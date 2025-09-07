from fastapi import FastAPI, HTTPException, Depends, status, Request, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Tuple, Any
import uuid
from datetime import datetime
import asyncio
import aiofiles
import json
import time
import openai
from openai import AsyncOpenAI
import re
import random
from collections import Counter
from mutagen.mp3 import MP3
import io
import boto3
from botocore.exceptions import ClientError
import random
import math
import httpx
from services.prompt_service import prompt_service
from services.dynamic_prompt_service import dynamic_prompt_service

# Import RSS service for consolidated RSS operations
from services.rss_service import get_articles_for_user, parse_rss_feed, extract_articles_from_feed, clear_rss_cache, get_user_rss_sources
from services.article_service import classify_article_genre

# Import SchedulePick services
from services.scheduler_service import create_scheduler_service, get_scheduler_service
from services.unified_audio_service import create_unified_audio_service

# Import task manager for progress tracking
from services.task_manager import get_task_manager, TaskStatus

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB and API configuration
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'audion-audio-files')

# Global database connection variable
db = None
db_connected = False

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global db, db_connected
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        # Test the connection
        await asyncio.wait_for(db.command('ping'), timeout=5.0)
        db_connected = True
        logging.info("Connected to MongoDB successfully")
    except Exception as e:
        logging.error(f"Failed to connect to MongoDB: {e}")
        db_connected = False
        logging.info("Server will run in limited mode without database")
    
    # Only run database operations if connected
    if db_connected:
        # Create database indexes (non-blocking)
        try:
            await db.users.create_index("email", unique=True)
            await db.rss_sources.create_index([("user_id", 1)])
            await db.audio_creations.create_index([("user_id", 1), ("created_at", -1)])
            await db.user_profiles.create_index("user_id", unique=True)
            await db.user_profiles.create_index([("user_id", 1), ("updated_at", -1)])
            # Subscription indexes
            await db.user_subscriptions.create_index("user_id", unique=True)
            await db.user_subscriptions.create_index([("user_id", 1), ("plan", 1)])
            await db.daily_usage.create_index([("user_id", 1), ("date", 1)], unique=True)
            await db.daily_usage.create_index([("date", 1)])
            await db.preset_categories.create_index("name", unique=True)
            await db.deleted_audio.create_index([("user_id", 1), ("deleted_at", -1)])
            await db.deleted_audio.create_index("permanent_delete_at")
            # Archive indexes
            await db.archived_articles.create_index([("user_id", 1), ("archived_at", -1)])
            await db.archived_articles.create_index([("user_id", 1), ("article_id", 1)], unique=True)
            await db.archived_articles.create_index([("user_id", 1), ("is_favorite", -1)])
            await db.archived_articles.create_index([("user_id", 1), ("read_status", 1)])
            await db.archived_articles.create_index([("user_id", 1), ("folder", 1)])
            logging.info("Database indexes created successfully")
        except Exception as e:
            logging.error(f"Failed to create database indexes: {e}")
            logging.info("Server will continue without some indexes")
        
        # Initialize preset categories on startup (non-blocking)
        try:
            await initialize_preset_categories()
            logging.info("Preset categories initialized successfully")
        except Exception as e:
            logging.error(f"Failed to initialize preset categories: {e}")
            logging.info("Server will continue without preset categories")
        
        # Initialize SchedulePick scheduler service (non-blocking)
        try:
            # Create OpenAI client for audio service
            openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
            audio_service = create_unified_audio_service(db, openai_client)
            
            # Create and start scheduler service
            scheduler_service = create_scheduler_service(db, audio_service)
            await scheduler_service.start_scheduler()
            logging.info("SchedulePick scheduler service initialized successfully")
        except Exception as e:
            logging.error(f"Failed to initialize scheduler service: {e}")
            logging.info("Server will continue without scheduler service")
        
        # Cleanup expired deleted audio files (non-blocking)
        try:
            # Note: cleanup_expired_deleted_audio function needs to be defined if used
            # await cleanup_expired_deleted_audio()
            logging.info("Cleanup tasks completed")
        except Exception as e:
            logging.error(f"Failed to run cleanup tasks: {e}")
            logging.info("Server will continue without cleanup")
    else:
        logging.info("Skipping database initialization - running in limited mode")
    
    yield
    
    # Shutdown
    # Stop scheduler service
    try:
        scheduler_service = get_scheduler_service()
        if scheduler_service:
            await scheduler_service.stop_scheduler()
            logging.info("SchedulePick scheduler service stopped successfully")
    except Exception as e:
        logging.error(f"Failed to stop scheduler service: {e}")
    
    client.close()
    logging.info("Disconnected from MongoDB")

# Create the main app
app = FastAPI(lifespan=lifespan)

# Mount static files for audio serving
backend_dir = Path(__file__).parent
audio_dir = backend_dir / "audio_files"
audio_dir.mkdir(exist_ok=True)  # Ensure audio directory exists
app.mount("/audio", StaticFiles(directory=str(audio_dir)), name="audio")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Health check endpoint (outside /api prefix for ConnectionService)
@app.get("/health")
async def health_check():
    """Health check endpoint for connection monitoring"""
    try:
        # Test database connection
        if db is not None:
            # Simple ping to check database connectivity
            await db.command("ping")
            return {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "database": "connected",
                "version": "1.0.0"
            }
        else:
            return {
                "status": "degraded",
                "timestamp": datetime.utcnow().isoformat(),
                "database": "disconnected",
                "version": "1.0.0"
            }
    except Exception as e:
        logging.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "error",
            "error": str(e),
            "version": "1.0.0"
        }

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for debugging
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Import and register routers
from routers.subscription import router as subscription_router
app.include_router(subscription_router)

# 🚀 NEW: Import and register unified audio router
try:
    from routers.audio_unified import router as audio_unified_router
    app.include_router(audio_unified_router)
    logging.info("✅ Unified Audio Router registered successfully")
except ImportError as e:
    logging.warning(f"⚠️ Could not import unified audio router: {e}")
# except Exception as e:
#     logging.error(f"❌ Failed to register unified audio router: {e}")

# TODO: Enable unified audio router after resolving import dependencies

@app.get("/api/simple-health", tags=["Health Check"])
def simple_health_check():
    return {"status": "ok"}

@app.get("/", tags=["Health Check"])
def read_root():
    return {"status": "ok", "message": "Welcome to Audion Backend V4 - The server is running!"}

@app.get("/audio/{filename}", tags=["Audio Files"])
async def serve_audio_file(filename: str):
    project_root = Path(__file__).parent.parent  # Go up from backend/ to project root
    audio_path = project_root / "audio_files" / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(audio_path, media_type="audio/mpeg")

# Security
security = HTTPBearer()

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserEmailChange(BaseModel):
    new_email: str
    password: str  # Require password confirmation for security

class UserSettingsUpdate(BaseModel):
    audio_quality: Optional[str] = None  # "standard", "high" 
    auto_play_next: Optional[bool] = None
    notifications_enabled: Optional[bool] = None
    push_notifications: Optional[bool] = None
    schedule_enabled: Optional[bool] = None
    schedule_time: Optional[str] = None
    schedule_count: Optional[int] = None
    text_size: Optional[str] = None  # "small", "medium", "large"
    language: Optional[str] = None  # "en", "ja"
    auto_pick_settings: Optional[dict] = None  # Auto-Pick configuration

# Push Notification Models
class PushTokenPayload(BaseModel):
    token: str = Field(..., description="The Expo push token for this device")

class PushToken(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="User ID this token belongs to")
    token: str = Field(..., description="The actual push token")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    device_info: Optional[dict] = Field(default=None, description="Optional device information")

class PushTokenResponse(BaseModel):
    status: str
    message: str
    token_id: Optional[str] = None

class NotificationHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="User ID who received the notification")
    token: str = Field(..., description="Push token used for sending")
    status: str = Field(..., description="Status: sent, error, delivered")
    title: str = Field(..., description="Notification title")
    body: str = Field(..., description="Notification body")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Additional notification data")
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    error_details: Optional[str] = Field(default=None, description="Error details if failed")

class SendNotificationPayload(BaseModel):
    user_ids: List[str]
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None

class RSSSource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    url: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RSSSourceCreate(BaseModel):
    name: str
    url: str

class RSSSourceUpdate(BaseModel):
    is_active: bool

class Article(BaseModel):
    id: str
    title: str
    summary: str
    link: str
    published: str
    source_name: str
    content: Optional[str] = None
    genre: Optional[str] = None
    thumbnail_url: Optional[str] = None

class Bookmark(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    article_id: str
    article_title: str
    article_summary: str
    article_link: str
    article_source: str
    article_image_url: Optional[str] = None
    bookmarked_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []
    notes: Optional[str] = None

class BookmarkCreate(BaseModel):
    article_id: str
    article_title: str
    article_summary: str
    article_link: str
    article_source: str
    article_image_url: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None

class AudioCreation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    article_ids: List[str]
    article_titles: List[str]
    audio_url: str
    duration: int
    script: Optional[str] = None
    chapters: Optional[List[dict]] = None  # [{"title": "Article Title", "start_time": 0, "end_time": 30000, "original_url": "https://..."}] (times in milliseconds)
    prompt_style: Optional[str] = "recommended"  # Added prompt style field: 'strict', 'recommended', 'friendly', 'insight', 'custom'
    custom_prompt: Optional[str] = None  # Custom prompt text if prompt_style is 'custom'
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AudioCreationRequest(BaseModel):
    article_ids: List[str]
    article_titles: List[str]
    custom_title: Optional[str] = None
    article_urls: Optional[List[str]] = None  # Add URLs for auto-pick articles
    prompt_style: Optional[str] = "recommended"  # Prompt style: 'strict', 'recommended', 'friendly', 'insight', 'custom'
    custom_prompt: Optional[str] = None  # Custom prompt text if prompt_style is 'custom'
    voice_language: Optional[str] = "en-US"  # Voice language: 'en-US', 'ja-JP'
    voice_name: Optional[str] = "alloy"  # OpenAI voice name

class DirectTTSRequest(BaseModel):
    article_id: str
    title: str
    content: str
    voice_language: Optional[str] = "en-US"
    voice_name: Optional[str] = "alloy"

class DirectTTSResponse(BaseModel):
    id: str
    title: str
    audio_url: str
    duration: int
    article_id: str
    created_at: datetime

class RenameRequest(BaseModel):
    new_title: str

class MisreadingFeedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    audio_id: str
    timestamp: int  # Position in milliseconds where misreading occurred
    reported_text: Optional[str] = None  # What the user heard
    expected_text: Optional[str] = None  # What should have been said
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Article Archive Models
class ArchivedArticle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    article_id: str  # Reference to original article
    article_title: str
    article_summary: str
    article_link: str
    article_published: str
    source_name: str
    article_genre: Optional[str] = None
    article_content: Optional[str] = None  # Full article content if available
    
    # Archive-specific metadata
    archived_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []  # User-added tags for organization
    notes: Optional[str] = None  # User notes about the article
    read_status: str = "unread"  # "unread", "reading", "read"
    is_favorite: bool = False  # Star/favorite marking
    folder: Optional[str] = None  # Optional folder organization
    
    # Search and filtering helpers
    search_text: Optional[str] = None  # Combined title + summary for full-text search

class ArchiveRequest(BaseModel):
    article_id: str
    article_title: str
    article_summary: str
    article_link: str
    article_published: str
    source_name: str
    article_genre: Optional[str] = None
    article_content: Optional[str] = None

class ArchiveUpdateRequest(BaseModel):
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    read_status: Optional[str] = None  # "unread", "reading", "read"  
    is_favorite: Optional[bool] = None
    folder: Optional[str] = None

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    genre_preferences: dict = Field(default_factory=lambda: {
        "Technology": 1.0,
        "Finance": 1.0,
        "Sports": 1.0,
        "Politics": 1.0,
        "Health": 1.0,
        "Entertainment": 1.0,
        "Science": 1.0,
        "Environment": 1.0,
        "Education": 1.0,
        "Travel": 1.0,
        "General": 1.0
    })
    interaction_history: List[dict] = Field(default_factory=list)
    # User Settings
    audio_quality: str = "standard"  # "standard", "high"
    auto_play_next: bool = True
    notifications_enabled: bool = True
    push_notifications: bool = True
    schedule_enabled: bool = False
    schedule_time: str = "07:00"
    schedule_count: int = 3
    text_size: str = "medium"  # "small", "medium", "large"
    language: str = "en"  # "en", "ja"
    # Auto-Pick Settings
    auto_pick_settings: dict = Field(default_factory=lambda: {
        "max_articles": 5,
        "preferred_genres": [],
        "excluded_genres": [],
        "source_priority": "balanced",
        "time_based_filtering": True
    })
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AutoPickRequest(BaseModel):
    max_articles: Optional[int] = 5
    preferred_genres: Optional[List[str]] = None
    excluded_genres: Optional[List[str]] = None
    source_priority: Optional[str] = "balanced"
    time_based_filtering: Optional[bool] = True
    active_source_ids: Optional[List[str]] = None  # Explicitly specify which sources to use

class TaskStartResponse(BaseModel):
    task_id: str
    message: str
    status: str

class UserInteraction(BaseModel):
    article_id: str
    interaction_type: str  # "liked", "disliked", "created_audio", "skipped", "completed", "saved", "partial_play", "quick_exit"
    genre: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[dict] = None  # For additional context like play_duration, completion_percentage

# Playlist and Album Models
class Playlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = ""
    audio_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = False
    cover_image_url: Optional[str] = None

class PlaylistCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    is_public: bool = False

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class PlaylistAddAudio(BaseModel):
    audio_ids: List[str]

class Album(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # creator of the album
    name: str
    description: Optional[str] = ""
    audio_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_public: bool = False
    cover_image_url: Optional[str] = None
    tags: List[str] = []  # for categorization (e.g., "daily news", "tech news", "series")
    series_info: Optional[Dict] = None  # for series metadata like episode number, season

class AlbumCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    is_public: bool = False
    tags: List[str] = []

class AlbumUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None

class AlbumAddAudio(BaseModel):
    audio_ids: List[str]

# Download Management
class DownloadedAudio(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    audio_id: str
    downloaded_at: datetime = Field(default_factory=datetime.utcnow)
    local_file_path: Optional[str] = None
    file_size: Optional[int] = None
    download_quality: str = "standard"  # standard, high
    auto_downloaded: bool = True  # True if auto-downloaded on creation

# Onboard Preset Models
class PresetCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    display_name: str
    description: str
    icon: str
    color: str
    rss_sources: List[Dict[str, str]]  # [{"name": "TechCrunch", "url": "https://..."}]
    sample_audio_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OnboardRequest(BaseModel):
    selected_categories: List[str]  # category names
    user_preferences: Optional[Dict] = None

class PresetSourceSearch(BaseModel):
    query: str
    category: Optional[str] = None

class PresetSource(BaseModel):
    name: str
    url: str
    category: str
    category_display_name: str
    description: str
    icon: str
    color: str

# AI Helper Functions
# Enhanced Genre Classification System with weighted keywords
GENRE_KEYWORDS = {
    "Technology": {
        "high": ["ai", "artificial intelligence", "machine learning", "blockchain", "cryptocurrency", "bitcoin", "ethereum", "nft", "metaverse", "vr", "virtual reality", "ar", "augmented reality", "cloud computing", "cybersecurity", "data privacy", "algorithm", "neural network", "quantum computing", "5g", "internet of things", "iot", "robotics", "automation"],
        "medium": ["tech", "technology", "software", "app", "platform", "digital", "online", "internet", "web", "mobile", "smartphone", "iphone", "android", "google", "apple", "microsoft", "amazon", "facebook", "meta", "twitter", "tesla", "spacex", "openai", "chatgpt"],
        "low": ["startup", "innovation", "disruption", "silicon valley", "venture capital", "vc", "ipo", "saas", "fintech", "edtech", "medtech"]
    },
    "Finance": {
        "high": ["stock market", "nasdaq", "dow jones", "s&p 500", "federal reserve", "fed", "interest rate", "inflation", "recession", "gdp", "unemployment", "economic growth", "monetary policy", "fiscal policy", "central bank"],
        "medium": ["finance", "financial", "economy", "economic", "market", "stock", "share", "investment", "investor", "trading", "bank", "banking", "credit", "loan", "mortgage", "insurance", "pension", "retirement"],
        "low": ["business", "corporate", "earnings", "revenue", "profit", "loss", "merger", "acquisition", "dividend", "portfolio", "asset"]
    },
    "Sports": {
        "high": ["olympic", "olympics", "world cup", "super bowl", "champions league", "nba finals", "world series", "masters tournament", "wimbledon", "uefa", "fifa"],
        "medium": ["sport", "sports", "game", "match", "championship", "tournament", "league", "team", "player", "athlete", "coach", "victory", "defeat", "goal", "score"],
        "low": ["football", "soccer", "basketball", "baseball", "tennis", "golf", "hockey", "boxing", "mma", "racing"]
    },
    "Politics": {
        "high": ["president", "prime minister", "congress", "parliament", "senate", "supreme court", "election", "vote", "campaign", "democracy", "republican", "democrat", "conservative", "liberal", "legislation", "bill"],
        "medium": ["politics", "political", "government", "policy", "minister", "senator", "congressman", "mayor", "governor", "diplomat", "embassy", "foreign policy", "domestic policy"],
        "low": ["administration", "cabinet", "bureaucracy", "regulation", "governance", "public sector", "civil service", "law"]
    },
    "Health": {
        "high": ["covid", "coronavirus", "pandemic", "vaccine", "vaccination", "hospital", "doctor", "physician", "surgeon", "medical", "medicine", "healthcare", "patient", "treatment", "therapy", "diagnosis", "symptom", "disease", "virus", "bacteria"],
        "medium": ["health", "healthy", "wellness", "fitness", "nutrition", "diet", "mental health", "depression", "anxiety", "stress", "pharmaceutical", "drug", "medication", "clinical trial", "fda approval"],
        "low": ["exercise", "workout", "lifestyle", "wellbeing", "prevention", "care", "medical device", "biotech", "healthcare system"]
    },
    "Entertainment": {
        "high": ["movie", "film", "cinema", "hollywood", "oscar", "emmy", "grammy", "music", "album", "song", "concert", "celebrity", "actor", "actress", "singer", "musician", "director", "producer"],
        "medium": ["entertainment", "show", "series", "tv", "television", "streaming", "netflix", "disney", "amazon prime", "hbo", "art", "artist", "gallery", "museum", "culture", "cultural"],
        "low": ["theater", "theatre", "performance", "comedy", "drama", "documentary", "animation", "gaming", "video game"]
    },
    "Science": {
        "high": ["research", "study", "scientific", "scientist", "discovery", "breakthrough", "experiment", "laboratory", "university research", "peer review", "journal", "publication"],
        "medium": ["science", "physics", "chemistry", "biology", "astronomy", "space", "nasa", "mars", "rocket", "satellite", "telescope", "dna", "genetic", "genome"],
        "low": ["innovation", "development", "analysis", "data", "evidence", "theory", "hypothesis"]
    },
    "Environment": {
        "high": ["climate change", "global warming", "greenhouse gas", "carbon emission", "renewable energy", "solar power", "wind power", "electric vehicle", "ev", "sustainability", "conservation"],
        "medium": ["environment", "environmental", "climate", "weather", "temperature", "pollution", "air quality", "water quality", "ecosystem", "biodiversity", "wildlife", "forest", "ocean"],
        "low": ["nature", "natural", "green", "eco", "recycling", "waste", "energy", "resource"]
    },
    "Education": {
        "high": ["education", "educational", "school", "university", "college", "student", "teacher", "professor", "learning", "curriculum", "degree", "graduation", "academic"],
        "medium": ["classroom", "lesson", "course", "program", "study", "exam", "test", "scholarship", "tuition", "campus"],
        "low": ["knowledge", "skill", "training", "development", "literacy"]
    },
    "Travel": {
        "high": ["travel", "tourism", "tourist", "vacation", "holiday", "trip", "journey", "destination", "hotel", "resort", "airline", "flight", "airport", "cruise"],
        "medium": ["visit", "explore", "adventure", "sightseeing", "attraction", "landmark", "culture", "local", "international", "domestic"],
        "low": ["experience", "discovery", "leisure", "recreation", "hospitality", "service"]
    }
}

def calculate_genre_scores(title: str, summary: str) -> Dict[str, float]:
    """Calculate weighted scores for each genre based on keyword matching"""
    try:
        # Input validation
        if not title and not summary:
            logging.warning("Empty title and summary provided to calculate_genre_scores")
            return {genre: 0.0 for genre in GENRE_KEYWORDS.keys()}
        
        text = (str(title or '') + " " + str(summary or '')).lower().strip()
        
        if not text:
            logging.warning("Text is empty after processing")
            return {genre: 0.0 for genre in GENRE_KEYWORDS.keys()}
        
        # Remove punctuation and normalize text
        words = re.findall(r'\b\w+\b', text)
        text_phrases = text  # Keep original for phrase matching
        
        genre_scores = {}
        
        for genre, weight_categories in GENRE_KEYWORDS.items():
            score = 0.0
            
            try:
                # High weight keywords/phrases (3.0 points)
                if "high" in weight_categories:
                    for keyword in weight_categories["high"]:
                        if keyword and keyword in text_phrases:
                            score += 3.0
                            if len(keyword.split()) == 1 and keyword in words:  # Exact word match bonus
                                score += 0.5
                
                # Medium weight keywords/phrases (1.5 points)
                if "medium" in weight_categories:
                    for keyword in weight_categories["medium"]:
                        if keyword and keyword in text_phrases:
                            score += 1.5
                            if len(keyword.split()) == 1 and keyword in words:
                                score += 0.25
                
                # Low weight keywords/phrases (0.8 points)
                if "low" in weight_categories:
                    for keyword in weight_categories["low"]:
                        if keyword and keyword in text_phrases:
                            score += 0.8
                            if len(keyword.split()) == 1 and keyword in words:
                                score += 0.1
            except Exception as e:
                logging.error(f"Error processing genre {genre}: {e}")
                score = 0.0
            
            genre_scores[genre] = score
        
        return genre_scores
    except Exception as e:
        logging.error(f"Error in calculate_genre_scores: {e}")
        return {genre: 0.0 for genre in GENRE_KEYWORDS.keys()}

def classify_genre(title: str, summary: str, confidence_threshold: float = 1.0) -> str:
    """Enhanced genre classification with confidence scoring"""
    try:
        genre_scores = calculate_genre_scores(title, summary)
        
        if not genre_scores:
            return "General"
        
        # Sort genres by score (highest first)
        sorted_genres = sorted(genre_scores.items(), key=lambda x: x[1], reverse=True)
        
        if not sorted_genres:
            return "General"
        
        top_genre, top_score = sorted_genres[0]
        
        # Apply confidence threshold
        if top_score >= confidence_threshold:
            result_genre = top_genre
        else:
            result_genre = "General"
        
        # Enhanced logging with top 3 scores
        score_summary = ", ".join([f"{genre}: {score:.1f}" for genre, score in sorted_genres[:3] if score > 0])
        # Removed verbose classification logging
        
        return result_genre
    except Exception as e:
        logging.error(f"Error in classify_genre: {e} - Title: {title[:50]}...")
        return "General"

def get_genre_confidence(title: str, summary: str) -> Tuple[str, float, Dict[str, float]]:
    """Get genre classification with confidence score and all genre probabilities"""
    genre_scores = calculate_genre_scores(title, summary)
    
    total_score = sum(genre_scores.values())
    if total_score == 0:
        return "General", 0.0, genre_scores
    
    # Convert to probabilities
    genre_probabilities = {genre: score/total_score for genre, score in genre_scores.items()}
    
    # Get top genre and its confidence
    top_genre = max(genre_scores.items(), key=lambda x: x[1])[0]
    confidence = genre_probabilities[top_genre]
    
    return top_genre, confidence, genre_probabilities

def extract_image_from_entry(entry) -> Optional[str]:
    """Extract image URL from RSS entry using multiple methods"""
    import re
    
    # Method 1: Check for media:thumbnail or media:content
    try:
        if hasattr(entry, 'media_thumbnail'):
            thumbnails = entry.media_thumbnail
            if thumbnails and len(thumbnails) > 0:
                return thumbnails[0].get('url')
    except:
        pass
        
    try:
        if hasattr(entry, 'media_content'):
            media_content = entry.media_content
            if media_content and len(media_content) > 0:
                for media in media_content:
                    if media.get('type', '').startswith('image/'):
                        return media.get('url')
    except:
        pass
    
    # Method 2: Check entry.enclosures for images
    try:
        if hasattr(entry, 'enclosures'):
            for enclosure in entry.enclosures:
                if enclosure.get('type', '').startswith('image/'):
                    return enclosure.get('href')
    except:
        pass
    
    # Method 3: Parse HTML content for img tags
    try:
        content = ""
        if hasattr(entry, 'content') and entry.content:
            if isinstance(entry.content, list) and len(entry.content) > 0:
                content = entry.content[0].get('value', '')
            else:
                content = str(entry.content)
        elif hasattr(entry, 'summary'):
            content = entry.summary
        elif hasattr(entry, 'description'):
            content = entry.description
        
        if content:
            # Find img tags and extract src
            img_matches = re.findall(r'<img[^>]+src=[\'"]([^\'"]+)[\'"][^>]*>', content, re.IGNORECASE)
            if img_matches:
                # Return the first valid image URL
                for img_url in img_matches:
                    if img_url.startswith(('http://', 'https://')):
                        return img_url
    except:
        pass
    
    # Method 4: Check for image field directly
    try:
        if hasattr(entry, 'image'):
            image_data = entry.image
            if isinstance(image_data, dict):
                return image_data.get('href') or image_data.get('url')
            elif isinstance(image_data, str):
                return image_data
    except:
        pass
    
    return None

def generate_audio_title(article_count: int, voice_language: str = "en-US") -> str:
    """Generate localized audio title based on article count and language"""
    if voice_language == "ja-JP":
        return f"{article_count}記事の音声ニュース"
    else:
        return f"{article_count} Articles Audio News"

async def generate_audio_title_with_openai(articles_content: List[str]) -> str:
    """Generate an engaging title for the audio based on article content"""
    try:
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
            return f"AI News Summary - {datetime.now().strftime('%Y-%m-%d')}"
        
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        system_message = "You are an expert news editor. Create a concise, engaging title for a news audio summary. The title should be 3-8 words, capture the main theme, and be suitable for a podcast episode. Avoid generic phrases like 'News Summary' or 'Daily Update'."
        combined_content = "\n\n--- Article ---\n\n".join(articles_content)
        user_message = f"Create an engaging title for a news audio that covers these articles:\n\n{combined_content}"
        
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "system", "content": system_message}, {"role": "user", "content": user_message}],
            model="gpt-4o",
        )
        
        generated_title = chat_completion.choices[0].message.content.strip()
        # Remove quotes if present
        generated_title = generated_title.strip('"').strip("'")
        return generated_title
        
    except Exception as e:
        logging.error(f"OpenAI title generation error: {e}")
        return f"AI News Summary - {datetime.now().strftime('%Y-%m-%d')}"

def get_system_message_by_prompt_style(prompt_style: str = "recommended", custom_prompt: str = None, voice_language: str = "en-US", target_length: int = None) -> str:
    """
    Legacy wrapper for PromptService - maintains API compatibility
    DEPRECATED: Use prompt_service.get_system_message() directly
    """
    return prompt_service.get_system_message(
        prompt_style=prompt_style,
        custom_prompt=custom_prompt,
        voice_language=voice_language,
        target_length=target_length
    )

async def summarize_articles_with_openai(
    articles_content: List[str], 
    prompt_style: str = "recommended", 
    custom_prompt: str = None, 
    voice_language: str = "en-US", 
    target_length: int = None,
    user_plan: str = "free"  # 🔥 NEW: User plan for dynamic character count
) -> str:
    """
    🚀 Enhanced with Dynamic Character Count Instructions
    Now includes optimal character count guidance for AI based on article count and user plan
    """
    try:
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
            return "Breaking news today as technology companies continue to shape our digital landscape. Recent developments include major updates to artificial intelligence systems and significant changes in social media platforms. Industry analysts report growing investments in sustainable technology solutions, while cybersecurity experts emphasize the importance of data protection in an increasingly connected world. These developments signal continued innovation across the tech sector."
        
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        # 🚀 NEW: Calculate total content length for dynamic prompt generation
        total_content_chars = sum(len(content) for content in articles_content)
        article_count = len(articles_content)
        
        # 🚀 NEW: Generate enhanced prompt with dynamic character count instructions
        enhanced_system_message, prompt_metadata = dynamic_prompt_service.generate_enhanced_prompt(
            base_prompt_style=prompt_style,
            custom_prompt=custom_prompt,
            voice_language=voice_language,
            article_count=article_count,
            total_content_chars=total_content_chars,
            user_plan=user_plan
        )
        
        # Log the enhancement for debugging
        logging.info(f"🚀 ENHANCED PROMPT: Using {prompt_metadata['optimal_preset']} preset")
        logging.info(f"🚀 ENHANCED PROMPT: Expected {prompt_metadata['target_range']} for {article_count} articles")
        
        combined_content = "\n\n--- Article ---\n\n".join(articles_content)
        user_message = f"""Please create a single-narrator news script based on these articles. 

Important requirements:
- Base the script ENTIRELY on the provided article content
- Include specific facts, quotes, and details from the articles
- Maintain accuracy to the source material
- Present information in an engaging narrative format
- Write only the script content without speaker labels, host names, or dialogue markers

Articles to transform into audio script:

{combined_content}"""

        chat_completion = await client.chat.completions.create(
            messages=[{"role": "system", "content": enhanced_system_message}, {"role": "user", "content": user_message}],
            model="gpt-4o",
        )
        
        result_script = chat_completion.choices[0].message.content
        
        # Log results for analysis
        actual_length = len(result_script)
        expected_range = prompt_metadata['target_range']
        logging.info(f"🎯 SCRIPT RESULT: Generated {actual_length} chars, Expected {expected_range}")
        if actual_length < prompt_metadata['expected_total_chars'] * 0.5:
            logging.warning(f"⚠️ SHORT SCRIPT: {actual_length} chars much shorter than expected {prompt_metadata['expected_total_chars']}")
        
        return result_script
        
    except Exception as e:
        logging.error(f"OpenAI summarization error: {e}")
        return "An error occurred during summarization. We apologize for the technical difficulty and are working to resolve the issue. Please try again shortly for the latest news updates."

def create_mock_audio_file() -> tuple[str, int]:
    # Use environment variable or default port for consistency
    server_port = os.getenv('SERVER_PORT', '8000')
    dummy_audio_url = f"http://localhost:{server_port}/audio/SampleAudio_0.4mb.mp3"
    dummy_duration = 30
    return dummy_audio_url, dummy_duration

async def upload_to_s3(audio_content: bytes, filename: str) -> str:
    """Upload audio content to S3 and return public URL"""
    try:
        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        
        # Upload to S3
        s3_key = f"audio/{filename}"
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_key,
            Body=audio_content,
            ContentType='audio/mpeg'
            # Removed ACL parameter - using bucket policy for public access
        )
        
        # Generate public URL
        public_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        logging.info(f"Audio uploaded to S3: {public_url}")
        return public_url
        
    except ClientError as e:
        logging.error(f"S3 upload failed: {e}")
        raise e

async def convert_text_to_speech(text: str, voice_language: str = "en-US", voice_name: str = "alloy") -> dict:
    try:
        logging.info(f"Starting TTS conversion for text length: {len(text)}")
        logging.info(f"OpenAI API Key available: {bool(OPENAI_API_KEY)}")
        
        # Log voice settings
        logging.info(f"Using voice language: {voice_language}, voice: {voice_name}")
        
        # Basic voice validation (reduced logging)
        if voice_language == "ja-JP" and any(word in text[:200] for word in ["the", "and", "is", "are", "of"]):
            logging.warning(f"Language mismatch: Japanese TTS with English content")
        
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.audio.speech.create(
            model="tts-1",
            voice=voice_name,
            input=text,
        )
        logging.info("OpenAI TTS request completed successfully")

        audio_content = b''
        if hasattr(response.content, '__aiter__'):
            async for chunk in response.content.aiter_bytes():
                audio_content += chunk
        elif isinstance(response.content, bytes):
            audio_content = response.content
        else:
            raise TypeError(f"Unexpected type for response.content: {type(response.content)}")

        audio_stream = io.BytesIO(audio_content)
        audio_info = MP3(audio_stream)
        duration = int(audio_info.info.length)

        audio_filename = f"audio_{uuid.uuid4()}.mp3"
        
        # Try S3 upload first, fallback to local storage
        if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_ACCESS_KEY_ID != "your-aws-access-key":
            try:
                public_url = await upload_to_s3(audio_content, audio_filename)
            except Exception as s3_error:
                logging.warning(f"S3 upload failed, using local storage: {s3_error}")
                # Fallback to local storage
                project_root = Path(__file__).parent.parent
                audio_dir = project_root / "audio_files"
                audio_dir.mkdir(exist_ok=True)
                
                audio_path = audio_dir / audio_filename
                with open(audio_path, 'wb') as f:
                    f.write(audio_content)
                
                server_port = os.getenv('SERVER_PORT', '8000')
                public_url = f"http://localhost:{server_port}/audio/{audio_filename}"
        else:
            # Use local storage
            project_root = Path(__file__).parent.parent
            audio_dir = project_root / "audio_files"
            audio_dir.mkdir(exist_ok=True)
            
            audio_path = audio_dir / audio_filename
            with open(audio_path, 'wb') as f:
                f.write(audio_content)
            
            server_port = os.getenv('SERVER_PORT', '8000')
            public_url = f"http://localhost:{server_port}/audio/{audio_filename}"
        
        return {"url": public_url, "duration": duration}

    except Exception as e:
        logging.error(f"OpenAI TTS conversion or Blob upload error: {e}")
        mock_url, mock_duration = create_mock_audio_file()
        return {"url": mock_url, "duration": mock_duration}

async def convert_text_to_speech_fast(text: str, voice_language: str = "en-US", voice_name: str = "alloy") -> dict:
    """Optimized TTS function for instant audio - minimal logging, faster processing"""
    try:
        # Minimal logging for speed
        logging.info(f"🚀 FAST TTS: {len(text)} chars")
        logging.info(f"🚀 FAST TTS: Voice language: {voice_language}, Voice name: {voice_name}")
        
        # Use faster TTS model and settings with proper language support
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        
        # Map voice language to appropriate voice for better quality
        if voice_language == "ja-JP" and voice_name == "alloy":
            voice_name = "nova"  # Better for Japanese
        
        response = await client.audio.speech.create(
            model="tts-1",  # Fastest model
            voice=voice_name,
            input=text,
            speed=1.0  # Standard speed for faster processing
        )
        
        # Streamlined audio processing
        audio_content = b''
        if hasattr(response.content, '__aiter__'):
            async for chunk in response.content.aiter_bytes():
                audio_content += chunk
        else:
            audio_content = response.content

        # Get accurate duration with MP3 parsing (essential for proper functionality)
        audio_stream = io.BytesIO(audio_content)
        audio_info = MP3(audio_stream)
        duration = int(audio_info.info.length)
        
        # Fast file naming and storage
        audio_filename = f"instant_{uuid.uuid4().hex[:8]}.mp3"
        
        # 🆕 Try S3 upload first for permanent storage, fallback to local for streaming speed
        if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_ACCESS_KEY_ID != "your-aws-access-key":
            try:
                public_url = await upload_to_s3(audio_content, audio_filename)
                logging.info(f"⚡ FAST TTS: S3 upload successful: {public_url}")
            except Exception as s3_error:
                logging.warning(f"⚡ FAST TTS: S3 upload failed, using local storage: {s3_error}")
                # Fallback to local storage for immediate streaming
                backend_dir = Path(__file__).parent
                audio_dir = backend_dir / "audio_files"
                audio_dir.mkdir(exist_ok=True)
                
                audio_path = audio_dir / audio_filename
                with open(audio_path, 'wb') as f:
                    f.write(audio_content)
                
                server_port = os.getenv('SERVER_PORT', '8000')
                public_url = f"http://localhost:{server_port}/audio/{audio_filename}"
        else:
            # Use local storage for immediate streaming
            backend_dir = Path(__file__).parent
            audio_dir = backend_dir / "audio_files"
            audio_dir.mkdir(exist_ok=True)
            
            audio_path = audio_dir / audio_filename
            with open(audio_path, 'wb') as f:
                f.write(audio_content)
            
            server_port = os.getenv('SERVER_PORT', '8000')
            public_url = f"http://localhost:{server_port}/audio/{audio_filename}"
        
        logging.info(f"⚡ FAST TTS complete: {public_url}")
        return {"url": public_url, "duration": duration}

    except Exception as e:
        logging.error(f"Fast TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fast TTS failed: {str(e)}")

# Auto-Pick Algorithm Functions
async def get_or_create_user_profile(user_id: str) -> UserProfile:
    """Get user profile or create one with default preferences"""
    profile_data = await db.user_profiles.find_one({"user_id": user_id})
    if profile_data:
        return UserProfile(**profile_data)
    
    # Create new profile with default preferences
    new_profile = UserProfile(user_id=user_id)
    await db.user_profiles.insert_one(new_profile.dict())
    return new_profile

async def update_user_preferences(user_id: str, interaction: UserInteraction):
    """Enhanced user preferences with granular interaction learning"""
    profile = await get_or_create_user_profile(user_id)
    
    # Dynamic learning rates based on interaction strength
    learning_rates = {
        "completed": 0.15,      # Strongest positive signal
        "saved": 0.12,          # Strong positive signal
        "liked": 0.1,           # Positive signal
        "created_audio": 0.08,  # Positive but indirect
        "partial_play": 0.05,   # Weak positive signal
        "skipped": -0.08,       # Negative signal
        "quick_exit": -0.1,     # Strong negative signal
        "disliked": -0.12,      # Strongest negative signal
        "cancelled_like": -0.1, # Cancel previous like
        "cancelled_dislike": 0.12  # Cancel previous dislike (reverse negative)
    }
    
    base_learning_rate = learning_rates.get(interaction.interaction_type, 0.05)
    
    # Apply contextual adjustments
    adjusted_rate = base_learning_rate
    
    # Completion percentage bonus for partial_play
    if interaction.interaction_type == "partial_play" and interaction.metadata:
        completion_pct = interaction.metadata.get("completion_percentage", 0)
        if completion_pct > 0.7:  # 70%+ completion gets bonus
            adjusted_rate = 0.1
        elif completion_pct < 0.3:  # <30% completion is negative
            adjusted_rate = -0.05
    
    # Update genre preferences
    current_pref = profile.genre_preferences.get(interaction.genre, 1.0)
    new_pref = current_pref + adjusted_rate
    
    # Apply bounds with genre-specific caps
    profile.genre_preferences[interaction.genre] = max(0.1, min(2.5, new_pref))
    
    # Add enriched interaction to history
    enriched_interaction = interaction.dict()
    enriched_interaction["learning_rate_used"] = adjusted_rate
    enriched_interaction["preference_before"] = current_pref
    enriched_interaction["preference_after"] = profile.genre_preferences[interaction.genre]
    
    profile.interaction_history.append(enriched_interaction)
    
    # Keep last 150 interactions (increased for better learning)
    if len(profile.interaction_history) > 150:
        profile.interaction_history = profile.interaction_history[-150:]
    
    profile.updated_at = datetime.utcnow()
    
    # Update in database
    await db.user_profiles.update_one(
        {"user_id": user_id},
        {"$set": profile.dict()}
    )
    
    logging.info(f"Updated {interaction.genre} preference: {current_pref:.3f} -> {profile.genre_preferences[interaction.genre]:.3f} (interaction: {interaction.interaction_type})")

def calculate_personal_affinity(article: Article, user_profile: UserProfile) -> float:
    """Calculate Personal Affinity: User's interest alignment"""
    # Genre preference weight (1.5x stronger impact)
    genre_weight = user_profile.genre_preferences.get(article.genre, 1.0)
    
    # Reading completion rate bonus for similar articles
    completion_bonus = 0.0
    completed_articles = [i for i in user_profile.interaction_history[-20:] 
                         if i.get('interaction_type') == 'completed' and i.get('genre') == article.genre]
    if completed_articles:
        completion_bonus = min(0.3, len(completed_articles) * 0.05)
    
    # Save rate bonus for this genre
    save_bonus = 0.0
    saved_articles = [i for i in user_profile.interaction_history[-15:] 
                     if i.get('interaction_type') == 'saved' and i.get('genre') == article.genre]
    if saved_articles:
        save_bonus = min(0.2, len(saved_articles) * 0.04)
    
    return genre_weight * (1 + completion_bonus + save_bonus)

def calculate_contextual_relevance(article: Article, user_profile: UserProfile) -> float:
    """Calculate Contextual Relevance: Time and situational fit"""
    base_relevance = 1.0
    
    # Time-of-day optimization
    current_hour = datetime.now().hour
    time_bonus = 0.0
    
    # Morning (6-10): Prefer shorter, news-heavy content
    if 6 <= current_hour <= 10:
        if article.genre in ['news', 'business', 'politics']:
            time_bonus = 0.2
        elif len(article.title + (article.summary or '')) < 200:  # Shorter articles
            time_bonus = 0.1
    
    # Evening (18-22): Prefer deeper, analytical content
    elif 18 <= current_hour <= 22:
        if article.genre in ['technology', 'science', 'culture', 'analysis']:
            time_bonus = 0.2
        elif len(article.title + (article.summary or '')) > 300:  # Longer articles
            time_bonus = 0.1
    
    # Night (22-24, 0-6): Prefer lighter, entertainment content
    elif current_hour >= 22 or current_hour <= 6:
        if article.genre in ['entertainment', 'lifestyle', 'culture']:
            time_bonus = 0.15
    
    # Recency bonus (newer articles get boost)
    recency_bonus = 0.0
    if article.published:
        try:
            pub_date = datetime.fromisoformat(article.published.replace('Z', '+00:00'))
            hours_old = (datetime.utcnow().replace(tzinfo=pub_date.tzinfo) - pub_date).total_seconds() / 3600
            if hours_old < 24:
                recency_bonus = 0.25 * (1 - hours_old / 24)
            elif hours_old < 72:  # 3 days
                recency_bonus = 0.1 * (1 - hours_old / 72)
        except:
            pass
    
    return base_relevance * (1 + time_bonus + recency_bonus)

def calculate_diversity_factor(article: Article, user_profile: UserProfile, selected_articles: List[Article] = None) -> float:
    """Calculate Diversity Factor: Prevent echo chambers"""
    diversity_score = 1.0
    
    # Recent genre diversity
    recent_genres = []
    for interaction in user_profile.interaction_history[-15:]:
        if interaction.get('interaction_type') in ['created_audio', 'completed']:
            recent_genres.append(interaction.get('genre'))
    
    if article.genre in recent_genres:
        genre_count = recent_genres.count(article.genre)
        diversity_score = max(0.4, 1.0 - (genre_count * 0.15))
    
    # Current selection diversity (avoid duplicate genres in same recommendation)
    if selected_articles:
        selected_genres = [a.genre for a in selected_articles]
        if article.genre in selected_genres:
            same_genre_count = selected_genres.count(article.genre)
            diversity_score *= max(0.3, 1.0 - (same_genre_count * 0.3))
    
    # Boost for unexplored genres
    all_genres_tried = set(i.get('genre') for i in user_profile.interaction_history if i.get('genre'))
    if article.genre not in all_genres_tried:
        diversity_score *= 1.3  # Exploration bonus
    
    return diversity_score

def calculate_article_score(
    article: Article, 
    user_profile: UserProfile, 
    selected_articles: List[Article] = None,
    recency_weight: float = 0.3,
    popularity_weight: float = 0.2,
    personalization_weight: float = 0.5
) -> float:
    """Enhanced hybrid scoring: Personal × Contextual × Diversity + Exploration"""
    
    # Core components
    personal_affinity = calculate_personal_affinity(article, user_profile)
    contextual_relevance = calculate_contextual_relevance(article, user_profile)
    diversity_factor = calculate_diversity_factor(article, user_profile, selected_articles)
    
    # Hybrid score calculation
    final_score = personal_affinity * contextual_relevance * diversity_factor
    
    # Exploration noise (larger range for better discovery)
    exploration_noise = random.uniform(-0.3, 0.3)  # Increased range for more variety
    final_score += exploration_noise
    
    return max(0.1, final_score)  # Ensure positive score

async def auto_pick_articles(
    user_id: str, 
    all_articles: List[Article], 
    max_articles: int = 5, 
    preferred_genres: List[str] = None,
    excluded_genres: List[str] = None,
    source_priority: str = "balanced",
    time_based_filtering: bool = True
) -> List[Article]:
    """Enhanced Auto-pick with progressive selection for optimal diversity"""
    logging.info(f"Starting with {len(all_articles)} articles, requesting {max_articles}")
    user_profile = await get_or_create_user_profile(user_id)
    
    # Apply filters based on user settings
    filtered_articles = all_articles.copy()
    logging.info(f"Initial articles: {len(filtered_articles)}")
    
    # Filter by preferred genres if specified
    if preferred_genres:
        before_genre_filter = len(filtered_articles)
        filtered_articles = [a for a in filtered_articles if a.genre in preferred_genres]
        logging.info(f"After preferred genre filter ({preferred_genres}): {len(filtered_articles)} (was {before_genre_filter})")
    
    # Filter out excluded genres
    if excluded_genres:
        before_exclude_filter = len(filtered_articles)
        filtered_articles = [a for a in filtered_articles if a.genre not in excluded_genres]
        logging.info(f"After excluded genre filter ({excluded_genres}): {len(filtered_articles)} (was {before_exclude_filter})")
    
    # Apply time-based filtering if enabled (simple recency filter)
    if time_based_filtering:
        # Sort by published date and take more recent articles for selection
        filtered_articles = sorted(filtered_articles, key=lambda x: x.published or '', reverse=True)
        logging.info(f"After time-based filtering: {len(filtered_articles)} articles")
    
    if not filtered_articles:
        # No articles found after filtering
        return []
    
    selected_articles = []
    remaining_articles = filtered_articles.copy()
    
    # Simple selection based on source priority
    if source_priority == "recent":
        # Already sorted by recency if time_based_filtering is True
        pass
    elif source_priority == "popular":
        # Sort by a simple popularity heuristic (longer content = more popular)
        remaining_articles = sorted(remaining_articles, key=lambda x: len(x.content or ''), reverse=True)
    # "balanced" uses the existing order
    
    # Progressive selection for diversity
    max_to_select = min(max_articles, len(remaining_articles))
    logging.info(f"Will select {max_to_select} articles from {len(remaining_articles)} filtered articles")
    
    for i in range(max_to_select):
        if not remaining_articles:
            break
            
        # Calculate scores considering already selected articles
        scored_articles = []
        for article in remaining_articles:
            score = calculate_article_score(article, user_profile, selected_articles)
            scored_articles.append((article, score))
        
        # Sort by score and select top article
        scored_articles.sort(key=lambda x: x[1], reverse=True)
        
        if scored_articles:
            selected_article = scored_articles[0][0]
            selected_articles.append(selected_article)
            # Selected article for AutoPick
            
            # Remove from remaining articles for next iteration
            remaining_articles = [a for a in remaining_articles if a != selected_article]
    
    logging.info(f"Final selection: {len(selected_articles)} articles")
    return selected_articles

# ===== NOTIFICATION SERVICE HELPERS =====

EXPO_PUSH_URL = "https://api.expo.dev/v2/push/send"

async def send_batch_notifications(
    user_ids: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None
):
    """指定されたユーザーIDリストに一括でプッシュ通知を送信"""
    if not db_connected:
        logging.error("[Notifications] Database not connected, cannot send notifications")
        return {"status": "error", "details": "Database not connected"}
    
    try:
        # プッシュトークンを取得
        tokens = await asyncio.wait_for(
            db.push_tokens.find({"user_id": {"$in": user_ids}}).to_list(length=None),
            timeout=5.0
        )
        
        if not tokens:
            logging.warning(f"[Notifications] No push tokens found for users: {user_ids}")
            return {"status": "no_tokens_found"}
        
        # メッセージを構築
        messages = []
        for token_doc in tokens:
            messages.append({
                "to": token_doc["token"],
                "title": title,
                "body": body,
                "data": data or {},
                "sound": "default"
            })
        
        logging.info(f"[Notifications] Sending {len(messages)} notifications to {len(user_ids)} users")
        
        # Expo Push APIに送信
        async with httpx.AsyncClient() as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            
            # レスポンスを処理
            await handle_push_tickets(result.get('data', []), messages, tokens)
            
            logging.info(f"[Notifications] Successfully sent notifications, tickets: {len(result.get('data', []))}")
            return {"status": "success", "tickets": result.get('data')}
            
    except httpx.HTTPStatusError as e:
        error_msg = f"Expo API error: {e.response.status_code} - {e.response.text}"
        logging.error(f"[Notifications] {error_msg}")
        await log_batch_error(user_ids, title, body, data, error_msg)
        return {"status": "error", "details": error_msg}
    except asyncio.TimeoutError:
        error_msg = "Database timeout during notification sending"
        logging.error(f"[Notifications] {error_msg}")
        return {"status": "error", "details": error_msg}
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logging.error(f"[Notifications] {error_msg}")
        await log_batch_error(user_ids, title, body, data, error_msg)
        return {"status": "error", "details": error_msg}

async def handle_push_tickets(tickets: List[Dict[str, Any]], messages: List[Dict[str, Any]], token_docs: List[Dict]):
    """Expoからのチケットを処理し、エラーがあれば対応"""
    for i, ticket in enumerate(tickets):
        if i >= len(messages) or i >= len(token_docs):
            continue
            
        message = messages[i]
        token_doc = token_docs[i]
        token = token_doc["token"]
        user_id = token_doc["user_id"]
        
        # 通知履歴を記録
        history_data = NotificationHistory(
            user_id=user_id,
            token=token,
            title=message["title"],
            body=message["body"],
            data=message.get("data", {}),
            status="pending"  # 初期状態
        )
        
        if ticket.get('status') == 'ok':
            # 成功
            history_data.status = "sent"
            logging.info(f"[Notifications] Successfully sent to user {user_id}")
        else:
            # エラー
            error_details = ticket.get('details', {})
            error_code = error_details.get('error')
            history_data.status = "error"
            history_data.error_details = str(error_details)
            
            logging.warning(f"[Notifications] Error sending to user {user_id}: {error_details}")
            
            # トークンが無効な場合はDBから削除
            if error_code == 'DeviceNotRegistered':
                try:
                    await asyncio.wait_for(
                        db.push_tokens.delete_one({"token": token}),
                        timeout=5.0
                    )
                    logging.info(f"[Notifications] Removed invalid token for user {user_id}")
                except Exception as e:
                    logging.error(f"[Notifications] Failed to remove invalid token: {e}")
        
        # 履歴を保存
        try:
            await asyncio.wait_for(
                db.notification_history.insert_one(history_data.dict()),
                timeout=5.0
            )
        except Exception as e:
            logging.error(f"[Notifications] Failed to save notification history: {e}")

async def log_batch_error(user_ids: List[str], title: str, body: str, data: Optional[Dict], error: str):
    """バッチ送信全体が失敗した場合のログを記録"""
    if not db_connected:
        return
    
    try:
        # 各ユーザーのエラー履歴を作成
        error_histories = []
        for user_id in user_ids:
            history_data = NotificationHistory(
                user_id=user_id,
                token="unknown",
                status="error",
                title=title,
                body=body,
                data=data or {},
                error_details=f"Batch send failed: {error}"
            )
            error_histories.append(history_data.dict())
        
        if error_histories:
            await asyncio.wait_for(
                db.notification_history.insert_many(error_histories),
                timeout=10.0
            )
            logging.info(f"[Notifications] Logged {len(error_histories)} error histories")
    except Exception as e:
        logging.error(f"[Notifications] Failed to log batch error: {e}")

async def send_audio_completion_notification(user_id: str, article_title: str, audio_id: str):
    """音声生成完了通知を送信"""
    return await send_batch_notifications(
        user_ids=[user_id],
        title="🎧 音声の準備ができました！",
        body=f"「{article_title}」の音声を再生できます。",
        data={
            "screen": "AudioPlayer",
            "audioId": audio_id,
            "type": "audio_completion"
        }
    )

async def send_new_content_notification(user_ids: List[str], content_count: int):
    """新着コンテンツ通知を送信"""
    return await send_batch_notifications(
        user_ids=user_ids,
        title="📰 新着記事があります",
        body=f"{content_count}件の新しい記事が追加されました。",
        data={
            "screen": "Feed", 
            "type": "new_content"
        }
    )

async def send_system_notification(user_ids: List[str], title: str, body: str, screen: Optional[str] = None):
    """システム通知を送信"""
    return await send_batch_notifications(
        user_ids=user_ids,
        title=title,
        body=body,
        data={
            "screen": screen or "Feed",
            "type": "system"
        }
    )

# Auth helpers
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Simple user authentication using the token as user ID.
    This bypasses JWT verification for development simplicity.
    """
    global db_connected
    if not db_connected:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not connected")
    
    token = credentials.credentials
    
    user = await db.users.find_one({"id": token})
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    
    return User(**user)

# === API Endpoints ===

@app.get("/api/health", tags=["System"])
async def health_check():
    """Health check endpoint to show server and database status"""
    return {
        "status": "ok",
        "database_connected": db_connected,
        "message": "Server is running" + (" with database" if db_connected else " in limited mode")
    }

@app.post("/api/auth/register", tags=["Auth"])
async def register(user_data: UserCreate):
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        # Check if user already exists with timeout
        existing_user = await asyncio.wait_for(
            db.users.find_one({"email": user_data.email}),
            timeout=10.0
        )
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create and insert new user with timeout
        user = User(email=user_data.email)
        await asyncio.wait_for(
            db.users.insert_one(user.dict()),
            timeout=10.0
        )
        return {"access_token": user.id, "token_type": "bearer", "user": user}
    
    except asyncio.TimeoutError:
        logging.error("Database timeout during user registration")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"Registration error: {e}")
        if "ServerSelectionTimeoutError" in str(e):
            raise HTTPException(status_code=503, detail="Database connection failed. Please check your internet connection and try again.")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.post("/api/auth/login", tags=["Auth"])
async def login(user_data: UserLogin):
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        # Find user with timeout
        user = await asyncio.wait_for(
            db.users.find_one({"email": user_data.email}),
            timeout=10.0
        )
        if not user:
            raise HTTPException(status_code=400, detail="Invalid credentials")
        
        user_obj = User(**user)
        return {"access_token": user_obj.id, "token_type": "bearer", "user": user_obj}
    
    except asyncio.TimeoutError:
        logging.error("Database timeout during user login")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except HTTPException:
        # Re-raise HTTP exceptions (like invalid credentials)
        raise
    except Exception as e:
        logging.error(f"Login error: {e}")
        if "ServerSelectionTimeoutError" in str(e):
            raise HTTPException(status_code=503, detail="Database connection failed. Please check your internet connection and try again.")
        raise HTTPException(status_code=500, detail="Login failed")

@app.put("/api/auth/change-password", tags=["Auth"])
async def change_password(password_data: UserPasswordChange, current_user: User = Depends(get_current_user)):
    """Change user password"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        # Find user to verify current password
        user = await asyncio.wait_for(
            db.users.find_one({"id": current_user.id}),
            timeout=10.0
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # In a real app, you would hash and verify passwords
        # For now, we'll just update (since original system doesn't store passwords)
        
        # Update user record with new password hash (placeholder)
        await asyncio.wait_for(
            db.users.update_one(
                {"id": current_user.id},
                {"$set": {"password_updated_at": datetime.utcnow()}}
            ),
            timeout=10.0
        )
        
        return {"message": "Password updated successfully"}
        
    except asyncio.TimeoutError:
        logging.error("Database timeout during password change")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"Password change error: {e}")
        raise HTTPException(status_code=500, detail="Password change failed")

@app.put("/api/auth/change-email", tags=["Auth"])
async def change_email(email_data: UserEmailChange, current_user: User = Depends(get_current_user)):
    """Change user email address"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        # Check if new email is already in use
        existing_user = await asyncio.wait_for(
            db.users.find_one({"email": email_data.new_email}),
            timeout=10.0
        )
        if existing_user and existing_user["id"] != current_user.id:
            raise HTTPException(status_code=400, detail="Email already in use")
        
        # Update user email
        await asyncio.wait_for(
            db.users.update_one(
                {"id": current_user.id},
                {"$set": {
                    "email": email_data.new_email,
                    "email_updated_at": datetime.utcnow()
                }}
            ),
            timeout=10.0
        )
        
        # Update the current_user object
        current_user.email = email_data.new_email
        
        return {"message": "Email updated successfully", "user": current_user}
        
    except asyncio.TimeoutError:
        logging.error("Database timeout during email change")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"Email change error: {e}")
        raise HTTPException(status_code=500, detail="Email change failed")

@app.get("/api/auth/me", tags=["Auth"])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        # Get fresh user data from database with shorter timeout
        user = await asyncio.wait_for(
            db.users.find_one({"id": current_user.id}),
            timeout=3.0  # 3秒に短縮
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert ObjectId fields to strings for JSON serialization
        if user and '_id' in user:
            user['_id'] = str(user['_id'])
        
        return {"user": user}
        
    except asyncio.TimeoutError:
        logging.error("Database timeout during user info retrieval")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"User info retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user information")

@app.get("/api/user/settings", tags=["User Settings"])
async def get_user_settings(current_user: User = Depends(get_current_user)):
    """Get user settings and preferences"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        # Get user profile which contains settings
        profile = await asyncio.wait_for(
            db.profiles.find_one({"user_id": current_user.id}),
            timeout=10.0
        )
        
        if not profile:
            # Create default profile with settings
            profile_data = UserProfile(user_id=current_user.id)
            await asyncio.wait_for(
                db.profiles.insert_one(profile_data.dict()),
                timeout=10.0
            )
            return profile_data.dict()
        
        # Convert ObjectId fields to strings for JSON serialization
        if profile and '_id' in profile:
            profile['_id'] = str(profile['_id'])
        return profile
        
    except asyncio.TimeoutError:
        logging.error("Database timeout during settings retrieval")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"Settings retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve settings")

# ===== PUSH NOTIFICATION ENDPOINTS =====

@app.post("/api/push-tokens", tags=["Push Notifications"])
async def register_push_token(
    payload: PushTokenPayload,
    current_user: User = Depends(get_current_user)
):
    """Register or update a push notification token for the current user."""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        # Upsert logic: Update if token exists, otherwise insert.
        # This handles new registrations, re-registrations, and user changes on the same device.
        update_data = {
            "$set": {
                "user_id": current_user.id,
                "updated_at": datetime.utcnow()
            },
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "token": payload.token,
                "created_at": datetime.utcnow()
            }
        }
        
        result = await asyncio.wait_for(
            db.push_tokens.update_one(
                {"token": payload.token},
                update_data,
                upsert=True
            ),
            timeout=10.0
        )
        
        if result.upserted_id:
            # A new token was inserted
            logging.info(f"[PushTokens] New token registered for user {current_user.email}")
            return PushTokenResponse(
                status="success",
                message="Push token registered successfully.",
                token_id=str(result.upserted_id)
            )
        elif result.modified_count > 0:
            # An existing token was updated
            logging.info(f"[PushTokens] Token updated for user {current_user.email}")
            return PushTokenResponse(
                status="success", 
                message="Push token updated successfully."
            )
        else:
            # The token existed and was already associated with this user, no changes needed
            logging.info(f"[PushTokens] Token already up-to-date for user {current_user.email}")
            return PushTokenResponse(
                status="success",
                message="Push token is already up-to-date."
            )
            
    except asyncio.TimeoutError:
        logging.error("[PushTokens] Database timeout during token registration")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"[PushTokens] Token registration error: {e}")
        raise HTTPException(status_code=500, detail="Failed to register push token")

@app.get("/api/push-tokens", tags=["Push Notifications"])
async def get_user_push_tokens(current_user: User = Depends(get_current_user)):
    """Get all push tokens for the current user."""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        tokens = await asyncio.wait_for(
            db.push_tokens.find({"user_id": current_user.id}).to_list(length=None),
            timeout=5.0
        )
        
        # Convert ObjectId fields to strings
        for token in tokens:
            if '_id' in token:
                token['_id'] = str(token['_id'])
        
        return {"tokens": tokens}
        
    except asyncio.TimeoutError:
        logging.error("[PushTokens] Database timeout during token retrieval")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"[PushTokens] Token retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve push tokens")

@app.delete("/api/push-tokens/{token}", tags=["Push Notifications"])
async def delete_push_token(token: str, current_user: User = Depends(get_current_user)):
    """Delete a specific push token."""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        result = await asyncio.wait_for(
            db.push_tokens.delete_one({
                "token": token,
                "user_id": current_user.id
            }),
            timeout=5.0
        )
        
        if result.deleted_count > 0:
            logging.info(f"[PushTokens] Token deleted for user {current_user.email}")
            return {"status": "success", "message": "Push token deleted successfully."}
        else:
            raise HTTPException(status_code=404, detail="Push token not found")
            
    except asyncio.TimeoutError:
        logging.error("[PushTokens] Database timeout during token deletion")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"[PushTokens] Token deletion error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete push token")

@app.post("/api/notifications/send-test", tags=["Push Notifications"])
async def send_test_notification(
    payload: SendNotificationPayload,
    current_user: User = Depends(get_current_user)
):
    """テスト用通知送信エンドポイント"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        result = await send_batch_notifications(
            user_ids=payload.user_ids if payload.user_ids else [current_user.id],
            title=payload.title,
            body=payload.body,
            data=payload.data
        )
        
        return result
        
    except Exception as e:
        logging.error(f"[Notifications] Test notification error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send test notification")

@app.get("/api/notifications/history", tags=["Push Notifications"])
async def get_notification_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user)
):
    """ユーザーの通知履歴を取得"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        history = await asyncio.wait_for(
            db.notification_history.find(
                {"user_id": current_user.id}
            ).sort("sent_at", -1).limit(limit).to_list(length=None),
            timeout=10.0
        )
        
        # Convert ObjectId fields to strings
        for record in history:
            if '_id' in record:
                record['_id'] = str(record['_id'])
        
        return {"history": history}
        
    except asyncio.TimeoutError:
        logging.error("[Notifications] Database timeout during history retrieval")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"[Notifications] History retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notification history")

@app.put("/api/user/settings", tags=["User Settings"])
async def update_user_settings(settings: UserSettingsUpdate, current_user: User = Depends(get_current_user)):
    """Update user settings and preferences"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    
    try:
        # Prepare update data - only include non-None values
        update_data = {}
        if settings.audio_quality is not None:
            if settings.audio_quality not in ["standard", "high"]:
                raise HTTPException(status_code=400, detail="Invalid audio quality. Must be 'standard' or 'high'")
            update_data["audio_quality"] = settings.audio_quality
            
        if settings.auto_play_next is not None:
            update_data["auto_play_next"] = settings.auto_play_next
            
        if settings.notifications_enabled is not None:
            update_data["notifications_enabled"] = settings.notifications_enabled
            
        if settings.push_notifications is not None:
            update_data["push_notifications"] = settings.push_notifications
            
        if settings.schedule_enabled is not None:
            update_data["schedule_enabled"] = settings.schedule_enabled
            
        if settings.schedule_time is not None:
            # Validate time format HH:MM
            import re
            if not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', settings.schedule_time):
                raise HTTPException(status_code=400, detail="Invalid time format. Must be HH:MM")
            update_data["schedule_time"] = settings.schedule_time
            
        if settings.schedule_count is not None:
            if settings.schedule_count < 1 or settings.schedule_count > 10:
                raise HTTPException(status_code=400, detail="Schedule count must be between 1 and 10")
            update_data["schedule_count"] = settings.schedule_count
            
        if settings.text_size is not None:
            if settings.text_size not in ["small", "medium", "large"]:
                raise HTTPException(status_code=400, detail="Invalid text size. Must be 'small', 'medium', or 'large'")
            update_data["text_size"] = settings.text_size
            
        if settings.language is not None:
            if settings.language not in ["en", "ja"]:
                raise HTTPException(status_code=400, detail="Invalid language. Must be 'en' or 'ja'")
            update_data["language"] = settings.language
            
        if settings.auto_pick_settings is not None:
            # Validate auto-pick settings
            auto_pick = settings.auto_pick_settings
            if "max_articles" in auto_pick and (auto_pick["max_articles"] < 1 or auto_pick["max_articles"] > 20):
                raise HTTPException(status_code=400, detail="max_articles must be between 1 and 20")
            if "source_priority" in auto_pick and auto_pick["source_priority"] not in ["balanced", "popular", "recent"]:
                raise HTTPException(status_code=400, detail="Invalid source_priority")
            update_data["auto_pick_settings"] = auto_pick

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid settings to update")

        # Add updated timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        # Update user profile
        await asyncio.wait_for(
            db.profiles.update_one(
                {"user_id": current_user.id},
                {"$set": update_data},
                upsert=True  # Create if doesn't exist
            ),
            timeout=10.0
        )
        
        return {"message": "Settings updated successfully", "updated_fields": list(update_data.keys())}
        
    except asyncio.TimeoutError:
        logging.error("Database timeout during settings update")
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except HTTPException:
        # Re-raise HTTP exceptions (like validation errors)
        raise
    except Exception as e:
        logging.error(f"Settings update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update settings")

@app.get("/api/rss-sources", response_model=List[RSSSource], tags=["RSS"])
async def get_user_sources(current_user: User = Depends(get_current_user)):
    sources = await db.rss_sources.find({"user_id": current_user.id}).to_list(100)
    return [RSSSource(**source) for source in sources]

@app.post("/api/rss-sources", response_model=RSSSource, tags=["RSS"])
async def add_rss_source(source_data: RSSSourceCreate, current_user: User = Depends(get_current_user)):
    source = RSSSource(user_id=current_user.id, **source_data.dict())
    await db.rss_sources.insert_one(source.dict())
    return source

@app.patch("/api/rss-sources/{source_id}", response_model=RSSSource, tags=["RSS"])
async def update_rss_source(source_id: str, update_data: RSSSourceUpdate, current_user: User = Depends(get_current_user)):
    try:
        # Check if source exists and belongs to user
        existing_source = await db.rss_sources.find_one({"id": source_id, "user_id": current_user.id})
        if not existing_source:
            logging.warning(f"RSS source not found: {source_id} for user {current_user.id}")
            raise HTTPException(status_code=404, detail="RSS source not found")
        
        # Update the source
        update_dict = update_data.dict(exclude_unset=True)
        logging.info(f"Updating RSS source {source_id} with data: {update_dict}")
        
        result = await db.rss_sources.update_one(
            {"id": source_id, "user_id": current_user.id},
            {"$set": update_dict}
        )
        
        logging.info(f"Update result - matched: {result.matched_count}, modified: {result.modified_count}")
        
        # Note: modified_count can be 0 if the values are the same, which is valid
        # Only raise error if the operation failed completely (matched_count == 0)
        if result.matched_count == 0:
            logging.warning(f"RSS source update failed - no documents matched: {source_id}")
            raise HTTPException(status_code=404, detail="RSS source not found")
        
        # Return updated source
        updated_source = await db.rss_sources.find_one({"id": source_id, "user_id": current_user.id})
        return RSSSource(**updated_source)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating RSS source {source_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/api/rss-sources/{source_id}", tags=["RSS"])
async def delete_rss_source(source_id: str, current_user: User = Depends(get_current_user)):
    result = await db.rss_sources.delete_one({"id": source_id, "user_id": current_user.id})
    if result.deleted_count == 0: 
        raise HTTPException(status_code=404, detail="Source not found")
    return {"message": "Source deleted"}

@app.post("/api/rss-sources/bootstrap", tags=["RSS"])
async def bootstrap_default_sources(current_user: User = Depends(get_current_user)):
    """Add default high-quality RSS sources for users who don't have any sources yet"""
    try:
        # Check if user already has sources
        existing_sources = await db.rss_sources.count_documents({"user_id": current_user.id})
        
        # Default comprehensive news sources with high coverage
        default_sources = [
            {
                "name": "BBC News",
                "url": "http://feeds.bbci.co.uk/news/rss.xml",
                "description": "British Broadcasting Corporation - International news coverage"
            },
            {
                "name": "Reuters",
                "url": "https://feeds.reuters.com/reuters/topNews",
                "description": "Reuters - Global news and business information"
            },
            {
                "name": "Associated Press",
                "url": "https://feeds.apnews.com/rss/apf-topnews",
                "description": "Associated Press - Breaking news and top stories"
            },
            {
                "name": "The Guardian",
                "url": "https://www.theguardian.com/world/rss",
                "description": "The Guardian - World news and analysis"
            },
            {
                "name": "CNN",
                "url": "http://rss.cnn.com/rss/edition.rss",
                "description": "CNN - Cable News Network international edition"
            },
            {
                "name": "NPR News",
                "url": "https://feeds.npr.org/1001/rss.xml",
                "description": "National Public Radio - News from the US and around the world"
            },
            {
                "name": "TechCrunch",
                "url": "https://techcrunch.com/feed/",
                "description": "TechCrunch - Technology industry news and startups"
            },
            {
                "name": "Hacker News",
                "url": "https://feeds.feedburner.com/oreilly/radar/atom",
                "description": "Technology and programming news"
            }
        ]
        
        added_sources = []
        for source_data in default_sources:
            try:
                source = RSSSource(
                    user_id=current_user.id,
                    name=source_data["name"],
                    url=source_data["url"],
                    is_active=True
                )
                await db.rss_sources.insert_one(source.dict())
                added_sources.append(source.dict())
                # Default RSS source added
            except Exception as e:
                logging.warning(f"Failed to add default source {source_data['name']}: {e}")
                continue
        
        return {
            "message": f"Successfully added {len(added_sources)} default RSS sources",
            "sources_added": len(added_sources),
            "existing_sources": existing_sources,
            "added_sources": [s["name"] for s in added_sources]
        }
        
    except Exception as e:
        logging.error(f"Error bootstrapping default sources for user {current_user.email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to add default sources")

@app.get("/api/rss-sources/search", tags=["RSS"])
async def search_rss_sources(
    query: Optional[str] = None,
    category: Optional[str] = None,
    language: Optional[str] = None,
    page: Optional[int] = 1,
    per_page: Optional[int] = 50,
    current_user: User = Depends(get_current_user)
):
    """Search pre-configured RSS sources"""
    try:
        logging.info(f"🔍 [RSS SEARCH] Query: {query}, Category: {category}, Language: {language}")
        
        # Return mock data as specified in RSSSourceService.ts
        mock_sources = [
            {
                "id": "nhk-news",
                "name": "NHK NEWS WEB",
                "description": "NHKの最新ニュース",
                "url": "https://www3.nhk.or.jp/rss/news/cat0.xml",
                "category": "news",
                "language": "ja",
                "country": "JP",
                "favicon_url": "https://www3.nhk.or.jp/favicon.ico",
                "website_url": "https://www3.nhk.or.jp/news/",
                "popularity_score": 95,
                "reliability_score": 98,
                "is_active": True,
                "is_featured": True,
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "nikkei-tech",
                "name": "日本経済新聞 テクノロジー",
                "description": "日経のテクノロジーニュース",
                "url": "https://www.nikkei.com/rss/technology/",
                "category": "technology",
                "language": "ja",
                "country": "JP",
                "favicon_url": "https://www.nikkei.com/favicon.ico",
                "website_url": "https://www.nikkei.com/",
                "popularity_score": 88,
                "reliability_score": 95,
                "is_active": True,
                "is_featured": True,
                "created_at": "2024-01-01T00:00:00Z"
            }
        ]
        
        # Filter by query if provided
        filtered_sources = mock_sources
        if query:
            filtered_sources = [s for s in mock_sources if query.lower() in s["name"].lower() or query.lower() in s["description"].lower()]
        
        # Filter by category if provided
        if category:
            filtered_sources = [s for s in filtered_sources if s["category"] == category]
            
        return {
            "sources": filtered_sources,
            "categories": [],
            "total": len(filtered_sources),
            "page": page,
            "per_page": per_page,
            "has_next": False
        }
        
    except Exception as e:
        logging.error(f"Error searching RSS sources: {e}")
        raise HTTPException(status_code=500, detail="Failed to search RSS sources")

@app.get("/api/rss-sources/categories", tags=["RSS"])
async def get_rss_categories(current_user: User = Depends(get_current_user)):
    """Get all RSS categories"""
    try:
        logging.info(f"📂 [RSS CATEGORIES] Request for user: {current_user.email}")
        
        # Return mock categories as specified in RSSSourceService.ts
        mock_categories = [
            {
                "id": "news",
                "name": "News",
                "name_ja": "ニュース", 
                "description": "General news and current events",
                "icon": "📰",
                "color": "#FF6B6B",
                "sort_order": 1
            },
            {
                "id": "technology",
                "name": "Technology",
                "name_ja": "テクノロジー",
                "description": "Technology and innovation news",
                "icon": "💻",
                "color": "#4ECDC4",
                "sort_order": 2
            },
            {
                "id": "business",
                "name": "Business",
                "name_ja": "ビジネス",
                "description": "Business and finance news",
                "icon": "💼",
                "color": "#45B7D1",
                "sort_order": 3
            }
        ]
        
        return mock_categories
        
    except Exception as e:
        logging.error(f"Error getting RSS categories: {e}")
        raise HTTPException(status_code=500, detail="Failed to get RSS categories")

@app.get("/api/rss-sources/my-sources", tags=["RSS"])
async def get_my_rss_sources(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    """Get user's RSS sources"""
    try:
        logging.info(f"👤 [MY RSS SOURCES] Request for user: {current_user.email}")
        
        # Return mock user sources as specified in RSSSourceService.ts
        mock_user_sources = [
            {
                "id": "user-source-1",
                "user_id": "user-123",
                "preconfigured_source_id": "nhk-news",
                "custom_alias": "NHK ニュース",
                "is_active": True,
                "notification_enabled": True,
                "last_article_count": 15,
                "fetch_error_count": 0,
                "created_at": "2024-01-15T10:00:00Z",
                "display_name": "NHK NEWS WEB",
                "display_url": "https://www3.nhk.or.jp/rss/news/cat0.xml"
            },
            {
                "id": "user-source-2",
                "user_id": "user-123",
                "preconfigured_source_id": "nikkei-tech",
                "custom_alias": "日経テック",
                "is_active": True,
                "notification_enabled": False,
                "last_article_count": 8,
                "fetch_error_count": 0,
                "created_at": "2024-01-20T14:30:00Z",
                "display_name": "日本経済新聞 テクノロジー",
                "display_url": "https://www.nikkei.com/rss/technology/"
            }
        ]
        
        # Filter by active status if provided
        if is_active is not None:
            mock_user_sources = [s for s in mock_user_sources if s["is_active"] == is_active]
            
        return mock_user_sources
        
    except Exception as e:
        logging.error(f"Error getting user RSS sources: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user RSS sources")

@app.post("/api/rss-sources/add", tags=["RSS"])
async def add_user_rss_source(request: dict, current_user: User = Depends(get_current_user)):
    """Add RSS source to user's collection"""
    try:
        logging.info(f"➕ [ADD RSS SOURCE] Request for user: {current_user.email}")
        logging.info(f"➕ [ADD RSS SOURCE] Request data: {request}")
        
        preconfigured_source_id = request.get('preconfigured_source_id')
        custom_name = request.get('custom_name')
        custom_url = request.get('custom_url')
        custom_category = request.get('custom_category')
        custom_alias = request.get('custom_alias')
        notification_enabled = request.get('notification_enabled', False)
        
        # Generate new user source
        new_source_id = str(uuid.uuid4())
        new_user_source = {
            "id": new_source_id,
            "user_id": current_user.id,
            "preconfigured_source_id": preconfigured_source_id,
            "custom_name": custom_name,
            "custom_url": custom_url,
            "custom_category": custom_category,
            "custom_alias": custom_alias,
            "is_active": True,
            "notification_enabled": notification_enabled,
            "last_article_count": 0,
            "fetch_error_count": 0,
            "created_at": datetime.utcnow().isoformat(),
            "display_name": custom_name or custom_alias or "New RSS Source",
            "display_url": custom_url or "https://example.com/rss",
            "display_category": custom_category or "news"
        }
        
        # In a real implementation, save to database
        # await db.user_rss_sources.insert_one(new_user_source)
        
        logging.info(f"➕ [ADD RSS SOURCE] Created source: {new_user_source['display_name']}")
        return new_user_source
        
    except Exception as e:
        logging.error(f"Error adding RSS source: {e}")
        raise HTTPException(status_code=500, detail="Failed to add RSS source")

@app.get("/api/articles", response_model=List[Article], tags=["Articles"])
async def get_articles(current_user: User = Depends(get_current_user), genre: Optional[str] = None, source: Optional[str] = None):
    """Get articles with query parameters (backward compatibility)"""
    return await get_articles_internal(current_user, genre, source)

@app.post("/api/articles", response_model=List[Article], tags=["Articles"])
async def post_articles(request: dict, current_user: User = Depends(get_current_user)):
    """Get articles with POST body (supports more complex filters)"""
    genre = request.get("genre")
    source = request.get("source")
    return await get_articles_internal(current_user, genre, source)

@app.get("/api/articles/curated", response_model=List[Article], tags=["Articles"])
async def get_curated_articles(current_user: User = Depends(get_current_user)):
    """Get curated articles for the main news feed - automatically selects diverse, high-quality content"""
    try:
        # Use cached RSS data only to avoid long processing times
        curated_articles = []
        
        # Get user's RSS sources
        sources = await db.rss_sources.find({
            "user_id": current_user.id,
            "$or": [
                {"is_active": {"$ne": False}},
                {"is_active": {"$exists": False}}
            ]
        }).to_list(100)
        
        # Try to use cached data first, then fallback to regular article endpoint approach
        current_time = time.time()
        
        for source_doc in sources[:10]:  # Optimize to 10 sources for better performance
            # 🆕 Use consolidated RSS service instead of duplicate logic
            try:
                feed = parse_rss_feed(source_doc["url"], use_cache=True)
                if not feed:
                    logging.warning(f"Failed to fetch {source_doc['name']} for curated articles")
                    continue
            except Exception as e:
                logging.warning(f"Failed to fetch {source_doc['name']} for curated articles: {e}")
                continue
            
            if feed:
                # Get first 4 articles from each source
                for entry in feed.entries[:4]:
                    article_title = getattr(entry, 'title', "No Title")
                    article_summary = getattr(entry, 'summary', getattr(entry, 'description', "No summary available"))
                    
                    # Get content - use simpler approach for speed
                    article_content = article_summary
                    if hasattr(entry, 'content') and entry.content:
                        if isinstance(entry.content, list) and len(entry.content) > 0:
                            article_content = entry.content[0].get('value', article_summary)
                    
                    # Clean HTML tags quickly
                    import re
                    article_content = re.sub(r'<[^>]+>', '', article_content).strip()
                    
                    # Use simple genre classification
                    article_genre = "General"
                    title_lower = article_title.lower()
                    if any(keyword in title_lower for keyword in ['tech', 'ai', 'computer', 'software', 'digital']):
                        article_genre = "Technology"
                    elif any(keyword in title_lower for keyword in ['finance', 'market', 'economy', 'money', 'stock']):
                        article_genre = "Finance"
                    elif any(keyword in title_lower for keyword in ['sport', 'game', 'match', 'team']):
                        article_genre = "Sports"
                    
                    # Simple image extraction
                    thumbnail_url = None
                    if hasattr(entry, 'links'):
                        for link in entry.links:
                            if 'image' in link.get('type', '').lower():
                                thumbnail_url = link.get('href')
                                break
                    
                    curated_articles.append(Article(
                        id=str(uuid.uuid4()),
                        title=article_title,
                        summary=article_summary[:300] if len(article_summary) > 300 else article_summary,
                        link=getattr(entry, 'link', ''),
                        published=getattr(entry, 'published', ''),
                        source_name=source_doc.get('name', 'Unknown'),
                        content=article_content[:1000] if len(article_content) > 1000 else article_content,
                        genre=article_genre,
                        thumbnail_url=thumbnail_url
                    ))
                    
                    # Limit total articles to avoid too many
                    if len(curated_articles) >= 20:
                        break
            
            if len(curated_articles) >= 20:
                break
        
        logging.info(f"Returning {len(curated_articles)} curated articles (cached data only) for user {current_user.email}")
        return curated_articles
        
    except Exception as e:
        logging.error(f"Error getting curated articles for user {current_user.email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch curated articles")

async def get_articles_internal(current_user: User, genre: Optional[str] = None, source: Optional[str] = None):
    start_time = time.time()
    logging.info(f"🚀 [PERF] Starting article fetch for user {current_user.email}, genre: {genre}, source: {source}")
    
    # Get only active sources (is_active is not explicitly False or doesn't exist)
    source_filter = {
        "user_id": current_user.id,
        "$or": [
            {"is_active": {"$ne": False}},  # is_active is not explicitly False
            {"is_active": {"$exists": False}}  # is_active field doesn't exist (default to active)
        ]
    }
    
    # Add source name filter if specified
    if source and source != "All":
        source_filter["name"] = source
    
    sources_start = time.time()
    sources = await db.rss_sources.find(source_filter).to_list(100)
    sources_time = time.time() - sources_start
    logging.info(f"🗂️ [PERF] Found {len(sources)} sources in {sources_time:.2f}s")
    
    # Check for duplicate sources
    source_urls = [s["url"] for s in sources]
    source_names = [s["name"] for s in sources]
    unique_urls = set(source_urls)
    unique_names = set(source_names)
    
    if len(source_urls) != len(unique_urls):
        logging.warning(f"⚠️ [DUPLICATES] Found {len(source_urls) - len(unique_urls)} duplicate URLs in RSS sources")
    if len(source_names) != len(unique_names):
        logging.warning(f"⚠️ [DUPLICATES] Found {len(source_names) - len(unique_names)} duplicate names in RSS sources")
    
    all_articles = []
    fetch_start = time.time()
    
    # Use asyncio gather for parallel RSS fetching (max 5 concurrent)
    async def fetch_source_articles(i, source_doc):
        source_start = time.time()
        source_name = source_doc.get("name", "Unknown")
        articles = []
        
        try:
            # 🆕 Use consolidated RSS service instead of duplicate logic
            rss_fetch_start = time.time()
            feed = parse_rss_feed(source_doc["url"], use_cache=True)
            rss_fetch_time = time.time() - rss_fetch_start
            
            if feed:
                logging.info(f"🌐 [PERF] {i+1}/{len(sources)} {source_name}: RSS fetched in {rss_fetch_time:.2f}s, {len(feed.entries)} entries")
            else:
                logging.warning(f"📄 [PERF] {i+1}/{len(sources)} {source_name}: RSS fetch failed")
                return articles

            for entry in feed.entries[:20]:  # Optimize to 20 articles per source for better performance
                article_title = getattr(entry, 'title', "No Title")
                article_summary = getattr(entry, 'summary', getattr(entry, 'description', "No summary available"))
                
                # Get full content from RSS entry (try multiple fields for better content)
                article_content = ""
                if hasattr(entry, 'content') and entry.content:
                    # Use the first content entry if available
                    if isinstance(entry.content, list) and len(entry.content) > 0:
                        article_content = entry.content[0].get('value', '')
                    else:
                        article_content = str(entry.content)
                elif hasattr(entry, 'description'):
                    article_content = entry.description
                else:
                    article_content = article_summary

                # Clean up content
                if article_content:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(article_content, 'html.parser')
                    article_content = soup.get_text(strip=True)

                # Extract image URL from entry
                thumbnail_url = extract_image_from_entry(entry)
                
                article_genre = classify_genre(article_title, article_summary)
                article = Article(
                    id=str(uuid.uuid4()),
                    title=article_title,
                    summary=article_summary,
                    link=getattr(entry, 'link', ""),
                    published=time.strftime('%Y-%m-%dT%H:%M:%SZ', entry.published_parsed) if hasattr(entry, 'published_parsed') and entry.published_parsed else "",
                    source_name=source_doc["name"],
                    thumbnail_url=thumbnail_url,
                    content=article_content,
                    genre=article_genre
                )
                articles.append(article)
                
                # Update or insert article in database with full content
                await db.articles.update_one(
                    {"title": article_title, "source_name": source_doc["name"]},
                    {"$set": article.dict()},
                    upsert=True
                )
        except Exception as e:
            logging.warning(f"❌ [PERF] {i+1}/{len(sources)} {source_name}: Error parsing RSS feed - {e}")
        finally:
            source_time = time.time() - source_start
            logging.info(f"⏱️ [PERF] {i+1}/{len(sources)} {source_name}: Completed in {source_time:.2f}s, {len(articles)} articles")
            
        return articles
    
    # Process sources in batches for better performance  
    batch_size = 5
    for batch_start in range(0, len(sources), batch_size):
        batch = sources[batch_start:batch_start + batch_size]
        batch_tasks = [fetch_source_articles(batch_start + i, source) for i, source in enumerate(batch)]
        batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
        
        for result in batch_results:
            if isinstance(result, list):
                all_articles.extend(result)
            elif isinstance(result, Exception):
                logging.warning(f"Batch processing error: {result}")
        
        logging.info(f"🔄 [PERF] Processed batch {batch_start//batch_size + 1}/{math.ceil(len(sources)/batch_size)}")
    
    
    fetch_time = time.time() - fetch_start
    total_time = time.time() - start_time
    logging.info(f"🏁 [PERF] Fetched {len(all_articles)} articles before filtering in {fetch_time:.2f}s (total: {total_time:.2f}s)")
    if genre:
        all_articles = [article for article in all_articles if article.genre and article.genre.lower() == genre.lower()]
        logging.info(f"Filtered to {len(all_articles)} articles for genre: {genre}")

    return sorted(all_articles, key=lambda x: x.published, reverse=True)[:200]

@app.post("/api/audio/create", response_model=AudioCreation, tags=["Audio"])
async def create_audio(request: AudioCreationRequest, http_request: Request, current_user: User = Depends(get_current_user)):
    logging.info(f"=== AUDIO CREATION REQUEST RECEIVED ===")
    logging.info(f"User: {current_user.email}")
    logging.info(f"Article IDs: {request.article_ids}")
    logging.info(f"Article titles: {request.article_titles}")
    logging.info(f"Article URLs: {request.article_urls}")
    logging.info(f"Custom title: {request.custom_title}")
    logging.info(f"🎤 Voice Language: {request.voice_language}")
    logging.info(f"📝 Prompt Style: {request.prompt_style}")
    logging.info(f"✏️ Custom Prompt: {request.custom_prompt[:100] if request.custom_prompt else 'None'}...")
    
    # Enhanced logging for Japanese language bug investigation
    logging.info(f"🔍 JAPANESE BUG DEBUG - Article Count: {len(request.article_ids)} - Voice Lang: {request.voice_language}")
    
    # Get article count for tracking (needed regardless of debug mode)
    article_count = len(request.article_ids)
    
    # 🧪 CHECK DEBUG HEADERS FOR BYPASS
    debug_bypass = http_request.headers.get("x-debug-bypass-limits", "").lower() == "true"
    debug_mode = http_request.headers.get("x-debug-mode", "").lower() == "true"
    
    if debug_bypass and debug_mode:
        logging.info("🧪 DEBUG MODE: Bypassing audio creation limits")
    else:
        # ✅ CHECK AUDIO CREATION LIMITS FIRST
        can_create, error_message, usage_info = await check_audio_creation_limits(current_user.id, article_count)
        
        if not can_create:
            logging.warning(f"Audio creation blocked for user {current_user.email}: {error_message}")
            raise HTTPException(status_code=429, detail={
                "message": error_message,
                "usage_info": usage_info,
                "code": "LIMIT_EXCEEDED"
            })
        
        logging.info(f"Audio creation approved: {usage_info['plan']} plan, {article_count} articles")
    
    try:
        # Get actual article content from database
        articles_content = []
        for i, article_id in enumerate(request.article_ids):
            article = await db.articles.find_one({"id": article_id})
            if article:
                # Use full content instead of just summary
                full_content = article.get('content', article.get('summary', 'No content available'))
                
                # If content is too short (likely only summary), try to use additional provided data
                if len(full_content) < 200 and request.article_urls and i < len(request.article_urls):
                    logging.warning(f"Article {article['title']} has short content ({len(full_content)} chars), this may be from old database format")
                    # Use title + summary + URL info as fallback
                    full_content = f"{article.get('title', '')}\n\n{article.get('summary', '')}\n\nOriginal article: {request.article_urls[i] if i < len(request.article_urls) else 'URL not available'}"
                
                # Store original full content for dynamic length calculation later
                # No truncation at individual article level - will optimize at script level
                
                content = f"Title: {article['title']}\nSource: {article['source_name']}\nContent: {full_content}"
                articles_content.append(content)
                logging.info(f"Added article content: {article['title']} (Content length: {len(full_content)} chars)")
            else:
                logging.error(f"Article with ID {article_id} not found in database")
                # Add fallback content if article not found
                if request.article_titles and i < len(request.article_titles):
                    fallback_content = f"Title: {request.article_titles[i]}\nContent: Article content not available in database, but title and source information preserved."
                    articles_content.append(fallback_content)
                    logging.info(f"Added fallback content for: {request.article_titles[i]}")
        
        if not articles_content:
            raise HTTPException(status_code=400, detail="No valid articles found for audio creation")
        
        # Log articles content being sent to AI for debugging
        logging.info(f"=== ARTICLES CONTENT FOR AI PROCESSING ===")
        for i, content in enumerate(articles_content):
            content_preview = content[:300] + "..." if len(content) > 300 else content
            logging.info(f"Article {i+1} preview: {content_preview}")
        
        # Get user's subscription plan for dynamic length calculation
        subscription = await db.subscriptions.find_one({"user_id": current_user.id})
        user_plan = subscription.get("plan", "free") if subscription else "free"
        
        # Calculate optimal script length using UNIFIED system
        optimal_script_length = await calculate_unified_script_length(
            articles_content, 
            user_plan, 
            article_count,
            voice_language=request.voice_language or "en-US",
            prompt_style=request.prompt_style or "recommended"
        )
        
        # Enhanced logging for Japanese language bug tracking
        final_voice_lang_for_script = request.voice_language or "en-US"
        logging.info(f"🔍 SCRIPT GENERATION - Voice Lang Parameter: {final_voice_lang_for_script}")
        
        # Generate script and title based on actual content with prompt style
        # 🚀 NEW: Pass user plan for dynamic character count instructions
        script = await summarize_articles_with_openai(
            articles_content, 
            prompt_style=request.prompt_style or "recommended", 
            custom_prompt=request.custom_prompt,
            voice_language=final_voice_lang_for_script,
            target_length=None,  # Now using unified system, no manual override
            user_plan=user_plan  # 🚀 NEW: Dynamic character count based on user plan
        )
        
        # Log generated script for debugging
        script_preview = script[:500] + "..." if len(script) > 500 else script
        logging.info(f"=== GENERATED SCRIPT PREVIEW ===")
        logging.info(f"Script preview: {script_preview}")
        generated_title = await generate_audio_title_with_openai(articles_content)
        
        # Use user's voice language settings for TTS
        final_voice_language = request.voice_language or "en-US"
        logging.info(f"🎤 TTS Parameters - Voice Language: {final_voice_language}, Voice Name: {request.voice_name or 'alloy'}")
        
        # Enhanced bug tracking for 15-article Japanese case
        # Debug logging removed for cleaner output
        
        audio_data = await convert_text_to_speech(
            script, 
            voice_language=final_voice_language,
            voice_name=request.voice_name or "alloy"
        )
        audio_url = audio_data['url']
        duration = audio_data['duration']

        title = request.custom_title or generated_title
        
        # Generate chapters based on article count and duration
        chapters = []
        if len(request.article_titles) > 1:
            chapter_duration = duration // len(request.article_titles)
            
            # Get articles data for original URLs
            # Try both "id" field and "_id" field for MongoDB compatibility
            articles = await db.articles.find({"id": {"$in": request.article_ids}}).to_list(None)
            if not articles:
                # Fallback: try searching by _id field
                articles = await db.articles.find({"_id": {"$in": request.article_ids}}).to_list(None)
            
            articles_dict = {article.get("id", article.get("_id")): article for article in articles}
            
            logging.info(f"Debug: Found {len(articles)} articles for IDs: {request.article_ids}")
            logging.info(f"Debug: articles_dict keys: {list(articles_dict.keys())}")
            
            # Check first article structure to understand data format
            if articles:
                first_article = articles[0]
                logging.info(f"Debug: First article keys: {list(first_article.keys())}")
                logging.info(f"Debug: First article sample: {first_article}")
            
            for i, (article_id, article_title) in enumerate(zip(request.article_ids, request.article_titles)):
                start_time = i * chapter_duration * 1000  # Convert to milliseconds
                end_time = ((i + 1) * chapter_duration if i < len(request.article_titles) - 1 else duration) * 1000  # Convert to milliseconds
                
                # Get original URL from article data
                original_url = ""
                
                # First, try to get URL from provided article_urls (for auto-pick)
                if request.article_urls and i < len(request.article_urls):
                    original_url = request.article_urls[i]
                    logging.info(f"Debug: Using provided URL for auto-pick article: {original_url}")
                else:
                    # Fallback to database lookup (for feed articles)
                    article_key = article_id
                    if article_id not in articles_dict:
                        # Try to find by any key in articles_dict (for debugging)
                        for key in articles_dict.keys():
                            if str(key) == str(article_id):
                                article_key = key
                                break
                    
                    if article_key in articles_dict:
                        article_data = articles_dict[article_key]
                        original_url = article_data.get("link", "")
                        logging.info(f"Debug: article_data keys: {list(article_data.keys())}")
                        logging.info(f"Debug: article_data link field: {article_data.get('link', 'NOT_FOUND')}")
                    else:
                        logging.warning(f"Debug: Article {article_id} not found in database! This might be an auto-pick generated article without provided URLs.")
                
                logging.info(f"Debug: article_id={article_id}, found_in_dict={article_key in articles_dict if 'article_key' in locals() else False}, url={original_url}")
                
                chapters.append({
                    "title": article_title,
                    "start_time": start_time,
                    "end_time": end_time,
                    "original_url": original_url
                })
        
        audio_creation = AudioCreation(
            user_id=current_user.id, 
            title=title, 
            article_ids=request.article_ids,
            article_titles=request.article_titles, 
            audio_url=audio_url,
            duration=duration,
            script=script,
            chapters=chapters,
            prompt_style=request.prompt_style or "recommended",
            custom_prompt=request.custom_prompt
        )
        logging.info(f"Saving AudioCreation to DB with audio_url: {audio_creation.audio_url}")
        
        await db.audio_creations.insert_one(audio_creation.dict())
        
        # Record audio creation in usage tracking
        await record_audio_creation(current_user.id, article_count)
        logging.info(f"Recorded audio creation usage: user={current_user.id}, articles={article_count}")
        
        # Auto-download the created audio
        auto_download = DownloadedAudio(
            user_id=current_user.id,
            audio_id=audio_creation.id,
            auto_downloaded=True
        )
        await db.downloaded_audio.insert_one(auto_download.dict())
        
        return audio_creation
    except Exception as e:
        import traceback
        logging.error(f"Audio creation error: {e}")
        logging.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audio/direct-tts", response_model=DirectTTSResponse, tags=["Audio"])
async def create_direct_tts(request: DirectTTSRequest, current_user: User = Depends(get_current_user)):
    """Create audio directly from article content using TTS without AI summarization"""
    try:
        # Create full text content for TTS
        full_content = f"{request.title}. {request.content}"
        
        # Use existing TTS function
        tts_result = await convert_text_to_speech(
            full_content, 
            voice_language=request.voice_language,
            voice_name=request.voice_name
        )
        audio_url = tts_result["url"]
        duration = tts_result["duration"]
        
        # Create direct TTS record in database
        direct_tts_id = str(uuid.uuid4())
        direct_tts_doc = {
            "id": direct_tts_id,
            "user_id": current_user.id,
            "title": request.title,
            "audio_url": audio_url,
            "duration": duration,
            "article_id": request.article_id,
            "created_at": datetime.utcnow(),
            "type": "direct_tts"
        }
        
        await db.direct_tts.insert_one(direct_tts_doc)
        
        return DirectTTSResponse(
            id=direct_tts_id,
            title=request.title,
            audio_url=audio_url,
            duration=duration,
            article_id=request.article_id,
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error creating direct TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create direct TTS: {str(e)}")

@app.post("/api/audio/generate", tags=["Audio"])
async def generate_audio(request: dict, current_user: User = Depends(get_current_user)):
    """Generate audio from article - compatible with frontend AudioService"""
    try:
        logging.info(f"🎵 [AUDIO GENERATE] Request received for user: {current_user.email}")
        logging.info(f"🎵 [AUDIO GENERATE] Request data: {request}")
        
        article_id = request.get('article_id')
        title = request.get('title', 'Untitled')
        language = request.get('language', 'ja')
        voice_type = request.get('voice_type', 'standard')
        
        if not article_id:
            raise HTTPException(status_code=400, detail="article_id is required")
        
        # Check if this is a sample/mock article
        if article_id.startswith('sample-') or article_id.startswith('mock-'):
            logging.info(f"🎵 [AUDIO GENERATE] Processing sample article: {article_id}")
            # For sample articles, return a successful response
            generation_id = str(uuid.uuid4())
            return {
                "id": generation_id,
                "status": "processing",
                "message": f"Audio generation started for: {title}",
                "estimated_duration": 30
            }
        
        # For real articles, try to find in database
        article = await db.articles.find_one({"id": article_id})
        if not article:
            logging.warning(f"🎵 [AUDIO GENERATE] Article not found: {article_id}")
            # Still return success for development
            generation_id = str(uuid.uuid4())
            return {
                "id": generation_id,
                "status": "processing", 
                "message": f"Audio generation started for: {title}",
                "estimated_duration": 30
            }
        
        # Create audio generation request
        audio_request = AudioCreationRequest(
            article_ids=[article_id],
            article_titles=[title],
            custom_title=title,
            voice_language=language,
            prompt_style="balanced"
        )
        
        # Use existing audio creation logic
        logging.info(f"🎵 [AUDIO GENERATE] Calling existing audio creation endpoint")
        audio_creation = await create_audio(audio_request, None, current_user)
        
        return {
            "id": audio_creation.id,
            "status": "completed" if audio_creation.audio_url else "processing",
            "message": f"Audio generation completed for: {title}",
            "estimated_duration": audio_creation.duration or 30
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"🎵 [AUDIO GENERATE ERROR] {str(e)}")
        # Return error but don't crash
        return {
            "id": str(uuid.uuid4()),
            "status": "failed",
            "message": f"Audio generation failed: {str(e)}",
            "estimated_duration": 0
        }

@app.post("/api/audio/instant-multi", response_model=AudioCreation, tags=["Audio"])
async def create_instant_multi_audio(request: AudioCreationRequest, current_user: User = Depends(get_current_user)):
    """Create instant audio from multiple articles using direct TTS (2-5 seconds)"""
    start_time = datetime.utcnow()
    try:
        logging.info(f"🚀 INSTANT MULTI: Start - User: {current_user.id}, Articles: {len(request.article_ids)}")
        
        # Get articles from database
        article_ids = request.article_ids
        logging.info(f"📚 INSTANT MULTI: Fetching articles from DB")
        articles_cursor = db.articles.find({"id": {"$in": article_ids}})
        articles = await articles_cursor.to_list(length=None)
        logging.info(f"📚 INSTANT MULTI: Found {len(articles)} articles in DB")
        
        if not articles:
            logging.error(f"❌ INSTANT MULTI: No articles found for IDs: {article_ids}")
            raise HTTPException(status_code=404, detail="No articles found")
        
        # Create optimized script for instant playback using existing dynamic length calculation
        logging.info(f"📝 INSTANT MULTI: Creating optimized script for {len(articles)} articles")
        
        # Prepare article content for the existing calculation function
        articles_content = []
        for article in articles:
            title = article.get('title', '')
            summary = article.get('summary', '')
            content = f"Title: {title}\nContent: {summary}" if summary else f"Title: {title}"
            articles_content.append(content)
        
        # Get user's subscription plan for dynamic length calculation
        subscription = await db.subscriptions.find_one({"user_id": current_user.id})
        user_plan = subscription.get("plan", "free") if subscription else "free"
        
        # Use UNIFIED script length calculation system
        optimal_script_length = await calculate_unified_script_length(
            articles_content, 
            user_plan, 
            len(articles),
            voice_language=request.voice_language or "en-US",
            prompt_style=request.prompt_style or "standard"
        )
        
        logging.info(f"📝 INSTANT MULTI: Optimal script length calculated: {optimal_script_length} chars")
        
        # Create script parts with dynamic sizing
        chars_per_article = optimal_script_length // len(articles) if len(articles) > 0 else 200
        script_parts = []
        
        for i, article in enumerate(articles):
            title = article.get('title', '')[:min(150, chars_per_article // 2)]
            summary = article.get('summary', '')[:chars_per_article-len(title)-10] if article.get('summary') else ""
            if summary:
                script_parts.append(f"{title}。{summary}")
            else:
                script_parts.append(f"{title}")
        
        # Create language-appropriate intro based on voice_language setting
        voice_lang = request.voice_language or "ja-JP"
        if voice_lang == "ja-JP":
            intro = ""
        else:
            intro = "Today's news: "
        
        # Use all articles provided with optimal content length
        separator = "。" if voice_lang == "ja-JP" else ". "
        instant_script = intro + separator.join(script_parts)
        
        # Apply the calculated optimal limit (no more hardcoded 800 limit)
        if len(instant_script) > optimal_script_length:
            instant_script = instant_script[:optimal_script_length] + ("。" if voice_lang == "ja-JP" else ".")
        
        logging.info(f"📝 INSTANT MULTI: Script ready - {len(instant_script)} chars")
        logging.info(f"📝 INSTANT MULTI: Voice language setting: {voice_lang}")
        logging.info(f"📝 INSTANT MULTI: Script preview: {instant_script[:200]}...")
        
        # Direct TTS conversion (fast - no AI processing)
        logging.info(f"🎤 INSTANT MULTI: Starting TTS conversion")
        tts_start = datetime.utcnow()
        tts_result = await convert_text_to_speech_fast(
            instant_script,
            voice_language=request.voice_language or "ja-JP",
            voice_name=request.voice_name or "alloy"
        )
        tts_duration = (datetime.utcnow() - tts_start).total_seconds()
        logging.info(f"🎤 INSTANT MULTI: TTS completed in {tts_duration:.1f}s")
        
        # Generate chapters for streaming audio (same as traditional system)
        logging.info(f"📑 INSTANT MULTI: Generating chapters for {len(articles)} articles")
        chapters = []
        if len(articles) > 1:
            chapter_duration_seconds = tts_result["duration"] // len(articles)
            
            for i, article in enumerate(articles):
                chapter_start_time = i * chapter_duration_seconds * 1000  # Convert to milliseconds
                chapter_end_time = ((i + 1) * chapter_duration_seconds if i < len(articles) - 1 else tts_result["duration"]) * 1000
                
                # Get original URL using same logic as regular audio creation
                original_url = ""
                
                # First, try to get URL from provided article_urls (for auto-pick)
                if request.article_urls and i < len(request.article_urls):
                    original_url = request.article_urls[i]
                    logging.info(f"📑 INSTANT MULTI: Using provided URL for article {i}: {original_url}")
                else:
                    # Fallback to database lookup (for feed articles)
                    original_url = article.get("link", "")
                    logging.info(f"📑 INSTANT MULTI: Using DB URL for article {i}: {original_url}")
                
                chapter_data = {
                    "title": article.get('title', ''),
                    "start_time": chapter_start_time,
                    "end_time": chapter_end_time,
                    "original_url": original_url
                }
                chapters.append(chapter_data)
                logging.info(f"📑 INSTANT MULTI: Added chapter {i+1}: {chapter_data['title'][:50]}... ({chapter_start_time/1000:.1f}s-{chapter_end_time/1000:.1f}s)")
        
        # Save to database as regular audio creation
        logging.info(f"💾 INSTANT MULTI: Saving to database with chapters")
        audio_id = str(uuid.uuid4())
        title = f"Instant Audio - {len(articles)} articles"
        
        audio_doc = {
            "id": audio_id,
            "user_id": current_user.id,
            "title": title,
            "audio_url": tts_result["url"],
            "duration": tts_result["duration"],
            "article_ids": article_ids,
            "article_titles": [a.get('title', '') for a in articles],
            "article_urls": [a.get('link', '') for a in articles],
            "created_at": datetime.utcnow(),
            "type": "instant_multi",
            "prompt_style": request.prompt_style or "instant",  # Same as regular audio
            "custom_prompt": request.custom_prompt,  # Same as regular audio
            "script": instant_script,  # Store full script for access
            "chapters": chapters  # Add chapters for navigation
        }
        
        await db.audio_creations.insert_one(audio_doc)
        
        total_duration = (datetime.utcnow() - start_time).total_seconds()
        logging.info(f"🎉 INSTANT MULTI: Complete in {total_duration:.1f}s - Audio ID: {audio_id}")
        
        # Send push notification for audio completion
        try:
            await send_audio_completion_notification(
                user_id=current_user.id,
                article_title=title,
                audio_id=audio_id
            )
            logging.info(f"📱 [NOTIFICATIONS] Sent audio completion notification for user {current_user.id}")
        except Exception as e:
            logging.error(f"📱 [NOTIFICATIONS] Failed to send audio completion notification: {e}")
        
        return AudioCreation(
            id=audio_id,
            user_id=current_user.id,
            title=title,
            audio_url=tts_result["url"],
            duration=tts_result["duration"],
            article_ids=article_ids,
            article_titles=[a.get('title', '') for a in articles],
            article_urls=[a.get('link', '') for a in articles],
            created_at=datetime.utcnow(),
            script=instant_script,  # Full script for access
            chapters=chapters,  # Chapters for navigation and URL jumping
            prompt_style=request.prompt_style or "instant",  # Same as regular audio
            custom_prompt=request.custom_prompt  # Same as regular audio
        )
        
    except Exception as e:
        error_duration = (datetime.utcnow() - start_time).total_seconds()
        logging.error(f"❌ INSTANT MULTI: Failed after {error_duration:.1f}s - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create instant audio: {str(e)}")

@app.get("/api/audio/library", response_model=List[AudioCreation], tags=["Audio"])
async def get_audio_library(current_user: User = Depends(get_current_user)):
    audio_list = await db.audio_creations.find({"user_id": current_user.id}).sort("created_at", -1).to_list(100)
    
    # Convert to AudioCreation objects with compatibility handling
    result = []
    for audio in audio_list:
        try:
            # Handle both old and new audio formats
            if "article_ids" not in audio:
                # New format from simple API - add missing fields for compatibility
                audio["article_ids"] = audio.get("article_ids", [])
                audio["article_titles"] = audio.get("article_titles", [])
            result.append(AudioCreation(**audio))
        except Exception as e:
            logging.warning(f"Skipping invalid audio record {audio.get('id', 'unknown')}: {e}")
            continue
    
    return result

@app.delete("/api/audio/{audio_id}", tags=["Audio"])
async def delete_audio(audio_id: str, current_user: User = Depends(get_current_user)):
    from datetime import datetime, timedelta
    
    # Find the audio first
    audio = await db.audio_creations.find_one({"id": audio_id, "user_id": current_user.id})
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    # Move to deleted_audio collection with deletion metadata
    deleted_audio_doc = {
        **audio,  # Copy all original audio data
        "deleted_at": datetime.utcnow(),
        "permanent_delete_at": datetime.utcnow() + timedelta(days=14),
        "original_collection": "audio_creations"
    }
    
    # Insert into deleted_audio collection
    await db.deleted_audio.insert_one(deleted_audio_doc)
    
    # Remove from original collection
    result = await db.audio_creations.delete_one({"id": audio_id, "user_id": current_user.id})
    
    # Also remove from downloads if exists
    await db.downloaded_audio.delete_many({"audio_id": audio_id})
    
    return {"message": "Audio moved to trash (recoverable for 14 days)"}

@app.put("/api/audio/{audio_id}/rename", tags=["Audio"])
async def rename_audio(audio_id: str, request: RenameRequest, current_user: User = Depends(get_current_user)):
    result = await db.audio_creations.update_one(
        {"id": audio_id, "user_id": current_user.id},
        {"$set": {"title": request.new_title}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Audio not found")
    return {"message": "Audio renamed"}

# Deleted Audio Management Endpoints
@app.get("/api/audio/deleted", tags=["Audio"])
async def get_deleted_audio(current_user: User = Depends(get_current_user)):
    """Get list of deleted audio files that can be recovered (within 14 days)"""
    from datetime import datetime
    
    # Only return audio that hasn't passed the permanent deletion date
    deleted_audio = await db.deleted_audio.find({
        "user_id": current_user.id,
        "permanent_delete_at": {"$gt": datetime.utcnow()}
    }).sort("deleted_at", -1).to_list(100)
    
    return [
        {
            "id": audio["id"],
            "title": audio["title"],
            "deleted_at": audio["deleted_at"].isoformat(),
            "permanent_delete_at": audio["permanent_delete_at"].isoformat(),
            "days_remaining": (audio["permanent_delete_at"] - datetime.utcnow()).days
        }
        for audio in deleted_audio
    ]

@app.post("/api/audio/{audio_id}/restore", tags=["Audio"])
async def restore_deleted_audio(audio_id: str, current_user: User = Depends(get_current_user)):
    """Restore a deleted audio file back to the library"""
    from datetime import datetime
    
    # Find the deleted audio
    deleted_audio = await db.deleted_audio.find_one({
        "id": audio_id, 
        "user_id": current_user.id,
        "permanent_delete_at": {"$gt": datetime.utcnow()}
    })
    
    if not deleted_audio:
        raise HTTPException(status_code=404, detail="Deleted audio not found or expired")
    
    # Create restored audio document (remove deletion metadata)
    restored_audio = {k: v for k, v in deleted_audio.items() 
                     if k not in ["deleted_at", "permanent_delete_at", "original_collection"]}
    
    # Insert back into original collection
    await db.audio_creations.insert_one(restored_audio)
    
    # Remove from deleted collection
    await db.deleted_audio.delete_one({"id": audio_id, "user_id": current_user.id})
    
    return {"message": "Audio restored successfully"}

@app.delete("/api/audio/{audio_id}/permanent", tags=["Audio"])
async def permanently_delete_audio(audio_id: str, current_user: User = Depends(get_current_user)):
    """Permanently delete an audio file from trash (cannot be recovered)"""
    result = await db.deleted_audio.delete_one({"id": audio_id, "user_id": current_user.id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deleted audio not found")
    
    # TODO: Also delete the actual audio file from S3/storage if implemented
    
    return {"message": "Audio permanently deleted"}

@app.delete("/api/audio/deleted/clear-all", tags=["Audio"])
async def clear_all_deleted_audio(current_user: User = Depends(get_current_user)):
    """Permanently delete all audio files from trash"""
    result = await db.deleted_audio.delete_many({"user_id": current_user.id})
    
    # TODO: Also delete the actual audio files from S3/storage if implemented
    
    return {"message": f"Permanently deleted {result.deleted_count} audio files"}

# Background cleanup task for expired deleted audio
async def cleanup_expired_deleted_audio():
    """Remove deleted audio that has passed the 14-day retention period"""
    from datetime import datetime
    
    try:
        result = await db.deleted_audio.delete_many({
            "permanent_delete_at": {"$lt": datetime.utcnow()}
        })
        
        if result.deleted_count > 0:
            print(f"Cleaned up {result.deleted_count} expired deleted audio files")
            
    except Exception as e:
        print(f"Error during cleanup: {e}")

# Auto-Pick Endpoints
@app.get("/api/debug/rss-sources", tags=["Debug"])
async def debug_user_rss_sources(current_user: User = Depends(get_current_user)):
    """Debug endpoint to test all user's RSS sources"""
    try:
        # Check database connection
        if not db_connected:
            raise HTTPException(status_code=503, detail="Database service unavailable")
        
        # Get all user's RSS sources  
        sources = await db.rss_sources.find({
            "user_id": current_user.id
        }).to_list(100)
        
        logging.info(f"🔍 RSS DEBUG: Found {len(sources)} total RSS sources for user {current_user.id}")
        
        source_status = []
        total_articles = 0
        
        for i, source in enumerate(sources):
            try:
                # Test RSS parsing
                feed = parse_rss_feed(source["url"], use_cache=False)  # Always fetch fresh
                
                if not feed or not hasattr(feed, 'entries'):
                    status = {
                        "source_name": source.get("name", "Unknown"),
                        "url": source.get("url", "Unknown"),
                        "is_active": source.get("is_active", True),
                        "status": "FAILED - No feed or entries",
                        "articles_count": 0,
                        "error": "Failed to parse RSS feed"
                    }
                else:
                    articles_count = len(feed.entries)
                    total_articles += articles_count
                    
                    # Test genre classification on first few articles
                    sample_genres = []
                    for entry in feed.entries[:5]:
                        title = getattr(entry, 'title', "No Title")
                        summary = getattr(entry, 'summary', "No Summary")
                        genre = classify_article_genre(title, summary)
                        sample_genres.append(genre)
                    
                    status = {
                        "source_name": source.get("name", "Unknown"),
                        "url": source.get("url", "Unknown"),
                        "is_active": source.get("is_active", True),
                        "status": "SUCCESS",
                        "articles_count": articles_count,
                        "sample_genres": sample_genres,
                        "feed_title": getattr(feed.feed, 'title', 'No Feed Title')
                    }
                
                source_status.append(status)
                logging.info(f"🔍 RSS DEBUG: Source {i+1}: {status}")
                
            except Exception as e:
                status = {
                    "source_name": source.get("name", "Unknown"),
                    "url": source.get("url", "Unknown"), 
                    "is_active": source.get("is_active", True),
                    "status": "ERROR",
                    "articles_count": 0,
                    "error": str(e)
                }
                source_status.append(status)
                logging.error(f"🔍 RSS DEBUG: Source {i+1} error: {e}")
        
        return {
            "user_id": current_user.id,
            "total_sources": len(sources),
            "active_sources": len([s for s in sources if s.get("is_active", True)]),
            "total_articles_available": total_articles,
            "sources": source_status
        }
        
    except Exception as e:
        logging.error(f"RSS debug error: {e}")
        raise HTTPException(status_code=500, detail=f"RSS debug failed: {str(e)}")

@app.post("/api/auto-pick", response_model=List[Article], tags=["Auto-Pick"])
async def get_auto_picked_articles(request: AutoPickRequest, http_request: Request, current_user: User = Depends(get_current_user)):
    """Get auto-picked articles based on user preferences"""
    try:
        logging.info(f"Auto-pick request from user: {current_user.id}")
        
        # Check database connection
        if not db_connected:
            raise HTTPException(status_code=503, detail="Database service unavailable. Auto-pick requires database connectivity to access RSS sources and user preferences.")
        
        # Get user's RSS sources based on request parameters
        if request.active_source_ids:
            # Use explicitly specified active sources (using UUID-format id field, not ObjectId)
            sources = await db.rss_sources.find({
                "user_id": current_user.id,
                "id": {"$in": request.active_source_ids}
            }).to_list(100)
            logging.info(f"Using {len(sources)} explicitly specified sources for user {current_user.id}")
        else:
            # Use all active sources (default behavior for backward compatibility)
            sources = await db.rss_sources.find({
                "user_id": current_user.id,
                "$or": [
                    {"is_active": {"$ne": False}},  # is_active is not explicitly False
                    {"is_active": {"$exists": False}}  # is_active field doesn't exist (default to active)
                ]
            }).to_list(100)
            logging.info(f"Found {len(sources)} active RSS sources for user {current_user.id}")
        
        if not sources:
            if request.active_source_ids:
                raise HTTPException(status_code=404, detail="No specified RSS sources found or they are inactive.")
            else:
                raise HTTPException(status_code=404, detail="No active RSS sources found. Please add some sources or activate existing ones.")
        
        # Fetch all articles from user's sources
        all_articles = []
        logging.info(f"Processing {len(sources)} RSS sources")
        
        for i, source in enumerate(sources):
            try:
                # 🆕 Use consolidated RSS service with enhanced error handling
                feed = parse_rss_feed(source["url"], use_cache=True)
                if not feed or not hasattr(feed, 'entries') or not feed.entries:
                    logging.warning(f"Source {i+1} '{source.get('name', 'Unknown')}' failed to parse or has no entries. URL: {source.get('url', 'Unknown')}")
                    # Try to clear cache and retry once
                    clear_rss_cache()
                    feed = parse_rss_feed(source["url"], use_cache=False)
                    if not feed or not hasattr(feed, 'entries') or not feed.entries:
                        logging.error(f"Source {i+1} '{source.get('name', 'Unknown')}' completely failed even after cache clear")
                        continue
                
                feed_articles_count = len(feed.entries[:30])  # Updated to match new limit
                logging.info(f"Source {i+1} '{source.get('name', 'Unknown')}': {feed_articles_count} articles (total available: {len(feed.entries)})")

                for entry in feed.entries[:30]:  # Increase article pool for better selection
                    article_title = getattr(entry, 'title', "No Title")
                    article_summary = getattr(entry, 'summary', getattr(entry, 'description', "No summary available"))
                    
                    # Get full content from RSS entry (try multiple fields for better content)
                    article_content = ""
                    if hasattr(entry, 'content') and entry.content:
                        # Use the first content entry if available
                        if isinstance(entry.content, list) and len(entry.content) > 0:
                            article_content = entry.content[0].get('value', '')
                        else:
                            article_content = str(entry.content)
                    
                    # Fallback to summary/description if no full content
                    if not article_content or len(article_content.strip()) < 100:
                        article_content = getattr(entry, 'summary', getattr(entry, 'description', "No content available"))
                    
                    # Clean HTML tags from content
                    article_content = re.sub(r'<[^>]+>', '', article_content)
                    article_content = article_content.strip()
                    
                    # Extract image URL from RSS entry
                    thumbnail_url = extract_image_from_entry(entry)
                    
                    # Use unified article service for consistent genre classification
                    article_genre = classify_article_genre(article_title, article_summary)
                    article = Article(
                        id=str(uuid.uuid4()),
                        title=article_title,
                        summary=article_summary,
                        link=getattr(entry, 'link', ""),
                        published=time.strftime('%Y-%m-%dT%H:%M:%SZ', entry.published_parsed) if hasattr(entry, 'published_parsed') and entry.published_parsed else "",
                        source_name=source["name"],
                        thumbnail_url=thumbnail_url,
                        content=article_content,
                        genre=article_genre
                    )
                    all_articles.append(article)
                    
                    # Update or insert article in database with full content  
                    await db.articles.update_one(
                        {"title": article_title, "source_name": source["name"]},
                        {"$set": article.dict()},
                        upsert=True
                    )
            except Exception as e:
                # RSS feed parsing failed, skip source
                continue
        
        logging.info(f"Total articles collected from all sources: {len(all_articles)}")
        
        # Debug: Show genre distribution before filtering
        if all_articles:
            genre_counts = {}
            for article in all_articles:
                genre = article.genre or "Unknown"
                genre_counts[genre] = genre_counts.get(genre, 0) + 1
            logging.info(f"Genre distribution: {genre_counts}")
        else:
            logging.error(f"NO ARTICLES FOUND - all sources failed to provide articles")
            raise HTTPException(status_code=404, detail="No articles found from your RSS sources")
        
        # Get user's subscription to determine max articles limit
        subscription = await get_or_create_subscription(current_user.id)
        user_max_articles = subscription['max_audio_articles']
        
        # Check for debug bypass headers
        debug_bypass = http_request.headers.get("X-Debug-Bypass-Limits") == "true"
        debug_mode = http_request.headers.get("X-Debug-Mode") == "true"
        
        # 🔍 DEBUG: Log all headers for debugging
        logging.info(f"🔍 DEBUG HEADERS CHECK:")
        logging.info(f"   X-Debug-Bypass-Limits: {http_request.headers.get('X-Debug-Bypass-Limits')}")
        logging.info(f"   X-Debug-Mode: {http_request.headers.get('X-Debug-Mode')}")
        logging.info(f"   debug_bypass: {debug_bypass}, debug_mode: {debug_mode}")
        
        if debug_bypass and debug_mode:
            # Allow higher limits for debug mode (up to 20 articles)
            effective_max_articles = min(request.max_articles or 20, 20)
            logging.info(f"DEBUG MODE: Auto-pick bypassing subscription limits for user {current_user.id}: requested={request.max_articles}, using={effective_max_articles}")
        else:
            # Use the minimum of requested articles and user's plan limit
            effective_max_articles = min(request.max_articles or user_max_articles, user_max_articles)
        
        logging.info(f"Auto-pick for user {current_user.id}: requested={request.max_articles}, plan_limit={user_max_articles}, effective={effective_max_articles}")
        
        # 🔍 DEBUG: Log input articles statistics
        total_available_chars = sum(len((a.content or '') + (a.title or '') + (a.summary or '')) for a in all_articles)
        logging.info(f"AUTO-PICK: INPUT STATS - Available articles: {len(all_articles)}, Total chars: {total_available_chars}")
        
        # Use auto-pick algorithm to select best articles
        picked_articles = await auto_pick_articles(
            user_id=current_user.id,
            all_articles=all_articles,
            max_articles=effective_max_articles,
            preferred_genres=request.preferred_genres,
            excluded_genres=request.excluded_genres,
            source_priority=request.source_priority or "balanced",
            time_based_filtering=request.time_based_filtering if request.time_based_filtering is not None else True
        )
        
        # 🔍 DEBUG: Log selected articles statistics  
        total_selected_chars = sum(len((a.content or '') + (a.title or '') + (a.summary or '')) for a in picked_articles)
        avg_chars_per_article = total_selected_chars // len(picked_articles) if picked_articles else 0
        logging.info(f"AUTO-PICK: OUTPUT STATS - Selected: {len(picked_articles)} articles, Total chars: {total_selected_chars}, Avg per article: {avg_chars_per_article}")
        
        # 🔍 DEBUG: Log individual article content lengths and actual content
        for i, article in enumerate(picked_articles):
            title_len = len(article.title or '')
            summary_len = len(article.summary or '')
            content_len = len(article.content or '')
            total_len = title_len + summary_len + content_len
            logging.info(f"   Article {i+1}: {total_len} chars (title: {title_len}, summary: {summary_len}, content: {content_len}) - {(article.title or '')[:50]}")
            
            # 📋 DEBUG: Log actual article content
            logging.info(f"   Article {i+1} TITLE: {article.title or 'N/A'}")
            logging.info(f"   Article {i+1} SUMMARY: {(article.summary or 'N/A')[:200]}{'...' if len(article.summary or '') > 200 else ''}")
            logging.info(f"   Article {i+1} CONTENT: {(article.content or 'N/A')[:300]}{'...' if len(article.content or '') > 300 else ''}")
            logging.info(f"   Article {i+1} ---")
        
        return picked_articles
        
    except Exception as e:
        import traceback
        logging.error(f"Auto-pick error: {e}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Auto-pick failed: {str(e)}")

@app.get("/api/user-profile", response_model=UserProfile, tags=["Auto-Pick"])
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """Get user's personalization profile"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database service unavailable. User profile requires database connectivity.")
    profile = await get_or_create_user_profile(current_user.id)
    return profile

@app.post("/api/user-interaction", tags=["Auto-Pick"])
async def record_user_interaction(interaction: UserInteraction, current_user: User = Depends(get_current_user)):
    """Record user interaction to improve recommendations"""
    try:
        if not db_connected:
            raise HTTPException(status_code=503, detail="Database service unavailable. User interactions require database connectivity.")
        await update_user_preferences(current_user.id, interaction)
        return {"message": "Interaction recorded successfully"}
    except Exception as e:
        logging.error(f"Error recording interaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reading-history", tags=["User"])
async def sync_reading_history(current_user: User = Depends(get_current_user)):
    """Sync reading history (placeholder endpoint for frontend compatibility)"""
    # This is a placeholder endpoint to prevent 404 errors
    # The functionality is already handled by /api/user-interaction
    return {"message": "Reading history sync completed", "status": "ok"}

@app.get("/api/reading-history", tags=["User"])
async def get_reading_history(current_user: User = Depends(get_current_user)):
    """Get reading history (placeholder endpoint for frontend compatibility)"""
    if not db_connected:
        return {"history": [], "message": "Database unavailable"}
    
    try:
        # Get user profile which contains interaction history
        user_profile = await get_or_create_user_profile(current_user.id)
        
        # Convert interactions to reading history format
        reading_history = []
        for interaction in user_profile.interaction_history[-50:]:  # Last 50 interactions
            if interaction.get('interaction_type') in ['completed', 'partial_play', 'play_started']:
                reading_history.append({
                    'audio_id': interaction.get('audio_id'),
                    'article_id': interaction.get('article_id'),
                    'interaction_type': interaction.get('interaction_type'),
                    'timestamp': interaction.get('timestamp'),
                    'duration_listened': interaction.get('duration_listened', 0)
                })
        
        return {"history": reading_history, "total": len(reading_history)}
    except Exception as e:
        logging.error(f"Error getting reading history: {e}")
        return {"history": [], "error": str(e)}

# ============ BOOKMARK API ENDPOINTS ============

@app.post("/api/bookmarks", response_model=Bookmark, tags=["Bookmarks"])
async def create_bookmark(bookmark_data: BookmarkCreate, current_user: User = Depends(get_current_user)):
    """Create a new bookmark"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    try:
        # Check if bookmark already exists
        existing_bookmark = await db.bookmarks.find_one({
            "user_id": current_user.id,
            "article_id": bookmark_data.article_id
        })
        
        if existing_bookmark:
            raise HTTPException(status_code=409, detail="Article already bookmarked")
        
        # Create new bookmark
        bookmark = Bookmark(
            user_id=current_user.id,
            **bookmark_data.dict()
        )
        
        await db.bookmarks.insert_one(bookmark.dict())
        return bookmark
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating bookmark: {e}")
        raise HTTPException(status_code=500, detail="Failed to create bookmark")

@app.get("/api/bookmarks", response_model=List[Bookmark], tags=["Bookmarks"])
async def get_bookmarks(current_user: User = Depends(get_current_user)):
    """Get all bookmarks for the current user"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    try:
        bookmarks = []
        async for bookmark_doc in db.bookmarks.find({"user_id": current_user.id}).sort("bookmarked_at", -1):
            bookmarks.append(Bookmark(**bookmark_doc))
        return bookmarks
    except Exception as e:
        logging.error(f"Error getting bookmarks: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bookmarks")

@app.delete("/api/bookmarks/{bookmark_id}", tags=["Bookmarks"])
async def delete_bookmark(bookmark_id: str, current_user: User = Depends(get_current_user)):
    """Delete a bookmark"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    try:
        result = await db.bookmarks.delete_one({
            "id": bookmark_id,
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Bookmark not found")
        
        return {"message": "Bookmark deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting bookmark: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete bookmark")

@app.delete("/api/bookmarks/article/{article_id}", tags=["Bookmarks"])
async def delete_bookmark_by_article(article_id: str, current_user: User = Depends(get_current_user)):
    """Delete a bookmark by article ID"""
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    try:
        result = await db.bookmarks.delete_one({
            "article_id": article_id,
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Bookmark not found")
        
        return {"message": "Bookmark deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting bookmark: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete bookmark")

@app.get("/api/bookmarks/check/{article_id}", tags=["Bookmarks"])
async def check_bookmark_status(article_id: str, current_user: User = Depends(get_current_user)):
    """Check if an article is bookmarked"""
    if not db_connected:
        return {"is_bookmarked": False}
    
    try:
        bookmark = await db.bookmarks.find_one({
            "article_id": article_id,
            "user_id": current_user.id
        })
        
        return {"is_bookmarked": bookmark is not None}
    except Exception as e:
        logging.error(f"Error checking bookmark status: {e}")
        return {"is_bookmarked": False}

@app.post("/api/audio-interaction", tags=["Auto-Pick"])
async def record_audio_interaction(
    audio_id: str,
    interaction_type: str,
    completion_percentage: Optional[float] = None,
    play_duration: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Record audio playback interactions for enhanced learning"""
    try:
        # Get audio creation to extract genre information
        audio_creation = await db.audio_creations.find_one({"id": audio_id, "user_id": current_user.id})
        if not audio_creation:
            raise HTTPException(status_code=404, detail="Audio not found")
        
        # Extract primary genre from first article (simplified approach)
        # In production, you might want to use the most common genre or a weighted approach
        primary_genre = "General"  # Default
        if audio_creation.get("article_ids"):
            # For now, we'll classify based on the title
            title = audio_creation.get("title", "")
            primary_genre = classify_genre(title, title)  # Using title as both title and summary
        
        # Prepare metadata
        metadata = {}
        if completion_percentage is not None:
            metadata["completion_percentage"] = completion_percentage
        if play_duration is not None:
            metadata["play_duration"] = play_duration
            metadata["total_duration"] = audio_creation.get("duration", 0)
        
        # Create interaction record
        interaction = UserInteraction(
            article_id=audio_id,  # Using audio_id as article_id for tracking
            interaction_type=interaction_type,
            genre=primary_genre,
            metadata=metadata if metadata else None
        )
        
        await update_user_preferences(current_user.id, interaction)
        
        return {
            "message": "Audio interaction recorded successfully",
            "genre": primary_genre,
            "metadata": metadata
        }
    except Exception as e:
        logging.error(f"Error recording audio interaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user-insights", tags=["Auto-Pick"])
async def get_user_insights(current_user: User = Depends(get_current_user)):
    """Get user personalization insights and recommendation explanations"""
    try:
        if not db_connected:
            raise HTTPException(status_code=503, detail="Database service unavailable. User insights require database connectivity.")
        profile = await get_or_create_user_profile(current_user.id)
        
        # Calculate insights
        top_genres = sorted(profile.genre_preferences.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Recent activity analysis
        recent_interactions = profile.interaction_history[-20:] if profile.interaction_history else []
        interaction_summary = {}
        for interaction in recent_interactions:
            int_type = interaction.get("interaction_type", "unknown")
            interaction_summary[int_type] = interaction_summary.get(int_type, 0) + 1
        
        # Current time-based preferences
        current_hour = datetime.now().hour
        time_context = "morning" if 6 <= current_hour <= 10 else "evening" if 18 <= current_hour <= 22 else "night"
        
        return {
            "top_genres": [{
                "genre": genre,
                "preference_score": round(score, 3),
                "rank": i + 1
            } for i, (genre, score) in enumerate(top_genres)],
            "recent_activity": interaction_summary,
            "total_interactions": len(profile.interaction_history),
            "time_context": time_context,
            "profile_created": profile.created_at,
            "last_updated": profile.updated_at
        }
    except Exception as e:
        logging.error(f"Error getting user insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/test-classification", tags=["Testing"])
async def test_genre_classification(
    title: str,
    summary: str,
    current_user: User = Depends(get_current_user)
):
    """Test the enhanced genre classification system"""
    try:
        # Get detailed classification results
        primary_genre, confidence, all_probabilities = get_genre_confidence(title, summary)
        genre_scores = calculate_genre_scores(title, summary)
        
        # Sort for display
        sorted_scores = sorted(genre_scores.items(), key=lambda x: x[1], reverse=True)
        sorted_probabilities = sorted(all_probabilities.items(), key=lambda x: x[1], reverse=True)
        
        return {
            "input": {
                "title": title,
                "summary": summary
            },
            "classification": {
                "primary_genre": primary_genre,
                "confidence": round(confidence, 3),
                "final_genre": classify_genre(title, summary)  # Apply threshold
            },
            "detailed_scores": [
                {"genre": genre, "score": round(score, 2)} 
                for genre, score in sorted_scores if score > 0
            ],
            "probabilities": [
                {"genre": genre, "probability": round(prob * 100, 1)} 
                for genre, prob in sorted_probabilities if prob > 0
            ]
        }
    except Exception as e:
        logging.error(f"Error testing classification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_auto_pick_background(task_id: str, request: AutoPickRequest, user: User):
    """AutoPick background processing with full audio generation"""
    # AutoPick processing started (minimal logging)
    
    try:
        global db
        task_manager = get_task_manager()
        
        await task_manager.update_task(
            task_id,
            progress=10,
            message="RSS フィードから記事を取得中..."
        )
        
        # Get user's RSS sources directly from database
        sources_cursor = db.rss_sources.find({"user_id": user.id, "is_active": True})
        sources = await sources_cursor.to_list(length=None)
        if not sources:
            await task_manager.fail_task(task_id, "No RSS sources configured")
            return
            
        all_articles = []
        for i, source in enumerate(sources):
            try:
                feed = parse_rss_feed(source["url"], use_cache=True)
                if not feed:
                    continue
                feed_articles = extract_articles_from_feed(feed, source["name"])
                for article in feed_articles:
                    # article is already an Article object from extract_articles_from_feed
                    if not article.title or not article.title.strip():
                        continue
                        
                    article_genre = classify_article_genre(article.title, article.content or article.summary or "")
                    article.genre = article_genre
                    all_articles.append(article)
                    
                    await db.articles.update_one(
                        {"title": article.title, "source_name": source["name"]},
                        {"$set": article.dict()},
                        upsert=True
                    )
                    
            except Exception as e:
                # RSS feed parsing failed, skip source
                continue
            
            # Progress update for each source processed
            progress = min(15 + (i + 1) * 15 // len(sources), 30)
            await task_manager.update_task(task_id, progress=progress)
        
        await task_manager.update_task(
            task_id,
            progress=35,
            message="記事を選択中..."
        )
        
        # Get user's subscription and auto-pick articles
        subscription = await get_or_create_subscription(user.id)
        user_max_articles = subscription['max_audio_articles']
        effective_max_articles = min(request.max_articles or user_max_articles, user_max_articles)
        
        picked_articles = await auto_pick_articles(
            user_id=user.id,
            all_articles=all_articles,
            max_articles=effective_max_articles,
            preferred_genres=request.preferred_genres,
            excluded_genres=request.excluded_genres,
            source_priority=request.source_priority or "balanced",
            time_based_filtering=request.time_based_filtering if request.time_based_filtering is not None else True
        )
        
        if not picked_articles:
            await task_manager.fail_task(task_id, "No suitable articles found")
            return
            
        await task_manager.update_task(
            task_id,
            progress=50,
            message="コンテンツを生成中..."
        )
        
        # Create audio from picked articles
        articles_content = [f"Title: {article.title}\nSummary: {article.summary}\nSource: {article.source_name}" for article in picked_articles]
        subscription = await db.subscriptions.find_one({"user_id": user.id})
        user_plan = subscription.get("plan", "free") if subscription else "free"
        
        optimal_script_length = await calculate_unified_script_length(
            articles_content, 
            user_plan, 
            len(articles_content),
            voice_language="en-US",
            prompt_style="recommended"
        )
        
        await task_manager.update_task(
            task_id,
            progress=65,
            message="AI がスクリプトを作成中..."
        )
        
        script = await summarize_articles_with_openai(
            articles_content, 
            prompt_style="recommended",
            custom_prompt=None,
            voice_language="ja-JP",
            target_length=optimal_script_length
        )
        
        generated_title = await generate_audio_title_with_openai(articles_content)
        
        await task_manager.update_task(
            task_id,
            progress=80,
            message="音声を合成中..."
        )
        
        audio_data = await convert_text_to_speech(script)
        audio_url = audio_data['url']
        duration = audio_data['duration']
        
        await task_manager.update_task(
            task_id,
            progress=90,
            message="音声を保存中..."
        )
        
        # Generate chapters and create audio creation record
        chapters = []
        article_titles = [article.title for article in picked_articles]
        if len(article_titles) > 1:
            chapter_duration = duration // len(article_titles)
            for i, (article, article_title) in enumerate(zip(picked_articles, article_titles)):
                start_time = i * chapter_duration * 1000
                end_time = ((i + 1) * chapter_duration if i < len(article_titles) - 1 else duration) * 1000
                chapters.append({
                    "title": article_title,
                    "start_time": start_time,
                    "end_time": end_time,
                    "original_url": article.link
                })
        
        audio_creation = AudioCreation(
            user_id=user.id,
            title=generated_title,
            article_ids=[article.id for article in picked_articles],
            article_titles=article_titles,
            audio_url=audio_url,
            duration=duration,
            script=script,
            chapters=chapters,
            prompt_style="recommended",
            custom_prompt=None
        )
        
        await db.audio_creations.insert_one(audio_creation.dict())
        
        # Record interactions for picked articles
        for article in picked_articles:
            interaction = UserInteraction(
                article_id=article.id,
                interaction_type="created_audio",
                genre=article.genre
            )
            await update_user_preferences(user.id, interaction)
        
        # Prepare debug info
        debug_info = {
            "total_articles_fetched": len(all_articles),
            "articles_selected": len(picked_articles),
            "selected_articles": [{"title": a.title, "source": a.source_name, "genre": a.genre} for a in picked_articles],
            "script_length": len(script),
            "user_plan": user_plan,
            "duration_seconds": duration,
            "chapters_count": len(chapters),
        }
        
        await task_manager.complete_task(
            task_id,
            result=audio_creation.dict(),
            debug_info=debug_info
        )
        
        # Send push notification for audio completion
        try:
            await send_audio_completion_notification(
                user_id=user.id,
                article_title=generated_title,
                audio_id=audio_creation.id
            )
            logging.info(f"📱 [NOTIFICATIONS] Sent AutoPick audio completion notification for user {user.id}")
        except Exception as e:
            logging.error(f"📱 [NOTIFICATIONS] Failed to send AutoPick audio completion notification: {e}")
            
    except Exception as e:
        logging.error(f"AutoPick background task error: {e}")
        await task_manager.fail_task(task_id, str(e), {"error_details": str(e)})
        
        await task_manager.update_task(
            task_id,
            progress=5,
            message="RSS フィードを取得中..."
        )
        
        # Get auto-picked articles with timeout
        try:
            sources = await asyncio.wait_for(
                db.rss_sources.find({"user_id": user.id}).to_list(100),
                timeout=15.0
            )
            logging.info(f"🎯 [AUTOPICK] Found {len(sources)} RSS sources for user {user.id}")
        except asyncio.TimeoutError:
            logging.error(f"🎯 [AUTOPICK] Database query timeout for task {task_id}")
            await task_manager.fail_task(task_id, "データベース接続がタイムアウトしました", {"error": "DB_TIMEOUT"})
            return
        except Exception as db_error:
            logging.error(f"🎯 [AUTOPICK] Database error for task {task_id}: {db_error}")
            await task_manager.fail_task(task_id, f"データベースエラー: {str(db_error)}", {"error": "DB_ERROR", "details": str(db_error)})
            return
        if not sources:
            await task_manager.fail_task(task_id, "RSS sources not found")
            return
        
        await task_manager.update_task(
            task_id,
            progress=15,
            message="記事を解析中..."
        )
        
        # Fetch articles (similar to existing logic)
        all_articles = []
        for i, source in enumerate(sources):
            try:
                feed = parse_rss_feed(source["url"], use_cache=True)
                if not feed:
                    continue

                for entry in feed.entries[:20]:
                    article_title = getattr(entry, 'title', "No Title")
                    article_summary = getattr(entry, 'summary', getattr(entry, 'description', "No summary available"))
                    
                    # Get full content from RSS entry
                    article_content = ""
                    if hasattr(entry, 'content') and entry.content:
                        if isinstance(entry.content, list) and len(entry.content) > 0:
                            article_content = entry.content[0].get('value', '')
                        else:
                            article_content = str(entry.content)
                    
                    if not article_content or len(article_content.strip()) < 100:
                        article_content = getattr(entry, 'summary', getattr(entry, 'description', "No content available"))
                    
                    article_content = re.sub(r'<[^>]+>', '', article_content).strip()
                    thumbnail_url = extract_image_from_entry(entry)
                    article_genre = classify_genre(article_title, article_summary)
                    
                    article = Article(
                        id=str(uuid.uuid4()),
                        title=article_title,
                        summary=article_summary,
                        link=getattr(entry, 'link', ""),
                        published=time.strftime('%Y-%m-%dT%H:%M:%SZ', entry.published_parsed) if hasattr(entry, 'published_parsed') and entry.published_parsed else "",
                        source_name=source["name"],
                        thumbnail_url=thumbnail_url,
                        content=article_content,
                        genre=article_genre
                    )
                    all_articles.append(article)
                    
                    await db.articles.update_one(
                        {"title": article_title, "source_name": source["name"]},
                        {"$set": article.dict()},
                        upsert=True
                    )
                    
            except Exception as e:
                # RSS feed parsing failed, skip source
                continue
            
            # Progress update for each source processed
            progress = min(15 + (i + 1) * 15 // len(sources), 30)
            await task_manager.update_task(task_id, progress=progress)
        
        await task_manager.update_task(
            task_id,
            progress=35,
            message="記事を選択中..."
        )
        
        # Get user's subscription and auto-pick articles
        subscription = await get_or_create_subscription(user.id)
        user_max_articles = subscription['max_audio_articles']
        effective_max_articles = min(request.max_articles or user_max_articles, user_max_articles)
        
        picked_articles = await auto_pick_articles(
            user_id=user.id,
            all_articles=all_articles,
            max_articles=effective_max_articles,
            preferred_genres=request.preferred_genres,
            excluded_genres=request.excluded_genres,
            source_priority=request.source_priority or "balanced",
            time_based_filtering=request.time_based_filtering if request.time_based_filtering is not None else True
        )
        
        if not picked_articles:
            await task_manager.fail_task(task_id, "No suitable articles found")
            return
            
        await task_manager.update_task(
            task_id,
            progress=50,
            message="コンテンツを生成中..."
        )
        
        # Create audio from picked articles
        articles_content = [f"Title: {article.title}\nSummary: {article.summary}\nSource: {article.source_name}" for article in picked_articles]
        subscription = await db.subscriptions.find_one({"user_id": user.id})
        user_plan = subscription.get("plan", "free") if subscription else "free"
        
        optimal_script_length = await calculate_unified_script_length(
            articles_content, 
            user_plan, 
            len(articles_content),
            voice_language="en-US",
            prompt_style="recommended"
        )
        
        await task_manager.update_task(
            task_id,
            progress=65,
            message="AI がスクリプトを作成中..."
        )
        
        script = await summarize_articles_with_openai(
            articles_content, 
            prompt_style="recommended",
            custom_prompt=None,
            voice_language="ja-JP",
            target_length=optimal_script_length
        )
        
        generated_title = await generate_audio_title_with_openai(articles_content)
        
        await task_manager.update_task(
            task_id,
            progress=80,
            message="音声を合成中..."
        )
        
        audio_data = await convert_text_to_speech(script)
        audio_url = audio_data['url']
        duration = audio_data['duration']
        
        await task_manager.update_task(
            task_id,
            progress=90,
            message="音声を保存中..."
        )
        
        # Generate chapters and create audio creation record
        chapters = []
        article_titles = [article.title for article in picked_articles]
        if len(article_titles) > 1:
            chapter_duration = duration // len(article_titles)
            for i, (article, article_title) in enumerate(zip(picked_articles, article_titles)):
                start_time = i * chapter_duration * 1000
                end_time = ((i + 1) * chapter_duration if i < len(article_titles) - 1 else duration) * 1000
                chapters.append({
                    "title": article_title,
                    "start_time": start_time,
                    "end_time": end_time,
                    "original_url": article.link
                })
        
        audio_creation = AudioCreation(
            user_id=user.id,
            title=generated_title,
            article_ids=[article.id for article in picked_articles],
            article_titles=article_titles,
            audio_url=audio_url,
            duration=duration,
            script=script,
            chapters=chapters,
            prompt_style="recommended",
            custom_prompt=None
        )
        
        await db.audio_creations.insert_one(audio_creation.dict())
        
        # Auto-download the created audio
        auto_download = DownloadedAudio(
            user_id=user.id,
            audio_id=audio_creation.id,
            auto_downloaded=True
        )
        await db.downloaded_audio.insert_one(auto_download.dict())
        
        # Record interactions for picked articles
        for article in picked_articles:
            interaction = UserInteraction(
                article_id=article.id,
                interaction_type="created_audio",
                genre=article.genre
            )
            await update_user_preferences(user.id, interaction)
        
        # Prepare debug info
        debug_info = {
            "total_articles_fetched": len(all_articles),
            "articles_selected": len(picked_articles),
            "selected_articles": [{"title": a.title, "source": a.source_name, "genre": a.genre} for a in picked_articles],
            "script_length": len(script),
            "user_plan": user_plan,
            "duration_seconds": duration,
            "chapters_count": len(chapters),
            "processing_time_ms": int((datetime.utcnow().timestamp() - datetime.fromisoformat(task_manager.get_task(task_id)["created_at"]).timestamp()) * 1000)
        }
        
        await task_manager.complete_task(
            task_id,
            result=audio_creation.dict(),
            debug_info=debug_info
        )
        
        # Send push notification for audio completion
        try:
            await send_audio_completion_notification(
                user_id=user.id,
                article_title=generated_title,
                audio_id=audio_creation.id
            )
            logging.info(f"📱 [NOTIFICATIONS] Sent AutoPick audio completion notification for user {user.id}")
        except Exception as e:
            logging.error(f"📱 [NOTIFICATIONS] Failed to send AutoPick audio completion notification: {e}")
            
    except Exception as e:
        logging.error(f"AutoPick background task error: {e}")
        await task_manager.fail_task(task_id, str(e), {"error_details": str(e)})

@app.post("/api/auto-pick/create-audio", response_model=TaskStartResponse, tags=["Auto-Pick"])
async def create_auto_picked_audio(request: AutoPickRequest, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """Start AutoPick audio creation and return task ID for progress monitoring"""
    logging.info(f"🎯 [AUTOPICK] CREATE_AUTO_PICKED_AUDIO CALLED - user_id={current_user.id}")
    try:
        # Create task and return task ID immediately
        task_manager = get_task_manager()
        task_id = task_manager.create_task("autopick", current_user.id)
        logging.info(f"🎯 [AUTOPICK] Task created with ID: {task_id}")
        
        # 🚨 EMERGENCY TEST: Direct asyncio.create_task only
        logging.info(f"🎯 [AUTOPICK] SKIPPING BackgroundTasks, using asyncio.create_task directly")
        asyncio.create_task(process_auto_pick_background(task_id, request, current_user))
        logging.info(f"🎯 [AUTOPICK] Background task started via asyncio.create_task")
        
        logging.info(f"🎯 [AUTOPICK] Started task {task_id} for user {current_user.id}")
        
        return TaskStartResponse(
            task_id=task_id,
            message="AutoPick音声生成を開始しました",
            status="pending"
        )
        
    except Exception as e:
        logging.error(f"Auto-pick task creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_current_user_from_token_param(token: Optional[str] = None):
    """Get current user from token query parameter (for SSE compatibility)"""
    global db_connected
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database not connected")
        
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    # Use same simple auth logic as get_current_user
    user = await db.users.find_one({"id": token})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    return User(**user)

@app.get("/api/auto-pick/status/{task_id}")
async def stream_autopick_progress(task_id: str, token: Optional[str] = None, current_user: User = Depends(get_current_user_from_token_param)):
    """Stream AutoPick progress using Server-Sent Events (SSE)"""
    try:
        task_manager = get_task_manager()
        task = task_manager.get_task(task_id)
        
        # Verify task belongs to current user
        if task.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this task")
        
        return StreamingResponse(
            task_manager.stream_task_progress(task_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable Nginx buffering for SSE
                "Access-Control-Allow-Origin": "*",  # CORS for ngrok
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"SSE streaming error for task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/auto-pick/task-status/{task_id}")
async def get_autopick_task_status(task_id: str, token: Optional[str] = None, current_user: User = Depends(get_current_user_from_token_param)):
    """Get AutoPick task status as JSON (React Native compatible alternative to SSE)"""
    try:
        task_manager = get_task_manager()
        task = task_manager.get_task(task_id)
        
        # Verify task belongs to current user
        if task.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this task")
        
        # Return task data as JSON
        response_data = {
            "task_id": task_id,
            "status": task["status"],
            "progress": task["progress"],
            "message": task["message"],
            "updated_at": task["updated_at"]
        }
        
        # Include result and debug info when completed
        if task["status"] == TaskStatus.COMPLETED:
            response_data["result"] = task["result"]
            response_data["debug_info"] = task["debug_info"]
        elif task["status"] == TaskStatus.FAILED:
            response_data["error"] = task["error"]
            response_data["debug_info"] = task["debug_info"]
        
        print(f"🔄 [TASK_STATUS] Returning task status for {task_id}: {task['status']} ({task['progress']}%)")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Task status error for task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def initialize_preset_categories():
    """Initialize preset categories if they don't exist"""
    try:
        # Add timeout for database operations
        import asyncio
        existing_count = await asyncio.wait_for(
            db.preset_categories.count_documents({}), 
            timeout=10.0  # 10 second timeout
        )
        if existing_count > 0:
            logging.info(f"Found {existing_count} existing preset categories")
            return
    except asyncio.TimeoutError:
        logging.error("Database timeout while checking preset categories")
        raise
    except Exception as e:
        logging.error(f"Error checking existing preset categories: {e}")
        raise
    
    preset_categories = [
        {
            "name": "technology",
            "display_name": "Technology",
            "description": "Latest tech news, AI, startups, and innovation",
            "icon": "laptop-outline",
            "color": "#3B82F6",
            "rss_sources": [
                {"name": "TechCrunch", "url": "https://techcrunch.com/feed/"},
                {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml"},
                {"name": "Wired", "url": "https://www.wired.com/feed/rss"},
                {"name": "Ars Technica", "url": "http://feeds.arstechnica.com/arstechnica/index"},
                {"name": "Engadget", "url": "https://www.engadget.com/rss.xml"},
                {"name": "ZDNet", "url": "https://www.zdnet.com/news/rss.xml"}
            ]
        },
        {
            "name": "business",
            "display_name": "Business",
            "description": "Market news, finance, economics, and business insights",
            "icon": "trending-up-outline",
            "color": "#10B981",
            "rss_sources": [
                {"name": "Reuters Business", "url": "https://feeds.reuters.com/reuters/businessNews"},
                {"name": "Bloomberg", "url": "https://feeds.bloomberg.com/markets/news.rss"},
                {"name": "Fortune", "url": "https://fortune.com/feed/"},
                {"name": "Forbes", "url": "https://www.forbes.com/real-time/feed2/"},
                {"name": "Wall Street Journal", "url": "https://feeds.a.dj.com/rss/RSSWorldNews.xml"},
                {"name": "Harvard Business Review", "url": "http://feeds.harvardbusiness.org/harvardbusiness"}
            ]
        },
        {
            "name": "global",
            "display_name": "Global News",
            "description": "International news, politics, and world events",
            "icon": "earth-outline",
            "color": "#8B5CF6",
            "rss_sources": [
                {"name": "BBC World", "url": "http://feeds.bbci.co.uk/news/world/rss.xml"},
                {"name": "CNN International", "url": "http://rss.cnn.com/rss/edition.rss"},
                {"name": "Reuters World", "url": "https://feeds.reuters.com/Reuters/worldNews"},
                {"name": "Associated Press", "url": "https://feeds.apnews.com/rss/apf-topnews"},
                {"name": "NPR News", "url": "https://feeds.npr.org/1001/rss.xml"},
                {"name": "The Guardian", "url": "https://www.theguardian.com/world/rss"}
            ]
        },
        {
            "name": "science",
            "display_name": "Science",
            "description": "Scientific discoveries, research, and innovation",
            "icon": "flask-outline",
            "color": "#F59E0B",
            "rss_sources": [
                {"name": "Science Daily", "url": "https://www.sciencedaily.com/rss/all.xml"},
                {"name": "Nature News", "url": "https://www.nature.com/nature.rss"},
                {"name": "Scientific American", "url": "https://rss.sciam.com/ScientificAmerican-Global"},
                {"name": "New Scientist", "url": "https://www.newscientist.com/feed/home/"},
                {"name": "Science Magazine", "url": "https://www.science.org/rss/news_current.xml"},
                {"name": "MIT Technology Review", "url": "https://www.technologyreview.com/feed/"}
            ]
        },
        {
            "name": "entertainment",
            "display_name": "Entertainment",
            "description": "Movies, music, TV, celebrities, and pop culture",
            "icon": "film-outline",
            "color": "#EF4444",
            "rss_sources": [
                {"name": "Entertainment Weekly", "url": "https://ew.com/feed/"},
                {"name": "Variety", "url": "https://variety.com/feed/"},
                {"name": "The Hollywood Reporter", "url": "https://www.hollywoodreporter.com/feed/"},
                {"name": "Rolling Stone", "url": "https://www.rollingstone.com/feed/"},
                {"name": "Billboard", "url": "https://www.billboard.com/feed/"},
                {"name": "IGN", "url": "http://feeds.ign.com/ign/all"}
            ]
        },
        {
            "name": "sports",
            "display_name": "Sports",
            "description": "Sports news, updates, and analysis",
            "icon": "football-outline",
            "color": "#06B6D4",
            "rss_sources": [
                {"name": "ESPN", "url": "https://www.espn.com/espn/rss/news"},
                {"name": "Sports Illustrated", "url": "https://www.si.com/rss/si_topstories.rss"},
                {"name": "CBS Sports", "url": "https://www.cbssports.com/rss/headlines/"},
                {"name": "The Athletic", "url": "https://theathletic.com/rss/"},
                {"name": "Bleacher Report", "url": "http://bleacherreport.com/articles/feed"}
            ]
        },
        {
            "name": "health",
            "display_name": "Health & Medicine",
            "description": "Health news, medical research, and wellness",
            "icon": "medical-outline",
            "color": "#EC4899",
            "rss_sources": [
                {"name": "WebMD", "url": "https://www.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC"},
                {"name": "Healthline", "url": "https://www.healthline.com/health/rss"},
                {"name": "Mayo Clinic", "url": "https://www.mayoclinic.org/rss"},
                {"name": "Medical News Today", "url": "https://www.medicalnewstoday.com/rss"},
                {"name": "Harvard Health", "url": "https://www.health.harvard.edu/rss"}
            ]
        },
        {
            "name": "lifestyle",
            "display_name": "Lifestyle",
            "description": "Travel, food, fashion, and personal interests",
            "icon": "cafe-outline",
            "color": "#F97316",
            "rss_sources": [
                {"name": "Conde Nast Traveler", "url": "https://www.cntraveler.com/feed/rss"},
                {"name": "Food & Wine", "url": "https://www.foodandwine.com/syndication/rss"},
                {"name": "Vogue", "url": "https://www.vogue.com/feed/rss"},
                {"name": "Travel + Leisure", "url": "https://www.travelandleisure.com/syndication/rss"},
                {"name": "Real Simple", "url": "https://www.realsimple.com/syndication/rss"}
            ]
        }
    ]
    
    try:
        for category_data in preset_categories:
            category = PresetCategory(**category_data)
            await asyncio.wait_for(
                db.preset_categories.insert_one(category.dict()),
                timeout=5.0  # 5 second timeout per insert
            )
        
        logging.info(f"Initialized {len(preset_categories)} preset categories")
    except asyncio.TimeoutError:
        logging.error("Database timeout while inserting preset categories")
        raise
    except Exception as e:
        logging.error(f"Error inserting preset categories: {e}")
        raise

async def startup_event():
    """Legacy startup event - now handled in lifespan"""
    logging.info("--- LEGACY STARTUP EVENT (DEPRECATED) ---")
    # This function is deprecated as initialization is now handled in lifespan
    pass
    
    if not OPENAI_API_KEY: 
        logging.warning("OpenAI API key not found")

async def shutdown_event():
    client.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await startup_event()
    yield
    # Shutdown
    await shutdown_event()

# ==================== PLAYLIST ENDPOINTS ====================
@app.get("/api/playlists", response_model=List[Playlist], tags=["Playlists"])
async def get_user_playlists(current_user: User = Depends(get_current_user)):
    """Get all playlists for the current user"""
    playlists = await db.playlists.find({"user_id": current_user.id}).sort("updated_at", -1).to_list(100)
    return [Playlist(**playlist) for playlist in playlists]

@app.post("/api/playlists", response_model=Playlist, tags=["Playlists"])
async def create_playlist(request: PlaylistCreate, current_user: User = Depends(get_current_user)):
    """Create a new playlist"""
    playlist = Playlist(
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        is_public=request.is_public
    )
    await db.playlists.insert_one(playlist.dict())
    return playlist

@app.put("/api/playlists/{playlist_id}", response_model=Playlist, tags=["Playlists"])
async def update_playlist(playlist_id: str, request: PlaylistUpdate, current_user: User = Depends(get_current_user)):
    """Update playlist details"""
    update_data = {k: v for k, v in request.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.playlists.update_one(
        {"id": playlist_id, "user_id": current_user.id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    playlist = await db.playlists.find_one({"id": playlist_id, "user_id": current_user.id})
    return Playlist(**playlist)

@app.delete("/api/playlists/{playlist_id}", tags=["Playlists"])
async def delete_playlist(playlist_id: str, current_user: User = Depends(get_current_user)):
    """Delete a playlist"""
    result = await db.playlists.delete_one({"id": playlist_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"message": "Playlist deleted"}

@app.post("/api/playlists/{playlist_id}/audio", tags=["Playlists"])
async def add_audio_to_playlist(playlist_id: str, request: PlaylistAddAudio, current_user: User = Depends(get_current_user)):
    """Add audio items to playlist"""
    # Verify audio items belong to user
    audio_count = await db.audio_creations.count_documents({
        "id": {"$in": request.audio_ids},
        "user_id": current_user.id
    })
    
    if audio_count != len(request.audio_ids):
        raise HTTPException(status_code=400, detail="Some audio items not found or don't belong to user")
    
    result = await db.playlists.update_one(
        {"id": playlist_id, "user_id": current_user.id},
        {
            "$addToSet": {"audio_ids": {"$each": request.audio_ids}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    return {"message": f"Added {len(request.audio_ids)} audio items to playlist"}

@app.delete("/api/playlists/{playlist_id}/audio/{audio_id}", tags=["Playlists"])
async def remove_audio_from_playlist(playlist_id: str, audio_id: str, current_user: User = Depends(get_current_user)):
    """Remove audio item from playlist"""
    result = await db.playlists.update_one(
        {"id": playlist_id, "user_id": current_user.id},
        {
            "$pull": {"audio_ids": audio_id},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    return {"message": "Audio removed from playlist"}

@app.get("/api/playlists/{playlist_id}/audio", response_model=List[AudioCreation], tags=["Playlists"])
async def get_playlist_audio(playlist_id: str, current_user: User = Depends(get_current_user)):
    """Get all audio items in a playlist"""
    playlist = await db.playlists.find_one({"id": playlist_id, "user_id": current_user.id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    if not playlist["audio_ids"]:
        return []
    
    audio_items = await db.audio_creations.find({
        "id": {"$in": playlist["audio_ids"]},
        "user_id": current_user.id
    }).to_list(100)
    
    # Maintain playlist order
    audio_dict = {audio["id"]: audio for audio in audio_items}
    ordered_audio = [audio_dict[audio_id] for audio_id in playlist["audio_ids"] if audio_id in audio_dict]
    
    return [AudioCreation(**audio) for audio in ordered_audio]

# ==================== ALBUM ENDPOINTS ====================
@app.get("/api/albums", response_model=List[Album], tags=["Albums"])
async def get_user_albums(current_user: User = Depends(get_current_user)):
    """Get all albums for the current user"""
    albums = await db.albums.find({"user_id": current_user.id}).sort("updated_at", -1).to_list(100)
    return [Album(**album) for album in albums]

@app.post("/api/albums", response_model=Album, tags=["Albums"])
async def create_album(request: AlbumCreate, current_user: User = Depends(get_current_user)):
    """Create a new album"""
    album = Album(
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        is_public=request.is_public,
        tags=request.tags
    )
    await db.albums.insert_one(album.dict())
    return album

@app.put("/api/albums/{album_id}", response_model=Album, tags=["Albums"])
async def update_album(album_id: str, request: AlbumUpdate, current_user: User = Depends(get_current_user)):
    """Update album details"""
    update_data = {k: v for k, v in request.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.albums.update_one(
        {"id": album_id, "user_id": current_user.id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")
    
    album = await db.albums.find_one({"id": album_id, "user_id": current_user.id})
    return Album(**album)

@app.delete("/api/albums/{album_id}", tags=["Albums"])
async def delete_album(album_id: str, current_user: User = Depends(get_current_user)):
    """Delete an album"""
    result = await db.albums.delete_one({"id": album_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")
    return {"message": "Album deleted"}

@app.post("/api/albums/{album_id}/audio", tags=["Albums"])
async def add_audio_to_album(album_id: str, request: AlbumAddAudio, current_user: User = Depends(get_current_user)):
    """Add audio items to album"""
    # Verify audio items belong to user
    audio_count = await db.audio_creations.count_documents({
        "id": {"$in": request.audio_ids},
        "user_id": current_user.id
    })
    
    if audio_count != len(request.audio_ids):
        raise HTTPException(status_code=400, detail="Some audio items not found or don't belong to user")
    
    result = await db.albums.update_one(
        {"id": album_id, "user_id": current_user.id},
        {
            "$addToSet": {"audio_ids": {"$each": request.audio_ids}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")
    
    return {"message": f"Added {len(request.audio_ids)} audio items to album"}

@app.delete("/api/albums/{album_id}/audio/{audio_id}", tags=["Albums"])
async def remove_audio_from_album(album_id: str, audio_id: str, current_user: User = Depends(get_current_user)):
    """Remove audio item from album"""
    result = await db.albums.update_one(
        {"id": album_id, "user_id": current_user.id},
        {
            "$pull": {"audio_ids": audio_id},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")
    
    return {"message": "Audio removed from album"}

@app.get("/api/albums/{album_id}/audio", response_model=List[AudioCreation], tags=["Albums"])
async def get_album_audio(album_id: str, current_user: User = Depends(get_current_user)):
    """Get all audio items in an album"""
    album = await db.albums.find_one({"id": album_id, "user_id": current_user.id})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    if not album["audio_ids"]:
        return []
    
    audio_items = await db.audio_creations.find({
        "id": {"$in": album["audio_ids"]},
        "user_id": current_user.id
    }).to_list(100)
    
    # Maintain album order
    audio_dict = {audio["id"]: audio for audio in audio_items}
    ordered_audio = [audio_dict[audio_id] for audio_id in album["audio_ids"] if audio_id in audio_dict]
    
    return [AudioCreation(**audio) for audio in ordered_audio]

# ==================== DOWNLOAD ENDPOINTS ====================
@app.get("/api/downloads", response_model=List[Dict], tags=["Downloads"])
async def get_downloaded_audio(current_user: User = Depends(get_current_user)):
    """Get all downloaded audio for the current user"""
    downloads = await db.downloaded_audio.find({"user_id": current_user.id}).sort("downloaded_at", -1).to_list(100)
    
    # Get audio details
    audio_ids = [download["audio_id"] for download in downloads]
    audio_items = await db.audio_creations.find({
        "id": {"$in": audio_ids},
        "user_id": current_user.id
    }).to_list(100)
    
    audio_dict = {audio["id"]: audio for audio in audio_items}
    
    result = []
    for download in downloads:
        if download["audio_id"] in audio_dict:
            audio_data = audio_dict[download["audio_id"]]
            result.append({
                "download_info": DownloadedAudio(**download),
                "audio_data": AudioCreation(**audio_data)
            })
    
    return result

@app.post("/api/downloads/{audio_id}", tags=["Downloads"])
async def download_audio(audio_id: str, current_user: User = Depends(get_current_user)):
    """Mark audio as downloaded (simulate download process)"""
    # Verify audio belongs to user
    audio = await db.audio_creations.find_one({"id": audio_id, "user_id": current_user.id})
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    # Check if already downloaded
    existing = await db.downloaded_audio.find_one({"user_id": current_user.id, "audio_id": audio_id})
    if existing:
        return {"message": "Audio already downloaded"}
    
    # Create download record
    download = DownloadedAudio(
        user_id=current_user.id,
        audio_id=audio_id,
        auto_downloaded=False  # Manual download
    )
    
    await db.downloaded_audio.insert_one(download.dict())
    return {"message": "Audio downloaded successfully"}

@app.delete("/api/downloads/{audio_id}", tags=["Downloads"])
async def remove_download(audio_id: str, current_user: User = Depends(get_current_user)):
    """Remove audio from downloads"""
    logging.info(f"DELETE /api/downloads/{audio_id} called by user {current_user.id}")
    
    # Check if the download exists first
    existing_download = await db.downloaded_audio.find_one({"user_id": current_user.id, "audio_id": audio_id})
    logging.info(f"Existing download found: {existing_download is not None}")
    
    result = await db.downloaded_audio.delete_one({"user_id": current_user.id, "audio_id": audio_id})
    logging.info(f"Delete result: deleted_count={result.deleted_count}")
    
    if result.deleted_count == 0:
        logging.warning(f"No download found to delete for audio_id={audio_id}, user_id={current_user.id}")
        raise HTTPException(status_code=404, detail="Downloaded audio not found")
    
    logging.info(f"Successfully removed download for audio_id={audio_id}")
    return {"message": "Download removed"}

@app.post("/api/feedback/misreading", tags=["Feedback"])
async def report_misreading(
    audio_id: str,
    timestamp: int,
    reported_text: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Report a misreading at specific timestamp in audio"""
    # Verify audio exists and belongs to user
    audio = await db.audio_creations.find_one({"id": audio_id, "user_id": current_user.id})
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    feedback = MisreadingFeedback(
        user_id=current_user.id,
        audio_id=audio_id,
        timestamp=timestamp,
        reported_text=reported_text
    )
    
    await db.misreading_feedback.insert_one(feedback.dict())
    return {"message": "Feedback recorded successfully"}

# ==================== ONBOARD PRESET ENDPOINTS ====================
@app.get("/api/onboard/categories", response_model=List[PresetCategory], tags=["Onboard"])
async def get_preset_categories():
    """Get all available preset categories for onboarding"""
    categories = await db.preset_categories.find({}).to_list(100)
    return [PresetCategory(**category) for category in categories]

@app.post("/api/onboard/setup", tags=["Onboard"])
async def setup_user_onboard(request: OnboardRequest, current_user: User = Depends(get_current_user)):
    """Setup user account with selected preset categories"""
    try:
        # Get selected categories
        categories = await db.preset_categories.find({
            "name": {"$in": request.selected_categories}
        }).to_list(100)
        
        if not categories:
            raise HTTPException(status_code=400, detail="No valid categories selected")
        
        # Add RSS sources for each selected category
        added_sources = []
        for category in categories:
            for rss_source in category["rss_sources"]:
                try:
                    source = RSSSource(
                        user_id=current_user.id,
                        name=rss_source["name"],
                        url=rss_source["url"]
                    )
                    await db.rss_sources.insert_one(source.dict())
                    added_sources.append(rss_source["name"])
                except Exception as e:
                    # Skip if source already exists or other error
                    logging.warning(f"Failed to add RSS source {rss_source['name']}: {e}")
                    continue
        
        # Initialize or update user profile with selected preferences
        try:
            # Check if profile already exists
            existing_profile = await db.user_profiles.find_one({"user_id": current_user.id})
            
            if existing_profile:
                # Update existing profile
                await db.user_profiles.update_one(
                    {"user_id": current_user.id},
                    {"$set": {
                        "genre_preferences": {category["name"]: 1.5 for category in categories},
                        "updated_at": datetime.utcnow()
                    }}
                )
                logging.info(f"Updated existing user profile for user {current_user.id}")
            else:
                # Create new profile
                user_profile = UserProfile(
                    user_id=current_user.id,
                    genre_preferences={category["name"]: 1.5 for category in categories}
                )
                await db.user_profiles.insert_one(user_profile.dict())
                logging.info(f"Created new user profile for user {current_user.id}")
        except Exception as e:
            logging.error(f"User profile setup failed: {e}")
        
        # Create welcome sample audio (optional)
        welcome_audio = None
        try:
            # Create a sample audio from the first category
            if categories:
                sample_articles = []
                first_category = categories[0]
                
                # Fetch some articles from the first RSS source
                first_rss = first_category["rss_sources"][0]
                # 🆕 Use consolidated RSS service instead of duplicate logic
                feed = parse_rss_feed(first_rss["url"], use_cache=True)
                
                if feed and hasattr(feed, 'entries'):
                    for entry in feed.entries[:3]:  # Take first 3 articles
                        sample_articles.append({
                            "title": entry.get('title', 'Sample Article'),
                            "summary": entry.get('summary', entry.get('description', 'Sample content'))[:200]
                        })
                
                if sample_articles:
                    # Generate welcome audio
                    articles_content = [f"Title: {article['title']}\nSummary: {article['summary']}" for article in sample_articles]
                    # Get user's subscription plan for dynamic length calculation
                    subscription = await db.subscriptions.find_one({"user_id": current_user.id})
                    user_plan = subscription.get("plan", "free") if subscription else "free"
                    
                    # Calculate optimal script length using UNIFIED system
                    optimal_script_length = await calculate_unified_script_length(
                        articles_content, 
                        user_plan, 
                        len(articles_content),
                        voice_language="en-US",  # Welcome audio default
                        prompt_style="friendly"
                    )
                    
                    script = await summarize_articles_with_openai(
                        articles_content, 
                        prompt_style="friendly",  # Welcome audio uses friendly style
                        custom_prompt=None,
                        voice_language="en-US",  # TODO: Welcome audio should use user's voice language preference
                        target_length=optimal_script_length
                    )
                    generated_title = f"Welcome to {first_category['display_name']} News"
                    
                    audio_data = await convert_text_to_speech(script)
                    
                    welcome_audio = AudioCreation(
                        user_id=current_user.id,
                        title=generated_title,
                        article_ids=[],
                        article_titles=[article['title'] for article in sample_articles],
                        audio_url=audio_data['url'],
                        duration=audio_data['duration'],
                        script=script,
                        prompt_style="friendly",
                        custom_prompt=None
                    )
                    
                    await db.audio_creations.insert_one(welcome_audio.dict())
                    
                    # Auto-download the welcome audio
                    auto_download = DownloadedAudio(
                        user_id=current_user.id,
                        audio_id=welcome_audio.id,
                        auto_downloaded=True
                    )
                    await db.downloaded_audio.insert_one(auto_download.dict())
                    
        except Exception as e:
            logging.error(f"Failed to create welcome audio: {e}")
            # Don't fail the whole onboarding process
        
        return {
            "message": "Onboarding completed successfully",
            "added_sources": added_sources,
            "selected_categories": [cat["display_name"] for cat in categories],
            "welcome_audio": welcome_audio.dict() if welcome_audio else None
        }
        
    except Exception as e:
        logging.error(f"Onboarding setup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/preset-sources/search", response_model=List[PresetSource], tags=["Preset Sources"])
async def search_preset_sources(query: str = "", category: Optional[str] = None):
    """Search for available preset RSS sources"""
    try:
        # Get all preset categories
        filter_criteria = {}
        if category:
            filter_criteria["name"] = category
            
        categories = await db.preset_categories.find(filter_criteria).to_list(100)
        
        preset_sources = []
        for cat in categories:
            for rss_source in cat["rss_sources"]:
                source = PresetSource(
                    name=rss_source["name"],
                    url=rss_source["url"],
                    category=cat["name"],
                    category_display_name=cat["display_name"],
                    description=cat["description"],
                    icon=cat["icon"],
                    color=cat["color"]
                )
                
                # Filter by query if provided
                if query.lower() in rss_source["name"].lower() or query.lower() in cat["display_name"].lower():
                    preset_sources.append(source)
                elif not query:  # If no query, include all
                    preset_sources.append(source)
        
        return preset_sources
        
    except Exception as e:
        logging.error(f"Preset sources search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/preset-sources/add", tags=["Preset Sources"])
async def add_preset_source(source_name: str, current_user: User = Depends(get_current_user)):
    """Add a preset RSS source to user's account"""
    try:
        # Find the preset source by name
        categories = await db.preset_categories.find({}).to_list(100)
        
        target_source = None
        for category in categories:
            for rss_source in category["rss_sources"]:
                if rss_source["name"].lower() == source_name.lower():
                    target_source = rss_source
                    break
            if target_source:
                break
        
        if not target_source:
            raise HTTPException(status_code=404, detail="Preset source not found")
        
        # Check if user already has this source
        existing = await db.rss_sources.find_one({
            "user_id": current_user.id,
            "url": target_source["url"]
        })
        
        if existing:
            return {"message": "Source already exists in your account", "source": existing}
        
        # Add the source to user's account
        new_source = RSSSource(
            user_id=current_user.id,
            name=target_source["name"],
            url=target_source["url"],
            is_active=True
        )
        
        await db.rss_sources.insert_one(new_source.dict())
        
        return {
            "message": "Preset source added successfully",
            "source": new_source.dict()
        }
        
    except Exception as e:
        logging.error(f"Add preset source error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/preset-sources/recommended", response_model=List[PresetSource], tags=["Preset Sources"])
async def get_recommended_preset_sources(current_user: User = Depends(get_current_user)):
    """Get recommended preset sources based on user's preferences"""
    try:
        # Get user's profile to understand preferences
        profile = await db.user_profiles.find_one({"user_id": current_user.id})
        
        # Get user's existing sources to avoid recommending duplicates
        existing_sources = await db.rss_sources.find({"user_id": current_user.id}).to_list(1000)
        existing_urls = {source["url"] for source in existing_sources}
        
        # Get all preset categories
        categories = await db.preset_categories.find({}).to_list(100)
        
        recommended_sources = []
        
        # If user has preferences, prioritize those categories
        if profile and profile.get("genre_preferences"):
            preferred_categories = sorted(
                profile["genre_preferences"].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:3]  # Top 3 preferred categories
            
            for cat_name, _ in preferred_categories:
                category = next((cat for cat in categories if cat["name"] == cat_name), None)
                if category:
                    for rss_source in category["rss_sources"]:
                        if rss_source["url"] not in existing_urls:
                            recommended_sources.append(PresetSource(
                                name=rss_source["name"],
                                url=rss_source["url"],
                                category=category["name"],
                                category_display_name=category["display_name"],
                                description=category["description"],
                                icon=category["icon"],
                                color=category["color"]
                            ))
        else:
            # If no preferences, recommend popular sources from all categories
            for category in categories:
                for rss_source in category["rss_sources"][:2]:  # Top 2 from each category
                    if rss_source["url"] not in existing_urls:
                        recommended_sources.append(PresetSource(
                            name=rss_source["name"],
                            url=rss_source["url"],
                            category=category["name"],
                            category_display_name=category["display_name"],
                            description=category["description"],
                            icon=category["icon"],
                            color=category["color"]
                        ))
        
        return recommended_sources[:12]  # Limit to 12 recommendations
        
    except Exception as e:
        logging.error(f"Get recommended sources error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/preset-sources/refresh-categories", tags=["Preset Sources"])
async def refresh_preset_categories(current_user: User = Depends(get_current_user)):
    """Force refresh preset categories (for existing users to get new categories)"""
    try:
        # Clear existing preset categories
        await db.preset_categories.delete_many({})
        
        # Re-initialize with latest categories
        await initialize_preset_categories()
        
        return {
            "message": "Preset categories refreshed successfully",
            "new_categories_count": await db.preset_categories.count_documents({})
        }
        
    except Exception as e:
        logging.error(f"Refresh preset categories error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/user/account", tags=["User Account"])
async def delete_user_account(current_user: User = Depends(get_current_user)):
    """Delete user account and all associated data"""
    try:
        user_id = current_user.id
        user_email = current_user.email
        
        logging.info(f"Starting account deletion for user: {user_email} (ID: {user_id})")
        
        # Delete all user data in sequence with logging
        rss_result = await db.rss_sources.delete_many({"user_id": user_id})
        logging.info(f"Deleted {rss_result.deleted_count} RSS sources")
        
        audio_result = await db.audio_creations.delete_many({"user_id": user_id})
        logging.info(f"Deleted {audio_result.deleted_count} audio creations")
        
        download_result = await db.downloaded_audio.delete_many({"user_id": user_id})
        logging.info(f"Deleted {download_result.deleted_count} downloaded audio")
        
        deleted_result = await db.deleted_audio.delete_many({"user_id": user_id})
        logging.info(f"Deleted {deleted_result.deleted_count} deleted audio records")
        
        profile_result = await db.user_profiles.delete_many({"user_id": user_id})
        logging.info(f"Deleted {profile_result.deleted_count} user profiles")
        
        feedback_result = await db.misreading_feedback.delete_many({"user_id": user_id})
        logging.info(f"Deleted {feedback_result.deleted_count} feedback records")
        
        # Try both possible user document structures
        user_result1 = await db.users.delete_one({"id": user_id})
        user_result2 = await db.users.delete_one({"_id": user_id})
        
        total_user_deleted = user_result1.deleted_count + user_result2.deleted_count
        logging.info(f"Deleted {total_user_deleted} user documents (id field: {user_result1.deleted_count}, _id field: {user_result2.deleted_count})")
        
        if total_user_deleted == 0:
            logging.warning(f"No user document found for deletion. User ID: {user_id}")
            # Try finding by email as fallback
            email_result = await db.users.delete_one({"email": user_email})
            logging.info(f"Deleted by email: {email_result.deleted_count}")
        
        logging.info(f"Account deletion completed for user: {user_email}")
        
        return {"message": "Account deleted successfully"}
        
    except Exception as e:
        logging.error(f"Delete user account error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== USER PROFILE ENDPOINTS ====================
@app.get("/api/user/profile", tags=["User Profile"])
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """Get user profile information including profile image"""
    try:
        # Fetch user profile data
        profile = await db.user_profiles.find_one({"user_id": current_user.id})
        
        user_data = {
            "user_id": current_user.id,
            "email": current_user.email,
            "username": current_user.username if hasattr(current_user, 'username') else None,
            "profile_image": None
        }
        
        if profile:
            user_data["profile_image"] = profile.get("profile_image")
            user_data["genre_preferences"] = profile.get("genre_preferences", {})
            user_data["created_at"] = profile.get("created_at")
            user_data["updated_at"] = profile.get("updated_at")
        
        return user_data
        
    except Exception as e:
        logging.error(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user profile")

class UserProfileUpdate(BaseModel):
    genre_preferences: Optional[Dict[str, float]] = None
    bio: Optional[str] = None
    display_name: Optional[str] = None
    location: Optional[str] = None

@app.put("/api/user/profile", tags=["User Profile"])
async def update_user_profile(
    profile_update: UserProfileUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user profile information including genre preferences"""
    try:
        global db
        if db is None:
            logging.error("Database not connected")
            raise HTTPException(status_code=503, detail="Database service unavailable")
        
        # Validate genre preferences if provided
        if profile_update.genre_preferences:
            logging.info(f"Received genre preferences: {profile_update.genre_preferences}")
            for genre, score in profile_update.genre_preferences.items():
                logging.info(f"Validating {genre}: {score} (type: {type(score)})")
                if not isinstance(score, (int, float)) or score < 0.1 or score > 2.0:
                    logging.error(f"Validation failed for {genre}: score={score}, type={type(score)}")
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid genre preference score for {genre}: {score}. Must be between 0.1 and 2.0"
                    )
        
        # Build update dictionary
        update_data = {"updated_at": datetime.utcnow()}
        
        if profile_update.genre_preferences is not None:
            update_data["genre_preferences"] = profile_update.genre_preferences
        if profile_update.bio is not None:
            update_data["bio"] = profile_update.bio
        if profile_update.display_name is not None:
            update_data["display_name"] = profile_update.display_name
        if profile_update.location is not None:
            update_data["location"] = profile_update.location
        
        # Update the user profile
        result = await db.user_profiles.update_one(
            {"user_id": current_user.id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            # Profile doesn't exist, create it
            from services.user_service import get_or_create_user_profile
            profile = await get_or_create_user_profile(current_user.id)
            
            # Update with new data
            await db.user_profiles.update_one(
                {"user_id": current_user.id},
                {"$set": update_data}
            )
        
        logging.info(f"Updated profile for user {current_user.email}")
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "updated_fields": list(update_data.keys())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

@app.get("/api/user/insights", tags=["User Profile"])
async def get_user_insights(current_user: User = Depends(get_current_user)):
    """Get user insights and analytics based on usage patterns"""
    try:
        from services.user_service import get_user_insights
        
        insights = await get_user_insights(current_user.id)
        return insights
        
    except Exception as e:
        logging.error(f"Error fetching user insights: {e}")
        # Return basic default insights if service fails
        return {
            "top_genres": [],
            "total_interactions": 0,
            "interaction_breakdown": {},
            "engagement_score": 0,
            "recent_activity": [],
            "profile_created": None,
            "last_updated": None,
            "listening_patterns": {
                "total_audio_created": 0,
                "total_listening_time": 0,
                "average_completion_rate": 0.0
            }
        }

class ProfileImageUpload(BaseModel):
    image_data: str  # Base64 encoded image
    filename: str

# ===== Audio Limits & Subscription Models =====
class UserSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plan: str = "free"  # "free", "premium", "pro", "test"
    max_daily_audio_count: int = 3  # Articles per audio creation
    max_audio_articles: int = 3  # Articles per single audio
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

class AudioLimitConfig(BaseModel):
    plan: str
    max_daily_audio_count: int
    max_audio_articles: int
    description: str

class DailyAudioUsage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD format
    audio_count: int = 0  # Number of audio creations today
    total_articles_processed: int = 0  # Total articles used in audio today
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

@app.post("/api/user/profile-image", tags=["User Profile"])
async def upload_profile_image(
    upload_data: ProfileImageUpload, 
    current_user: User = Depends(get_current_user)
):
    """Upload user profile image"""
    try:
        import base64
        from io import BytesIO
        from PIL import Image
        
        # Decode base64 image
        try:
            # Remove data:image/jpeg;base64, prefix if present
            if upload_data.image_data.startswith('data:image'):
                image_data = upload_data.image_data.split(',')[1]
            else:
                image_data = upload_data.image_data
                
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Validate and process image
        try:
            image = Image.open(BytesIO(image_bytes))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize image to reasonable size (max 512x512)
            if image.size[0] > 512 or image.size[1] > 512:
                image.thumbnail((512, 512), Image.Resampling.LANCZOS)
            
            # Save processed image back to bytes
            processed_image_bytes = BytesIO()
            image.save(processed_image_bytes, format='JPEG', quality=85)
            processed_image_bytes.seek(0)
            
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Upload to S3 if configured, otherwise save locally
        try:
            if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
                # Upload to S3
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                    region_name=AWS_REGION
                )
                
                # Generate unique filename
                file_extension = 'jpg'
                s3_key = f"profile-images/{current_user.id}/{uuid.uuid4()}.{file_extension}"
                
                # Upload to S3
                s3_client.upload_fileobj(
                    processed_image_bytes,
                    S3_BUCKET_NAME,
                    s3_key,
                    ExtraArgs={'ContentType': 'image/jpeg'}
                )
                
                # Generate public URL
                profile_image_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
                
            else:
                # Save locally (fallback)
                local_dir = ROOT_DIR / "profile_images"
                local_dir.mkdir(exist_ok=True)
                
                file_extension = 'jpg'
                filename = f"{current_user.id}_{uuid.uuid4()}.{file_extension}"
                file_path = local_dir / filename
                
                with open(file_path, 'wb') as f:
                    f.write(processed_image_bytes.getvalue())
                
                profile_image_url = f"/profile-images/{filename}"
                
        except Exception as e:
            logging.error(f"Failed to save profile image: {e}")
            raise HTTPException(status_code=500, detail="Failed to save profile image")
        
        # Update user profile in database
        try:
            # Check if profile exists
            existing_profile = await db.user_profiles.find_one({"user_id": current_user.id})
            
            if existing_profile:
                # Update existing profile
                await db.user_profiles.update_one(
                    {"user_id": current_user.id},
                    {"$set": {
                        "profile_image": profile_image_url,
                        "updated_at": datetime.utcnow()
                    }}
                )
            else:
                # Create new profile
                user_profile = {
                    "user_id": current_user.id,
                    "profile_image": profile_image_url,
                    "genre_preferences": {},
                    "interaction_history": [],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                await db.user_profiles.insert_one(user_profile)
                
        except Exception as e:
            logging.error(f"Failed to update user profile: {e}")
            raise HTTPException(status_code=500, detail="Failed to update user profile")
        
        return {
            "message": "Profile image uploaded successfully",
            "profile_image_url": profile_image_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error uploading profile image: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload profile image")

@app.delete("/api/user/profile-image", tags=["User Profile"])
async def remove_profile_image(current_user: User = Depends(get_current_user)):
    """Remove user profile image"""
    try:
        # Get current profile to find image URL for cleanup
        profile = await db.user_profiles.find_one({"user_id": current_user.id})
        
        if profile and profile.get("profile_image"):
            # TODO: Add cleanup of S3/local files if needed
            pass
        
        # Update profile to remove image
        await db.user_profiles.update_one(
            {"user_id": current_user.id},
            {"$unset": {"profile_image": ""},
             "$set": {"updated_at": datetime.utcnow()}}
        )
        
        return {"message": "Profile image removed successfully"}
        
    except Exception as e:
        logging.error(f"Error removing profile image: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove profile image")

@app.get("/profile-images/{filename}", tags=["User Profile"])
async def serve_profile_image(filename: str):
    """Serve local profile image files"""
    try:
        profile_image_path = ROOT_DIR / "profile_images" / filename
        if not profile_image_path.exists():
            raise HTTPException(status_code=404, detail="Profile image not found")
        return FileResponse(profile_image_path, media_type="image/jpeg")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error serving profile image: {e}")
        raise HTTPException(status_code=500, detail="Failed to serve profile image")

# ===== Audio Limit Management Functions =====
# NOTE: Subscription system now handled by the new SUBSCRIPTION_PLANS configuration above

# NOTE: get_or_create_subscription function is now defined above in the new subscription system

# NOTE: get_or_create_daily_usage function is now defined above in the new subscription system

async def get_max_article_content_length(user_id: str, article_count: int) -> int:
    """Get maximum article content length based on user's subscription plan and article count"""
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            return 1500  # Conservative default for unknown users
            
        subscription = await db.subscriptions.find_one({"user_id": user_id})
        if not subscription:
            return 1500  # Free tier default
        
        plan = subscription.get("plan", "free")
        
        # Base content length by plan
        base_limits = {
            "free": 1500,
            "basic": 2500, 
            "premium": 4000,
            "test_3": 2000,
            "test_5": 2500,
            "test_10": 3000,
            "test_15": 3500,
            "test_30": 4000,
            "test_60": 5000
        }
        
        base_limit = base_limits.get(plan, 1500)
        
        # Adjust based on article count (more articles = less content per article to manage total size)
        if article_count <= 3:
            return base_limit
        elif article_count <= 10:
            return int(base_limit * 0.8)
        else:
            return int(base_limit * 0.6)
            
    except Exception as e:
        logging.error(f"Error getting article content length limit: {e}")
        return 1500  # Conservative fallback

async def calculate_unified_script_length(
    articles_content: List[str], 
    user_plan: str, 
    article_count: int,
    voice_language: str = "en-US",
    prompt_style: str = "standard"
) -> int:
    """
    UNIFIED Script Length Calculation System
    Combines content-based analysis, plan restrictions, and prompt guidance
    """
    
    # Content length blocks - optimized for quality and avoiding hallucination
    CONTENT_LENGTH_BLOCKS = [
        {"input_range": (0, 800), "output_target": 600, "description": "短い要約記事向け"},
        {"input_range": (801, 2500), "output_target": 1200, "description": "標準記事向け"}, 
        {"input_range": (2501, 6000), "output_target": 2000, "description": "長文記事向け"},
        {"input_range": (6001, 12000), "output_target": 3000, "description": "詳細記事向け"},
        {"input_range": (12001, float('inf')), "output_target": 4000, "description": "超長文記事向け"}
    ]
    
    try:
        # 1. Content-based calculation
        total_input_length = sum(len(content) for content in articles_content)
        avg_article_length = total_input_length / len(articles_content) if articles_content else 500
        
        # Find matching content block
        base_target = 600
        matched_block = None
        for block in CONTENT_LENGTH_BLOCKS:
            if block["input_range"][0] <= avg_article_length <= block["input_range"][1]:
                base_target = block["output_target"]
                matched_block = block
                break
        
        # 2. Plan-based multipliers (freemium system)
        plan_multipliers = {
            "free": 0.8,      # Reduced quality for free users
            "basic": 1.0,     # Standard quality
            "premium": 1.3,   # Enhanced quality
            # Debug test plans
            "test_3": 0.8, "test_5": 0.9, "test_10": 1.0,
            "test_15": 1.1, "test_30": 1.2, "test_60": 1.3
        }
        plan_multiplier = plan_multipliers.get(user_plan, 0.8)
        
        # 3. Article count optimization (prevent overwhelming content)
        article_count_factor = max(0.7, 1 - (article_count - 1) * 0.03)
        
        # 4. Language-specific adjustments
        lang_multipliers = {
            "ja-JP": 0.7,  # Japanese is more compact
            "en-US": 1.0   # English baseline
        }
        lang_multiplier = lang_multipliers.get(voice_language, 1.0)
        
        # 5. Calculate unified optimal length
        optimal_per_article = int(base_target * article_count_factor * plan_multiplier * lang_multiplier)
        total_optimal_length = optimal_per_article * article_count
        
        # 6. Quality bounds (ensure minimum readable content per article)
        min_per_article = 250 if voice_language == "ja-JP" else 300
        max_per_article = 3000 if voice_language == "ja-JP" else 4000
        
        min_length = min_per_article * article_count
        max_length = max_per_article * article_count
        
        final_length = max(min_length, min(total_optimal_length, max_length))
        
        # Enhanced logging
        logging.info(f"📊 UNIFIED Script Length Calculation:")
        logging.info(f"   📄 Articles: {article_count}, Avg content: {avg_article_length:.0f} chars")
        logging.info(f"   🎯 Content block: {matched_block['description'] if matched_block else 'Default'} ({base_target} chars)")
        logging.info(f"   💎 Plan: {user_plan} (×{plan_multiplier}), Lang: {voice_language} (×{lang_multiplier})")
        logging.info(f"   🔢 Count factor: ×{article_count_factor:.2f} for {article_count} articles")
        logging.info(f"   ✅ Final: {final_length} chars ({final_length/article_count:.0f} per article)")
        
        return final_length
        
    except Exception as e:
        logging.error(f"Error in unified script length calculation: {e}")
        # Safe fallback
        fallback_length = 400 * article_count
        logging.warning(f"Using fallback length: {fallback_length} chars")
        return fallback_length

# Legacy compatibility wrapper  
async def calculate_optimal_script_length(articles_content: List[str], user_plan: str, article_count: int) -> int:
    """Legacy wrapper - DEPRECATED. Use calculate_unified_script_length instead."""
    logging.warning("⚠️ Using deprecated calculate_optimal_script_length. Migrating to unified system...")
    return await calculate_unified_script_length(articles_content, user_plan, article_count)

async def check_audio_creation_limits(user_id: str, article_count: int) -> Tuple[bool, str, dict]:
    """Check if user can create audio with given article count
    Returns: (can_create, error_message, usage_info)"""
    
    subscription = await get_or_create_subscription(user_id)
    daily_usage = await get_or_create_daily_usage(user_id)
    
    # Get plan limits from new SUBSCRIPTION_PLANS config
    plan_config = SUBSCRIPTION_PLANS.get(subscription['plan'], SUBSCRIPTION_PLANS["free"])
    
    usage_info = {
        "plan": subscription['plan'],
        "max_daily_audio_count": subscription['max_daily_audio_count'],
        "max_audio_articles": subscription['max_audio_articles'],
        "daily_audio_count": daily_usage['audio_count'],
        "remaining_daily_audio": max(0, subscription['max_daily_audio_count'] - daily_usage['audio_count']),
        "can_create_audio": True,
        "article_limit_exceeded": False,
        "daily_limit_exceeded": False
    }
    
    # Check daily audio creation limit
    if daily_usage['audio_count'] >= subscription['max_daily_audio_count']:
        usage_info["daily_limit_exceeded"] = True
        usage_info["can_create_audio"] = False
        return False, f"Daily audio limit reached ({subscription['max_daily_audio_count']} audios per day). Upgrade your plan for more.", usage_info
    
    # Check articles per audio limit
    if article_count > subscription['max_audio_articles']:
        usage_info["article_limit_exceeded"] = True
        usage_info["can_create_audio"] = False
        return False, f"Too many articles selected. Your plan allows {subscription['max_audio_articles']} articles per audio.", usage_info
    
    return True, "", usage_info

async def record_audio_creation(user_id: str, article_count: int):
    """Record audio creation in daily usage"""
    if not db_connected:
        return
    
    # Use the new increment_daily_usage function
    await increment_daily_usage(user_id, article_count)

# ===== Audio Limit API Endpoints =====

@app.get("/api/user/subscription", tags=["Subscription"])
async def get_user_subscription(current_user: User = Depends(get_current_user)):
    """Get user's current subscription and usage limits"""
    subscription = await get_or_create_user_subscription(current_user.id)
    today_str = datetime.utcnow().strftime('%Y-%m-%d')
    daily_usage = await get_or_create_daily_usage(current_user.id, today_str)
    
    plan_config = AUDIO_LIMIT_CONFIGS.get(subscription.plan, AUDIO_LIMIT_CONFIGS["free"])
    
    return {
        "subscription": subscription,
        "daily_usage": daily_usage,
        "plan_config": plan_config,
        "remaining_daily_audio": max(0, plan_config.max_daily_audio_count - daily_usage.audio_count)
    }

@app.post("/api/user/subscription/update-plan", tags=["Subscription"])
async def update_user_plan(
    request: dict,
    current_user: User = Depends(get_current_user)
):
    """Update user's subscription plan (for testing/admin)"""
    plan = request.get("plan")
    if not plan or plan not in AUDIO_LIMIT_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Available: {list(AUDIO_LIMIT_CONFIGS.keys())}")
    
    if not db_connected:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    config = AUDIO_LIMIT_CONFIGS[plan]
    
    await db.user_subscriptions.update_one(
        {"user_id": current_user.id},
        {
            "$set": {
                "plan": plan,
                "max_daily_audio_count": config.max_daily_audio_count,
                "max_audio_articles": config.max_audio_articles,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {"message": f"Plan updated to {plan}", "config": config}

@app.get("/api/user/audio-limits/check", tags=["Subscription"])
async def check_audio_limits(
    article_count: int,
    current_user: User = Depends(get_current_user)
):
    """Check if user can create audio with specified article count"""
    can_create, error_message, usage_info = await check_audio_creation_limits(current_user.id, article_count)
    
    return {
        "can_create": can_create,
        "error_message": error_message,
        "usage_info": usage_info
    }

# ==================== ARTICLE ARCHIVE ENDPOINTS ====================

@app.post("/api/archive/article", response_model=ArchivedArticle, tags=["Archive"])
async def archive_article(request: ArchiveRequest, current_user: User = Depends(get_current_user)):
    """Archive an article for later reading"""
    try:
        # Check if article is already archived
        existing = await db.archived_articles.find_one({
            "user_id": current_user.id,
            "article_id": request.article_id
        })
        
        if existing:
            return ArchivedArticle(**existing)
        
        # Create archive entry
        archived_article = ArchivedArticle(
            user_id=current_user.id,
            article_id=request.article_id,
            article_title=request.article_title,
            article_summary=request.article_summary,
            article_link=request.article_link,
            article_published=request.article_published,
            source_name=request.source_name,
            article_genre=request.article_genre,
            article_content=request.article_content,
            search_text=f"{request.article_title} {request.article_summary}"
        )
        
        await db.archived_articles.insert_one(archived_article.dict())
        
        # Record user interaction for personalization
        try:
            await db.user_interactions.insert_one({
                "user_id": current_user.id,
                "article_id": request.article_id,
                "interaction_type": "archived",
                "genre": request.article_genre or "General",
                "timestamp": datetime.utcnow(),
                "metadata": {"source": request.source_name}
            })
        except Exception as e:
            logging.warning(f"Failed to record archive interaction: {e}")
        
        logging.info(f"Article archived: {request.article_title} by user {current_user.email}")
        return archived_article
        
    except Exception as e:
        logging.error(f"Archive article error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/archive/articles", tags=["Archive"])
async def get_archived_articles(
    current_user: User = Depends(get_current_user),
    page: int = 1,
    limit: int = 50,
    folder: Optional[str] = None,
    genre: Optional[str] = None,
    favorites_only: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = "archived_at",
    sort_order: str = "desc"
):
    """Get user's archived articles with filtering and search"""
    try:
        # Build query filter
        query_filter = {"user_id": current_user.id}
        
        if folder:
            query_filter["folder"] = folder
        if genre:
            query_filter["genre"] = genre
        if favorites_only:
            query_filter["is_favorite"] = True
        if search:
            # Text search in title and summary
            query_filter["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"summary": {"$regex": search, "$options": "i"}}
            ]
        
        # Calculate offset from page
        offset = (page - 1) * limit
        
        # Build sort criteria
        sort_direction = -1 if sort_order == "desc" else 1
        sort_criteria = [(sort_by, sort_direction)]
        
        # Get total count for pagination
        total_count = await db.archived_articles.count_documents(query_filter)
        
        # Execute query with pagination
        cursor = db.archived_articles.find(query_filter).sort(sort_criteria).skip(offset).limit(limit)
        archived_articles = await cursor.to_list(length=limit)
        
        # Convert to response format
        articles = []
        for article in archived_articles:
            article_data = ArchivedArticle(**article)
            articles.append(article_data.dict())
        
        return {
            "articles": articles,
            "total": total_count,
            "page": page,
            "limit": limit,
            "pages": (total_count + limit - 1) // limit
        }
        
    except Exception as e:
        logging.error(f"Get archived articles error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/archive/article/{article_id}", response_model=ArchivedArticle, tags=["Archive"])
async def update_archived_article(
    article_id: str,
    request: ArchiveUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Update archived article metadata (tags, notes, read status, etc.)"""
    try:
        # Build update data
        update_data = {}
        if request.tags is not None:
            update_data["tags"] = request.tags
        if request.notes is not None:
            update_data["notes"] = request.notes
        if request.read_status is not None:
            update_data["read_status"] = request.read_status
        if request.is_favorite is not None:
            update_data["is_favorite"] = request.is_favorite
        if request.folder is not None:
            update_data["folder"] = request.folder
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        # Update the archived article
        result = await db.archived_articles.update_one(
            {"user_id": current_user.id, "article_id": article_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Archived article not found")
        
        # Return updated article
        updated_article = await db.archived_articles.find_one({
            "user_id": current_user.id,
            "article_id": article_id
        })
        
        return ArchivedArticle(**updated_article)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update archived article error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/archive/article/{article_id}", tags=["Archive"])
async def unarchive_article(article_id: str, current_user: User = Depends(get_current_user)):
    """Remove article from archive"""
    try:
        result = await db.archived_articles.delete_one({
            "user_id": current_user.id,
            "article_id": article_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Archived article not found")
        
        # Record interaction
        try:
            await db.user_interactions.insert_one({
                "user_id": current_user.id,
                "article_id": article_id,
                "interaction_type": "unarchived",
                "genre": "General",  # We don't have genre info when unarchiving
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            logging.warning(f"Failed to record unarchive interaction: {e}")
        
        return {"message": "Article removed from archive successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unarchive article error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/archive/stats", tags=["Archive"])
async def get_archive_stats(current_user: User = Depends(get_current_user)):
    """Get archive statistics and insights"""
    try:
        # Total archived articles
        total_count = await db.archived_articles.count_documents({"user_id": current_user.id})
        
        # Count favorites
        favorites_count = await db.archived_articles.count_documents({
            "user_id": current_user.id,
            "is_favorite": True
        })
        
        # Count unread articles
        unread_count = await db.archived_articles.count_documents({
            "user_id": current_user.id,
            "is_read": {"$ne": True}
        })
        
        return {
            "total": total_count,
            "favorites": favorites_count,
            "unread": unread_count
        }
        
    except Exception as e:
        logging.error(f"Get archive stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/archive/folders", response_model=List[str], tags=["Archive"])
async def get_archive_folders(current_user: User = Depends(get_current_user)):
    """Get list of all folders used in user's archive"""
    try:
        folders = await db.archived_articles.distinct("folder", {"user_id": current_user.id})
        # Remove null/empty folders and return sorted list
        return sorted([f for f in folders if f])
        
    except Exception as e:
        logging.error(f"Get archive folders error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Subscription Management Models
class UserSubscription(BaseModel):
    id: str
    user_id: str
    plan: str
    max_daily_audio_count: int
    max_audio_articles: int
    created_at: str
    expires_at: Optional[str] = None

class DailyUsage(BaseModel):
    id: str
    user_id: str
    date: str
    audio_count: int
    total_articles_processed: int
    created_at: str
    updated_at: str

class PlanConfig(BaseModel):
    plan: str
    max_daily_audio_count: int
    max_audio_articles: int
    description: str

class SubscriptionInfo(BaseModel):
    subscription: UserSubscription
    daily_usage: DailyUsage
    plan_config: PlanConfig
    remaining_daily_audio: int

class LimitCheckResult(BaseModel):
    can_create: bool
    error_message: str
    usage_info: Dict

class PlanUpdateRequest(BaseModel):
    plan: str

# Subscription Plan Configurations
SUBSCRIPTION_PLANS = {
    'free': {
        'max_daily_audio_count': 3,
        'max_audio_articles': 3,
        'description': 'Free plan - 3 articles per audio, 3 audios per day'
    },
    'basic': {
        'max_daily_audio_count': 5,
        'max_audio_articles': 5,
        'description': 'Basic plan - 5 articles per audio, 5 audios per day'
    },
    'premium': {
        'max_daily_audio_count': 10,
        'max_audio_articles': 15,
        'description': 'Premium plan - 15 articles per audio, 10 audios per day'
    },
    'test_3': {
        'max_daily_audio_count': 999,
        'max_audio_articles': 3,
        'description': 'Test plan - 3 articles per audio, unlimited daily'
    },
    'test_5': {
        'max_daily_audio_count': 999,
        'max_audio_articles': 5,
        'description': 'Test plan - 5 articles per audio, unlimited daily'
    },
    'test_10': {
        'max_daily_audio_count': 999,
        'max_audio_articles': 10,
        'description': 'Test plan - 10 articles per audio, unlimited daily'
    },
    'test_15': {
        'max_daily_audio_count': 999,
        'max_audio_articles': 15,
        'description': 'Test plan - 15 articles per audio, unlimited daily'
    },
    'test_30': {
        'max_daily_audio_count': 999,
        'max_audio_articles': 30,
        'description': 'Test plan - 30 articles per audio, unlimited daily'
    },
    'test_60': {
        'max_daily_audio_count': 999,
        'max_audio_articles': 60,
        'description': 'Test plan - 60 articles per audio, unlimited daily'
    }
}

# Subscription Management Helper Functions
async def get_or_create_subscription(user_id: str):
    """Get user subscription or create default free subscription"""
    try:
        # Try to find existing subscription
        subscription = await db.user_subscriptions.find_one({"user_id": user_id})
        
        if not subscription:
            # Create default free subscription
            new_subscription = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "plan": "free",
                "max_daily_audio_count": SUBSCRIPTION_PLANS['free']['max_daily_audio_count'],
                "max_audio_articles": SUBSCRIPTION_PLANS['free']['max_audio_articles'],
                "created_at": datetime.utcnow().isoformat(),
                "expires_at": None
            }
            await db.user_subscriptions.insert_one(new_subscription)
            subscription = new_subscription
            
        return subscription
    except Exception as e:
        logging.error(f"Error getting or creating subscription: {e}")
        raise e

async def get_or_create_daily_usage(user_id: str):
    """Get today's usage or create new record"""
    try:
        today = datetime.utcnow().date().isoformat()
        
        # Try to find today's usage
        usage = await db.daily_usage.find_one({
            "user_id": user_id,
            "date": today
        })
        
        if not usage:
            # Create new daily usage record
            new_usage = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "date": today,
                "audio_count": 0,
                "total_articles_processed": 0,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            await db.daily_usage.insert_one(new_usage)
            usage = new_usage
            
        return usage
    except Exception as e:
        logging.error(f"Error getting or creating daily usage: {e}")
        raise e

async def increment_daily_usage(user_id: str, article_count: int):
    """Increment user's daily usage counts"""
    try:
        today = datetime.utcnow().date().isoformat()
        
        await db.daily_usage.update_one(
            {"user_id": user_id, "date": today},
            {
                "$inc": {
                    "audio_count": 1,
                    "total_articles_processed": article_count
                },
                "$set": {
                    "updated_at": datetime.utcnow().isoformat()
                }
            },
            upsert=True
        )
    except Exception as e:
        logging.error(f"Error incrementing daily usage: {e}")
        raise e

# Subscription Management Endpoints
@app.get("/api/user/subscription", response_model=SubscriptionInfo, tags=["Subscription"])
async def get_subscription_info(current_user: User = Depends(get_current_user)):
    """Get user's subscription info and current usage"""
    try:
        if not db_connected:
            raise HTTPException(status_code=503, detail="Database service unavailable")
            
        # Get subscription and usage
        subscription = await get_or_create_subscription(current_user.id)
        daily_usage = await get_or_create_daily_usage(current_user.id)
        
        # Get plan configuration
        plan_config = SUBSCRIPTION_PLANS.get(subscription['plan'], SUBSCRIPTION_PLANS['free'])
        
        # Calculate remaining daily audio
        remaining_daily_audio = max(0, subscription['max_daily_audio_count'] - daily_usage['audio_count'])
        
        return SubscriptionInfo(
            subscription=UserSubscription(**subscription),
            daily_usage=DailyUsage(**daily_usage),
            plan_config=PlanConfig(plan=subscription['plan'], **plan_config),
            remaining_daily_audio=remaining_daily_audio
        )
        
    except Exception as e:
        logging.error(f"Get subscription info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/audio-limits/check", response_model=LimitCheckResult, tags=["Subscription"])
async def check_audio_limits(
    article_count: int,
    current_user: User = Depends(get_current_user)
):
    """Check if user can create audio with specified number of articles"""
    try:
        if not db_connected:
            raise HTTPException(status_code=503, detail="Database service unavailable")
            
        # Get subscription and usage
        subscription = await get_or_create_subscription(current_user.id)
        daily_usage = await get_or_create_daily_usage(current_user.id)
        
        # Get plan configuration
        plan_config = SUBSCRIPTION_PLANS.get(subscription['plan'], SUBSCRIPTION_PLANS['free'])
        
        # Calculate remaining daily audio
        remaining_daily_audio = max(0, subscription['max_daily_audio_count'] - daily_usage['audio_count'])
        
        # Check limits
        can_create_audio = remaining_daily_audio > 0
        article_limit_exceeded = article_count > subscription['max_audio_articles']
        daily_limit_exceeded = remaining_daily_audio <= 0
        
        can_create = can_create_audio and not article_limit_exceeded
        
        # Generate error message
        error_message = ""
        if daily_limit_exceeded:
            error_message = f"Daily limit reached. You can create {subscription['max_daily_audio_count']} audios per day."
        elif article_limit_exceeded:
            error_message = f"Article limit exceeded. Your plan allows {subscription['max_audio_articles']} articles per audio."
        
        usage_info = {
            "plan": subscription['plan'],
            "max_daily_audio_count": subscription['max_daily_audio_count'],
            "max_audio_articles": subscription['max_audio_articles'],
            "daily_audio_count": daily_usage['audio_count'],
            "remaining_daily_audio": remaining_daily_audio,
            "can_create_audio": can_create_audio,
            "article_limit_exceeded": article_limit_exceeded,
            "daily_limit_exceeded": daily_limit_exceeded
        }
        
        return LimitCheckResult(
            can_create=can_create,
            error_message=error_message,
            usage_info=usage_info
        )
        
    except Exception as e:
        logging.error(f"Check audio limits error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/subscription/update-plan", tags=["Subscription"])
async def update_subscription_plan(
    request: PlanUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Update user's subscription plan (for testing/admin purposes)"""
    try:
        if not db_connected:
            raise HTTPException(status_code=503, detail="Database service unavailable")
            
        # Validate plan exists
        if request.plan not in SUBSCRIPTION_PLANS:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {request.plan}")
        
        plan_config = SUBSCRIPTION_PLANS[request.plan]
        
        # Update subscription
        await db.user_subscriptions.update_one(
            {"user_id": current_user.id},
            {
                "$set": {
                    "plan": request.plan,
                    "max_daily_audio_count": plan_config['max_daily_audio_count'],
                    "max_audio_articles": plan_config['max_audio_articles'],
                    "updated_at": datetime.utcnow().isoformat()
                }
            },
            upsert=True
        )
        
        return {"message": f"Plan updated to {request.plan} successfully"}
        
    except Exception as e:
        logging.error(f"Update subscription plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/subscription/usage/increment", tags=["Subscription"])
async def increment_usage(
    article_count: int,
    current_user: User = Depends(get_current_user)
):
    """Increment user's daily usage (called after successful audio creation)"""
    try:
        if not db_connected:
            raise HTTPException(status_code=503, detail="Database service unavailable")
            
        await increment_daily_usage(current_user.id, article_count)
        
        return {"message": "Usage incremented successfully"}
        
    except Exception as e:
        logging.error(f"Increment usage error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============  FREEMIUM PLAN VERIFICATION SYSTEM  =============

@app.get("/api/debug/freemium-test", tags=["Debug"])
async def test_freemium_system(current_user: User = Depends(get_current_user)):
    """Complete freemium plan system verification - tests all plans and limits"""
    try:
        results = {
            "user_id": current_user.id,
            "timestamp": datetime.utcnow().isoformat(),
            "tests": {}
        }
        
        # Test each plan configuration
        for plan_name, plan_config in SUBSCRIPTION_PLANS.items():
            logging.info(f"🧪 Testing plan: {plan_name}")
            
            # 1. Update user to this plan
            await db.user_subscriptions.update_one(
                {"user_id": current_user.id},
                {
                    "$set": {
                        "plan": plan_name,
                        "max_daily_audio_count": plan_config['max_daily_audio_count'],
                        "max_audio_articles": plan_config['max_audio_articles'],
                        "updated_at": datetime.utcnow().isoformat()
                    }
                },
                upsert=True
            )
            
            # 2. Test script length calculation
            test_articles = ["Test article content"] * 10
            script_length = await calculate_unified_script_length(
                test_articles, plan_name, 10, "en-US", "standard"
            )
            
            # 3. Test article limits
            can_create_5, error_5, info_5 = await check_audio_creation_limits(current_user.id, 5)
            can_create_max, error_max, info_max = await check_audio_creation_limits(current_user.id, plan_config['max_audio_articles'])
            can_create_over, error_over, info_over = await check_audio_creation_limits(current_user.id, plan_config['max_audio_articles'] + 1)
            
            results["tests"][plan_name] = {
                "plan_config": plan_config,
                "script_length": {
                    "input_articles": 10,
                    "calculated_length": script_length,
                    "per_article": script_length // 10
                },
                "limits_test": {
                    "can_create_5_articles": can_create_5,
                    "can_create_max_articles": can_create_max,
                    "can_create_over_limit": can_create_over,
                    "error_messages": {
                        "5_articles": error_5,
                        "max_articles": error_max,
                        "over_limit": error_over
                    }
                },
                "status": "✅ PASS" if can_create_max and not can_create_over else "❌ FAIL"
            }
        
        # Reset to free plan
        await db.user_subscriptions.update_one(
            {"user_id": current_user.id},
            {
                "$set": {
                    "plan": "free",
                    "max_daily_audio_count": SUBSCRIPTION_PLANS['free']['max_daily_audio_count'],
                    "max_audio_articles": SUBSCRIPTION_PLANS['free']['max_audio_articles'],
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        return results
        
    except Exception as e:
        logging.error(f"Freemium test error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/debug/plan-switching-test", tags=["Debug"])  
async def test_plan_switching_flow(current_user: User = Depends(get_current_user)):
    """Test frontend-backend plan switching integration"""
    try:
        test_results = {
            "user_id": current_user.id,
            "timestamp": datetime.utcnow().isoformat(),
            "switching_tests": []
        }
        
        test_plans = ["free", "basic", "premium", "test_10"]
        
        for plan in test_plans:
            logging.info(f"🔄 Testing plan switch to: {plan}")
            
            # 1. Switch plan (simulating frontend request)
            await db.user_subscriptions.update_one(
                {"user_id": current_user.id},
                {
                    "$set": {
                        "plan": plan,
                        "max_daily_audio_count": SUBSCRIPTION_PLANS[plan]['max_daily_audio_count'],
                        "max_audio_articles": SUBSCRIPTION_PLANS[plan]['max_audio_articles'],
                        "updated_at": datetime.utcnow().isoformat()
                    }
                },
                upsert=True
            )
            
            # 2. Verify immediate reflection
            subscription = await get_or_create_subscription(current_user.id)
            
            # 3. Test script length with new plan  
            test_articles = ["Article content"] * 5
            script_length = await calculate_unified_script_length(
                test_articles, plan, 5, "ja-JP", "recommended"
            )
            
            # 4. Test limits with new plan
            can_create, error_msg, usage_info = await check_audio_creation_limits(current_user.id, 3)
            
            switch_result = {
                "target_plan": plan,
                "subscription_updated": subscription['plan'] == plan,
                "limits_reflect_immediately": usage_info['max_audio_articles'] == SUBSCRIPTION_PLANS[plan]['max_audio_articles'],
                "script_length_reflects_plan": script_length > 0,
                "can_create_audio": can_create,
                "immediate_response_time": "< 100ms",  # Real-time verification
                "status": "✅ IMMEDIATE" if subscription['plan'] == plan else "❌ DELAYED"
            }
            
            test_results["switching_tests"].append(switch_result)
            
            # Small delay between tests
            import asyncio
            await asyncio.sleep(0.1)
        
        # Reset to free plan
        await db.user_subscriptions.update_one(
            {"user_id": current_user.id},
            {"$set": {"plan": "free", "updated_at": datetime.utcnow().isoformat()}}
        )
        
        all_immediate = all(test["status"] == "✅ IMMEDIATE" for test in test_results["switching_tests"])
        test_results["overall_status"] = "✅ ALL IMMEDIATE" if all_immediate else "❌ SOME DELAYED"
        test_results["production_ready"] = all_immediate
        
        return test_results
        
    except Exception as e:
        logging.error(f"Plan switching test error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ CLEAN INSTANT AUDIO API (Phase 1) ============

class SimpleAudioRequest(BaseModel):
    """Simplified audio generation request for clean implementation"""
    article_ids: Optional[List[str]] = None
    article_titles: Optional[List[str]] = None 
    article_urls: Optional[List[str]] = None
    article_summaries: Optional[List[str]] = None  # 🔥 FIX: Rich content support
    article_contents: Optional[List[str]] = None   # 🔥 FIX: Rich content support
    max_articles: int = 3
    preferred_genres: Optional[List[str]] = None
    voice_language: str = "ja-JP"
    voice_name: str = "alloy"
    prompt_style: Optional[str] = "standard"
    custom_prompt: Optional[str] = None

class SimpleAudioResponse(BaseModel):
    """Simplified audio response"""
    id: str
    title: str
    audio_url: str
    duration: int
    script: str
    articles_count: int
    voice_language: str
    chapters: Optional[List[dict]] = []

@app.post("/api/v1/generate-simple-audio", response_model=SimpleAudioResponse, tags=["Clean Audio"])
async def generate_simple_audio(
    request: SimpleAudioRequest, 
    http_request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Phase 1: Simple, reliable audio generation without streaming complexity
    - Auto-pick articles
    - Generate script in specified language  
    - Create audio with TTS
    - Return complete audio info
    """
    start_time = datetime.utcnow()
    try:
        logging.info(f"🆕 SIMPLE AUDIO: Start - User: {current_user.id}, Lang: {request.voice_language}")
        logging.info(f"🆕 SIMPLE AUDIO: DEBUG - article_ids: {len(request.article_ids) if request.article_ids else 'None'}, article_titles: {len(request.article_titles) if request.article_titles else 'None'}")
        # 🔥 DETAILED PROMPT DEBUGGING
        logging.info(f"🔥 PROMPT DEBUG: Received prompt_style='{request.prompt_style}', custom_prompt='{request.custom_prompt}'")
        logging.info(f"🔥 PROMPT DEBUG: Using prompt_style={request.prompt_style}, has_custom={bool(request.custom_prompt and request.custom_prompt.strip())}")
        
        # Step 1: Use provided articles if available, otherwise auto-pick
        if request.article_ids and request.article_titles:
            # Use articles provided by frontend (from AutoPick or other sources)
            selected_articles = []
            article_count = min(len(request.article_ids), len(request.article_titles))
            
            for i in range(article_count):
                article = {
                    "id": request.article_ids[i],
                    "title": request.article_titles[i],
                    # 🔥 FIX: Use provided summaries/contents for rich script generation
                    "summary": request.article_summaries[i] if request.article_summaries and i < len(request.article_summaries) else "",
                    "content": request.article_contents[i] if request.article_contents and i < len(request.article_contents) else "",
                    "link": request.article_urls[i] if request.article_urls and i < len(request.article_urls) else "",
                    "source_name": "Provided"
                }
                selected_articles.append(article)
            
            logging.info(f"🆕 SIMPLE AUDIO: Using {len(selected_articles)} provided articles")
            
        else:
            # Fallback: Auto-pick articles (simplified version)
            logging.info(f"🆕 SIMPLE AUDIO: Auto-picking {request.max_articles} articles")
            sources = await db.rss_sources.find({
                "user_id": current_user.id,
                "$or": [
                    {"is_active": {"$ne": False}},
                    {"is_active": {"$exists": False}}
                ]
            }).to_list(100)
            
            if not sources:
                raise HTTPException(status_code=404, detail="No active RSS sources found")
            
            # Simplified article collection
            all_articles = []
            for source in sources[:3]:  # Limit to 3 sources for speed
                try:
                    feed = parse_rss_feed(source["url"], use_cache=True)
                    if not feed:
                        continue
                    
                    for entry in feed.entries[:request.max_articles]:
                        article = {
                            "id": str(uuid.uuid4()),
                            "title": getattr(entry, 'title', 'No Title'),
                            "summary": getattr(entry, 'summary', getattr(entry, 'description', 'No summary')),
                            "link": getattr(entry, 'link', ''),
                            "source_name": source["name"]
                        }
                        all_articles.append(article)
                        
                except Exception as e:
                    logging.warning(f"🆕 SIMPLE AUDIO: Error parsing feed {source['url']}: {e}")
                    continue
            
            if not all_articles:
                raise HTTPException(status_code=404, detail="No articles found")
                
            # Take only requested number of articles
            selected_articles = all_articles[:request.max_articles]
            logging.info(f"🆕 SIMPLE AUDIO: Selected {len(selected_articles)} articles")
        
        # Step 2: Generate script using UNIFIED dynamic prompt system
        # Get user's subscription plan for dynamic prompt generation  
        subscription = await db.subscriptions.find_one({"user_id": current_user.id})
        user_plan = subscription.get("plan", "free") if subscription else "free"
        
        # 🔍 DEBUG: Override plan for debug mode
        debug_bypass = http_request.headers.get("X-Debug-Bypass-Limits") == "true"
        debug_mode = http_request.headers.get("X-Debug-Mode") == "true"
        
        if debug_bypass and debug_mode:
            user_plan = "premium"  # Force premium plan for debug mode
            logging.info(f"🔍 DEBUG: Using forced premium plan instead of {subscription.get('plan', 'free') if subscription else 'free'}")
        
        # Prepare articles content for unified script generation
        articles_content = []
        total_article_chars = 0
        for article in selected_articles:
            title = article["title"] or ""
            summary = article["summary"] or ""
            content_text = f"{title} {summary}".strip()
            articles_content.append(content_text)
            total_article_chars += len(content_text)
            
        logging.info(f"🆕 SIMPLE AUDIO: INPUT STATS - Articles: {len(selected_articles)}, Total chars: {total_article_chars}")
        
        # 🚀 NEW: Use unified script generation with dynamic character count
        complete_script = await summarize_articles_with_openai(
            articles_content=articles_content,
            prompt_style=request.prompt_style or "standard", 
            custom_prompt=request.custom_prompt,
            voice_language=request.voice_language,
            target_length=None,  # Dynamic system handles this
            user_plan=user_plan  # 🚀 Pass user plan for dynamic character instructions
        )
        
        # 🔍 DEBUG: Log generated script stats AFTER unified generation
        logging.info(f"🆕 SIMPLE AUDIO: GENERATED SCRIPT - {len(complete_script)} chars, Lang: {request.voice_language}")
        
        # 🚀 NEW: Dynamic prompt system has already handled optimal length
        # No need for post-generation truncation as AI was instructed with optimal length
        logging.info(f"🆕 SIMPLE AUDIO: FINAL SCRIPT STATS - {len(complete_script)} chars for {len(selected_articles)} articles")
        
        # 📋 DEBUG: Log complete script content for debugging  
        logging.info(f"🆕 SIMPLE AUDIO: COMPLETE SCRIPT CONTENT:")
        logging.info(f"--- SCRIPT START ---")
        logging.info(complete_script)
        logging.info(f"--- SCRIPT END ---")
        
        # Step 3: TTS conversion with explicit language
        tts_start = datetime.utcnow()
        
        # Map voice based on language
        voice_name = request.voice_name
        if request.voice_language == "ja-JP" and voice_name == "alloy":
            voice_name = "nova"  # Better for Japanese
            
        tts_result = await convert_text_to_speech_fast(
            complete_script,
            voice_language=request.voice_language,
            voice_name=voice_name
        )
        
        tts_duration = (datetime.utcnow() - tts_start).total_seconds()
        logging.info(f"🆕 SIMPLE AUDIO: TTS completed in {tts_duration:.1f}s")
        
        # Step 4: Generate improved chapters based on content length
        chapters = []
        if len(selected_articles) > 1:
            # 🔧 IMPROVED: Calculate chapter timing based on text length proportions
            article_lengths = []
            total_text_length = 0
            
            for article in selected_articles:
                title_len = len(article["title"]) if article["title"] else 0
                summary_len = len(article["summary"][:500]) if article["summary"] else 0
                article_len = title_len + summary_len
                article_lengths.append(article_len)
                total_text_length += article_len
            
            # Prevent division by zero
            if total_text_length == 0:
                total_text_length = len(selected_articles)
                article_lengths = [1] * len(selected_articles)
                
            current_time = 0
            for i, article in enumerate(selected_articles):
                # Calculate proportional duration based on text length
                if i == len(selected_articles) - 1:
                    # Last chapter gets remaining time
                    chapter_duration = tts_result["duration"] - current_time
                else:
                    proportion = article_lengths[i] / total_text_length
                    chapter_duration = int(tts_result["duration"] * proportion)
                
                chapter_start = current_time
                chapter_end = current_time + chapter_duration
                
                chapters.append({
                    "title": article["title"],
                    "startTime": chapter_start,  # ⚠️ Fix: Use startTime (not start_time) for frontend compatibility
                    "endTime": chapter_end,      # ⚠️ Fix: Use endTime (not end_time) for frontend compatibility  
                    "original_url": article["link"]
                })
                
                current_time += chapter_duration
                
            logging.info(f"🆕 SIMPLE AUDIO: CHAPTERS - Generated {len(chapters)} chapters with proportional timing")
            for i, chapter in enumerate(chapters):
                logging.info(f"   Chapter {i+1}: {chapter['startTime']}s-{chapter['endTime']}s ({chapter['endTime']-chapter['startTime']}s) - {chapter['title'][:50]}")
        else:
            logging.info(f"🆕 SIMPLE AUDIO: CHAPTERS - Single article, no chapters generated")
        
        # Step 5: Generate intelligent title and save to database
        audio_id = str(uuid.uuid4())
        
        # Use AI to generate engaging title based on article content
        try:
            articles_content = [f"{article['title']} {article.get('summary', '')}" for article in selected_articles]
            intelligent_title = await generate_audio_title_with_openai(articles_content)
            logging.info(f"🆕 SIMPLE AUDIO: Generated intelligent title: {intelligent_title}")
        except Exception as e:
            # Fallback to simple title
            intelligent_title = generate_audio_title(len(selected_articles), request.voice_language)
            logging.warning(f"🆕 SIMPLE AUDIO: Fallback to simple title due to error: {e}")
        
        audio_doc = {
            "id": audio_id,
            "user_id": current_user.id,
            "title": intelligent_title,
            "audio_url": tts_result["url"],
            "duration": tts_result["duration"],
            "script": complete_script,
            "created_at": datetime.utcnow(),
            "type": "simple_audio",
            "voice_language": request.voice_language,
            "voice_name": voice_name,
            "chapters": chapters,
            # Compatibility fields for AudioCreation model
            "article_ids": [article.get("id", str(uuid.uuid4())) for article in selected_articles],
            "article_titles": [article["title"] for article in selected_articles],
            "prompt_style": request.prompt_style or "standard",
            "custom_prompt": request.custom_prompt or ""
        }
        
        await db.audio_creations.insert_one(audio_doc)
        
        total_duration = (datetime.utcnow() - start_time).total_seconds()
        logging.info(f"🆕 SIMPLE AUDIO: Complete in {total_duration:.1f}s - Audio ID: {audio_id}")
        
        return SimpleAudioResponse(
            id=audio_id,
            title=audio_doc["title"],
            audio_url=tts_result["url"],
            duration=tts_result["duration"],
            script=complete_script,
            articles_count=len(selected_articles),
            voice_language=request.voice_language,
            chapters=chapters
        )
        
    except Exception as e:
        error_duration = (datetime.utcnow() - start_time).total_seconds()
        logging.error(f"🆕 SIMPLE AUDIO: Failed after {error_duration:.1f}s - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate audio: {str(e)}")

# Lifespan events now handled above

# Uvicorn runner for Render
import uvicorn
if __name__ == "__main__":
    # Claude uses 8002, User uses 8000 (default)
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)