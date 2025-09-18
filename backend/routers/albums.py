"""
Albums router for managing user albums and their audio items.
"""

import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends

from models.user import User
from models.audio import AudioCreation, Album, AlbumCreate, AlbumUpdate, AlbumAddAudio
from services.auth_service import get_current_user
from config.database import get_database

router = APIRouter(prefix="/api", tags=["Albums"])

@router.get("/albums", response_model=List[Album])
async def get_user_albums(current_user: User = Depends(get_current_user)):
    db = get_database()
    albums = await db.albums.find({"user_id": current_user.id}).sort("updated_at", -1).to_list(100)
    return [Album(**album) for album in albums]

@router.post("/albums", response_model=Album)
async def create_album(request: AlbumCreate, current_user: User = Depends(get_current_user)):
    db = get_database()
    album = Album(
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        is_public=request.is_public,
        tags=request.tags,
    )
    await db.albums.insert_one(album.dict())
    return album

@router.put("/albums/{album_id}", response_model=Album)
async def update_album(album_id: str, request: AlbumUpdate, current_user: User = Depends(get_current_user)):
    db = get_database()
    update_data = {k: v for k, v in request.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    result = await db.albums.update_one(
        {"id": album_id, "user_id": current_user.id},
        {"$set": update_data},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")

    album = await db.albums.find_one({"id": album_id, "user_id": current_user.id})
    return Album(**album)

@router.delete("/albums/{album_id}")
async def delete_album(album_id: str, current_user: User = Depends(get_current_user)):
    db = get_database()
    result = await db.albums.delete_one({"id": album_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")
    return {"message": "Album deleted"}

@router.post("/albums/{album_id}/audio")
async def add_audio_to_album(album_id: str, request: AlbumAddAudio, current_user: User = Depends(get_current_user)):
    db = get_database()
    audio_count = await db.audio_creations.count_documents({
        "id": {"$in": request.audio_ids},
        "user_id": current_user.id,
    })
    if audio_count != len(request.audio_ids):
        raise HTTPException(status_code=400, detail="Some audio items not found or don't belong to user")

    result = await db.albums.update_one(
        {"id": album_id, "user_id": current_user.id},
        {"$addToSet": {"audio_ids": {"$each": request.audio_ids}}, "$set": {"updated_at": datetime.utcnow()}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")
    return {"message": f"Added {len(request.audio_ids)} audio items to album"}

@router.delete("/albums/{album_id}/audio/{audio_id}")
async def remove_audio_from_album(album_id: str, audio_id: str, current_user: User = Depends(get_current_user)):
    db = get_database()
    result = await db.albums.update_one(
        {"id": album_id, "user_id": current_user.id},
        {"$pull": {"audio_ids": audio_id}, "$set": {"updated_at": datetime.utcnow()}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")
    return {"message": "Audio removed from album"}

@router.get("/albums/{album_id}/audio", response_model=List[AudioCreation])
async def get_album_audio(album_id: str, current_user: User = Depends(get_current_user)):
    db = get_database()
    album = await db.albums.find_one({"id": album_id, "user_id": current_user.id})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    if not album.get("audio_ids"):
        return []
    audio_items = await db.audio_creations.find({
        "id": {"$in": album["audio_ids"]},
        "user_id": current_user.id,
    }).to_list(100)
    audio_dict = {audio["id"]: audio for audio in audio_items}
    ordered = [audio_dict[a] for a in album["audio_ids"] if a in audio_dict]
    return [AudioCreation(**audio) for audio in ordered]

