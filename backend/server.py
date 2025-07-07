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

# AI Integration imports
import openai
from google.cloud import texttospeech
import google.auth.credentials
import google.auth.transport.requests
from google.oauth2 import service_account Z

from mutagen.mp3 import MP3
from vercel_blob import put
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Create the main app
app = FastAPI()

# Security
security = HTTPBearer()

# Pydantic Models (The same as before)
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
    duration: int
    script: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AudioCreationRequest(BaseModel):
    article_ids: List[str]
    article_titles: List[str]
    custom_title: Optional[str] = None

class RenameRequest(BaseModel):
    new_title: str

from mutagen.mp3 import MP3

# AI Helper Functions
def initialize_google_credentials():
    """
    環境変数からGoogle認証情報を読み込み、認証情報オブジェクトを返す。
    """
    creds_json_str = os.environ.get('GOOGLE_CREDENTIAL_JSON')
    if not creds_json_str:
        logging.warning("GOOGLE_CREDENTIAL_JSON is not set. TTS will use mock audio.")
        return None
    try:
        creds_info = json.loads(creds_json_str)
        credentials = service_account.Credentials.from_service_account_info(creds_info)
        return credentials
    except Exception as e:
        logging.error(f"Failed to load Google credentials: {e}")
        return None

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
    audio_filename = f"audio_{uuid.uuid4()}.mp3"
    audio_path = Path("/tmp") / audio_filename
    audio_path.parent.mkdir(parents=True, exist_ok=True)
    mock_audio_content = b"MOCK_AUDIO_DATA_FOR_PODCAST_STYLE_CONTENT" * 100
    with open(audio_path, "wb") as f:
        f.write(mock_audio_content)
    return f"/api/audio/file/{audio_filename}", 180

# 置き換え後のコード
async def convert_text_to_speech(text: str) -> dict:
    try:
        tts_client = texttospeech.TextToSpeechAsyncClient()
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(language_code="en-US", ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL)
        audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
        response = await tts_client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)

        # mutagenで再生時間を取得
        audio_stream = io.BytesIO(response.audio_content)
        audio_info = MP3(audio_stream)
        duration = int(audio_info.info.length)

        audio_filename = f"audio_{uuid.uuid4()}.mp3"

        # Vercel Blobに公開設定でアップロード
        blob_result = await put(
            f'audio/{audio_filename}',
            response.audio_content,
            options={'access': 'public'}
        )
        
        public_url = blob_result['url']
        logging.info(f"Audio content uploaded to Vercel Blob: {public_url}")
        
        # URLと再生時間の両方を返す
        return {"url": public_url, "duration": duration}

    except Exception as e:
        logging.error(f"TTS conversion or Blob upload error: {e}")
        # エラー時はモックファイルを返し、再生時間は0とする
        return {"url": create_mock_audio_file(), "duration": 0}

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
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Source not found")
    return {"message": "Source deleted"}

@app.get("/api/articles", response_model=List[Article], tags=["Articles"])
async def get_articles(current_user: User = Depends(get_current_user)):
    sources = await db.rss_sources.find({"user_id": current_user.id}).to_list(100)
    all_articles = []
    for source in sources:
        try:
            feed = feedparser.parse(source["url"])
            for entry in feed.entries[:10]:
                all_articles.append(Article(
                    id=str(uuid.uuid4()),
                    title=getattr(entry, 'title', "No Title"),
                    summary=getattr(entry, 'summary', getattr(entry, 'description', "No summary available")),
                    link=getattr(entry, 'link', ""),
                    published=getattr(entry, 'published', "Unknown"),
                    source_name=source["name"],
                    content=getattr(entry, 'summary', getattr(entry, 'description', "No content available"))
                ))
        except Exception as e:
            logging.warning(f"Error parsing RSS feed {source['url']}: {e}")
            continue
    return sorted(all_articles, key=lambda x: x.published, reverse=True)[:50]

# 置き換え後のコード
@app.post("/api/audio/create", response_model=AudioCreation, tags=["Audio"])
async def create_audio(request: AudioCreationRequest, current_user: User = Depends(get_current_user)):
    try:
        # (要約部分のロジックは変更なし)
        articles_content = [f"Article: {title}\n\nThis is the full content of the article..." for title in request.article_titles]
        script = await summarize_articles_with_openai(articles_content)
        
        # 音声化処理を呼び出し、URLと再生時間を取得
        audio_data = await convert_text_to_speech(script)
        audio_url = audio_data['url']
        duration = audio_data['duration']

        title = request.custom_title or f"AI News Summary - {datetime.now().strftime('%Y-%m-%d')}"
        
        # データベースに保存するオブジェクトを作成
        audio_creation = AudioCreation(
            user_id=current_user.id, 
            title=title, 
            article_ids=request.article_ids,
            article_titles=request.article_titles, 
            audio_url=audio_url,  # 取得したURLを保存
            duration=duration,    # 取得した再生時間を保存
            script=script
        )
        
        await db.audio_creations.insert_one(audio_creation.dict())
        return audio_creation
    except Exception as e:
        logging.error(f"Audio creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/audio/library", response_model=List[AudioCreation], tags=["Audio"])
async def get_audio_library(current_user: User = Depends(get_current_user)):
    audio_list = await db.audio_creations.find({"user_id": current_user.id}).sort("created_at", -1).to_list(100)
    return [AudioCreation(**audio) for audio in audio_list]

@app.get("/api/audio/file/{filename}", tags=["Audio"])
async def get_audio_file(filename: str):
    file_path = Path("/tmp") / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found or has been cleared by a new deploy.")
    return FileResponse(str(file_path))

@app.delete("/api/audio/{audio_id}", tags=["Audio"])
async def delete_audio(audio_id: str, current_user: User = Depends(get_current_user)):
    result = await db.audio_creations.delete_one({"id": audio_id, "user_id": current_user.id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Audio not found")
    return {"message": "Audio deleted"}

@app.put("/api/audio/{audio_id}/rename", tags=["Audio"])
async def rename_audio(audio_id: str, request: RenameRequest, current_user: User = Depends(get_current_user)):
    result = await db.audio_creations.update_one(
        {"id": audio_id, "user_id": current_user.id},
        {"$set": {"title": request.new_title}}
    )
    if result.modified_count == 0: raise HTTPException(status_code=404, detail="Audio not found")
    return {"message": "Audio renamed"}

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.rss_sources.create_index([("user_id", 1)])
    await db.audio_creations.create_index([("user_id", 1), ("created_at", -1)])
    logging.info("Database indexes created.")
    if not OPENAI_API_KEY: logging.warning("OpenAI API key not found")
    if not os.environ.get('GOOGLE_CREDENTIAL_JSON'): logging.warning("Google Cloud credentials not found")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Uvicorn runner for Render
import uvicorn
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
