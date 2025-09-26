"""
Audio router for managing audio creation, playback, and library operations.
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime
import uuid

from models.user import User
from models.audio import AudioCreation, AudioCreationRequest, RenameRequest
from models.audio import DownloadedAudio  # for type reuse if needed
from models.audio import Playlist, Album  # not used here but kept for clarity
from models.rss import PresetCategory  # for consistency across modules
from models.common import StandardResponse
from services.auth_service import get_current_user
from services.audio_service import (
    create_audio_from_articles, get_user_audio_library, get_audio_by_id,
    rename_audio, soft_delete_audio, restore_audio, permanently_delete_audio,
    get_deleted_audio, clear_all_deleted_audio, get_audio_statistics
)
from services.tts_service import tts_service
from config.database import get_database
from bson import ObjectId
from services.user_service import record_audio_interaction
from utils.errors import handle_database_error, handle_generic_error, handle_not_found_error

router = APIRouter(prefix="/api", tags=["Audio"])
security = HTTPBearer()

class AudioStatusResponse(BaseModel):
    audio_id: str
    status: str  # 'processing' | 'completed' | 'failed'
    progress_percent: int = 100
    message: str = ""

class DirectTTSRequest(BaseModel):
    article_id: str
    title: str
    content: str
    voice_language: Optional[str] = None
    voice_name: Optional[str] = "alloy"

class DirectTTSResponse(BaseModel):
    id: str
    title: str
    audio_url: str
    duration: int
    article_id: str
    created_at: datetime

class SimpleGenerateRequest(BaseModel):
    article_id: str
    title: Optional[str] = None
    language: Optional[str] = None
    voice_type: Optional[str] = None
    
class SimpleGenerationResponse(BaseModel):
    id: str
    status: str
    message: str
    estimated_duration: int

@router.post("/audio/create", response_model=AudioCreation)
async def create_audio(request: AudioCreationRequest, current_user: User = Depends(get_current_user)):
    """
    Create audio podcast from articles using AI.
    
    Args:
        request: Audio creation request with article data
        current_user: Current authenticated user
        
    Returns:
        AudioCreation: Created audio object
    """
    try:
        logging.info(f"Audio creation request from user {current_user.email}")
        logging.info(f"Article IDs: {request.article_ids}")
        logging.info(f"Article titles: {request.article_titles}")
        
        # Validate input
        if not request.article_ids or not request.article_titles:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one article is required"
            )
        
        if len(request.article_ids) != len(request.article_titles):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Article IDs and titles count mismatch"
            )
        
        # Create audio
        audio_creation = await create_audio_from_articles(
            user_id=current_user.id,
            article_ids=request.article_ids,
            article_titles=request.article_titles,
            custom_title=request.custom_title,
            article_urls=request.article_urls
        )
        
        logging.info(f"Successfully created audio {audio_creation.id} for user {current_user.email}")
        return audio_creation
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating audio: {e}")
        raise handle_generic_error(e, "audio creation")

@router.get("/audio/library", response_model=List[AudioCreation])
async def get_audio_library(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get user's audio library.

    Args:
        credentials: HTTP Bearer credentials containing JWT token

    Returns:
        List[AudioCreation]: User's audio library
    """
    try:
        current_user = await get_current_user(credentials)
        library = await get_user_audio_library(current_user.id)
        return library
        
    except Exception as e:
        logging.error(f"Error getting audio library: {e}")
        raise handle_database_error(e, "get audio library")

@router.get("/audio/{audio_id}", response_model=AudioCreation)
async def get_audio_by_id_endpoint(audio_id: str, current_user: User = Depends(get_current_user)):
    """
    Get specific audio by ID.
    
    Args:
        audio_id: Audio ID
        current_user: Current authenticated user
        
    Returns:
        AudioCreation: Audio object
    """
    try:
        audio = await get_audio_by_id(current_user.id, audio_id)
        
        if not audio:
            raise handle_not_found_error("Audio", audio_id)
        
        return audio
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting audio by ID: {e}")
        raise handle_database_error(e, "get audio")

@router.get("/audio/status/{audio_id}", response_model=AudioStatusResponse)
async def get_audio_status_endpoint(audio_id: str, current_user: User = Depends(get_current_user)):
    """Lightweight status endpoint to support client polling."""
    try:
        audio = await get_audio_by_id(current_user.id, audio_id)
        if audio:
            return AudioStatusResponse(
                audio_id=audio_id,
                status='completed',
                progress_percent=100,
                message='Audio is ready'
            )
        # If not found, treat as processing for backward compatibility
        return AudioStatusResponse(
            audio_id=audio_id,
            status='processing',
            progress_percent=50,
            message='Audio generation in progress'
        )
    except Exception as e:
        logging.error(f"Error getting audio status: {e}")
        # On error, surface as failed to client
        return AudioStatusResponse(
            audio_id=audio_id,
            status='failed',
            progress_percent=0,
            message='Failed to retrieve status'
        )

@router.post("/audio/direct-tts", response_model=DirectTTSResponse)
async def create_direct_tts_endpoint(request: DirectTTSRequest, current_user: User = Depends(get_current_user)):
    """Create audio directly from provided content via TTS (no summarization)."""
    try:
        full_text = f"{request.title}. {request.content}"
        tts = await tts_service.convert_text_to_speech(
            text=full_text,
            voice_name=request.voice_name or "alloy",
            voice_language=request.voice_language
        )
        audio_url = tts.get("url")
        duration = int(tts.get("duration", 0))
        rec_id = str(uuid.uuid4())
        db = get_database()
        await db.direct_tts.insert_one({
            "id": rec_id,
            "user_id": current_user.id,
            "title": request.title,
            "audio_url": audio_url,
            "duration": duration,
            "article_id": request.article_id,
            "created_at": datetime.utcnow(),
            "type": "direct_tts"
        })
        return DirectTTSResponse(
            id=rec_id,
            title=request.title,
            audio_url=audio_url,
            duration=duration,
            article_id=request.article_id,
            created_at=datetime.utcnow()
        )
    except Exception as e:
        logging.error(f"Error creating direct TTS: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create direct TTS: {str(e)}")

@router.post("/audio/generate", response_model=SimpleGenerationResponse)
async def generate_audio_simple(request: SimpleGenerateRequest, current_user: User = Depends(get_current_user)):
    """Generate audio from a single article ID (compat endpoint)."""
    try:
        if not request.article_id:
            raise HTTPException(status_code=422, detail="article_id is required")
        title = request.title or "Untitled"
        # Use unified path: one-article creation via service
        audio = await create_audio_from_articles(
            user_id=current_user.id,
            article_ids=[request.article_id],
            article_titles=[title],
            custom_title=title,
            article_urls=None
        )
        return SimpleGenerationResponse(
            id=audio.id,
            status="completed" if audio.audio_url else "processing",
            message=f"Audio generation completed for: {title}",
            estimated_duration=audio.duration or 30
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[AUDIO GENERATE ERROR] {e}")
        return SimpleGenerationResponse(
            id=str(uuid.uuid4()),
            status="failed",
            message=f"Audio generation failed: {str(e)}",
            estimated_duration=0
        )

@router.post("/audio/{audio_id}/play")
async def record_audio_play(audio_id: str, current_user: User = Depends(get_current_user)):
    """Record a play event (analytics)."""
    try:
        db = get_database()
        try:
            oid = ObjectId(audio_id)
        except Exception:
            oid = audio_id
        result = await db.audio_creations.update_one(
            {"_id": oid, "user_id": current_user.id},
            {"$inc": {"play_count": 1}, "$set": {"last_played_at": datetime.utcnow()}}
        )
        return {"message": "Play recorded", "play_count": 1 if result.modified_count else 0}
    except Exception as e:
        logging.error(f"Error recording play: {e}")
        raise HTTPException(status_code=500, detail="Failed to record play")

# Feedback (misreading) under audio domain for consolidation
from pydantic import BaseModel

class MisreadingFeedbackRequest(BaseModel):
    audio_id: str
    timestamp: int
    reported_text: str | None = None

@router.post("/feedback/misreading")
async def report_misreading(request: MisreadingFeedbackRequest, current_user: User = Depends(get_current_user)):
    db = get_database()
    # Verify audio exists
    audio = await db.audio_creations.find_one({"id": request.audio_id, "user_id": current_user.id})
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    feedback = {
        "user_id": current_user.id,
        "audio_id": request.audio_id,
        "timestamp": request.timestamp,
        "reported_text": request.reported_text,
        "created_at": datetime.utcnow(),
    }
    await db.misreading_feedback.insert_one(feedback)
    return {"message": "Feedback recorded successfully"}

@router.post("/audio/instant-multi", response_model=AudioCreation)
async def create_instant_multi_audio_endpoint(request: AudioCreationRequest, current_user: User = Depends(get_current_user)):
    """Compatibility endpoint: create audio from multiple articles quickly.
    For now, uses the standard creation service to keep behavior consistent.
    """
    try:
        audio = await create_audio_from_articles(
            user_id=current_user.id,
            article_ids=request.article_ids,
            article_titles=request.article_titles,
            custom_title=request.custom_title,
            article_urls=request.article_urls,
        )
        return audio
    except Exception as e:
        logging.error(f"Error in instant-multi: {e}")
        raise HTTPException(status_code=500, detail="Failed to create instant audio")

@router.put("/audio/{audio_id}/rename")
async def rename_audio_endpoint(
    audio_id: str, 
    request: RenameRequest, 
    current_user: User = Depends(get_current_user)
):
    """
    Rename an audio file.
    
    Args:
        audio_id: Audio ID
        request: Rename request with new title
        current_user: Current authenticated user
        
    Returns:
        StandardResponse: Rename result
    """
    try:
        # Validate input
        if not request.new_title.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="New title cannot be empty"
            )
        
        renamed = await rename_audio(current_user.id, audio_id, request.new_title.strip())
        
        if not renamed:
            raise handle_not_found_error("Audio", audio_id)
        
        return StandardResponse(message="Audio renamed successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error renaming audio: {e}")
        raise handle_database_error(e, "rename audio")

@router.delete("/audio/{audio_id}")
async def delete_audio(audio_id: str, current_user: User = Depends(get_current_user)):
    """
    Soft delete an audio file (move to trash).
    
    Args:
        audio_id: Audio ID to delete
        current_user: Current authenticated user
        
    Returns:
        StandardResponse: Deletion result
    """
    try:
        deleted = await soft_delete_audio(current_user.id, audio_id)
        
        if not deleted:
            raise handle_not_found_error("Audio", audio_id)
        
        return StandardResponse(message="Audio moved to trash successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting audio: {e}")
        raise handle_database_error(e, "delete audio")

@router.get("/audio/deleted")
async def get_deleted_audio_endpoint(current_user: User = Depends(get_current_user)):
    """
    Get user's deleted audio files.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        List: Deleted audio files
    """
    try:
        deleted_audio = await get_deleted_audio(current_user.id)
        return deleted_audio
        
    except Exception as e:
        logging.error(f"Error getting deleted audio: {e}")
        raise handle_database_error(e, "get deleted audio")

@router.post("/audio/{audio_id}/restore")
async def restore_deleted_audio(audio_id: str, current_user: User = Depends(get_current_user)):
    """
    Restore a soft-deleted audio file.
    
    Args:
        audio_id: Audio ID to restore
        current_user: Current authenticated user
        
    Returns:
        StandardResponse: Restore result
    """
    try:
        restored = await restore_audio(current_user.id, audio_id)
        
        if not restored:
            raise handle_not_found_error("Deleted audio", audio_id)
        
        return StandardResponse(message="Audio restored successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error restoring audio: {e}")
        raise handle_database_error(e, "restore audio")

@router.delete("/audio/{audio_id}/permanent")
async def permanently_delete_audio_endpoint(audio_id: str, current_user: User = Depends(get_current_user)):
    """
    Permanently delete an audio file.
    
    Args:
        audio_id: Audio ID to permanently delete
        current_user: Current authenticated user
        
    Returns:
        StandardResponse: Permanent deletion result
    """
    try:
        deleted = await permanently_delete_audio(current_user.id, audio_id)
        
        if not deleted:
            raise handle_not_found_error("Deleted audio", audio_id)
        
        return StandardResponse(message="Audio permanently deleted")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error permanently deleting audio: {e}")
        raise handle_database_error(e, "permanent delete audio")

@router.delete("/audio/deleted/clear-all")
async def clear_all_deleted_audio_endpoint(current_user: User = Depends(get_current_user)):
    """
    Permanently delete all soft-deleted audio for user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        StandardResponse: Clear all result
    """
    try:
        deleted_count = await clear_all_deleted_audio(current_user.id)
        
        return StandardResponse(
            message=f"Permanently deleted {deleted_count} audio files",
            data={"deleted_count": deleted_count}
        )
        
    except Exception as e:
        logging.error(f"Error clearing all deleted audio: {e}")
        raise handle_database_error(e, "clear all deleted audio")

@router.post("/audio-interaction")
async def record_audio_interaction_endpoint(
    interaction_data: Dict[str, Any], 
    current_user: User = Depends(get_current_user)
):
    """
    Record audio playback interaction.
    
    Args:
        interaction_data: Interaction data (audio_id, type, timing, etc.)
        current_user: Current authenticated user
        
    Returns:
        StandardResponse: Interaction recording result
    """
    try:
        audio_id = interaction_data.get("audio_id")
        interaction_type = interaction_data.get("interaction_type", "played")
        start_time = interaction_data.get("start_time")
        end_time = interaction_data.get("end_time")
        completion_percentage = interaction_data.get("completion_percentage")
        
        if not audio_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="audio_id is required"
            )
        
        # Record interaction
        recorded = await record_audio_interaction(
            user_id=current_user.id,
            audio_id=audio_id,
            interaction_type=interaction_type,
            start_time=start_time,
            end_time=end_time,
            completion_percentage=completion_percentage
        )
        
        if not recorded:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audio not found"
            )
        
        return StandardResponse(message="Audio interaction recorded successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error recording audio interaction: {e}")
        raise handle_generic_error(e, "record audio interaction")

@router.get("/audio/stats")
async def get_audio_stats(current_user: User = Depends(get_current_user)):
    """
    Get audio statistics for the user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Dict: Audio statistics
    """
    try:
        stats = await get_audio_statistics(current_user.id)
        
        return {
            "message": "Audio statistics",
            "data": stats
        }
        
    except Exception as e:
        logging.error(f"Error getting audio statistics: {e}")
        raise handle_generic_error(e, "get audio statistics")
