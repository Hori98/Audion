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

class AutoPickRequest(BaseModel):
    """Request model for auto-picking articles based on user preferences."""
    max_articles: Optional[int] = 5
    preferred_genres: Optional[List[str]] = None
    active_source_ids: Optional[List[str]] = None  # Explicitly specify which sources to use

class MisreadingFeedback(BaseModel):
    """Model for reporting audio misreading issues."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    audio_id: str
    timestamp: int  # Position in milliseconds where misreading occurred
    reported_text: Optional[str] = None  # What the user heard
    expected_text: Optional[str] = None  # What should have been said
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Genre classification constants - Updated for frontend consistency
GENRE_KEYWORDS = {
    "Technology": {
        "high": ["ai", "artificial intelligence", "machine learning", "blockchain", "cryptocurrency", "bitcoin", "ethereum", "nft", "metaverse", "vr", "virtual reality", "ar", "augmented reality", "cloud computing", "cybersecurity", "data privacy", "algorithm", "neural network", "quantum computing", "5g", "internet of things", "iot", "robotics", "automation"],
        "medium": ["tech", "technology", "software", "app", "platform", "digital", "online", "internet", "web", "mobile", "smartphone", "iphone", "android", "google", "apple", "microsoft", "amazon", "facebook", "meta", "twitter", "tesla", "spacex", "openai", "chatgpt"],
        "low": ["startup", "innovation", "disruption", "silicon valley", "venture capital", "vc", "ipo", "saas", "fintech", "edtech", "medtech"]
    },
    "Business": {
        "high": ["stock market", "nasdaq", "dow jones", "s&p 500", "federal reserve", "fed", "interest rate", "inflation", "recession", "gdp", "unemployment", "economic growth", "monetary policy", "fiscal policy", "central bank", "earnings", "revenue", "profit", "merger", "acquisition"],
        "medium": ["business", "finance", "financial", "economy", "economic", "market", "stock", "share", "investment", "investor", "trading", "bank", "banking", "credit", "loan", "mortgage", "insurance", "pension", "retirement", "corporate", "company", "enterprise"],
        "low": ["dividend", "portfolio", "asset", "commerce", "industry", "sector", "management", "executive", "ceo", "cfo"]
    },
    "Breaking News": {
        "high": ["breaking", "urgent", "alert", "developing", "live", "just in", "update", "emergency", "crisis", "incident", "accident", "disaster", "attack", "shooting", "explosion", "fire", "earthquake", "flood"],
        "medium": ["news", "latest", "report", "announcement", "statement", "press release", "briefing", "conference", "witness", "investigation", "police", "rescue", "evacuate"],
        "low": ["happened", "occurred", "confirmed", "officials", "authorities", "spokesperson", "sources"]
    },
    "Sports": {
        "high": ["olympic", "olympics", "world cup", "super bowl", "champions league", "nba finals", "world series", "masters tournament", "wimbledon", "uefa", "fifa"],
        "medium": ["sport", "sports", "game", "match", "championship", "tournament", "league", "team", "player", "athlete", "coach", "victory", "defeat", "goal", "score"],
        "low": ["football", "soccer", "basketball", "baseball", "tennis", "golf", "hockey", "boxing", "mma", "racing"]
    },
    "Politics": {
        "high": ["president", "prime minister", "congress", "parliament", "senate", "supreme court", "election", "vote", "campaign", "democracy", "republican", "democrat", "conservative", "liberal", "legislation", "bill", "political party", "impeachment", "filibuster", "caucus", "primary election"],
        "medium": ["politics", "political", "government", "policy", "minister", "senator", "congressman", "mayor", "governor", "diplomat", "embassy", "foreign policy", "domestic policy", "white house", "capitol", "pentagon", "state department"],
        "low": ["administration", "cabinet", "bureaucracy", "regulation", "governance", "public sector", "civil service", "law", "ballot", "polling", "voter"]
    },
    "World": {
        "high": ["international", "global", "worldwide", "foreign", "overseas", "diplomatic", "embassy", "united nations", "un", "nato", "eu", "european union", "g7", "g20", "summit", "treaty", "sanctions", "peace talks", "conflict", "war"],
        "medium": ["world", "country", "nation", "national", "border", "immigration", "refugee", "asylum", "trade war", "tariff", "export", "import", "alliance", "cooperation", "bilateral", "multilateral"],
        "low": ["international relations", "foreign affairs", "cross-border", "transnational", "overseas", "abroad", "region", "regional"]
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