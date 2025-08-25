"""
Authentication service layer
Handles user authentication business logic
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_user_token, get_password_hash, verify_password
from app.models.user import User, UserCreate, UserInDB


class AuthService:
    """Service for authentication operations"""

    @staticmethod
    async def register_user(
        user_data: UserCreate, db: AsyncSession
    ) -> tuple[UserInDB, str]:
        """
        Register a new user

        Returns:
            Tuple of (user, access_token)

        Raises:
            HTTPException: If email already exists
        """
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == user_data.email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Create new user
        hashed_password = get_password_hash(user_data.password)

        new_user = User(
            email=user_data.email,
            display_name=user_data.display_name,
            hashed_password=hashed_password,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        # Generate access token
        access_token = create_user_token(new_user.id, new_user.email)

        return UserInDB.from_orm(new_user), access_token

    @staticmethod
    async def authenticate_user(
        email: str, password: str, db: AsyncSession
    ) -> tuple[UserInDB, str]:
        """
        Authenticate user with email and password

        Returns:
            Tuple of (user, access_token)

        Raises:
            HTTPException: If credentials are invalid
        """
        # Find user by email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        # Generate access token
        access_token = create_user_token(user.id, user.email)

        return UserInDB.from_orm(user), access_token
