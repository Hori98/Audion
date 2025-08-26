"""
Audio API endpoints - Audio generation and management
Contract-first design with async processing
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_database
from app.api.v1.endpoints.auth import get_current_user
from app.models.audio import (
    AudioContent, 
    AudioCreateRequest, 
    AudioGenerationResponse,
    AudioContentResponse,
    AudioLibraryResponse,
    AudioStatus
)
from app.models.user import UserInDB
from app.services.audio_service import AudioGenerationService

router = APIRouter(prefix="/audio", tags=["audio"])
audio_service = AudioGenerationService()


@router.post("/generate", response_model=AudioGenerationResponse)
async def generate_audio(
    request: AudioCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate audio content from article (async processing)"""
    
    try:
        # Create audio content record (starts as processing)
        audio_content = await audio_service.create_audio_content(
            article_id=request.article_id,
            user_id=current_user.id,
            db=db,
            title=request.title,
            language=request.language,
            voice_type=request.voice_type
        )
        
        return AudioGenerationResponse(
            id=audio_content.id,
            status=audio_content.status,
            message="Audio generation started. Check status for progress.",
            estimated_duration=180  # 3 minutes estimate
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Audio generation failed")


@router.get("/status/{audio_id}")
async def get_audio_status(
    audio_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get audio generation status"""
    
    result = await db.execute(
        select(AudioContent).where(
            AudioContent.id == audio_id,
            AudioContent.user_id == current_user.id
        )
    )
    audio_content = result.scalar_one_or_none()
    
    if not audio_content:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    return {
        "audio_id": audio_content.id,
        "status": audio_content.status,
        "progress_percent": 100 if audio_content.status == AudioStatus.completed else 50,
        "message": f"Status: {audio_content.status}"
    }


@router.get("/library", response_model=AudioLibraryResponse)
async def get_audio_library(
    page: int = 1,
    per_page: int = 20,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get user's audio library"""
    
    library_data = await audio_service.get_user_audio_library(
        user_id=current_user.id,
        db=db,
        page=page,
        per_page=per_page
    )
    
    return AudioLibraryResponse(
        audio_contents=[
            AudioContentResponse.model_validate(audio) 
            for audio in library_data["audio_contents"]
        ],
        total=library_data["total"],
        page=library_data["page"],
        per_page=library_data["per_page"],
        has_next=library_data["has_next"]
    )


@router.get("/{audio_id}", response_model=AudioContentResponse)
async def get_audio_content(
    audio_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get single audio content"""
    
    result = await db.execute(
        select(AudioContent).where(
            AudioContent.id == audio_id,
            AudioContent.user_id == current_user.id
        )
    )
    audio_content = result.scalar_one_or_none()
    
    if not audio_content:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    return AudioContentResponse.model_validate(audio_content)


@router.delete("/{audio_id}")
async def delete_audio_content(
    audio_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete audio content"""
    
    result = await db.execute(
        select(AudioContent).where(
            AudioContent.id == audio_id,
            AudioContent.user_id == current_user.id
        )
    )
    audio_content = result.scalar_one_or_none()
    
    if not audio_content:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    await db.delete(audio_content)
    await db.commit()
    
    return {"message": "Audio content deleted successfully"}


@router.post("/{audio_id}/play")
async def record_audio_play(
    audio_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """Record that audio was played (for analytics)"""
    
    result = await db.execute(
        select(AudioContent).where(
            AudioContent.id == audio_id,
            AudioContent.user_id == current_user.id
        )
    )
    audio_content = result.scalar_one_or_none()
    
    if not audio_content:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    # Increment play count
    audio_content.play_count += 1
    audio_content.last_played_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Play recorded", "play_count": audio_content.play_count}


# Import datetime for play tracking
from datetime import datetime