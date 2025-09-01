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
from models.schedule import (
    Schedule,
    ScheduleCreateRequest,
    ScheduleUpdateRequest,
    ScheduleResponse,
    ScheduledPlaylist,
    ScheduledPlaylistResponse,
    SchedulePreferences,
    DayOfWeek,
    ScheduleStatus
)

# Import global database and security directly from FastAPI context
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, Field
import uuid
from datetime import datetime

# Use the security instance and database from the main application
security = HTTPBearer()

# Database will be injected from the main application context
async def get_database():
    """Get database from main application context"""
    # Import here to avoid circular import
    import sys
    import os
    backend_path = os.path.dirname(os.path.dirname(__file__))
    if backend_path not in sys.path:
        sys.path.append(backend_path)
    
    try:
        from server import db
        return db
    except ImportError:
        logging.error("Failed to import database from server")
        raise HTTPException(
            status_code=503,
            detail="Database service unavailable"
        )

# User model for unified audio service
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user using authentication credentials"""
    # Import here to avoid circular import
    try:
        from server import db, db_connected
        
        if not db_connected:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not connected")
        
        token = credentials.credentials
        user = await db.users.find_one({"id": token})
        
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
        
        return User(**user)
        
    except ImportError:
        logging.error("Failed to import database for authentication")
        raise HTTPException(
            status_code=503,
            detail="Authentication service unavailable"
        )

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

# === SCHEDULE MANAGEMENT ENDPOINTS ===

@router.post("/schedules", response_model=ScheduleResponse)
async def create_schedule(
    request: ScheduleCreateRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    📅 スケジュール作成 - 新しい音声生成スケジュールを作成
    
    機能:
    - スケジュール設定の保存
    - 次回実行時刻の自動計算
    - ユーザー設定の検証
    """
    
    logger.info(f"📅 CREATE SCHEDULE: Starting for user {current_user.id}")
    
    try:
        # Create new schedule with user ID
        schedule = Schedule(
            user_id=current_user.id,
            schedule_name=request.schedule_name,
            generation_time=request.generation_time,
            generation_days=request.generation_days,
            timezone=request.timezone,
            preferences=request.preferences or SchedulePreferences()
        )
        
        # TODO: Calculate next_generation_at based on time and days
        
        # Save to database
        schedule_dict = schedule.dict()
        await db.schedules.insert_one(schedule_dict)
        
        logger.info(f"📅 CREATE SCHEDULE: Success - {schedule.id}")
        return ScheduleResponse(**schedule_dict)
        
    except Exception as e:
        logger.error(f"🚫 CREATE SCHEDULE: Failed for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Schedule creation failed: {str(e)}")

@router.get("/schedules", response_model=List[ScheduleResponse])
async def get_user_schedules(
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    📅 スケジュール一覧取得 - ユーザーの全スケジュールを取得
    """
    
    try:
        schedules_cursor = db.schedules.find({"user_id": current_user.id})
        schedules = await schedules_cursor.to_list(length=None)
        
        return [ScheduleResponse(**schedule) for schedule in schedules]
        
    except Exception as e:
        logger.error(f"🚫 GET SCHEDULES: Failed for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch schedules: {str(e)}")

@router.get("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    📅 スケジュール詳細取得 - 特定スケジュールの詳細情報
    """
    
    try:
        schedule = await db.schedules.find_one({
            "id": schedule_id,
            "user_id": current_user.id
        })
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        return ScheduleResponse(**schedule)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚫 GET SCHEDULE: Failed for user {current_user.id}, schedule {schedule_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch schedule: {str(e)}")

@router.put("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: str,
    request: ScheduleUpdateRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    📅 スケジュール更新 - 既存スケジュールの設定変更
    """
    
    try:
        # Check if schedule exists and belongs to user
        existing_schedule = await db.schedules.find_one({
            "id": schedule_id,
            "user_id": current_user.id
        })
        
        if not existing_schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Build update dict from non-None fields
        update_dict = {}
        if request.schedule_name is not None:
            update_dict["schedule_name"] = request.schedule_name
        if request.generation_time is not None:
            update_dict["generation_time"] = request.generation_time
        if request.generation_days is not None:
            update_dict["generation_days"] = request.generation_days
        if request.timezone is not None:
            update_dict["timezone"] = request.timezone
        if request.status is not None:
            update_dict["status"] = request.status
        if request.preferences is not None:
            update_dict["preferences"] = request.preferences.dict()
        
        update_dict["updated_at"] = datetime.utcnow()
        
        # TODO: Recalculate next_generation_at if time/days changed
        
        # Update in database
        await db.schedules.update_one(
            {"id": schedule_id, "user_id": current_user.id},
            {"$set": update_dict}
        )
        
        # Fetch updated schedule
        updated_schedule = await db.schedules.find_one({
            "id": schedule_id,
            "user_id": current_user.id
        })
        
        logger.info(f"📅 UPDATE SCHEDULE: Success - {schedule_id}")
        return ScheduleResponse(**updated_schedule)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚫 UPDATE SCHEDULE: Failed for user {current_user.id}, schedule {schedule_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Schedule update failed: {str(e)}")

@router.delete("/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    📅 スケジュール削除 - スケジュールの完全削除
    """
    
    try:
        # Check if schedule exists and belongs to user
        existing_schedule = await db.schedules.find_one({
            "id": schedule_id,
            "user_id": current_user.id
        })
        
        if not existing_schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Delete the schedule
        result = await db.schedules.delete_one({
            "id": schedule_id,
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        logger.info(f"📅 DELETE SCHEDULE: Success - {schedule_id}")
        return {"message": "Schedule deleted successfully", "schedule_id": schedule_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚫 DELETE SCHEDULE: Failed for user {current_user.id}, schedule {schedule_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Schedule deletion failed: {str(e)}")

@router.get("/schedules/{schedule_id}/playlists", response_model=List[ScheduledPlaylistResponse])
async def get_schedule_playlists(
    schedule_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database),
    limit: int = 10
):
    """
    📅 スケジュール生成プレイリスト一覧 - 特定スケジュールで生成されたプレイリスト
    """
    
    try:
        # Verify schedule belongs to user
        schedule = await db.schedules.find_one({
            "id": schedule_id,
            "user_id": current_user.id
        })
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        # Get playlists for this schedule
        playlists_cursor = db.scheduled_playlists.find({
            "schedule_id": schedule_id,
            "user_id": current_user.id
        }).sort("generated_at", -1).limit(limit)
        
        playlists = await playlists_cursor.to_list(length=None)
        
        return [ScheduledPlaylistResponse(**playlist) for playlist in playlists]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚫 GET SCHEDULE PLAYLISTS: Failed for user {current_user.id}, schedule {schedule_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch schedule playlists: {str(e)}")

@router.post("/schedules/{schedule_id}/generate", response_model=UnifiedAudioResponse)
async def manually_trigger_schedule(
    schedule_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database),
    user_plan: str = Depends(get_user_subscription_plan),
    audio_service: UnifiedAudioService = Depends(get_unified_audio_service)
):
    """
    📅 スケジュール手動実行 - スケジュールを即座に実行してプレイリスト生成
    """
    
    logger.info(f"📅 MANUAL TRIGGER: Starting for user {current_user.id}, schedule {schedule_id}")
    
    try:
        # Get the schedule
        schedule = await db.schedules.find_one({
            "id": schedule_id,
            "user_id": current_user.id
        })
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        if schedule["status"] != ScheduleStatus.ACTIVE:
            raise HTTPException(status_code=400, detail="Schedule is not active")
        
        # Create unified request based on schedule preferences
        preferences = schedule.get("preferences", {})
        unified_request = AudioGenerationRequest(
            article_ids=None,  # SchedulePick uses automatic selection
            max_articles=preferences.get("max_articles", 5),
            voice_language=preferences.get("voice_language", "ja-JP"),
            voice_name=preferences.get("voice_name", "alloy"),
            prompt_style=preferences.get("prompt_style", "standard"),
            custom_prompt=preferences.get("custom_prompt"),
            user_plan=user_plan
        )
        
        # Generate audio using unified service
        result = await audio_service.generate_audio(
            request=unified_request,
            user_id=current_user.id,
            mode=AudioGenerationMode.AUTO_PICK  # SchedulePick uses AutoPick logic
        )
        
        # Save as scheduled playlist
        scheduled_playlist = ScheduledPlaylist(
            schedule_id=schedule_id,
            user_id=current_user.id,
            playlist_title=f"{schedule['schedule_name']} - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            audio_url=result.audio_url,
            duration=result.duration,
            script=result.script,
            articles=result.article_ids or [],
            articles_count=result.articles_count,
            chapters=result.chapters or []
        )
        
        # Save to database
        await db.scheduled_playlists.insert_one(scheduled_playlist.dict())
        
        # Update schedule's last generation info
        await db.schedules.update_one(
            {"id": schedule_id},
            {
                "$set": {
                    "last_generated_at": datetime.utcnow(),
                    "last_generated_playlist_id": scheduled_playlist.id
                }
            }
        )
        
        # Return unified response
        response = UnifiedAudioResponse(
            id=result.id,
            title=scheduled_playlist.playlist_title,
            audio_url=result.audio_url,
            duration=result.duration,
            script=result.script,
            voice_language=result.voice_language,
            voice_name=result.voice_name,
            chapters=result.chapters or [],
            articles_count=result.articles_count,
            generation_mode="schedule",
            created_at=datetime.utcnow().isoformat()
        )
        
        logger.info(f"📅 MANUAL TRIGGER: Success - {response.id} for schedule {schedule_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"🚫 MANUAL TRIGGER: Failed for user {current_user.id}, schedule {schedule_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Schedule generation failed: {str(e)}")

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

@router.get("/scheduler/status")
async def get_scheduler_status(
    current_user: User = Depends(get_current_user)
):
    """
    📅 スケジューラーサービス状態確認
    """
    
    try:
        # Import scheduler service
        from services.scheduler_service import get_scheduler_service
        
        scheduler_service = get_scheduler_service()
        if not scheduler_service:
            return {
                "running": False,
                "available": False,
                "reason": "Scheduler service not initialized"
            }
        
        status = await scheduler_service.get_scheduler_status()
        logger.info(f"📅 SCHEDULER STATUS: Retrieved for user {current_user.id}")
        return status
        
    except Exception as e:
        logger.error(f"🚫 SCHEDULER STATUS: Failed for user {current_user.id}: {str(e)}")
        return {
            "running": False,
            "available": False,
            "error": str(e)
        }

# === ERROR HANDLERS ===
# Note: Exception handlers should be registered at the app level, not router level
# This section is commented out and should be moved to server.py if needed

# @app.exception_handler(Exception)  # This would be used in server.py
# async def audio_generation_exception_handler(request: Request, exc: Exception):
#     """統一エラーハンドリング"""
#     
#     logger.error(f"🚫 AUDIO API ERROR: {request.url} - {str(exc)}")
#     
#     return HTTPException(
#         status_code=500,
#         detail={
#             "error": "Audio generation failed",
#             "message": str(exc),
#             "endpoint": str(request.url),
#             "timestamp": datetime.utcnow().isoformat()
#         }
#     )