from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import feedparser
import asyncio
import aiofiles
import json
import time
import openai
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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'audion-audio-files')

# Create the main app
app = FastAPI()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for debugging
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

class RSSSource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    url: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RSSSourceCreate(BaseModel):
    name: str
    url: str

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
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AudioCreationRequest(BaseModel):
    article_ids: List[str]
    article_titles: List[str]
    custom_title: Optional[str] = None

class RenameRequest(BaseModel):
    new_title: str

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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AutoPickRequest(BaseModel):
    max_articles: Optional[int] = 5
    preferred_genres: Optional[List[str]] = None

class UserInteraction(BaseModel):
    article_id: str
    interaction_type: str  # "liked", "disliked", "created_audio", "skipped", "completed", "saved", "partial_play", "quick_exit"
    genre: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[dict] = None  # For additional context like play_duration, completion_percentage

# AI Helper Functions
def classify_genre(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    genre = "General"
    if any(keyword in text for keyword in ["tech", "technology", "ai", "artificial intelligence", "software", "startup", "innovation"]):
        genre = "Technology"
    elif any(keyword in text for keyword in ["finance", "economy", "market", "stock", "business", "investment"]):
        genre = "Finance"
    elif any(keyword in text for keyword in ["sport", "game", "team", "match", "athlete"]):
        genre = "Sports"
    elif any(keyword in text for keyword in ["politics", "government", "election", "law", "policy"]):
        genre = "Politics"
    elif any(keyword in text for keyword in ["health", "medical", "disease", "hospital", "doctor"]):
        genre = "Health"
    elif any(keyword in text for keyword in ["entertainment", "movie", "music", "celebrity", "art", "culture"]):
        genre = "Entertainment"
    elif any(keyword in text for keyword in ["science", "research", "discovery", "space", "biology", "physics"]):
        genre = "Science"
    elif any(keyword in text for keyword in ["environment", "climate", "nature", "ecology", "sustainability"]):
        genre = "Environment"
    elif any(keyword in text for keyword in ["education", "school", "university", "student", "learning"]):
        genre = "Education"
    elif any(keyword in text for keyword in ["travel", "tourism", "destination", "vacation", "trip"]):
        genre = "Travel"
    logging.info(f"Classifying: \"{title[:50]}...\" -> {genre}")
    return genre

async def summarize_articles_with_openai(articles_content: List[str]) -> str:
    try:
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
            return "HOST 1: This is a mock response because the API key is not configured."
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        system_message = "You are an expert news summarizer. Create an engaging conversational script between two professional news hosts discussing the provided articles. Make it sound natural and informative, like a real news podcast. Keep it around 200-300 words."
        combined_content = "\n\n--- Article ---\n\n".join(articles_content)
        user_message = f"Please create a conversational script between two news hosts discussing these articles:\n\n{combined_content}"
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "system", "content": system_message}, {"role": "user", "content": user_message}],
            model="gpt-4o",
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        logging.error(f"OpenAI summarization error: {e}")
        return "HOST 1: An error occurred during summarization. This is a fallback mock response."

def create_mock_audio_file() -> tuple[str, int]:
    dummy_audio_url = "https://6yzcao8mrwa5n5rr.public.blob.vercel-storage.com/SampleAudio_0.4mb.mp3"
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

async def convert_text_to_speech(text: str) -> dict:
    try:
        logging.info(f"Starting TTS conversion for text length: {len(text)}")
        logging.info(f"OpenAI API Key available: {bool(OPENAI_API_KEY)}")
        logging.info(f"Vercel Blob Token available: {bool(os.environ.get('BLOB_READ_WRITE_TOKEN'))}")
        
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.audio.speech.create(
            model="tts-1",
            voice="alloy",
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
        "disliked": -0.12       # Strongest negative signal
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
        elif len(article.title + (article.description or '')) < 200:  # Shorter articles
            time_bonus = 0.1
    
    # Evening (18-22): Prefer deeper, analytical content
    elif 18 <= current_hour <= 22:
        if article.genre in ['technology', 'science', 'culture', 'analysis']:
            time_bonus = 0.2
        elif len(article.title + (article.description or '')) > 300:  # Longer articles
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
    token = credentials.credentials
    user = await db.users.find_one({"id": token})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    return User(**user)

# === API Endpoints ===

@app.post("/api/auth/register", tags=["Auth"])
async def register(user_data: UserCreate):
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=user_data.email)
    await db.users.insert_one(user.dict())
    return {"access_token": user.id, "token_type": "bearer", "user": user}

@app.post("/api/auth/login", tags=["Auth"])
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    user_obj = User(**user)
    return {"access_token": user_obj.id, "token_type": "bearer", "user": user_obj}

@app.get("/api/sources", response_model=List[RSSSource], tags=["RSS"])
async def get_user_sources(current_user: User = Depends(get_current_user)):
    sources = await db.rss_sources.find({"user_id": current_user.id}).to_list(100)
    return [RSSSource(**source) for source in sources]

@app.post("/api/sources", response_model=RSSSource, tags=["RSS"])
async def add_rss_source(source_data: RSSSourceCreate, current_user: User = Depends(get_current_user)):
    source = RSSSource(user_id=current_user.id, **source_data.dict())
    await db.rss_sources.insert_one(source.dict())
    return source

@app.delete("/api/sources/{source_id}", tags=["RSS"])
async def delete_rss_source(source_id: str, current_user: User = Depends(get_current_user)):
    result = await db.rss_sources.delete_one({"id": source_id, "user_id": current_user.id})
    if result.deleted_count == 0: 
        raise HTTPException(status_code=404, detail="Source not found")
    return {"message": "Source deleted"}

@app.get("/api/articles", response_model=List[Article], tags=["Articles"])
async def get_articles(current_user: User = Depends(get_current_user), genre: Optional[str] = None):
    sources = await db.rss_sources.find({"user_id": current_user.id}).to_list(100)
    all_articles = []
    for source in sources:
        try:
            cache_key = source["url"]
            current_time = time.time()

            if cache_key in RSS_CACHE and (current_time - RSS_CACHE[cache_key]['timestamp'] < CACHE_EXPIRY_SECONDS):
                feed = RSS_CACHE[cache_key]['feed']
                logging.info(f"Using cached feed for {source['name']}")
            else:
                feed = feedparser.parse(source["url"])
                RSS_CACHE[cache_key] = {'feed': feed, 'timestamp': current_time}
                logging.info(f"Fetched new feed for {source['name']}")

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
                    source_name=source["name"],
                    content=getattr(entry, 'summary', getattr(entry, 'description', "No content available")),
                    genre=article_genre
                ))
        except Exception as e:
            logging.warning(f"Error parsing RSS feed {source['url']}: {e}")
            continue
    
    logging.info(f"Fetched {len(all_articles)} articles before filtering.")
    if genre:
        all_articles = [article for article in all_articles if article.genre and article.genre.lower() == genre.lower()]
        logging.info(f"Filtered to {len(all_articles)} articles for genre: {genre}")

    return sorted(all_articles, key=lambda x: x.published, reverse=True)[:50]

@app.post("/api/audio/create", response_model=AudioCreation, tags=["Audio"])
async def create_audio(request: AudioCreationRequest, current_user: User = Depends(get_current_user)):
    try:
        articles_content = [f"Article: {title}\n\nThis is the full content of the article..." for title in request.article_titles]
        script = await summarize_articles_with_openai(articles_content)
        
        audio_data = await convert_text_to_speech(script)
        audio_url = audio_data['url']
        duration = audio_data['duration']

        title = request.custom_title or f"AI News Summary - {datetime.now().strftime('%Y-%m-%d')}"
        
        audio_creation = AudioCreation(
            user_id=current_user.id, 
            title=title, 
            article_ids=request.article_ids,
            article_titles=request.article_titles, 
            audio_url=audio_url,
            duration=duration,
            script=script
        )
        logging.info(f"Saving AudioCreation to DB with audio_url: {audio_creation.audio_url}")
        
        await db.audio_creations.insert_one(audio_creation.dict())
        return audio_creation
    except Exception as e:
        logging.error(f"Audio creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/audio/library", response_model=List[AudioCreation], tags=["Audio"])
async def get_audio_library(current_user: User = Depends(get_current_user)):
    audio_list = await db.audio_creations.find({"user_id": current_user.id}).sort("created_at", -1).to_list(100)
    return [AudioCreation(**audio) for audio in audio_list]

@app.delete("/api/audio/{audio_id}", tags=["Audio"])
async def delete_audio(audio_id: str, current_user: User = Depends(get_current_user)):
    result = await db.audio_creations.delete_one({"id": audio_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Audio not found")
    return {"message": "Audio deleted"}

@app.put("/api/audio/{audio_id}/rename", tags=["Audio"])
async def rename_audio(audio_id: str, request: RenameRequest, current_user: User = Depends(get_current_user)):
    result = await db.audio_creations.update_one(
        {"id": audio_id, "user_id": current_user.id},
        {"$set": {"title": request.new_title}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Audio not found")
    return {"message": "Audio renamed"}

# Auto-Pick Endpoints
@app.post("/api/auto-pick", response_model=List[Article], tags=["Auto-Pick"])
async def get_auto_picked_articles(request: AutoPickRequest, current_user: User = Depends(get_current_user)):
    """Get auto-picked articles based on user preferences"""
    try:
        # Get user's RSS sources first
        sources = await db.rss_sources.find({"user_id": current_user.id}).to_list(100)
        if not sources:
            raise HTTPException(status_code=404, detail="No RSS sources found. Please add some sources first.")
        
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
        logging.error(f"Auto-pick error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user-profile", response_model=UserProfile, tags=["Auto-Pick"])
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """Get user's personalization profile"""
    profile = await get_or_create_user_profile(current_user.id)
    return profile

@app.post("/api/user-interaction", tags=["Auto-Pick"])
async def record_user_interaction(interaction: UserInteraction, current_user: User = Depends(get_current_user)):
    """Record user interaction to improve recommendations"""
    try:
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
        articles_content = [f"Article: {article.title}\n\n{article.summary}" for article in picked_articles]
        script = await summarize_articles_with_openai(articles_content)
        
        audio_data = await convert_text_to_speech(script)
        audio_url = audio_data['url']
        duration = audio_data['duration']

        title = f"Auto-Pick Podcast - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        audio_creation = AudioCreation(
            user_id=current_user.id, 
            title=title, 
            article_ids=[article.id for article in picked_articles],
            article_titles=[article.title for article in picked_articles], 
            audio_url=audio_url,
            duration=duration,
            script=script
        )
        
        await db.audio_creations.insert_one(audio_creation.dict())
        
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

@app.on_event("startup")
async def startup_event():
    logging.info("--- SERVER STARTUP ---")
    await db.users.create_index("email", unique=True)
    await db.rss_sources.create_index([("user_id", 1)])
    await db.audio_creations.create_index([("user_id", 1), ("created_at", -1)])
    await db.user_profiles.create_index("user_id", unique=True)
    await db.user_profiles.create_index([("user_id", 1), ("updated_at", -1)])
    logging.info("Database indexes created.")
    if not OPENAI_API_KEY: 
        logging.warning("OpenAI API key not found")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Uvicorn runner for Render
import uvicorn
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)