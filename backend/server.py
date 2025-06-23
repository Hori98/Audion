from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
from datetime import datetime, timedelta
import feedparser
import asyncio
import aiofiles
import json

# AI Integration imports
import openai
from google.cloud import texttospeech

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
GOOGLE_CLOUD_API_KEY = os.environ.get('GOOGLE_CLOUD_API_KEY')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

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

class AudioCreation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    article_ids: List[str]
    article_titles: List[str]
    audio_url: str
    duration: int  # in seconds
    script: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AudioCreationRequest(BaseModel):
    article_ids: List[str]
    article_titles: List[str]
    custom_title: Optional[str] = None

# AI Helper Functions
async def summarize_articles_with_openai(articles_content: List[str]) -> str:
    """Use OpenAI to summarize multiple articles into a conversational script"""
    try:
        # APIキーが設定されていない、またはデモキーの場合はモック応答を返す
        if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
            logging.warning("OpenAI API key not found or is a placeholder. Returning mock response.")
            # (ここに以前と同じモック応答のreturn文が入りますが、簡潔にするため省略します)
            return "HOST 1: This is a mock response because the API key is not configured."

        # OpenAIクライアントを初期化
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)

        # システムメッセージとユーザーメッセージを定義
        system_message = "You are an expert news summarizer. Create an engaging conversational script between two professional news hosts discussing the provided articles. Make it sound natural and informative, like a real news podcast. Keep it around 200-300 words."

        combined_content = "\n\n--- Article ---\n\n".join(articles_content)
        user_message = f"Please create a conversational script between two news hosts discussing these articles:\n\n{combined_content}"

        # OpenAI APIを呼び出す
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
            model="gpt-4o",
        )

        # 応答テキストを返す
        return chat_completion.choices[0].message.content

    except Exception as e:
        logging.error(f"OpenAI summarization error: {e}")
        # エラー発生時も、フォールバックとしてモック応答を返す
        return "HOST 1: An error occurred during summarization. This is a fallback mock response."

async def convert_text_to_speech(text: str) -> str:
    """Convert text to speech using Google Cloud TTS"""
    try:
        if not GOOGLE_CLOUD_API_KEY or GOOGLE_CLOUD_API_KEY.startswith("AIzaSyDemo"):
            # Return mock audio URL for demo keys
            return create_mock_audio_file()
        
        # Initialize the TTS client
        # For demo purposes, we'll use a simple approach without service account
        # In production, you'd use proper service account authentication
        
        # Create mock audio file for now since we need service account for real TTS
        logging.warning("Using mock audio - configure Google Cloud service account for real TTS")
        return create_mock_audio_file()
        
    except Exception as e:
        logging.error(f"TTS conversion error: {e}")
        return create_mock_audio_file()

def create_mock_audio_file() -> str:
    """Create a mock audio file for demo purposes"""
    audio_filename = f"audio_{uuid.uuid4()}.mp3"
    audio_path = f"audio_files/{audio_filename}"
    
    # Create audio directory if it doesn't exist
    os.makedirs("audio_files", exist_ok=True)
    
    # Create a longer mock audio content to simulate real audio
    mock_audio_content = b"MOCK_AUDIO_DATA_FOR_PODCAST_STYLE_CONTENT" * 100
    
    with open(audio_path, "wb") as f:
        f.write(mock_audio_content)
    
    return f"/api/audio/file/{audio_filename}"

# Simple auth helpers (mocked for MVP)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # Mock authentication - in real app, verify JWT token
    user = await db.users.find_one({"id": token})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return User(**user)

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(email=user_data.email)
    await db.users.insert_one(user.dict())
    
    # Return mock token (user ID for simplicity)
    return {"access_token": user.id, "token_type": "bearer", "user": user}

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    user_obj = User(**user)
    return {"access_token": user_obj.id, "token_type": "bearer", "user": user_obj}

# RSS Source Routes
@api_router.get("/sources", response_model=List[RSSSource])
async def get_user_sources(current_user: User = Depends(get_current_user)):
    sources = await db.rss_sources.find({"user_id": current_user.id}).to_list(100)
    return [RSSSource(**source) for source in sources]

@api_router.post("/sources", response_model=RSSSource)
async def add_rss_source(source_data: RSSSourceCreate, current_user: User = Depends(get_current_user)):
    source = RSSSource(user_id=current_user.id, **source_data.dict())
    await db.rss_sources.insert_one(source.dict())
    return source

@api_router.delete("/sources/{source_id}")
async def delete_rss_source(source_id: str, current_user: User = Depends(get_current_user)):
    result = await db.rss_sources.delete_one({"id": source_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Source not found")
    return {"message": "Source deleted"}

# Article Feed Routes
@api_router.get("/articles", response_model=List[Article])
async def get_articles(current_user: User = Depends(get_current_user)):
    # Get user's RSS sources
    sources = await db.rss_sources.find({"user_id": current_user.id}).to_list(100)
    
    all_articles = []
    
    for source in sources:
        try:
            # Parse RSS feed
            feed = feedparser.parse(source["url"])
            
            for entry in feed.entries[:10]:  # Limit to 10 articles per source
                article = Article(
                    id=str(uuid.uuid4()),
                    title=entry.title if hasattr(entry, 'title') else "No Title",
                    summary=entry.summary if hasattr(entry, 'summary') else entry.description if hasattr(entry, 'description') else "No summary available",
                    link=entry.link if hasattr(entry, 'link') else "",
                    published=entry.published if hasattr(entry, 'published') else "Unknown",
                    source_name=source["name"],
                    content=entry.summary if hasattr(entry, 'summary') else entry.description if hasattr(entry, 'description') else "No content available"
                )
                all_articles.append(article)
        except Exception as e:
            print(f"Error parsing RSS feed {source['url']}: {e}")
            continue
    
    # Sort by published date (mock sorting)
    return all_articles[:50]  # Return top 50 articles

# Audio Creation Routes
@api_router.post("/audio/create", response_model=AudioCreation)
async def create_audio(request: AudioCreationRequest, current_user: User = Depends(get_current_user)):
    try:
        # Get the full articles content for summarization
        articles_content = []
        
        # For demo purposes, we'll create mock content based on titles
        # In a real implementation, you'd fetch the full article content
        for title in request.article_titles:
            articles_content.append(f"Article: {title}\n\nThis is the full content of the article discussing various aspects of {title.lower()}...")
        
        logging.info(f"Starting AI pipeline for {len(articles_content)} articles")
        
        # Step 1: Use OpenAI to create conversational script
        logging.info("Step 1: Generating conversational script with OpenAI...")
        script = await summarize_articles_with_openai(articles_content)
        
        # Step 2: Convert script to audio using Google TTS
        logging.info("Step 2: Converting script to audio with Google TTS...")
        audio_url = await convert_text_to_speech(script)
        
        # Create title
        title = request.custom_title or f"AI News Summary - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        # Save audio creation record
        audio_creation = AudioCreation(
            user_id=current_user.id,
            title=title,
            article_ids=request.article_ids,
            article_titles=request.article_titles,
            audio_url=audio_url,
            duration=180,  # Estimated 3 minutes
            script=script
        )
        
        await db.audio_creations.insert_one(audio_creation.dict())
        
        logging.info(f"Audio creation completed: {audio_creation.id}")
        return audio_creation
        
    except Exception as e:
        logging.error(f"Audio creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create audio: {str(e)}")

@api_router.get("/audio/library", response_model=List[AudioCreation])
async def get_audio_library(current_user: User = Depends(get_current_user)):
    audio_list = await db.audio_creations.find({"user_id": current_user.id}).sort("created_at", -1).to_list(100)
    return [AudioCreation(**audio) for audio in audio_list]

@api_router.get("/audio/file/{filename}")
async def get_audio_file(filename: str):
    file_path = f"audio_files/{filename}"
    if not os.path.exists(file_path):
        # Return a sample audio URL for demo purposes
        return {"audio_url": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"}
    
    return FileResponse(file_path, media_type="audio/mpeg")

@api_router.delete("/audio/{audio_id}")
async def delete_audio(audio_id: str, current_user: User = Depends(get_current_user)):
    result = await db.audio_creations.delete_one({"id": audio_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Audio not found")
    return {"message": "Audio deleted"}

@api_router.put("/audio/{audio_id}/rename")
async def rename_audio(audio_id: str, new_title: str, current_user: User = Depends(get_current_user)):
    result = await db.audio_creations.update_one(
        {"id": audio_id, "user_id": current_user.id},
        {"$set": {"title": new_title}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Audio not found")
    return {"message": "Audio renamed"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Create indexes for better performance
    await db.users.create_index("email", unique=True)
    await db.rss_sources.create_index([("user_id", 1)])
    await db.audio_creations.create_index([("user_id", 1), ("created_at", -1)])
    
    # Log API key status
    if OPENAI_API_KEY:
        if OPENAI_API_KEY.startswith("sk-demo"):
            logger.warning("Using demo OpenAI API key - replace with real key for actual AI functionality")
        else:
            logger.info("OpenAI API key configured")
    else:
        logger.warning("No OpenAI API key found")
        
    if GOOGLE_CLOUD_API_KEY:
        if GOOGLE_CLOUD_API_KEY.startswith("AIzaSyDemo"):
            logger.warning("Using demo Google Cloud API key - replace with real key for actual TTS functionality")
        else:
            logger.info("Google Cloud API key configured")
    else:
        logger.warning("No Google Cloud API key found")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

import uvicorn
import os

if __name__ == "__main__":
    # Renderが提供するPORT環境変数を取得。もしなければ、デフォルトで8000番を使う。
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)