"""
Audio service for managing audio creation, playback, and library operations.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from backend.config.database import get_database, is_database_connected
from backend.models.audio import AudioCreation, Playlist, Album, DownloadedAudio
from backend.models.article import Article
from backend.services.ai_service import generate_audio_title_with_openai, summarize_articles_with_openai, convert_text_to_speech
from backend.services.storage_service import delete_from_s3
from backend.utils.errors import handle_database_error, handle_generic_error
from backend.utils.database import find_many_by_user, find_one_by_id, insert_document, update_document, delete_document

async def create_audio_from_articles(user_id: str, 
                                   article_ids: List[str],
                                   article_titles: List[str],
                                   custom_title: Optional[str] = None,
                                   article_urls: Optional[List[str]] = None) -> AudioCreation:
    """
    Create audio podcast from articles using AI.
    
    Args:
        user_id: User ID
        article_ids: List of article IDs
        article_titles: List of article titles
        custom_title: Optional custom title for the audio
        article_urls: Optional list of article URLs
        
    Returns:
        AudioCreation: Created audio object
    """
    try:
        logging.info(f"Creating audio for user {user_id} with {len(article_ids)} articles")
        
        # Prepare article content for AI processing
        articles_content = []
        for i, title in enumerate(article_titles):
            content = f"Title: {title}"
            if article_urls and i < len(article_urls):
                content += f"\nURL: {article_urls[i]}"
            articles_content.append(content)
        
        # Generate title using AI
        if custom_title:
            audio_title = custom_title
        else:
            audio_title = await generate_audio_title_with_openai(articles_content)
        
        # Generate script using AI
        script = await summarize_articles_with_openai(articles_content)
        
        # Convert script to speech
        tts_result = await convert_text_to_speech(script)
        audio_url = tts_result["url"]
        duration = tts_result["duration"]
        
        # Create chapters data
        chapters = []
        for i, (article_id, title) in enumerate(zip(article_ids, article_titles)):
            chapter = {
                "title": title,
                "start_time": 0,  # For now, all content is in one continuous segment
                "end_time": duration * 1000,  # Convert to milliseconds
                "original_url": article_urls[i] if article_urls and i < len(article_urls) else ""
            }
            chapters.append(chapter)
        
        # Create audio record
        audio_data = {
            "user_id": user_id,
            "title": audio_title,
            "article_ids": article_ids,
            "article_titles": article_titles,
            "audio_url": audio_url,
            "duration": duration,
            "script": script,
            "chapters": chapters,
            "created_at": datetime.utcnow()
        }
        
        audio_id = await insert_document("audio_creations", audio_data)
        
        # Create and return AudioCreation object
        audio_creation = AudioCreation(
            id=audio_id,
            **audio_data
        )
        
        logging.info(f"Successfully created audio {audio_id} for user {user_id}")
        return audio_creation
        
    except Exception as e:
        logging.error(f"Error creating audio: {e}")
        raise handle_generic_error(e, "audio creation")

async def get_user_audio_library(user_id: str, include_deleted: bool = False) -> List[AudioCreation]:
    """
    Get user's audio library.
    
    Args:
        user_id: User ID
        include_deleted: Whether to include soft-deleted audio
        
    Returns:
        List[AudioCreation]: User's audio library
    """
    try:
        filters = {}
        if not include_deleted:
            filters["deleted_at"] = {"$exists": False}
        
        audio_data = await find_many_by_user(
            "audio_creations", 
            user_id, 
            filters=filters,
            sort_field="created_at",
            sort_direction=-1
        )
        
        return [AudioCreation(**audio) for audio in audio_data]
        
    except Exception as e:
        logging.error(f"Error getting user audio library: {e}")
        raise handle_database_error(e, "get audio library")

async def get_audio_by_id(user_id: str, audio_id: str) -> Optional[AudioCreation]:
    """
    Get specific audio by ID for a user.
    
    Args:
        user_id: User ID
        audio_id: Audio ID
        
    Returns:
        AudioCreation or None: Audio object if found
    """
    try:
        audio_data = await find_one_by_id("audio_creations", audio_id, user_id)
        
        if audio_data:
            return AudioCreation(**audio_data)
        return None
        
    except Exception as e:
        logging.error(f"Error getting audio by ID: {e}")
        return None

async def rename_audio(user_id: str, audio_id: str, new_title: str) -> bool:
    """
    Rename an audio file.
    
    Args:
        user_id: User ID
        audio_id: Audio ID
        new_title: New title for the audio
        
    Returns:
        bool: True if renamed successfully
    """
    try:
        updates = {
            "title": new_title,
            "updated_at": datetime.utcnow()
        }
        
        return await update_document("audio_creations", audio_id, updates, user_id)
        
    except Exception as e:
        logging.error(f"Error renaming audio: {e}")
        raise handle_database_error(e, "rename audio")

async def soft_delete_audio(user_id: str, audio_id: str) -> bool:
    """
    Soft delete an audio file (move to trash).
    
    Args:
        user_id: User ID
        audio_id: Audio ID
        
    Returns:
        bool: True if soft deleted successfully
    """
    try:
        if not is_database_connected():
            raise handle_database_error(Exception("Database not connected"), "soft delete audio")
        
        db = get_database()
        
        # Get the audio record
        audio = await db.audio_creations.find_one({"_id": audio_id, "user_id": user_id})
        if not audio:
            return False
        
        # Move to deleted_audio collection
        deleted_audio = {
            **audio,
            "original_collection": "audio_creations",
            "deleted_at": datetime.utcnow(),
            "permanent_delete_at": datetime.utcnow() + timedelta(days=30)  # Auto-delete after 30 days
        }
        
        await db.deleted_audio.insert_one(deleted_audio)
        
        # Remove from original collection
        await db.audio_creations.delete_one({"_id": audio_id, "user_id": user_id})
        
        logging.info(f"Audio {audio_id} moved to trash for user {user_id}")
        return True
        
    except Exception as e:
        logging.error(f"Error soft deleting audio: {e}")
        raise handle_database_error(e, "soft delete audio")

async def restore_audio(user_id: str, audio_id: str) -> bool:
    """
    Restore a soft-deleted audio file.
    
    Args:
        user_id: User ID
        audio_id: Audio ID
        
    Returns:
        bool: True if restored successfully
    """
    try:
        if not is_database_connected():
            raise handle_database_error(Exception("Database not connected"), "restore audio")
        
        db = get_database()
        
        # Find in deleted_audio collection
        deleted_audio = await db.deleted_audio.find_one({"_id": audio_id, "user_id": user_id})
        if not deleted_audio:
            return False
        
        # Restore to original collection
        original_audio = {k: v for k, v in deleted_audio.items() 
                         if k not in ["deleted_at", "permanent_delete_at", "original_collection"]}
        
        await db.audio_creations.insert_one(original_audio)
        
        # Remove from deleted_audio collection
        await db.deleted_audio.delete_one({"_id": audio_id, "user_id": user_id})
        
        logging.info(f"Audio {audio_id} restored for user {user_id}")
        return True
        
    except Exception as e:
        logging.error(f"Error restoring audio: {e}")
        raise handle_database_error(e, "restore audio")

async def permanently_delete_audio(user_id: str, audio_id: str) -> bool:
    """
    Permanently delete an audio file and its associated storage.
    
    Args:
        user_id: User ID
        audio_id: Audio ID
        
    Returns:
        bool: True if permanently deleted successfully
    """
    try:
        if not is_database_connected():
            raise handle_database_error(Exception("Database not connected"), "permanent delete audio")
        
        db = get_database()
        
        # Find audio in deleted collection
        deleted_audio = await db.deleted_audio.find_one({"_id": audio_id, "user_id": user_id})
        if not deleted_audio:
            return False
        
        # Delete from storage if it's an S3 URL
        audio_url = deleted_audio.get("audio_url", "")
        if audio_url and "s3" in audio_url:
            try:
                await delete_from_s3(audio_url)
            except Exception as storage_error:
                logging.warning(f"Failed to delete audio from storage: {storage_error}")
        
        # Remove from database
        await db.deleted_audio.delete_one({"_id": audio_id, "user_id": user_id})
        
        logging.info(f"Audio {audio_id} permanently deleted for user {user_id}")
        return True
        
    except Exception as e:
        logging.error(f"Error permanently deleting audio: {e}")
        raise handle_database_error(e, "permanent delete audio")

async def get_deleted_audio(user_id: str) -> List[Dict[str, Any]]:
    """
    Get user's deleted audio files.
    
    Args:
        user_id: User ID
        
    Returns:
        List[Dict]: Deleted audio files
    """
    try:
        if not is_database_connected():
            raise handle_database_error(Exception("Database not connected"), "get deleted audio")
        
        db = get_database()
        
        deleted_audio = await db.deleted_audio.find(
            {"user_id": user_id}
        ).sort("deleted_at", -1).to_list(100)
        
        # Format for response
        for audio in deleted_audio:
            audio["id"] = str(audio["_id"])
            del audio["_id"]
        
        return deleted_audio
        
    except Exception as e:
        logging.error(f"Error getting deleted audio: {e}")
        raise handle_database_error(e, "get deleted audio")

async def clear_all_deleted_audio(user_id: str) -> int:
    """
    Permanently delete all soft-deleted audio for a user.
    
    Args:
        user_id: User ID
        
    Returns:
        int: Number of audio files permanently deleted
    """
    try:
        if not is_database_connected():
            raise handle_database_error(Exception("Database not connected"), "clear deleted audio")
        
        db = get_database()
        
        # Get all deleted audio for user
        deleted_audio_list = await db.deleted_audio.find({"user_id": user_id}).to_list(None)
        
        # Delete from storage
        for audio in deleted_audio_list:
            audio_url = audio.get("audio_url", "")
            if audio_url and "s3" in audio_url:
                try:
                    await delete_from_s3(audio_url)
                except Exception as storage_error:
                    logging.warning(f"Failed to delete audio from storage: {storage_error}")
        
        # Delete from database
        result = await db.deleted_audio.delete_many({"user_id": user_id})
        
        logging.info(f"Permanently deleted {result.deleted_count} audio files for user {user_id}")
        return result.deleted_count
        
    except Exception as e:
        logging.error(f"Error clearing deleted audio: {e}")
        raise handle_database_error(e, "clear deleted audio")

async def cleanup_expired_deleted_audio():
    """
    Clean up expired deleted audio files (run as background task).
    """
    try:
        if not is_database_connected():
            return
        
        db = get_database()
        
        # Find expired audio
        expired_audio = await db.deleted_audio.find(
            {"permanent_delete_at": {"$lte": datetime.utcnow()}}
        ).to_list(None)
        
        # Delete from storage and database
        for audio in expired_audio:
            audio_url = audio.get("audio_url", "")
            if audio_url and "s3" in audio_url:
                try:
                    await delete_from_s3(audio_url)
                except Exception as storage_error:
                    logging.warning(f"Failed to delete expired audio from storage: {storage_error}")
        
        # Remove from database
        if expired_audio:
            result = await db.deleted_audio.delete_many(
                {"permanent_delete_at": {"$lte": datetime.utcnow()}}
            )
            logging.info(f"Cleaned up {result.deleted_count} expired audio files")
        
    except Exception as e:
        logging.error(f"Error during cleanup of expired deleted audio: {e}")

async def get_audio_statistics(user_id: str) -> Dict[str, Any]:
    """
    Get audio statistics for a user.
    
    Args:
        user_id: User ID
        
    Returns:
        Dict: Audio statistics
    """
    try:
        if not is_database_connected():
            return {"total_audio": 0, "total_duration": 0, "deleted_audio": 0}
        
        db = get_database()
        
        # Count active audio
        total_audio = await db.audio_creations.count_documents({"user_id": user_id})
        
        # Count deleted audio
        deleted_audio = await db.deleted_audio.count_documents({"user_id": user_id})
        
        # Calculate total duration
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": None, "total_duration": {"$sum": "$duration"}}}
        ]
        
        duration_result = await db.audio_creations.aggregate(pipeline).to_list(1)
        total_duration = duration_result[0]["total_duration"] if duration_result else 0
        
        return {
            "total_audio": total_audio,
            "total_duration": total_duration,
            "deleted_audio": deleted_audio,
            "average_duration": total_duration / total_audio if total_audio > 0 else 0
        }
        
    except Exception as e:
        logging.error(f"Error getting audio statistics: {e}")
        return {"total_audio": 0, "total_duration": 0, "deleted_audio": 0}
