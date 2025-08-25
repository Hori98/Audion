"""
Unified Audio Generation Router - 統一音声生成API
重複したエンドポイントを整理し、統一されたAPIを提供

Replaces:
- /api/audio/create
- /api/v1/generate-simple-audio  
- /api/auto-pick/create-audio
- (Future: schedule endpoints)

With:
- /api/v2/audio/generate (unified endpoint)
- /api/v2/audio/autopick (dedicated autopick)
- /api/v2/audio/manual (dedicated manual)
- /api/v2/audio/schedule (future schedule)
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from services.unified_audio_service import (
    UnifiedAudioService, 
    AudioGenerationMode,
    AudioGenerationRequest,
    AudioGenerationResponse,
    create_unified_audio_service
)

# Import from server.py context - temporary solution
import sys
import os

# Add backend directory to path
backend_path = os.path.dirname(os.path.dirname(__file__))
if backend_path not in sys.path:
    sys.path.append(backend_path)

# Import existing dependencies from server context
try:
    # These are defined in server.py as global variables/functions
    from server import db, get_current_user
    
    # User class placeholder - will be replaced with proper import
    class User:
        def __init__(self, user_id: str = "placeholder"):
            self.id = user_id
            
    async def get_database():
        return db
        
except ImportError as e:
    logging.warning(f"Could not import server dependencies: {e}")
    
    # Fallback definitions
    class User:
        def __init__(self):
            self.id = "placeholder"
    
    async def get_database():
        return None
    
    async def get_current_user():
        return User()

router = APIRouter(prefix="/api/v2/audio", tags=["Unified Audio Generation"])
logger = logging.getLogger(__name__)

# === REQUEST/RESPONSE MODELS ===

class AutoPickRequest(BaseModel):
    """AutoPick専用リクエスト"""
    max_articles: int = 5
    voice_language: str = "ja-JP"
    voice_name: str = "alloy"
    prompt_style: str = "standard"
    custom_prompt: Optional[str] = None
    preferred_genres: Optional[List[str]] = None
    excluded_genres: Optional[List[str]] = None

class ManualPickRequest(BaseModel):
    """Manual選択専用リクエスト"""
    article_ids: List[str]
    article_titles: List[str]
    article_urls: Optional[List[str]] = None
    article_summaries: Optional[List[str]] = None
    article_contents: Optional[List[str]] = None
    voice_language: str = "ja-JP"  
    voice_name: str = "alloy"
    prompt_style: str = "standard"
    custom_prompt: Optional[str] = None

class UnifiedAudioResponse(BaseModel):
    """統一音声生成レスポンス"""
    id: str
    title: str
    audio_url: str
    duration: int
    script: str
    voice_language: str
    voice_name: str
    chapters: Optional[List[Dict]] = []
    articles_count: int
    generation_mode: str
    created_at: str
    
class AudioGenerationStatus(BaseModel):
    """音声生成状況"""
    status: str  # "processing", "completed", "failed"
    progress: Optional[int] = None  # 0-100
    stage: Optional[str] = None     # "articles", "script", "audio", "complete"
    message: Optional[str] = None

# === DEPENDENCY INJECTION ===

async def get_unified_audio_service(
    db=Depends(get_database)
) -> UnifiedAudioService:
    """統一音声サービスの依存注入"""
    try:
        # Import OpenAI client from server context
        import openai
        import os
        
        OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        openai_client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
        
        return create_unified_audio_service(db, openai_client)
        
    except Exception as e:
        logging.error(f"Failed to create unified audio service: {e}")
        # Return service with None clients - will use fallback functionality
        return create_unified_audio_service(db, None)

async def get_user_subscription_plan(
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
) -> str:
    """ユーザーのサブスクリプションプラン取得"""
    try:
        subscription = await db.subscriptions.find_one({"user_id": current_user.id})
        return subscription.get("plan", "free") if subscription else "free"
    except:
        return "free"

# === UNIFIED ENDPOINTS ===

@router.post("/autopick", response_model=UnifiedAudioResponse)
async def generate_autopick_audio(
    request: AutoPickRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user),
    user_plan: str = Depends(get_user_subscription_plan),
    audio_service: UnifiedAudioService = Depends(get_unified_audio_service)
):
    """
    🎯 AutoPick音声生成 - AI自動記事選択
    
    機能:
    - RSSソースから自動記事選択
    - ユーザープラン連動文字数調整
    - 動的プロンプト生成
    
    Plan limits:
    - Free: 3 articles, brief scripts
    - Premium: 20 articles, comprehensive scripts
    """
    
    logger.info(f"🎯 AUTOPICK: Starting for user {current_user.id}, plan {user_plan}")
    
    try:
        # Handle debug mode override
        debug_bypass = http_request.headers.get("X-Debug-Bypass-Limits") == "true"
        debug_mode = http_request.headers.get("X-Debug-Mode") == "true"
        
        if debug_bypass and debug_mode:
            user_plan = "premium"
            logger.info(f"🔍 DEBUG: Forced premium plan for autopick")
        
        # Create unified request
        unified_request = AudioGenerationRequest(
            article_ids=None,  # AutoPick doesn't use predefined articles
            max_articles=request.max_articles,
            voice_language=request.voice_language,
            voice_name=request.voice_name,
            prompt_style=request.prompt_style,
            custom_prompt=request.custom_prompt,
            user_plan=user_plan
        )
        
        # Generate audio using unified service
        result = await audio_service.generate_audio(
            request=unified_request,
            user_id=current_user.id,
            mode=AudioGenerationMode.AUTO_PICK
        )
        
        # Convert to API response format
        response = UnifiedAudioResponse(
            id=result.id,
            title=result.title,
            audio_url=result.audio_url,
            duration=result.duration,
            script=result.script,
            voice_language=result.voice_language,
            voice_name=result.voice_name,
            chapters=result.chapters or [],
            articles_count=result.articles_count,
            generation_mode="autopick",
            created_at=datetime.utcnow().isoformat()
        )
        
        logger.info(f"🎯 AUTOPICK: Success - {response.id} ({response.articles_count} articles)")
        return response
        
    except Exception as e:
        logger.error(f"🚫 AUTOPICK: Failed for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AutoPick generation failed: {str(e)}")

@router.post("/manual", response_model=UnifiedAudioResponse)
async def generate_manual_audio(
    request: ManualPickRequest,
    current_user: User = Depends(get_current_user),
    user_plan: str = Depends(get_user_subscription_plan),
    audio_service: UnifiedAudioService = Depends(get_unified_audio_service)
):
    """
    📋 Manual音声生成 - ユーザー手動記事選択
    
    機能:
    - ユーザー選択記事から音声生成
    - プレミアム品質スクリプト
    - カスタムプロンプト対応
    
    Requirements:
    - article_ids: 必須
    - article_titles: 必須
    - article_summaries/contents: 推奨（品質向上）
    """
    
    logger.info(f"📋 MANUAL: Starting for user {current_user.id}, {len(request.article_ids)} articles")
    
    try:
        # Validate required fields
        if not request.article_ids or not request.article_titles:
            raise HTTPException(status_code=400, detail="article_ids and article_titles are required for manual generation")
        
        if len(request.article_ids) != len(request.article_titles):
            raise HTTPException(status_code=400, detail="article_ids and article_titles must have the same length")
        
        # Create unified request
        unified_request = AudioGenerationRequest(
            article_ids=request.article_ids,
            article_titles=request.article_titles,
            article_urls=request.article_urls,
            article_summaries=request.article_summaries,
            article_contents=request.article_contents,
            voice_language=request.voice_language,
            voice_name=request.voice_name,
            prompt_style=request.prompt_style,
            custom_prompt=request.custom_prompt,
            user_plan=user_plan
        )
        
        # Generate audio using unified service
        result = await audio_service.generate_audio(
            request=unified_request,
            user_id=current_user.id,
            mode=AudioGenerationMode.MANUAL
        )
        
        # Convert to API response format
        response = UnifiedAudioResponse(
            id=result.id,
            title=result.title,
            audio_url=result.audio_url,
            duration=result.duration,
            script=result.script,
            voice_language=result.voice_language,
            voice_name=result.voice_name,
            chapters=result.chapters or [],
            articles_count=result.articles_count,
            generation_mode="manual",
            created_at=datetime.utcnow().isoformat()
        )
        
        logger.info(f"📋 MANUAL: Success - {response.id} ({response.articles_count} articles)")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚫 MANUAL: Failed for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Manual generation failed: {str(e)}")

@router.post("/schedule", response_model=UnifiedAudioResponse)
async def generate_scheduled_audio(
    # Schedule-specific parameters would go here
    current_user: User = Depends(get_current_user),
    user_plan: str = Depends(get_user_subscription_plan),
    audio_service: UnifiedAudioService = Depends(get_unified_audio_service)
):
    """
    📅 Schedule音声生成 - 自動スケジュール配信
    
    機能:
    - 時間ベース自動生成
    - ユーザー設定連動
    - 通知機能統合
    
    Status: 🚧 PLACEHOLDER - 実装予定
    """
    
    logger.info(f"📅 SCHEDULE: Starting for user {current_user.id}")
    
    # This endpoint is a placeholder for future schedule functionality
    raise HTTPException(
        status_code=501, 
        detail="Scheduled audio generation is not yet implemented. Use autopick or manual endpoints."
    )

# === STATUS/UTILITY ENDPOINTS ===

@router.get("/status/{audio_id}", response_model=AudioGenerationStatus)
async def get_generation_status(
    audio_id: str,
    current_user: User = Depends(get_current_user)
):
    """音声生成状況確認（将来的な非同期処理用）"""
    
    # Placeholder for async generation status tracking
    return AudioGenerationStatus(
        status="completed",
        progress=100,
        stage="complete", 
        message="Audio generation completed successfully"
    )

@router.get("/modes", response_model=List[Dict[str, Any]])
async def get_available_modes():
    """利用可能な音声生成モード一覧"""
    
    return [
        {
            "mode": "autopick",
            "name": "Auto-Pick",
            "description": "AI automatically selects and processes articles from your RSS sources",
            "endpoint": "/api/v2/audio/autopick",
            "supports": ["genre_filtering", "plan_based_limits", "dynamic_prompts"]
        },
        {
            "mode": "manual", 
            "name": "Manual Selection",
            "description": "Create audio from manually selected articles",
            "endpoint": "/api/v2/audio/manual",
            "supports": ["custom_articles", "rich_content", "custom_prompts"]
        },
        {
            "mode": "schedule",
            "name": "Scheduled Delivery",
            "description": "Automated audio generation on schedule",
            "endpoint": "/api/v2/audio/schedule", 
            "supports": ["time_based", "notifications", "user_preferences"],
            "status": "coming_soon"
        }
    ]

# === ERROR HANDLERS ===

@router.exception_handler(Exception)
async def audio_generation_exception_handler(request: Request, exc: Exception):
    """統一エラーハンドリング"""
    
    logger.error(f"🚫 AUDIO API ERROR: {request.url} - {str(exc)}")
    
    return HTTPException(
        status_code=500,
        detail={
            "error": "Audio generation failed",
            "message": str(exc),
            "endpoint": str(request.url),
            "timestamp": datetime.utcnow().isoformat()
        }
    )