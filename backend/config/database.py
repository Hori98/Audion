"""
Database connection and configuration for MongoDB.
Provides async connection management and database utilities.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from .settings import MONGO_URL, DB_NAME

# データベース接続のグローバル変数（server.pyと共有）
_db_instance = None
_db_connected = False

def set_database_instance(db, connected):
    """
    server.pyから呼び出されてデータベースインスタンスを設定
    """
    global _db_instance, _db_connected
    _db_instance = db
    _db_connected = connected

async def connect_to_database():
    """
    Establishes connection to MongoDB database.
    
    Returns:
        tuple: (database_instance, connection_status)
    """
    global _db_instance, _db_connected
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        _db_instance = client[DB_NAME]
        
        # Test the connection with timeout
        await asyncio.wait_for(_db_instance.command('ping'), timeout=5.0)
        _db_connected = True
        logging.info("Connected to MongoDB successfully")
        
        return _db_instance, True
        
    except Exception as e:
        logging.error(f"Failed to connect to MongoDB: {e}")
        _db_connected = False
        logging.info("Server will run in limited mode without database")
        return None, False

async def create_database_indexes():
    """
    Creates necessary database indexes for optimal performance.
    Should be called after successful database connection.
    """
    global _db_instance, _db_connected
    if not _db_connected or not _db_instance:
        logging.warning("Cannot create indexes: database not connected")
        return
    
    try:
        # User indexes
        await _db_instance.users.create_index("email", unique=True)
        
        # RSS sources indexes
        await _db_instance.rss_sources.create_index([("user_id", 1)])
        
        # Audio creations indexes
        await _db_instance.audio_creations.create_index([("user_id", 1), ("created_at", -1)])
        
        # User profiles indexes
        await _db_instance.user_profiles.create_index("user_id", unique=True)
        await _db_instance.user_profiles.create_index([("user_id", 1), ("updated_at", -1)])
        
        # Preset categories indexes
        await _db_instance.preset_categories.create_index("name", unique=True)
        
        # Deleted audio indexes
        await _db_instance.deleted_audio.create_index([("user_id", 1), ("deleted_at", -1)])
        await _db_instance.deleted_audio.create_index("permanent_delete_at")
        
        # Playlists and albums indexes
        await _db_instance.playlists.create_index([("user_id", 1), ("created_at", -1)])
        await _db_instance.albums.create_index([("user_id", 1), ("created_at", -1)])
        
        logging.info("Database indexes created successfully")
        
    except Exception as e:
        logging.error(f"Failed to create database indexes: {e}")
        logging.info("Server will continue without some indexes")

def get_database():
    """
    Returns the current database instance.
    
    Returns:
        AsyncIOMotorDatabase: Database instance or None if not connected
    """
    global _db_instance
    return _db_instance

def is_database_connected():
    """
    Checks if database is currently connected.
    
    Returns:
        bool: True if database is connected, False otherwise
    """
    global _db_connected
    return _db_connected

@asynccontextmanager
async def get_database_session():
    """
    Context manager for database sessions.
    Provides error handling and logging for database operations.
    """
    global _db_instance, _db_connected
    if not _db_connected:
        raise RuntimeError("Database not connected")
    
    try:
        yield _db_instance
    except Exception as e:
        logging.error(f"Database operation failed: {e}")
        raise