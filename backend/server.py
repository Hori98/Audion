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

@app.on_event("startup")
async def startup_event():
    logging.info("--- SERVER STARTUP ---")
    await db.users.create_index("email", unique=True)
    await db.rss_sources.create_index([("user_id", 1)])
    await db.audio_creations.create_index([("user_id", 1), ("created_at", -1)])
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