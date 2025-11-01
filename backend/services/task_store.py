"""
Task store helpers for AutoPick V2.

Provides DB-backed persistence with in-memory fallback for status reads/updates.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import logging


# In-memory task store shared across app
MEM_TASKS: Dict[str, Dict[str, Any]] = {}


def now_iso() -> str:
    return datetime.utcnow().isoformat() + 'Z'


def task_update(
    task_id: str,
    updates: Dict[str, Any],
    mem_store: Dict[str, Dict[str, Any]],
    db_connected: bool,
    db,
) -> None:
    task = mem_store.get(task_id)
    if not task:
        return
    task.update(updates)
    task['updated_at'] = now_iso()

    if not db_connected or db is None:
        return
    try:
        to_set = {**updates, 'updated_at': datetime.utcnow()}
        # Fire-and-forget best-effort update (caller may call in background)
        import asyncio
        asyncio.create_task(db.autopick_tasks.update_one({"task_id": task_id}, {"$set": to_set}))
    except Exception as e:
        logging.warning(f"Failed to persist task update: {e}")


async def task_insert_db(doc: Dict[str, Any], db_connected: bool, db) -> None:
    if not db_connected or db is None:
        return
    try:
        await db.autopick_tasks.insert_one(doc)
    except Exception as e:
        logging.warning(f"Failed to insert task to DB: {e}")


async def task_get(
    task_id: str,
    mem_store: Dict[str, Dict[str, Any]],
    db_connected: bool,
    db,
) -> Optional[Dict[str, Any]]:
    if db_connected and db is not None:
        try:
            found = await db.autopick_tasks.find_one({"task_id": task_id})
            if found:
                return found
        except Exception as e:
            logging.warning(f"Failed to read task from DB: {e}")
    return mem_store.get(task_id)


async def count_user_active_tasks(
    user_id: str,
    mem_store: Dict[str, Dict[str, Any]],
    db_connected: bool,
    db,
) -> int:
    if db_connected and db is not None:
        try:
            return await db.autopick_tasks.count_documents({
                "user_id": user_id,
                "status": {"$in": ["pending", "in_progress"]}
            })
        except Exception as e:
            logging.warning(f"Failed to count tasks in DB: {e}")
    # Fallback
    return len([t for t in mem_store.values() if t.get('user_id') == user_id and t.get('status') in ('pending', 'in_progress')])
