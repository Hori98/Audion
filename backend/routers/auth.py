"""
Authentication router for user registration and login endpoints.
"""

import logging
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer

from backend.models.user import User, UserCreate, UserLogin
from backend.models.common import TokenResponse, StandardResponse
from backend.services.auth_service import authenticate_user, create_user, create_jwt_token, get_current_user
from backend.utils.errors import handle_authentication_error, handle_database_error
from backend.utils.helpers import validate_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer()

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """
    Register a new user account.
    
    Args:
        user_data: User registration data
        
    Returns:
        TokenResponse: JWT token for the new user
    """
    try:
        # Validate input
        if not validate_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid email format"
            )
        
        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password must be at least 6 characters long"
            )
        
        # Create user
        user = await create_user(user_data.email, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )
        
        # Generate JWT token
        token = create_jwt_token(user.id, user.email)
        
        logging.info(f"New user registered: {user.email}")
        return TokenResponse(access_token=token, token_type="bearer")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Registration error: {e}")
        raise handle_database_error(e, "user registration")

@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    """
    Authenticate user and return JWT token.
    
    Args:
        user_data: User login credentials
        
    Returns:
        TokenResponse: JWT token for authenticated user
    """
    try:
        # Validate input
        if not validate_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid email format"
            )
        
        # Authenticate user
        user = await authenticate_user(user_data.email, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Generate JWT token
        token = create_jwt_token(user.id, user.email)
        
        logging.info(f"User logged in: {user.email}")
        return TokenResponse(access_token=token, token_type="bearer")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Login error: {e}")
        raise handle_authentication_error(e, "user login")

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.
    
    Args:
        current_user: Current authenticated user from dependency injection
        
    Returns:
        User: Current user information
    """
    return current_user

@router.post("/verify-token", response_model=StandardResponse)
async def verify_token(current_user: User = Depends(get_current_user)):
    """
    Verify JWT token validity.
    
    Args:
        current_user: Current authenticated user from dependency injection
        
    Returns:
        StandardResponse: Token verification result
    """
    return StandardResponse(
        message="Token is valid",
        data={"user_id": current_user.id, "email": current_user.email}
    )
