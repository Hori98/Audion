"""
Audio router for managing audio creation, playback, and library operations.
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query

from models.user import User
from models.audio import AudioCreation, AudioCreationRequest, RenameRequest
from models.common import StandardResponse
from services.auth_service import get_current_user
from services.audio_service import (
    create_audio_from_articles, get_user_audio_library, get_audio_by_id,
    rename_audio, soft_delete_audio, restore_audio, permanently_delete_audio,
    get_deleted_audio, clear_all_deleted_audio, get_audio_statistics
)
from services.user_service import record_audio_interaction
from utils.errors import handle_database_error, handle_generic_error, handle_not_found_error

router = APIRouter(prefix="/api", tags=["Audio"])

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
async def get_audio_library(current_user: User = Depends(get_current_user)):
    """
    Get user's audio library.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        List[AudioCreation]: User's audio library
    """
    try:
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