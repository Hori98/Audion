"""
Authentication service for JWT token management and user authentication.
"""

import logging
import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from bson import ObjectId
from pydantic import ValidationError

from config.settings import JWT_SECRET_KEY, JWT_ALGORITHM
from config.database import get_database, is_database_connected
from models.user import User
from utils.errors import handle_authentication_error, handle_database_error
from utils.helpers import hash_password, verify_password
from services.rss_defaults import setup_default_rss_sources

def create_jwt_token(user_id: str, email: str) -> str:
    """
    Create a JWT token for authenticated user.
    
    Args:
        user_id: User ID
        email: User email
        
    Returns:
        str: JWT token
    """
    try:
        payload = {
            "sub": user_id,
            "email": email,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(days=30)  # Token expires in 30 days
        }
        
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return token
        
    except Exception as e:
        logging.error(f"Error creating JWT token: {e}")
        raise handle_authentication_error(e, "token creation")

def verify_jwt_token(token: str) -> dict:
    """
    Verify and decode JWT token.
    
    Args:
        token: JWT token to verify
        
    Returns:
        dict: Token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        logging.error(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials) -> User:
    """
    Get current user from JWT token.
    
    Args:
        credentials: HTTP Bearer credentials containing JWT token
        
    Returns:
        User: Current authenticated user
        
    Raises:
        HTTPException: If authentication fails
    """
    # Check if database is available
    if not is_database_connected():
        raise handle_database_error(Exception("Database not connected"), "authentication")
    
    db = get_database()
    
    try:
        token = credentials.credentials
        user_id = None
        
        logging.info(f"[AUTH] Processing token: {token}")
        
        # Try JWT token first
        try:
            payload = verify_jwt_token(token)
            user_id = payload.get("sub")
            logging.info(f"[AUTH] JWT decoded, user_id: {user_id}")
        except Exception as e:
            # If JWT fails, treat token as direct user_id (UUID format)
            user_id = token
            logging.info(f"[AUTH] JWT failed ({e}), using token as user_id: {user_id}")
            
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        # Use database instance from above
        
        # Try as ObjectId first, then as string
        user_data = None
        try:
            user_data = await db.users.find_one({"_id": ObjectId(user_id)})
            if user_data:
                logging.info(f"[AUTH] User found by ObjectId: {user_id}")
        except Exception as e:
            # If ObjectId fails, search by string ID
            logging.info(f"[AUTH] ObjectId search failed ({e}), trying string ID")
            user_data = await db.users.find_one({"_id": user_id})
            if user_data:
                logging.info(f"[AUTH] User found by string ID: {user_id}")
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Convert to User model
        user_data["id"] = str(user_data["_id"])
        del user_data["_id"]

        try:
            return User(**user_data)
        except ValidationError as e:
            logging.error(f"[AUTH] User model validation failed for user_id {user_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"User data for user {user_id} is corrupted or missing required fields: {e}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting current user: {e}")
        raise handle_authentication_error(e, "user authentication")

async def authenticate_user(email: str, password: str) -> Optional[User]:
    """
    Authenticate user with email and password.
    
    Args:
        email: User email
        password: User password
        
    Returns:
        User or None: User if authentication successful, None otherwise
    """
    if not is_database_connected():
        return None
        
    db = get_database()
    
    try:
        user_data = await db.users.find_one({"email": email})
        
        if not user_data:
            return None
        
        # Verify password
        stored_password = user_data.get("password", "")
        if not verify_password(password, stored_password):
            return None
        
        # Convert to User model
        user_data["id"] = str(user_data["_id"])
        del user_data["_id"]
        del user_data["password"]  # Don't include password in User model
        
        return User(**user_data)
        
    except Exception as e:
        logging.error(f"Error authenticating user: {e}")
        return None

async def create_user(email: str, password: str) -> Optional[User]:
    """
    Create a new user account.
    
    Args:
        email: User email
        password: User password
        
    Returns:
        User or None: Created user if successful, None otherwise
        
    Raises:
        HTTPException: If user creation fails
    """
    if not is_database_connected():
        raise handle_database_error(Exception("Database not connected"), "user creation")
        
    db = get_database()
    
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create user data
        user_data = {
            "email": email,
            "password": hash_password(password),
            "created_at": datetime.utcnow()
        }
        
        # Insert user
        result = await db.users.insert_one(user_data)
        user_id = str(result.inserted_id)

        # Setup default RSS sources for new user
        try:
            await setup_default_rss_sources(user_id)
            logging.info(f"✅ Default RSS sources setup completed for user: {email}")
        except Exception as e:
            logging.warning(f"⚠️ Failed to setup default RSS sources for user {email}: {e}")
            # Continue with user creation even if RSS setup fails

        # Return user (without password)
        return User(
            id=user_id,
            email=email,
            created_at=user_data["created_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating user: {e}")
        raise handle_database_error(e, "user creation")

async def delete_user(user_id: str) -> bool:
    """
    Delete a user account and all associated data.
    
    Args:
        user_id: ID of user to delete
        
    Returns:
        bool: True if user was deleted successfully
        
    Raises:
        HTTPException: If deletion fails
    """
    if not is_database_connected():
        raise handle_database_error(Exception("Database not connected"), "user deletion")
        
    db = get_database()
    
    try:
        # Delete user and all associated data
        await db.users.delete_one({"_id": ObjectId(user_id)})
        await db.rss_sources.delete_many({"user_id": user_id})
        await db.audio_creations.delete_many({"user_id": user_id})
        await db.user_profiles.delete_many({"user_id": user_id})
        await db.playlists.delete_many({"user_id": user_id})
        await db.albums.delete_many({"user_id": user_id})
        await db.deleted_audio.delete_many({"user_id": user_id})
        
        logging.info(f"Successfully deleted user {user_id} and all associated data")
        return True
        
    except Exception as e:
        logging.error(f"Error deleting user {user_id}: {e}")
        raise handle_database_error(e, "user deletion")