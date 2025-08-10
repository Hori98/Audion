#!/usr/bin/env python3
"""
Lightweight test server for debugging frontend connectivity issues
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI(title="Audion Test API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Simple in-memory storage
users = {}
rss_sources = {}

class UserCreate(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: str
    email: str
    created_at: str

class RSSSourceCreate(BaseModel):
    name: str
    url: str

class RSSSource(BaseModel):
    id: str
    user_id: str
    name: str
    url: str
    created_at: str

@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "message": "Test server is running",
        "database": "in-memory"
    }

@app.get("/api/health")
async def api_health_check():
    """API health check endpoint"""
    return {
        "status": "healthy",
        "message": "API is working",
        "users_count": len(users),
        "sources_count": len(rss_sources)
    }

@app.post("/api/auth/register")
async def register_user(user_data: UserCreate):
    """Register a new user"""
    import uuid
    from datetime import datetime
    
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=user_data.email,
        created_at=datetime.now().isoformat()
    )
    
    users[user_id] = user
    logging.info(f"Registered user: {user_data.email}")
    
    return {
        "access_token": user_id,
        "token_type": "bearer",
        "user": user
    }

@app.post("/api/auth/login")
async def login_user(user_data: UserCreate):
    """Login user (simplified - auto-register if not exists)"""
    # Find existing user by email
    for user_id, user in users.items():
        if user.email == user_data.email:
            logging.info(f"User logged in: {user_data.email}")
            return {
                "access_token": user_id,
                "token_type": "bearer",
                "user": user
            }
    
    # Auto-register user if not found (for testing convenience)
    import uuid
    from datetime import datetime
    
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=user_data.email,
        created_at=datetime.now().isoformat()
    )
    
    users[user_id] = user
    logging.info(f"Auto-registered and logged in user: {user_data.email}")
    
    return {
        "access_token": user_id,
        "token_type": "bearer",
        "user": user
    }

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Simple token validation"""
    token = credentials.credentials
    if token not in users:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return users[token]

@app.get("/api/rss-sources", response_model=List[RSSSource])
async def get_user_sources(current_user: User = Depends(get_current_user)):
    """Get user's RSS sources"""
    user_sources = [source for source in rss_sources.values() if source.user_id == current_user.id]
    logging.info(f"Retrieved {len(user_sources)} sources for user {current_user.email}")
    return user_sources

@app.post("/api/rss-sources", response_model=RSSSource)
async def add_rss_source(source_data: RSSSourceCreate, current_user: User = Depends(get_current_user)):
    """Add new RSS source"""
    import uuid
    from datetime import datetime
    
    source_id = str(uuid.uuid4())
    source = RSSSource(
        id=source_id,
        user_id=current_user.id,
        name=source_data.name,
        url=source_data.url,
        created_at=datetime.now().isoformat()
    )
    
    rss_sources[source_id] = source
    logging.info(f"Added RSS source: {source_data.name} for user {current_user.email}")
    return source

@app.get("/api/articles")
async def get_articles(current_user: User = Depends(get_current_user)):
    """Get sample articles for testing"""
    # Return sample articles for testing
    sample_articles = [
        {
            "id": "1",
            "title": "Sample Technology Article",
            "description": "This is a sample article about technology trends.",
            "url": "https://example.com/article1",
            "published_at": "2025-01-07T12:00:00Z",
            "source": "Tech News",
            "genre": "Technology"
        },
        {
            "id": "2", 
            "title": "Sample Science Article",
            "description": "This is a sample article about recent scientific discoveries.",
            "url": "https://example.com/article2",
            "published_at": "2025-01-07T11:00:00Z",
            "source": "Science Daily",
            "genre": "Science"
        }
    ]
    
    logging.info(f"Retrieved {len(sample_articles)} sample articles for user {current_user.email}")
    return sample_articles

@app.get("/api/preset-categories")
async def get_preset_categories():
    """Get sample preset categories for testing"""
    sample_categories = [
        {
            "id": "tech",
            "name": "Technology",
            "description": "Latest technology news and trends",
            "sources": ["Tech News", "TechCrunch"]
        },
        {
            "id": "science", 
            "name": "Science",
            "description": "Scientific discoveries and research",
            "sources": ["Science Daily", "Nature"]
        },
        {
            "id": "business",
            "name": "Business",
            "description": "Business and finance news",
            "sources": ["Reuters", "Bloomberg"]
        }
    ]
    
    logging.info(f"Retrieved {len(sample_categories)} preset categories")
    return sample_categories

@app.get("/api/onboard/categories")
async def get_onboard_categories():
    """Get categories for onboarding"""
    onboard_categories = [
        {
            "id": "technology",
            "name": "Technology", 
            "display_name": "Technology",
            "description": "Latest tech news and innovations",
            "icon": "phone-portrait-outline",
            "color": "#0066CC",
            "rss_sources": [
                {"name": "Tech News", "url": "https://example.com/tech.rss"},
                {"name": "TechCrunch", "url": "https://example.com/techcrunch.rss"}
            ]
        },
        {
            "id": "science",
            "name": "Science",
            "display_name": "Science", 
            "description": "Scientific discoveries and research",
            "icon": "flask-outline",
            "color": "#00AA44",
            "rss_sources": [
                {"name": "Science Daily", "url": "https://example.com/science.rss"},
                {"name": "Nature", "url": "https://example.com/nature.rss"}
            ]
        },
        {
            "id": "business",
            "name": "Business",
            "display_name": "Business",
            "description": "Business and finance news", 
            "icon": "briefcase-outline",
            "color": "#FF6600",
            "rss_sources": [
                {"name": "Reuters Business", "url": "https://example.com/reuters.rss"},
                {"name": "Bloomberg", "url": "https://example.com/bloomberg.rss"}
            ]
        }
    ]
    
    logging.info(f"Retrieved {len(onboard_categories)} onboarding categories")
    return onboard_categories

@app.post("/api/onboard/setup")
async def setup_onboarding(
    setup_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Complete onboarding setup"""
    selected_categories = setup_data.get("selected_categories", [])
    
    # Add sample RSS sources based on selected categories
    added_sources = []
    for category in selected_categories:
        import uuid
        from datetime import datetime
        source_id = str(uuid.uuid4())
        source = RSSSource(
            id=source_id,
            user_id=current_user.id,
            name=f"{category} News",
            url=f"https://example.com/{category.lower()}.rss",
            created_at=datetime.now().isoformat()
        )
        rss_sources[source_id] = source
        added_sources.append(source.name)
    
    logging.info(f"Onboarding completed for user {current_user.email} with {len(added_sources)} sources")
    
    return {
        "success": True,
        "added_sources": added_sources,
        "message": "Onboarding completed successfully"
    }

@app.get("/api/user/profile")
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """Get user profile"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at,
        "sources_count": len([s for s in rss_sources.values() if s.user_id == current_user.id])
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)