"""
Bookmark Pydantic models.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class Bookmark(BaseModel):
  id: str = Field(default_factory=lambda: str(uuid.uuid4()))
  user_id: str
  article_id: str
  article_title: str
  article_summary: str
  article_link: str
  article_source: str
  article_image_url: Optional[str] = None
  bookmarked_at: datetime = Field(default_factory=datetime.utcnow)
  tags: List[str] = []
  notes: Optional[str] = None

class BookmarkCreate(BaseModel):
  article_id: str
  article_title: str
  article_summary: str
  article_link: str
  article_source: str
  article_image_url: Optional[str] = None
  tags: List[str] = []
  notes: Optional[str] = None

