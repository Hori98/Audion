"""
Simple subscription/limits service.

Provides helper functions to check daily creation limits per user.
Intended as a minimal implementation; replace with plan-based logic later.
"""

import os
from datetime import datetime, timedelta
from typing import Dict

from backend.config.database import get_database, is_database_connected
from backend.runtime import shared_state


def _start_of_utc_day(dt: datetime) -> datetime:
    return datetime(dt.year, dt.month, dt.day)


def _daily_limit_default() -> int:
    try:
        return int(os.environ.get('DAILY_AUDIO_LIMIT', '5'))
    except Exception:
        return 5


async def get_user_limits(user_id: str) -> Dict[str, int]:
    """Return simple daily limits: remaining_daily_audio based on creations today."""
    if not shared_state.db_connected or shared_state.db is None:
        # When DB is not connected, use default limits (not 0)
        limit = _daily_limit_default()
        return {"daily_limit": limit, "used_today": 0, "remaining_daily_audio": limit}
    today_start = _start_of_utc_day(datetime.utcnow())

    query = {"user_id": user_id, "created_at": {"$gte": today_start}}

    try:
        used_today = await shared_state.db.audio_creations.count_documents(query)
    except Exception:
        # If created_at doesn't exist on some documents, fallback: count last 24h
        day_ago = datetime.utcnow() - timedelta(days=1)
        used_today = await shared_state.db.audio_creations.count_documents({"user_id": user_id, "created_at": {"$gte": day_ago}})

    limit = _daily_limit_default()
    remaining = max(0, limit - used_today)
    return {"daily_limit": limit, "used_today": int(used_today), "remaining_daily_audio": int(remaining)}


async def ensure_can_create_audio(user_id: str):
    """Raise an exception if daily limit exceeded."""
    from fastapi import HTTPException, status

    limits = await get_user_limits(user_id)
    if limits["remaining_daily_audio"] <= 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily audio creation limit reached"
        )
