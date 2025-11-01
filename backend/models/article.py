"""
Article-related Pydantic models for article processing and genre classification.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Article(BaseModel):
    """Article model from RSS feeds."""
    id: str
    title: str
    summary: str
    link: str
    published: str
    source_name: str
    content: Optional[str] = None
    genre: Optional[str] = None

class ArticleCandidate(BaseModel):
    """Lightweight candidate article from the frontend (home tab)."""
    id: str
    title: str
    summary: Optional[str] = None
    link: Optional[str] = None
    source_name: Optional[str] = None
    published_at: Optional[str] = None


class AutoPickRequest(BaseModel):
    """Request model for auto-picking articles based on user preferences.

    Extended to accept additional optional fields used by the frontend so the
    backend won't reject richer payloads. Unknown fields can be safely ignored
    by business logic until fully supported.
    """
    # Core selection params
    max_articles: Optional[int] = 5
    preferred_genres: Optional[List[str]] = None
    active_source_ids: Optional[List[str]] = None  # Explicitly specify sources

    # Extended params (optional)
    voice_language: Optional[str] = None
    voice_name: Optional[str] = None
    prompt_style: Optional[str] = None
    custom_prompt: Optional[str] = None
    tab_scope: Optional[str] = None  # 'home' | 'feed'
    source_scope: Optional[str] = None  # 'fixed' | 'user'
    selected_source_ids: Optional[List[str]] = None
    candidates: Optional[List[ArticleCandidate]] = None

class MisreadingFeedback(BaseModel):
    """Model for reporting audio misreading issues."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    audio_id: str
    timestamp: int  # Position in milliseconds where misreading occurred
    reported_text: Optional[str] = None  # What the user heard
    expected_text: Optional[str] = None  # What should have been said
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Genre classification constants
GENRE_KEYWORDS = {
    "Technology": {
        "high": ["ai", "artificial intelligence", "machine learning", "blockchain", "cryptocurrency", "bitcoin", "ethereum", "nft", "metaverse", "vr", "virtual reality", "ar", "augmented reality", "cloud computing", "cybersecurity", "data privacy", "algorithm", "neural network", "quantum computing", "5g", "internet of things", "iot", "robotics", "automation"],
        "medium": ["tech", "technology", "software", "app", "platform", "digital", "online", "internet", "web", "mobile", "smartphone", "iphone", "android", "google", "apple", "microsoft", "amazon", "facebook", "meta", "twitter", "tesla", "spacex", "openai", "chatgpt"],
        "low": ["startup", "innovation", "disruption", "silicon valley", "venture capital", "vc", "ipo", "saas", "fintech", "edtech", "medtech"]
    },
    "Finance": {
        "high": ["stock market", "nasdaq", "dow jones", "s&p 500", "federal reserve", "fed", "interest rate", "inflation", "recession", "gdp", "unemployment", "economic growth", "monetary policy", "fiscal policy", "central bank"],
        "medium": ["finance", "financial", "economy", "economic", "market", "stock", "share", "investment", "investor", "trading", "bank", "banking", "credit", "loan", "mortgage", "insurance", "pension", "retirement"],
        "low": ["business", "corporate", "earnings", "revenue", "profit", "loss", "merger", "acquisition", "dividend", "portfolio", "asset"]
    },
    "Sports": {
        "high": ["olympic", "olympics", "world cup", "super bowl", "champions league", "nba finals", "world series", "masters tournament", "wimbledon", "uefa", "fifa"],
        "medium": ["sport", "sports", "game", "match", "championship", "tournament", "league", "team", "player", "athlete", "coach", "victory", "defeat", "goal", "score"],
        "low": ["football", "soccer", "basketball", "baseball", "tennis", "golf", "hockey", "boxing", "mma", "racing"]
    },
    "Politics": {
        "high": ["president", "prime minister", "congress", "parliament", "senate", "supreme court", "election", "vote", "campaign", "democracy", "republican", "democrat", "conservative", "liberal", "legislation", "bill"],
        "medium": ["politics", "political", "government", "policy", "minister", "senator", "congressman", "mayor", "governor", "diplomat", "embassy", "foreign policy", "domestic policy"],
        "low": ["administration", "cabinet", "bureaucracy", "regulation", "governance", "public sector", "civil service", "law"]
    },
    "Health": {
        "high": ["covid", "coronavirus", "pandemic", "vaccine", "vaccination", "hospital", "doctor", "physician", "surgeon", "medical", "medicine", "healthcare", "patient", "treatment", "therapy", "diagnosis", "symptom", "disease", "virus", "bacteria"],
        "medium": ["health", "healthy", "wellness", "fitness", "nutrition", "diet", "mental health", "depression", "anxiety", "stress", "pharmaceutical", "drug", "medication", "clinical trial", "fda approval"],
        "low": ["exercise", "workout", "lifestyle", "wellbeing", "prevention", "care", "medical device", "biotech", "healthcare system"]
    },
    "Entertainment": {
        "high": ["movie", "film", "cinema", "hollywood", "oscar", "emmy", "grammy", "music", "album", "song", "concert", "celebrity", "actor", "actress", "singer", "musician", "director", "producer"],
        "medium": ["entertainment", "show", "series", "tv", "television", "streaming", "netflix", "disney", "amazon prime", "hbo", "art", "artist", "gallery", "museum", "culture", "cultural"],
        "low": ["theater", "theatre", "performance", "comedy", "drama", "documentary", "animation", "gaming", "video game"]
    },
    "Science": {
        "high": ["research", "study", "scientific", "scientist", "discovery", "breakthrough", "experiment", "laboratory", "university research", "peer review", "journal", "publication"],
        "medium": ["science", "physics", "chemistry", "biology", "astronomy", "space", "nasa", "mars", "rocket", "satellite", "telescope", "dna", "genetic", "genome"],
        "low": ["innovation", "development", "analysis", "data", "evidence", "theory", "hypothesis"]
    },
    "Environment": {
        "high": ["climate change", "global warming", "greenhouse gas", "carbon emission", "renewable energy", "solar power", "wind power", "electric vehicle", "ev", "sustainability", "conservation"],
        "medium": ["environment", "environmental", "climate", "weather", "temperature", "pollution", "air quality", "water quality", "ecosystem", "biodiversity", "wildlife", "forest", "ocean"],
        "low": ["nature", "natural", "green", "eco", "recycling", "waste", "energy", "resource"]
    },
    "Education": {
        "high": ["education", "educational", "school", "university", "college", "student", "teacher", "professor", "learning", "curriculum", "degree", "graduation", "academic"],
        "medium": ["classroom", "lesson", "course", "program", "study", "exam", "test", "scholarship", "tuition", "campus"],
        "low": ["knowledge", "skill", "training", "development", "literacy"]
    },
    "Travel": {
        "high": ["travel", "tourism", "tourist", "vacation", "holiday", "trip", "journey", "destination", "hotel", "resort", "airline", "flight", "airport", "cruise"],
        "medium": ["visit", "explore", "adventure", "sightseeing", "attraction", "landmark", "culture", "local", "international", "domestic"],
        "low": ["experience", "discovery", "leisure", "recreation", "hospitality", "service"]
    }
}
