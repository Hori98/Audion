"""
Archive-related Pydantic models.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class ArchivedArticle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    article_id: str
    article_title: str
    article_summary: str
    article_link: str
    article_published: str
    source_name: str
    article_genre: Optional[str] = None
    article_content: Optional[str] = None
    archived_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []
    notes: Optional[str] = None
    read_status: str = "unread"
    is_favorite: bool = False
    folder: Optional[str] = None
    search_text: Optional[str] = None

class ArchiveRequest(BaseModel):
    article_id: str
    article_title: str
    article_summary: str
    article_link: str
    article_published: str
    source_name: str
    article_genre: Optional[str] = None
    article_content: Optional[str] = None

class ArchiveUpdateRequest(BaseModel):
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    read_status: Optional[str] = None
    is_favorite: Optional[bool] = None
    folder: Optional[str] = None

