"""
Database connection and configuration for MongoDB.
Provides async connection management and database utilities.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from .settings import MONGO_URL, DB_NAME

# Global database connection variables
db = None
db_connected = False

async def connect_to_database():
    """
    Establishes connection to MongoDB database.
    
    Returns:
        tuple: (database_instance, connection_status)
    """
    global db, db_connected
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Test the connection with timeout
        await asyncio.wait_for(db.command('ping'), timeout=5.0)
        db_connected = True
        logging.info("Connected to MongoDB successfully")
        
        return db, True
        
    except Exception as e:
        logging.error(f"Failed to connect to MongoDB: {e}")
        db_connected = False
        logging.info("Server will run in limited mode without database")
        return None, False

async def create_database_indexes():
    """
    Creates necessary database indexes for optimal performance.
    Should be called after successful database connection.
    """
    if not db_connected or not db:
        logging.warning("Cannot create indexes: database not connected")
        return
    
    try:
        # User indexes
        await db.users.create_index("email", unique=True)
        
        # RSS sources indexes
        await db.rss_sources.create_index([("user_id", 1)])
        
        # Audio creations indexes
        await db.audio_creations.create_index([("user_id", 1), ("created_at", -1)])
        
        # User profiles indexes
        await db.user_profiles.create_index("user_id", unique=True)
        await db.user_profiles.create_index([("user_id", 1), ("updated_at", -1)])
        
        # Preset categories indexes
        await db.preset_categories.create_index("name", unique=True)
        
        # Deleted audio indexes
        await db.deleted_audio.create_index([("user_id", 1), ("deleted_at", -1)])
        await db.deleted_audio.create_index("permanent_delete_at")
        
        # Playlists and albums indexes
        await db.playlists.create_index([("user_id", 1), ("created_at", -1)])
        await db.albums.create_index([("user_id", 1), ("created_at", -1)])
        
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
    return db

def is_database_connected():
    """
    Checks if database is currently connected.
    
    Returns:
        bool: True if database is connected, False otherwise
    """
    return db_connected

@asynccontextmanager
async def get_database_session():
    """
    Context manager for database sessions.
    Provides error handling and logging for database operations.
    """
    if not db_connected:
        raise RuntimeError("Database not connected")
    
    try:
        yield db
    except Exception as e:
        logging.error(f"Database operation failed: {e}")
        raise