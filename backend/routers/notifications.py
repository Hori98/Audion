"""
Notifications router for push tokens and sending notifications.
"""

import logging
import asyncio
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
import httpx

from models.user import User
from services.auth_service import get_current_user
from config.database import get_database, is_database_connected

router = APIRouter(prefix="/api", tags=["Push Notifications"])

EXPO_PUSH_URL = "https://api.expo.dev/v2/push/send"


class PushTokenPayload(BaseModel):
    token: str = Field(..., description="The Expo push token for this device")


class PushTokenResponse(BaseModel):
    status: str
    message: str
    token_id: Optional[str] = None


class SendNotificationPayload(BaseModel):
    user_ids: Optional[List[str]] = None
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None


@router.post("/push-tokens", response_model=PushTokenResponse)
async def register_push_token(payload: PushTokenPayload, current_user: User = Depends(get_current_user)):
    if not is_database_connected():
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")

    db = get_database()
    try:
        update_data = {
            "$set": {
                "user_id": current_user.id,
                "updated_at": datetime.utcnow(),
            },
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "token": payload.token,
                "created_at": datetime.utcnow(),
            },
        }
        result = await asyncio.wait_for(
            db.push_tokens.update_one({"token": payload.token}, update_data, upsert=True),
            timeout=10.0,
        )
        if result.upserted_id:
            return PushTokenResponse(status="success", message="Push token registered successfully.", token_id=str(result.upserted_id))
        if result.modified_count > 0:
            return PushTokenResponse(status="success", message="Push token updated successfully.")
        return PushTokenResponse(status="success", message="Push token is already up-to-date.")
    except asyncio.TimeoutError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"[PushTokens] Token registration error: {e}")
        raise HTTPException(status_code=500, detail="Failed to register push token")


@router.get("/push-tokens")
async def get_user_push_tokens(current_user: User = Depends(get_current_user)):
    if not is_database_connected():
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    db = get_database()
    try:
        tokens = await asyncio.wait_for(
            db.push_tokens.find({"user_id": current_user.id}).to_list(length=None),
            timeout=5.0,
        )
        for token in tokens:
            if "_id" in token:
                token["_id"] = str(token["_id"])
        return {"tokens": tokens}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"[PushTokens] Token retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve push tokens")


@router.delete("/push-tokens/{token}")
async def delete_push_token(token: str, current_user: User = Depends(get_current_user)):
    if not is_database_connected():
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    db = get_database()
    try:
        result = await asyncio.wait_for(
            db.push_tokens.delete_one({"token": token, "user_id": current_user.id}),
            timeout=5.0,
        )
        if result.deleted_count > 0:
            return {"status": "success", "message": "Push token deleted successfully."}
        raise HTTPException(status_code=404, detail="Push token not found")
    except asyncio.TimeoutError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"[PushTokens] Token deletion error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete push token")


@router.post("/notifications/send-test")
async def send_test_notification(payload: SendNotificationPayload, current_user: User = Depends(get_current_user)):
    if not is_database_connected():
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    db = get_database()
    try:
        user_ids = payload.user_ids if payload.user_ids else [current_user.id]
        tokens = await asyncio.wait_for(
            db.push_tokens.find({"user_id": {"$in": user_ids}}).to_list(length=None),
            timeout=5.0,
        )
        if not tokens:
            return {"status": "no_tokens_found"}

        messages = [
            {
                "to": t["token"],
                "title": payload.title,
                "body": payload.body,
                "data": payload.data or {},
                "sound": "default",
            }
            for t in tokens
        ]
        async with httpx.AsyncClient() as client:
            response = await client.post(EXPO_PUSH_URL, json=messages, headers={"Content-Type": "application/json"}, timeout=30.0)
            response.raise_for_status()
            result = response.json()
            return {"status": "success", "tickets": result.get("data")}
    except httpx.HTTPStatusError as e:
        logging.error(f"[Notifications] Expo API error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=502, detail="Expo API error")
    except Exception as e:
        logging.error(f"[Notifications] Test notification error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send test notification")


@router.get("/notifications/history")
async def get_notification_history(limit: int = 20, current_user: User = Depends(get_current_user)):
    if not is_database_connected():
        raise HTTPException(status_code=503, detail="Database unavailable. Server is running in limited mode.")
    db = get_database()
    try:
        history = await asyncio.wait_for(
            db.notification_history.find({"user_id": current_user.id}).sort("sent_at", -1).limit(limit).to_list(length=None),
            timeout=10.0,
        )
        for record in history:
            if "_id" in record:
                record["_id"] = str(record["_id"])
        return {"history": history}
    except asyncio.TimeoutError:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again later.")
    except Exception as e:
        logging.error(f"[Notifications] History retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notification history")

