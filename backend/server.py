from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Tuple
import uuid
from datetime import datetime
import feedparser
import asyncio
import aiofiles
import json
import time
import openai
import re
import random
from collections import Counter
from mutagen.mp3 import MP3
import io
import boto3
from botocore.exceptions import ClientError
import random
import math

# Global cache for RSS feeds
RSS_CACHE = {}
CACHE_EXPIRY_SECONDS = 300  # Cache for 5 minutes

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
    client.close()
    logging.info("Disconnected from MongoDB")

# Create the main app
app = FastAPI(lifespan=lifespan)

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

@app.get("/api/health", tags=["Health Check"])
def health_check():
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
        "diversity_enabled": True,
        "max_per_genre": 2,
        "preferred_genres": [],
        "excluded_genres": [],
        "min_reading_time": 1,
        "max_reading_time": 15,
        "require_images": False,
        "source_priority": "balanced",
        "recency_weight": 0.3,
        "popularity_weight": 0.2,
        "personalization_weight": 0.5
    })
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AutoPickRequest(BaseModel):
    max_articles: Optional[int] = 5
    preferred_genres: Optional[List[str]] = None
    active_source_ids: Optional[List[str]] = None  # Explicitly specify which sources to use

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
            logging.warning(f"No genre scores calculated for: {title[:50]}...")
            return "General"
        
        # Sort genres by score (highest first)
        sorted_genres = sorted(genre_scores.items(), key=lambda x: x[1], reverse=True)
        
        if not sorted_genres:
            logging.warning(f"No sorted genres for: {title[:50]}...")
            return "General"
        
        top_genre, top_score = sorted_genres[0]
        
        # Apply confidence threshold
        if top_score >= confidence_threshold:
            result_genre = top_genre
        else:
            result_genre = "General"
        
        # Enhanced logging with top 3 scores
        score_summary = ", ".join([f"{genre}: {score:.1f}" for genre, score in sorted_genres[:3] if score > 0])
        logging.info(f"Enhanced Classification: \"{title[:50]}...\" -> {result_genre} (scores: {score_summary})")
        
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

def get_system_message_by_prompt_style(prompt_style: str = "recommended", custom_prompt: str = None, voice_language: str = "en-US") -> str:
    """Get system message based on prompt style and voice language"""
    
    # Define prompts by language
    if voice_language == "ja-JP":
        # Japanese prompts
        prompt_styles_ja = {
            "strict": "正確で事実に基づいた日本語ニュース原稿を作成してください。推測や主観は避け、確認された情報のみを報告し、200-250語で簡潔にまとめてください。単一ナレーター向けに、スピーカーラベルや対話形式は使用せず、自然な日本語の話し言葉で構成してください。",
            "recommended": "専門的でクリアな日本語ニュース原稿を単一ナレーター向けに作成してください。重要情報を分かりやすく整理し、200-300語で自然な日本語の話し言葉で構成してください。スピーカーラベルや対話形式は使用せず、音声ナレーション用の日本語原稿として作成してください。",
            "friendly": "分かりやすく親しみやすい日本語ニュース原稿を作成してください。専門用語は簡単に説明し、背景情報も含めて初心者でも理解できるよう250-350語で丁寧に日本語で解説してください。単一ナレーター向けに、スピーカーラベルは使用せず、自然で親しみやすい日本語の話し言葉で構成してください。",
            "insight": "ニュースの背景分析と今後への影響を重視した日本語原稿を作成してください。事実に加えて、専門的な洞察や市場・社会への意味も含め、300-400語で深い理解を提供する日本語原稿を作成してください。単一ナレーター向けに、分析的で洞察に富んだ日本語の話し言葉で構成してください。",
            "custom": custom_prompt or "専門的でクリアな日本語ニュース原稿を単一ナレーター向けに作成してください。重要情報を分かりやすく整理し、200-300語で自然な日本語の話し言葉で構成してください。"
        }
        return prompt_styles_ja.get(prompt_style, prompt_styles_ja["recommended"])
    else:
        # English prompts
        prompt_styles_en = {
            "strict": "Create an accurate, fact-based English news script. Avoid speculation or personal opinions, report only verified information, and keep it concise at 200-250 words. Format for a single narrator without speaker labels or dialogue, using natural spoken English.",
            "recommended": "Create a professional and clear English news script for a single narrator. Organize important information clearly and structure it in 200-300 words using natural spoken English. Do not use speaker labels or dialogue format - create as an audio narration script.",
            "friendly": "Create an easy-to-understand and approachable English news script. Explain technical terms simply and include background information so beginners can understand, providing a comprehensive explanation in 250-350 words. Format for a single narrator without speaker labels, using natural and friendly spoken English.",
            "insight": "Create an English news script focusing on background analysis and future implications. Include facts plus professional insights and market/social significance, providing deep understanding in 300-400 words. Format for a single narrator with analytical and insightful spoken English.",
            "custom": custom_prompt or "Create a professional and clear English news script for a single narrator. Organize important information clearly and structure it in 200-300 words using natural spoken English."
        }
        return prompt_styles_en.get(prompt_style, prompt_styles_en["recommended"])

async def summarize_articles_with_openai(articles_content: List[str], prompt_style: str = "recommended", custom_prompt: str = None, voice_language: str = "en-US") -> str:
    try:
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
            return "Breaking news today as technology companies continue to shape our digital landscape. Recent developments include major updates to artificial intelligence systems and significant changes in social media platforms. Industry analysts report growing investments in sustainable technology solutions, while cybersecurity experts emphasize the importance of data protection in an increasingly connected world. These developments signal continued innovation across the tech sector."
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        system_message = get_system_message_by_prompt_style(prompt_style, custom_prompt, voice_language)
        combined_content = "\n\n--- Article ---\n\n".join(articles_content)
        user_message = f"Please create a single-narrator news script summarizing these articles:\n\n{combined_content}\n\nWrite only the script content without any speaker labels, host names, or dialogue markers."
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "system", "content": system_message}, {"role": "user", "content": user_message}],
            model="gpt-4o",
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        logging.error(f"OpenAI summarization error: {e}")
        return "An error occurred during summarization. We apologize for the technical difficulty and are working to resolve the issue. Please try again shortly for the latest news updates."

def create_mock_audio_file() -> tuple[str, int]:
    dummy_audio_url = "http://localhost:8001/audio_files/SampleAudio_0.4mb.mp3"
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
        
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.audio.speech.create(
            model="tts-1",
            voice=voice_name,
            input=text,
        )
        logging.info("OpenAI TTS request completed successfully")
        
        logging.info(f"Type of OpenAI TTS response: {type(response)}")
        logging.info(f"Type of response.content: {type(response.content)}")

        audio_content = b''
        if hasattr(response.content, '__aiter__'):
            async for chunk in response.content.aiter_bytes():
                audio_content += chunk
            logging.info("Read audio_content from async stream.")
        elif isinstance(response.content, bytes):
            audio_content = response.content
            logging.info("Assumed audio_content is already bytes.")
        else:
            raise TypeError(f"Unexpected type for response.content: {type(response.content)}")

        logging.info(f"Type of audio_content after processing: {type(audio_content)}")
        logging.info(f"Length of audio_content: {len(audio_content)}")

        audio_stream = io.BytesIO(audio_content)
        audio_info = MP3(audio_stream)
        duration = int(audio_info.info.length)

        audio_filename = f"audio_{uuid.uuid4()}.mp3"
        logging.info(f"Processing audio file: {audio_filename}, size: {len(audio_content)} bytes")

        # Debug: Log AWS credentials status
        logging.info(f"AWS_ACCESS_KEY_ID present: {bool(AWS_ACCESS_KEY_ID)}")
        logging.info(f"AWS_SECRET_ACCESS_KEY present: {bool(AWS_SECRET_ACCESS_KEY)}")
        logging.info(f"AWS_ACCESS_KEY_ID starts with: {AWS_ACCESS_KEY_ID[:10] if AWS_ACCESS_KEY_ID else 'None'}...")
        
        # Try S3 upload first, fallback to local storage
        if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_ACCESS_KEY_ID != "your-aws-access-key":
            try:
                logging.info("Attempting S3 upload...")
                public_url = await upload_to_s3(audio_content, audio_filename)
                logging.info(f"Successfully uploaded to S3: {public_url}")
            except Exception as s3_error:
                logging.warning(f"S3 upload failed, falling back to local storage: {s3_error}")
                # Fallback to local storage
                project_root = Path(__file__).parent.parent
                audio_dir = project_root / "audio_files"
                audio_dir.mkdir(exist_ok=True)
                
                audio_path = audio_dir / audio_filename
                with open(audio_path, 'wb') as f:
                    f.write(audio_content)
                
                public_url = f"http://localhost:8000/audio/{audio_filename}"
                logging.info(f"Fallback: Audio saved locally at {public_url}")
        else:
            logging.info(f"AWS condition failed - KEY:{bool(AWS_ACCESS_KEY_ID)} SECRET:{bool(AWS_SECRET_ACCESS_KEY)} NOT_DEFAULT:{AWS_ACCESS_KEY_ID != 'your-aws-access-key' if AWS_ACCESS_KEY_ID else False}")
            # Use local storage
            project_root = Path(__file__).parent.parent
            audio_dir = project_root / "audio_files"
            audio_dir.mkdir(exist_ok=True)
            
            audio_path = audio_dir / audio_filename
            with open(audio_path, 'wb') as f:
                f.write(audio_content)
            
            public_url = f"http://localhost:8000/audio/{audio_filename}"
            logging.info(f"Audio saved locally: {public_url}")
        
        return {"url": public_url, "duration": duration}

    except Exception as e:
        logging.error(f"OpenAI TTS conversion or Blob upload error: {e}")
        mock_url, mock_duration = create_mock_audio_file()
        return {"url": mock_url, "duration": mock_duration}

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

def calculate_article_score(article: Article, user_profile: UserProfile, selected_articles: List[Article] = None) -> float:
    """Enhanced hybrid scoring: Personal × Contextual × Diversity + Exploration"""
    
    # Core components
    personal_affinity = calculate_personal_affinity(article, user_profile)
    contextual_relevance = calculate_contextual_relevance(article, user_profile)
    diversity_factor = calculate_diversity_factor(article, user_profile, selected_articles)
    
    # Hybrid score calculation
    final_score = personal_affinity * contextual_relevance * diversity_factor
    
    # Exploration noise (larger range for better discovery)
    exploration_noise = random.uniform(-0.1, 0.1)
    final_score += exploration_noise
    
    return max(0.1, final_score)  # Ensure positive score

async def auto_pick_articles(user_id: str, all_articles: List[Article], max_articles: int = 5, preferred_genres: List[str] = None) -> List[Article]:
    """Enhanced Auto-pick with progressive selection for optimal diversity"""
    user_profile = await get_or_create_user_profile(user_id)
    
    # Filter by preferred genres if specified
    if preferred_genres:
        filtered_articles = [a for a in all_articles if a.genre in preferred_genres]
    else:
        filtered_articles = all_articles
    
    if not filtered_articles:
        return []
    
    selected_articles = []
    remaining_articles = filtered_articles.copy()
    
    # Progressive selection to ensure diversity
    for i in range(min(max_articles, len(filtered_articles))):
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
            remaining_articles.remove(selected_article)
    
    return selected_articles

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
    logging.info(f"DEBUG: Attempting authentication with token: {token}")
    
    user = await db.users.find_one({"id": token})
    logging.info(f"DEBUG: Found user: {user is not None}")
    
    if not user:
        logging.error(f"DEBUG: User not found for token: {token}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    
    logging.info(f"DEBUG: Returning user: {user.get('email', 'No email')}")
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

async def get_articles_internal(current_user: User, genre: Optional[str] = None, source: Optional[str] = None):
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
    
    sources = await db.rss_sources.find(source_filter).to_list(100)
    all_articles = []
    for source_doc in sources:
        try:
            cache_key = source_doc["url"]
            current_time = time.time()

            if cache_key in RSS_CACHE and (current_time - RSS_CACHE[cache_key]['timestamp'] < CACHE_EXPIRY_SECONDS):
                feed = RSS_CACHE[cache_key]['feed']
                logging.info(f"Using cached feed for {source_doc['name']}")
            else:
                feed = feedparser.parse(source_doc["url"])
                RSS_CACHE[cache_key] = {'feed': feed, 'timestamp': current_time}
                logging.info(f"Fetched new feed for {source_doc['name']}")

            for entry in feed.entries[:10]:
                article_title = getattr(entry, 'title', "No Title")
                article_summary = getattr(entry, 'summary', getattr(entry, 'description', "No summary available"))
                article_genre = classify_genre(article_title, article_summary)
                all_articles.append(Article(
                    id=str(uuid.uuid4()),
                    title=article_title,
                    summary=article_summary,
                    link=getattr(entry, 'link', ""),
                    published=time.strftime('%Y-%m-%dT%H:%M:%SZ', entry.published_parsed) if hasattr(entry, 'published_parsed') and entry.published_parsed else "",
                    source_name=source_doc["name"],
                    content=getattr(entry, 'summary', getattr(entry, 'description', "No content available")),
                    genre=article_genre
                ))
        except Exception as e:
            logging.warning(f"Error parsing RSS feed {source_doc['url']}: {e}")
            continue
    
    logging.info(f"Fetched {len(all_articles)} articles before filtering.")
    if genre:
        all_articles = [article for article in all_articles if article.genre and article.genre.lower() == genre.lower()]
        logging.info(f"Filtered to {len(all_articles)} articles for genre: {genre}")

    return sorted(all_articles, key=lambda x: x.published, reverse=True)[:50]

@app.post("/api/audio/create", response_model=AudioCreation, tags=["Audio"])
async def create_audio(request: AudioCreationRequest, current_user: User = Depends(get_current_user)):
    logging.info(f"=== AUDIO CREATION REQUEST RECEIVED ===")
    logging.info(f"User: {current_user.email}")
    logging.info(f"Article IDs: {request.article_ids}")
    logging.info(f"Article titles: {request.article_titles}")
    logging.info(f"Article URLs: {request.article_urls}")
    logging.info(f"Custom title: {request.custom_title}")
    
    # ✅ CHECK AUDIO CREATION LIMITS FIRST
    article_count = len(request.article_ids)
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
        for article_id in request.article_ids:
            article = await db.articles.find_one({"id": article_id})
            if article:
                content = f"Title: {article['title']}\nSummary: {article['summary']}\nSource: {article['source_name']}"
                articles_content.append(content)
        
        # Generate script and title based on actual content with prompt style
        script = await summarize_articles_with_openai(
            articles_content, 
            prompt_style=request.prompt_style or "recommended", 
            custom_prompt=request.custom_prompt,
            voice_language=request.voice_language or "en-US"
        )
        generated_title = await generate_audio_title_with_openai(articles_content)
        
        # Use user's voice language settings for TTS
        audio_data = await convert_text_to_speech(
            script, 
            voice_language=request.voice_language or "en-US",
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

@app.get("/api/audio/library", response_model=List[AudioCreation], tags=["Audio"])
async def get_audio_library(current_user: User = Depends(get_current_user)):
    audio_list = await db.audio_creations.find({"user_id": current_user.id}).sort("created_at", -1).to_list(100)
    return [AudioCreation(**audio) for audio in audio_list]

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
@app.post("/api/auto-pick", response_model=List[Article], tags=["Auto-Pick"])
async def get_auto_picked_articles(request: AutoPickRequest, current_user: User = Depends(get_current_user)):
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
        for source in sources:
            try:
                cache_key = source["url"]
                current_time = time.time()

                if cache_key in RSS_CACHE and (current_time - RSS_CACHE[cache_key]['timestamp'] < CACHE_EXPIRY_SECONDS):
                    feed = RSS_CACHE[cache_key]['feed']
                else:
                    feed = feedparser.parse(source["url"])
                    RSS_CACHE[cache_key] = {'feed': feed, 'timestamp': current_time}

                for entry in feed.entries[:20]:  # Get more articles for better selection
                    article_title = getattr(entry, 'title', "No Title")
                    article_summary = getattr(entry, 'summary', getattr(entry, 'description', "No summary available"))
                    article_genre = classify_genre(article_title, article_summary)
                    all_articles.append(Article(
                        id=str(uuid.uuid4()),
                        title=article_title,
                        summary=article_summary,
                        link=getattr(entry, 'link', ""),
                        published=time.strftime('%Y-%m-%dT%H:%M:%SZ', entry.published_parsed) if hasattr(entry, 'published_parsed') and entry.published_parsed else "",
                        source_name=source["name"],
                        content=getattr(entry, 'summary', getattr(entry, 'description', "No content available")),
                        genre=article_genre
                    ))
            except Exception as e:
                logging.warning(f"Error parsing RSS feed {source['url']}: {e}")
                continue
        
        if not all_articles:
            raise HTTPException(status_code=404, detail="No articles found from your RSS sources")
        
        # Use auto-pick algorithm to select best articles
        picked_articles = await auto_pick_articles(
            user_id=current_user.id,
            all_articles=all_articles,
            max_articles=request.max_articles,
            preferred_genres=request.preferred_genres
        )
        
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

@app.post("/api/auto-pick/create-audio", response_model=AudioCreation, tags=["Auto-Pick"])
async def create_auto_picked_audio(request: AutoPickRequest, current_user: User = Depends(get_current_user)):
    """Auto-pick articles and create audio in one step"""
    try:
        # Get auto-picked articles
        sources = await db.rss_sources.find({"user_id": current_user.id}).to_list(100)
        if not sources:
            raise HTTPException(status_code=404, detail="No RSS sources found")
        
        # Fetch articles (similar to auto-pick endpoint)
        all_articles = []
        for source in sources:
            try:
                cache_key = source["url"]
                current_time = time.time()

                if cache_key in RSS_CACHE and (current_time - RSS_CACHE[cache_key]['timestamp'] < CACHE_EXPIRY_SECONDS):
                    feed = RSS_CACHE[cache_key]['feed']
                else:
                    feed = feedparser.parse(source["url"])
                    RSS_CACHE[cache_key] = {'feed': feed, 'timestamp': current_time}

                for entry in feed.entries[:20]:
                    article_title = getattr(entry, 'title', "No Title")
                    article_summary = getattr(entry, 'summary', getattr(entry, 'description', "No summary available"))
                    article_genre = classify_genre(article_title, article_summary)
                    all_articles.append(Article(
                        id=str(uuid.uuid4()),
                        title=article_title,
                        summary=article_summary,
                        link=getattr(entry, 'link', ""),
                        published=time.strftime('%Y-%m-%dT%H:%M:%SZ', entry.published_parsed) if hasattr(entry, 'published_parsed') and entry.published_parsed else "",
                        source_name=source["name"],
                        content=getattr(entry, 'summary', getattr(entry, 'description', "No content available")),
                        genre=article_genre
                    ))
            except Exception as e:
                logging.warning(f"Error parsing RSS feed {source['url']}: {e}")
                continue
        
        # Auto-pick articles
        picked_articles = await auto_pick_articles(
            user_id=current_user.id,
            all_articles=all_articles,
            max_articles=request.max_articles or 3,
            preferred_genres=request.preferred_genres
        )
        
        if not picked_articles:
            raise HTTPException(status_code=404, detail="No suitable articles found for auto-pick")
        
        # Create audio from picked articles
        articles_content = [f"Title: {article.title}\nSummary: {article.summary}\nSource: {article.source_name}" for article in picked_articles]
        script = await summarize_articles_with_openai(
            articles_content, 
            prompt_style="recommended",  # Auto-pick uses default recommended style for now
            custom_prompt=None,
            voice_language="en-US"  # TODO: Auto-pick should use user's voice language preference
        )
        generated_title = await generate_audio_title_with_openai(articles_content)
        
        audio_data = await convert_text_to_speech(script)
        audio_url = audio_data['url']
        duration = audio_data['duration']

        title = generated_title
        
        # Generate chapters based on article count and duration
        chapters = []
        article_titles = [article.title for article in picked_articles]
        if len(article_titles) > 1:
            chapter_duration = duration // len(article_titles)
            for i, (article, article_title) in enumerate(zip(picked_articles, article_titles)):
                start_time = i * chapter_duration * 1000  # Convert to milliseconds
                end_time = ((i + 1) * chapter_duration if i < len(article_titles) - 1 else duration) * 1000  # Convert to milliseconds
                chapters.append({
                    "title": article_title,
                    "start_time": start_time,
                    "end_time": end_time,
                    "original_url": article.link
                })
        
        audio_creation = AudioCreation(
            user_id=current_user.id, 
            title=title, 
            article_ids=[article.id for article in picked_articles],
            article_titles=article_titles, 
            audio_url=audio_url,
            duration=duration,
            script=script,
            chapters=chapters,
            prompt_style="recommended",  # Auto-pick uses default recommended style
            custom_prompt=None
        )
        
        await db.audio_creations.insert_one(audio_creation.dict())
        
        # Auto-download the created audio
        auto_download = DownloadedAudio(
            user_id=current_user.id,
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
            await update_user_preferences(current_user.id, interaction)
        
        return audio_creation
        
    except Exception as e:
        logging.error(f"Auto-pick create audio error: {e}")
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
                feed = feedparser.parse(first_rss["url"])
                
                for entry in feed.entries[:3]:  # Take first 3 articles
                    sample_articles.append({
                        "title": entry.get('title', 'Sample Article'),
                        "summary": entry.get('summary', entry.get('description', 'Sample content'))[:200]
                    })
                
                if sample_articles:
                    # Generate welcome audio
                    articles_content = [f"Title: {article['title']}\nSummary: {article['summary']}" for article in sample_articles]
                    script = await summarize_articles_with_openai(
                        articles_content, 
                        prompt_style="friendly",  # Welcome audio uses friendly style
                        custom_prompt=None,
                        voice_language="en-US"  # TODO: Welcome audio should use user's voice language preference
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

AUDIO_LIMIT_CONFIGS = {
    "free": AudioLimitConfig(plan="free", max_daily_audio_count=3, max_audio_articles=3, description="Free tier - 3 articles per audio, 3 audios per day"),
    "premium": AudioLimitConfig(plan="premium", max_daily_audio_count=15, max_audio_articles=10, description="Premium tier - 10 articles per audio, 15 audios per day"),
    "pro": AudioLimitConfig(plan="pro", max_daily_audio_count=50, max_audio_articles=30, description="Pro tier - 30 articles per audio, 50 audios per day"),
    # Test configurations for validation
    "test_3": AudioLimitConfig(plan="test_3", max_daily_audio_count=10, max_audio_articles=3, description="Test: 3 articles per audio"),
    "test_5": AudioLimitConfig(plan="test_5", max_daily_audio_count=10, max_audio_articles=5, description="Test: 5 articles per audio"),
    "test_10": AudioLimitConfig(plan="test_10", max_daily_audio_count=10, max_audio_articles=10, description="Test: 10 articles per audio"),
    "test_15": AudioLimitConfig(plan="test_15", max_daily_audio_count=10, max_audio_articles=15, description="Test: 15 articles per audio"),
    "test_30": AudioLimitConfig(plan="test_30", max_daily_audio_count=10, max_audio_articles=30, description="Test: 30 articles per audio"),
    "test_60": AudioLimitConfig(plan="test_60", max_daily_audio_count=10, max_audio_articles=60, description="Test: 60 articles per audio"),
}

async def get_or_create_user_subscription(user_id: str) -> UserSubscription:
    """Get or create user subscription with default free plan"""
    if not db_connected:
        # Default limits when database is unavailable
        return UserSubscription(user_id=user_id, plan="free", max_daily_audio_count=3, max_audio_articles=3)
    
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    if not subscription:
        # Create default free subscription
        new_subscription = UserSubscription(user_id=user_id)
        await db.user_subscriptions.insert_one(new_subscription.dict())
        return new_subscription
    
    return UserSubscription(**subscription)

async def get_or_create_daily_usage(user_id: str, date_str: str) -> DailyAudioUsage:
    """Get or create daily usage record for user"""
    if not db_connected:
        return DailyAudioUsage(user_id=user_id, date=date_str)
    
    usage = await db.daily_audio_usage.find_one({"user_id": user_id, "date": date_str})
    if not usage:
        new_usage = DailyAudioUsage(user_id=user_id, date=date_str)
        await db.daily_audio_usage.insert_one(new_usage.dict())
        return new_usage
    
    return DailyAudioUsage(**usage)

async def check_audio_creation_limits(user_id: str, article_count: int) -> Tuple[bool, str, dict]:
    """Check if user can create audio with given article count
    Returns: (can_create, error_message, usage_info)"""
    
    subscription = await get_or_create_user_subscription(user_id)
    today_str = datetime.utcnow().strftime('%Y-%m-%d')
    daily_usage = await get_or_create_daily_usage(user_id, today_str)
    
    # Get plan limits
    plan_config = AUDIO_LIMIT_CONFIGS.get(subscription.plan, AUDIO_LIMIT_CONFIGS["free"])
    
    usage_info = {
        "plan": subscription.plan,
        "max_daily_audio_count": plan_config.max_daily_audio_count,
        "max_audio_articles": plan_config.max_audio_articles,
        "daily_audio_count": daily_usage.audio_count,
        "remaining_daily_audio": max(0, plan_config.max_daily_audio_count - daily_usage.audio_count),
        "can_create_audio": True,
        "article_limit_exceeded": False,
        "daily_limit_exceeded": False
    }
    
    # Check daily audio creation limit
    if daily_usage.audio_count >= plan_config.max_daily_audio_count:
        usage_info["daily_limit_exceeded"] = True
        usage_info["can_create_audio"] = False
        return False, f"Daily audio limit reached ({plan_config.max_daily_audio_count} audios per day). Upgrade your plan for more.", usage_info
    
    # Check articles per audio limit
    if article_count > plan_config.max_audio_articles:
        usage_info["article_limit_exceeded"] = True
        usage_info["can_create_audio"] = False
        return False, f"Too many articles selected. Your {subscription.plan} plan allows up to {plan_config.max_audio_articles} articles per audio.", usage_info
    
    return True, "", usage_info

async def record_audio_creation(user_id: str, article_count: int):
    """Record audio creation in daily usage"""
    if not db_connected:
        return
    
    today_str = datetime.utcnow().strftime('%Y-%m-%d')
    
    await db.daily_audio_usage.update_one(
        {"user_id": user_id, "date": today_str},
        {
            "$inc": {
                "audio_count": 1,
                "total_articles_processed": article_count
            },
            "$set": {"updated_at": datetime.utcnow()}
        },
        upsert=True
    )

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

@app.get("/api/archive/articles", response_model=List[ArchivedArticle], tags=["Archive"])
async def get_archived_articles(
    current_user: User = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
    folder: Optional[str] = None,
    read_status: Optional[str] = None,
    is_favorite: Optional[bool] = None,
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
        if read_status:
            query_filter["read_status"] = read_status
        if is_favorite is not None:
            query_filter["is_favorite"] = is_favorite
        if search:
            # Text search in title and summary
            query_filter["$text"] = {"$search": search}
        
        # Build sort criteria
        sort_direction = -1 if sort_order == "desc" else 1
        sort_criteria = [(sort_by, sort_direction)]
        
        # Execute query with pagination
        cursor = db.archived_articles.find(query_filter).sort(sort_criteria).skip(offset).limit(limit)
        archived_articles = await cursor.to_list(length=limit)
        
        return [ArchivedArticle(**article) for article in archived_articles]
        
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
        
        # Count by read status
        read_stats = await db.archived_articles.aggregate([
            {"$match": {"user_id": current_user.id}},
            {"$group": {"_id": "$read_status", "count": {"$sum": 1}}}
        ]).to_list(length=10)
        
        # Count by folder
        folder_stats = await db.archived_articles.aggregate([
            {"$match": {"user_id": current_user.id}},
            {"$group": {"_id": "$folder", "count": {"$sum": 1}}}
        ]).to_list(length=20)
        
        # Count favorites
        favorites_count = await db.archived_articles.count_documents({
            "user_id": current_user.id,
            "is_favorite": True
        })
        
        # Recent activity (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_count = await db.archived_articles.count_documents({
            "user_id": current_user.id,
            "archived_at": {"$gte": week_ago}
        })
        
        return {
            "total_articles": total_count,
            "favorites_count": favorites_count,
            "recent_week_count": recent_count,
            "read_status_breakdown": {item["_id"] or "unread": item["count"] for item in read_stats},
            "folder_breakdown": {item["_id"] or "unfiled": item["count"] for item in folder_stats}
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

# Lifespan events now handled above

# Uvicorn runner for Render
import uvicorn
if __name__ == "__main__":
    # Claude uses 8002, User uses 8000 (default)
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)