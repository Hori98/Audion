"""
Authentication endpoints - Beta version core functionality
Clean implementation following contract-first approach
"""


from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_database
from app.core.security import (
    verify_token,
)
from app.models.user import User, UserCreate, UserInDB, UserResponse
from app.services import AuthService

router = APIRouter()
security = HTTPBearer()


# Request/Response schemas
class LoginRequest(BaseModel):
    """User login request"""

    email: str
    password: str


class LoginResponse(BaseModel):
    """User login response"""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RegisterRequest(UserCreate):
    """User registration request (inherits from UserCreate)"""

    pass


class RegisterResponse(BaseModel):
    """User registration response"""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    message: str = "Registration successful"


# Dependency: Get current authenticated user
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_database),
) -> UserInDB:
    """Get current authenticated user from JWT token"""

    # Verify token and extract payload
    payload = verify_token(credentials.credentials)
    user_id: str = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    # Get user from database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return UserInDB.from_orm(user)


@router.post("/register", response_model=RegisterResponse)
async def register_user(
    user_data: RegisterRequest, db: AsyncSession = Depends(get_database)
):
    """
    Register new user

    Beta version: Simple email/password registration
    """

    user, access_token = await AuthService.register_user(user_data, db)
    user_response = UserResponse.from_orm(user)

    return RegisterResponse(access_token=access_token, user=user_response)


@router.post("/login", response_model=LoginResponse)
async def login_user(
    login_data: LoginRequest, db: AsyncSession = Depends(get_database)
):
    """
    User login with email and password

    Returns JWT token for authentication
    """

    user, access_token = await AuthService.authenticate_user(
        login_data.email, login_data.password, db
    )
    user_response = UserResponse.from_orm(user)

    return LoginResponse(access_token=access_token, user=user_response)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserInDB = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse.from_orm(current_user)


@router.post("/logout")
async def logout_user():
    """
    User logout

    Note: JWT tokens are stateless, so logout is handled client-side
    This endpoint exists for client confirmation
    """
    return {"message": "Logout successful"}
