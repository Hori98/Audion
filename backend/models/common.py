"""
Common Pydantic models shared across the application.
"""

from typing import Any, Dict, Optional, TYPE_CHECKING
from pydantic import BaseModel

if TYPE_CHECKING:
    from .user import User

class StandardResponse(BaseModel):
    """Standard API response format."""
    message: str
    data: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    """Standard error response format."""
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class TokenResponse(BaseModel):
    """JWT token response format."""
    access_token: str
    token_type: str = "bearer"

class RegisterResponse(BaseModel):
    """User registration response format."""
    access_token: str
    user: Dict[str, Any]

class HealthResponse(BaseModel):
    """Health check response format."""
    status: str
    database_connected: bool
    message: Optional[str] = None