"""
Downloads router for managing downloaded audio entries.
"""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends

from models.user import User
from models.audio import AudioCreation, DownloadedAudio
from services.auth_service import get_current_user
from config.database import get_database

router = APIRouter(prefix="/api", tags=["Downloads"])

@router.get("/downloads", response_model=List[Dict[str, Any]])
async def get_downloaded_audio(current_user: User = Depends(get_current_user)):
    db = get_database()
    downloads = await db.downloaded_audio.find({"user_id": current_user.id}).sort("downloaded_at", -1).to_list(100)
    audio_ids = [d.get("audio_id") for d in downloads]
    audio_items = await db.audio_creations.find({"id": {"$in": audio_ids}, "user_id": current_user.id}).to_list(100)
    audio_dict = {a["id"]: a for a in audio_items}
    result: List[Dict[str, Any]] = []
    for d in downloads:
        aid = d.get("audio_id")
        if aid in audio_dict:
            result.append({
                "download_info": DownloadedAudio(**d),
                "audio_data": AudioCreation(**audio_dict[aid])
            })
    return result

@router.post("/downloads/{audio_id}")
async def download_audio(audio_id: str, current_user: User = Depends(get_current_user)):
    db = get_database()
    audio = await db.audio_creations.find_one({"id": audio_id, "user_id": current_user.id})
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    existing = await db.downloaded_audio.find_one({"user_id": current_user.id, "audio_id": audio_id})
    if existing:
        return {"message": "Audio already downloaded"}
    download = DownloadedAudio(user_id=current_user.id, audio_id=audio_id, auto_downloaded=False)
    await db.downloaded_audio.insert_one(download.dict())
    return {"message": "Audio downloaded successfully"}

@router.delete("/downloads/{audio_id}")
async def remove_download(audio_id: str, current_user: User = Depends(get_current_user)):
    db = get_database()
    existing = await db.downloaded_audio.find_one({"user_id": current_user.id, "audio_id": audio_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Downloaded audio not found")
    result = await db.downloaded_audio.delete_one({"user_id": current_user.id, "audio_id": audio_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Downloaded audio not found")
    return {"message": "Download removed"}

