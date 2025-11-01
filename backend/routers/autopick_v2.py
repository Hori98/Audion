"""
AutoPick V2 router (task-based API)

Provides:
- POST /api/v2/audio/autopick : start task and return task_id
- GET  /api/auto-pick/task-status/{task_id} : poll status/result
"""

import asyncio
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.models.article import AutoPickRequest, Article
from backend.models.user import User, UserInteraction
from backend.models.audio import AudioCreation

from backend.services.genre_mapping_service import normalize_preferred_genres
from backend.services.subscription_service import ensure_can_create_audio
from backend.services.autopick_pool import resolve_article_pool_for_request
from backend.services.task_store import (
    MEM_TASKS,
    now_iso,
    task_update,
    task_insert_db,
    task_get,
    count_user_active_tasks,
)
from backend.services.user_service import auto_pick_articles, update_user_preferences
from backend.services.ai_service import (
    summarize_articles_with_openai,
    convert_text_to_speech,
    generate_audio_title_with_openai,
)

from backend.config.settings import RSS_CACHE_EXPIRY_SECONDS
from backend.runtime import shared_state
from backend.config.database import get_database
from backend.services.auth_service import verify_jwt_token
from bson import ObjectId

# Authentication will use simplified token-as-user-id approach

security = HTTPBearer()

# JWT-based auth for AutoPick V2
async def get_current_user_v2(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        payload = verify_jwt_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        if not shared_state.db_connected or shared_state.db is None:
            # Fallback to direct DB get if shared_state is not wired
            db = get_database()
        else:
            db = shared_state.db

        try:
            oid = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid user id in token")

        user_doc = await db.users.find_one({"_id": oid})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        user_doc["id"] = str(user_doc["_id"]) ; user_doc.pop("_id", None)
        return User(**user_doc)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[AutoPick V2] Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


router = APIRouter()


async def _run_task(task_id: str, request: AutoPickRequest, user: User):
    try:
        import time as _t
        stage_timings = {}
        t0 = _t.time()

        # Normalize genres
        if request.preferred_genres:
            request.preferred_genres = normalize_preferred_genres(request.preferred_genres)

        task_update(task_id, {"status": "in_progress", "progress": 5, "message": "記事候補を収集中..."}, MEM_TASKS, shared_state.db_connected, shared_state.db)
        pool = await resolve_article_pool_for_request(
            request,
            user.id,
            shared_state.db,
            shared_state.db_connected,
            shared_state.RSS_CACHE,
            RSS_CACHE_EXPIRY_SECONDS,
        )
        pool_count = len(pool)
        stage_timings['pool_ms'] = int((_t.time() - t0) * 1000)
        if not pool:
            task_update(task_id, {"status": "failed", "progress": 100, "error": "記事候補が見つかりません"}, MEM_TASKS, shared_state.db_connected, shared_state.db)
            return

        t1 = _t.time()
        picked = await auto_pick_articles(
            user_id=user.id,
            all_articles=pool,
            max_articles=request.max_articles or 3,
            preferred_genres=request.preferred_genres
        )
        stage_timings['selection_ms'] = int((_t.time() - t1) * 1000)
        if not picked:
            task_update(task_id, {"status": "failed", "progress": 100, "error": "条件に合う記事がありません"}, MEM_TASKS, shared_state.db_connected, shared_state.db)
            return

        task_update(task_id, {"progress": 35, "message": "要約を作成しています..."}, MEM_TASKS, shared_state.db_connected, shared_state.db)
        t2 = _t.time()
        articles_content = [f"Title: {a.title}\nSummary: {a.summary}\nSource: {a.source_name}" for a in picked]
        script = await summarize_articles_with_openai(
            articles_content,
            prompt_style=(request.prompt_style or "recommended"),
            custom_prompt=request.custom_prompt,
        )
        stage_timings['summarize_ms'] = int((_t.time() - t2) * 1000)

        task_update(task_id, {"progress": 65, "message": "音声を生成しています..."}, MEM_TASKS, shared_state.db_connected, shared_state.db)
        t3 = _t.time()
        tts = await convert_text_to_speech(script)
        audio_url = tts['url']
        duration = tts['duration']
        stage_timings['tts_ms'] = int((_t.time() - t3) * 1000)

        task_update(task_id, {"progress": 85, "message": "ライブラリに保存しています..."}, MEM_TASKS, shared_state.db_connected, shared_state.db)
        await ensure_can_create_audio(user.id)

        # Chapters
        chapters = []
        titles = [a.title for a in picked]
        if len(titles) > 1 and duration > 0:
            per = duration // len(titles)
            for i, (art, title) in enumerate(zip(picked, titles)):
                start = i * per * 1000
                end = ((i + 1) * per if i < len(titles) - 1 else duration) * 1000
                chapters.append({
                    "title": title,
                    "start_time": start,
                    "end_time": end,
                    "original_url": art.link,
                })

        generated_title = await generate_audio_title_with_openai(articles_content)
        audio_doc = AudioCreation(
            user_id=user.id,
            title=generated_title,
            article_ids=[a.id for a in picked],
            article_titles=titles,
            audio_url=audio_url,
            duration=duration,
            script=script,
            chapters=chapters,
            prompt_style=(request.prompt_style or "recommended"),
            custom_prompt=(request.custom_prompt or None),
        )
        doc = audio_doc.dict()
        if 'created_at' not in doc:
            from datetime import datetime
            doc['created_at'] = datetime.utcnow()
        await shared_state.db.audio_creations.insert_one(doc)

        # Learning
        try:
            for art in picked:
                interaction = UserInteraction(
                    article_id=art.id,
                    interaction_type="created_audio",
                    genre=art.genre or "General",
                )
                await update_user_preferences(user.id, interaction)
        except Exception as le:
            logging.warning(f"Failed to record learning interaction: {le}")

        total_ms = int((_t.time() - t0) * 1000)
        script_len = len(script or "")
        result = {
            "id": audio_doc.id,
            "title": audio_doc.title,
            "audio_url": audio_doc.audio_url,
            "duration": audio_doc.duration,
            "script": audio_doc.script,
            "chapters": audio_doc.chapters,
            "article_ids": audio_doc.article_ids,
        }
        debug_info = {
            "pool_sizes": {"total": pool_count},
            "applied_genres": request.preferred_genres or [],
            "stage_timings": {**stage_timings, "total_ms": total_ms},
            "candidates_count": len(request.candidates or []),
            "tab_scope": (request.tab_scope or ''),
            "script_length": script_len,
        }
        task_update(task_id, {"status": "completed", "progress": 100, "message": "完了しました", "result": result, "debug_info": debug_info}, MEM_TASKS, shared_state.db_connected, shared_state.db)

    except Exception as e:
        logging.error(f"AutoPick V2 task failed: {e}")
        task_update(task_id, {"status": "failed", "progress": 100, "error": str(e)}, MEM_TASKS, shared_state.db_connected, shared_state.db)


@router.post("/api/v2/audio/autopick")
async def start_autopick_task(request: AutoPickRequest, current_user: User = Depends(get_current_user_v2)):
    # Limits
    await ensure_can_create_audio(current_user.id)
    active_count = await count_user_active_tasks(current_user.id, MEM_TASKS, shared_state.db_connected, shared_state.db)
    from os import getenv
    try:
        max_parallel = max(1, int(getenv('MAX_PARALLEL_AUTOPICK', '1')))
    except Exception:
        max_parallel = 1
    if active_count >= max_parallel:
        raise HTTPException(status_code=429, detail="Too many AutoPick tasks in progress")

    # Normalize genres early
    if request.preferred_genres:
        request.preferred_genres = normalize_preferred_genres(request.preferred_genres)

    task_id = str(uuid.uuid4())
    task_doc = {
        "task_id": task_id,
        "user_id": current_user.id,
        "status": "pending",
        "progress": 0,
        "message": "タスクを開始しています...",
        "updated_at": now_iso(),
    }
    MEM_TASKS[task_id] = dict(task_doc)
    # Persist task
    if shared_state.db_connected and shared_state.db is not None:
        from datetime import datetime
        persist = {**task_doc, "updated_at": datetime.utcnow(), "created_at": datetime.utcnow()}
        await task_insert_db(persist, shared_state.db_connected, shared_state.db)

    asyncio.create_task(_run_task(task_id, request, current_user))
    return {"task_id": task_id, "status": "pending", "message": "タスクを開始しました"}


@router.get("/api/auto-pick/task-status/{task_id}")
async def get_autopick_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user_v2)
):
    task = await task_get(task_id, MEM_TASKS, shared_state.db_connected, shared_state.db)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Verify user owns this task
    if task.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    keys = ["task_id", "status", "progress", "message", "updated_at", "result", "error", "debug_info"]
    return {k: task.get(k) for k in keys if k in task}


@router.post("/api/v2/audio/autopick/sync")
async def generate_autopick_sync(
    request: AutoPickRequest, 
    current_user: User = Depends(get_current_user_v2)
):
    """Synchronous AutoPick generation that returns the created audio object.

    Note: For production UX, prefer task-based endpoint. This exists to support
    clients expecting immediate UnifiedAudioResponse.
    """
    # Limits
    await ensure_can_create_audio(current_user.id)

    # Normalize genres
    if request.preferred_genres:
        request.preferred_genres = normalize_preferred_genres(request.preferred_genres)

    # Build pool
    pool = await resolve_article_pool_for_request(
        request,
        current_user.id,
        shared_state.db,
        shared_state.db_connected,
        shared_state.RSS_CACHE,
        RSS_CACHE_EXPIRY_SECONDS,
    )
    if not pool:
        raise HTTPException(status_code=404, detail="No candidate articles")

    picked = await auto_pick_articles(
        user_id=current_user.id,
        all_articles=pool,
        max_articles=request.max_articles or 3,
        preferred_genres=request.preferred_genres,
    )
    if not picked:
        raise HTTPException(status_code=404, detail="No suitable articles")

    # Summarize + TTS
    articles_content = [f"Title: {a.title}\nSummary: {a.summary}\nSource: {a.source_name}" for a in picked]
    script = await summarize_articles_with_openai(
        articles_content,
        prompt_style=(request.prompt_style or "recommended"),
        custom_prompt=request.custom_prompt,
    )
    tts = await convert_text_to_speech(script)

    # Chapters
    duration = tts['duration']
    titles = [a.title for a in picked]
    chapters = []
    if len(titles) > 1 and duration > 0:
        per = duration // len(titles)
        for i, (art, title) in enumerate(zip(picked, titles)):
            start = i * per * 1000
            end = ((i + 1) * per if i < len(titles) - 1 else duration) * 1000
            chapters.append({
                "title": title,
                "start_time": start,
                "end_time": end,
                "original_url": art.link,
            })

    # Save
    await ensure_can_create_audio(current_user.id)
    generated_title = await generate_audio_title_with_openai(articles_content)
    audio_doc = AudioCreation(
        user_id=current_user.id,
        title=generated_title,
        article_ids=[a.id for a in picked],
        article_titles=titles,
        audio_url=tts['url'],
        duration=tts['duration'],
        script=script,
        chapters=chapters,
        prompt_style=(request.prompt_style or "recommended"),
        custom_prompt=(request.custom_prompt or None),
    )
    doc = audio_doc.dict()
    if 'created_at' not in doc:
        from datetime import datetime
        doc['created_at'] = datetime.utcnow()
    await shared_state.db.audio_creations.insert_one(doc)

    # Learning
    try:
        for art in picked:
            interaction = UserInteraction(
                article_id=art.id,
                interaction_type="created_audio",
                genre=art.genre or "General",
            )
            await update_user_preferences(current_user.id, interaction)
    except Exception as le:
        logging.warning(f"Failed to record learning interaction: {le}")

    # Return Unified-like payload
    return {
        "id": audio_doc.id,
        "title": audio_doc.title,
        "audio_url": audio_doc.audio_url,
        "duration": audio_doc.duration,
        "script": audio_doc.script,
        "voice_language": request.voice_language or "ja-JP",
        "voice_name": request.voice_name or "alloy",
        "chapters": audio_doc.chapters,
        "articles_count": len(audio_doc.article_ids),
        "generation_mode": "autopick",
        "created_at": doc.get("created_at"),
    }
