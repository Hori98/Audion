"""
User service for managing user profiles, preferences, and interactions.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from config.database import get_database, is_database_connected
from models.user import UserProfile, UserInteraction
from models.article import Article, GENRE_KEYWORDS
from services.article_service import score_article_for_user_preferences
from utils.errors import handle_database_error, handle_generic_error
from utils.database import find_one_by_id, insert_document, update_document

async def get_or_create_user_profile(user_id: str) -> UserProfile:
    """
    Get existing user profile or create a new one with default preferences.
    
    Args:
        user_id: User ID
        
    Returns:
        UserProfile: User profile object
    """
    try:
        if not is_database_connected():
            raise handle_database_error(Exception("Database not connected"), "get user profile")
        
        db = get_database()
        
        # Try to find existing profile
        profile_data = await db.user_profiles.find_one({"user_id": user_id})
        
        if profile_data:
            profile_data["id"] = str(profile_data["_id"])
            del profile_data["_id"]
            return UserProfile(**profile_data)
        
        # Create new profile with default preferences
        default_profile = UserProfile(user_id=user_id)
        profile_dict = default_profile.dict()
        
        result = await db.user_profiles.insert_one(profile_dict)
        profile_dict["id"] = str(result.inserted_id)
        
        logging.info(f"Created new user profile for user {user_id}")
        return UserProfile(**profile_dict)
        
    except Exception as e:
        logging.error(f"Error getting/creating user profile: {e}")
        raise handle_database_error(e, "get/create user profile")

async def update_user_preferences(user_id: str, interaction: UserInteraction) -> bool:
    """
    Update user preferences based on interaction.
    
    Args:
        user_id: User ID
        interaction: User interaction data
        
    Returns:
        bool: True if preferences were updated
    """
    try:
        if not is_database_connected():
            raise handle_database_error(Exception("Database not connected"), "update preferences")
        
        db = get_database()
        
        # Get current profile
        profile_data = await db.user_profiles.find_one({"user_id": user_id})
        if not profile_data:
            # Create profile if it doesn't exist
            await get_or_create_user_profile(user_id)
            profile_data = await db.user_profiles.find_one({"user_id": user_id})
        
        current_preferences = profile_data.get("genre_preferences", {})
        interaction_history = profile_data.get("interaction_history", [])
        
        # Update preferences based on interaction type
        genre = interaction.genre
        if genre in current_preferences:
            current_score = current_preferences[genre]
            
            # Adjust preference based on interaction type
            if interaction.interaction_type == "liked":
                new_score = min(2.0, current_score + 0.1)
            elif interaction.interaction_type == "disliked":
                new_score = max(0.1, current_score - 0.15)
            elif interaction.interaction_type == "created_audio":
                new_score = min(2.0, current_score + 0.2)
            elif interaction.interaction_type == "completed":
                new_score = min(2.0, current_score + 0.05)
            elif interaction.interaction_type == "skipped":
                new_score = max(0.1, current_score - 0.05)
            elif interaction.interaction_type == "quick_exit":
                new_score = max(0.1, current_score - 0.1)
            else:
                new_score = current_score
            
            current_preferences[genre] = new_score
        
        # Add interaction to history (keep last 100 interactions)
        interaction_dict = interaction.dict()
        interaction_history.append(interaction_dict)
        interaction_history = interaction_history[-100:]  # Keep only last 100
        
        # Update profile
        updates = {
            "genre_preferences": current_preferences,
            "interaction_history": interaction_history,
            "updated_at": datetime.utcnow()
        }
        
        await db.user_profiles.update_one(
            {"user_id": user_id},
            {"$set": updates}
        )
        
        logging.info(f"Updated preferences for user {user_id}, genre {genre}")
        return True
        
    except Exception as e:
        logging.error(f"Error updating user preferences: {e}")
        raise handle_database_error(e, "update user preferences")

async def get_user_insights(user_id: str) -> Dict[str, Any]:
    """
    Get user insights based on interaction history and preferences.
    
    Args:
        user_id: User ID
        
    Returns:
        Dict: User insights and analytics
    """
    try:
        profile = await get_or_create_user_profile(user_id)
        
        # Calculate insights
        preferences = profile.genre_preferences
        history = profile.interaction_history
        
        # Top genres by preference
        sorted_preferences = sorted(preferences.items(), key=lambda x: x[1], reverse=True)
        top_genres = [{"genre": genre, "score": score} for genre, score in sorted_preferences[:5]]
        
        # Interaction statistics
        total_interactions = len(history)
        if total_interactions > 0:
            interaction_types = {}
            recent_activity = []
            
            for interaction in history[-20:]:  # Last 20 interactions
                interaction_type = interaction.get("interaction_type", "unknown")
                interaction_types[interaction_type] = interaction_types.get(interaction_type, 0) + 1
                recent_activity.append({
                    "type": interaction_type,
                    "genre": interaction.get("genre", "unknown"),
                    "timestamp": interaction.get("timestamp", "")
                })
            
            # Calculate engagement score
            positive_interactions = (
                interaction_types.get("liked", 0) + 
                interaction_types.get("created_audio", 0) + 
                interaction_types.get("completed", 0)
            )
            negative_interactions = (
                interaction_types.get("disliked", 0) + 
                interaction_types.get("quick_exit", 0) + 
                interaction_types.get("skipped", 0)
            )
            
            engagement_score = (positive_interactions / total_interactions * 100) if total_interactions > 0 else 0
        else:
            interaction_types = {}
            recent_activity = []
            engagement_score = 0
        
        return {
            "top_genres": top_genres,
            "total_interactions": total_interactions,
            "interaction_breakdown": interaction_types,
            "engagement_score": round(engagement_score, 1),
            "recent_activity": recent_activity[-10:],  # Last 10 activities
            "profile_created": profile.created_at.isoformat() if profile.created_at else None,
            "last_updated": profile.updated_at.isoformat() if profile.updated_at else None
        }
        
    except Exception as e:
        logging.error(f"Error getting user insights: {e}")
        raise handle_generic_error(e, "get user insights")

async def auto_pick_articles(user_id: str, 
                           all_articles: List[Article], 
                           max_articles: int = 5,
                           preferred_genres: Optional[List[str]] = None) -> List[Article]:
    """
    Auto-pick articles based on user preferences and diversity.
    
    Args:
        user_id: User ID
        all_articles: All available articles
        max_articles: Maximum number of articles to return
        preferred_genres: Optional list of preferred genres to focus on
        
    Returns:
        List[Article]: Selected articles
    """
    try:
        if not all_articles:
            return []
        
        # Get user profile
        profile = await get_or_create_user_profile(user_id)
        user_preferences = profile.genre_preferences
        
        # Filter by preferred genres if specified
        if preferred_genres:
            filtered_articles = [
                article for article in all_articles 
                if article.genre and article.genre in preferred_genres
            ]
            if filtered_articles:
                all_articles = filtered_articles
        
        # Score articles based on user preferences
        scored_articles = []
        for article in all_articles:
            score = score_article_for_user_preferences(article, user_preferences)
            scored_articles.append((article, score))
        
        # Sort by score (highest first)
        scored_articles.sort(key=lambda x: x[1], reverse=True)
        
        # Apply diversity selection
        selected_articles = []
        genre_counts = {}
        
        for article, score in scored_articles:
            if len(selected_articles) >= max_articles:
                break
            
            genre = article.genre or "General"
            genre_count = genre_counts.get(genre, 0)
            
            # Limit articles per genre for diversity (max 2 per genre for 5 articles)
            max_per_genre = max(1, max_articles // 3)
            
            if genre_count < max_per_genre or len(selected_articles) < max_articles // 2:
                selected_articles.append(article)
                genre_counts[genre] = genre_count + 1
        
        logging.info(f"Auto-picked {len(selected_articles)} articles for user {user_id}")
        return selected_articles
        
    except Exception as e:
        logging.error(f"Error auto-picking articles: {e}")
        # Return random selection as fallback
        import random
        return random.sample(all_articles, min(max_articles, len(all_articles)))

async def record_audio_interaction(user_id: str, 
                                 audio_id: str,
                                 interaction_type: str,
                                 start_time: Optional[int] = None,
                                 end_time: Optional[int] = None,
                                 completion_percentage: Optional[float] = None) -> bool:
    """
    Record audio playback interaction.
    
    Args:
        user_id: User ID
        audio_id: Audio ID
        interaction_type: Type of interaction
        start_time: Start time in milliseconds
        end_time: End time in milliseconds
        completion_percentage: Percentage of audio completed
        
    Returns:
        bool: True if interaction was recorded
    """
    try:
        if not is_database_connected():
            return False
        
        db = get_database()
        
        # Get audio details for genre classification
        audio_data = await db.audio_creations.find_one({"_id": audio_id, "user_id": user_id})
        if not audio_data:
            return False
        
        # Determine genre from audio titles (use first article's genre or classify)
        genre = "General"
        if audio_data.get("article_titles"):
            from services.article_service import classify_article_genre
            first_title = audio_data["article_titles"][0]
            genre = classify_article_genre(first_title, "")
        
        # Create interaction record
        metadata = {}
        if start_time is not None:
            metadata["start_time"] = start_time
        if end_time is not None:
            metadata["end_time"] = end_time
        if completion_percentage is not None:
            metadata["completion_percentage"] = completion_percentage
        
        interaction = UserInteraction(
            article_id=audio_id,  # Using audio_id as article_id for audio interactions
            interaction_type=interaction_type,
            genre=genre,
            metadata=metadata
        )
        
        # Update user preferences
        await update_user_preferences(user_id, interaction)
        
        logging.info(f"Recorded audio interaction for user {user_id}: {interaction_type}")
        return True
        
    except Exception as e:
        logging.error(f"Error recording audio interaction: {e}")
        return False

async def initialize_user_with_onboard_preferences(user_id: str, 
                                                  selected_categories: List[str]) -> bool:
    """
    Initialize user preferences based on onboarding category selection.
    
    Args:
        user_id: User ID
        selected_categories: List of selected category names
        
    Returns:
        bool: True if preferences were initialized
    """
    try:
        # Create or update user profile with enhanced preferences for selected categories
        profile = await get_or_create_user_profile(user_id)
        preferences = profile.genre_preferences.copy()
        
        # Boost selected categories
        for category in selected_categories:
            if category in preferences:
                preferences[category] = 1.5  # Boost selected categories
            else:
                # Handle preset category names that might not match exactly
                category_mapping = {
                    "tech": "Technology",
                    "business": "Finance", 
                    "finance": "Finance",
                    # Add more mappings as needed
                }
                mapped_category = category_mapping.get(category.lower(), category)
                if mapped_category in preferences:
                    preferences[mapped_category] = 1.5
        
        # Slightly reduce non-selected categories
        for genre in preferences:
            if genre not in selected_categories:
                preferences[genre] = 0.8
        
        # Update profile
        if not is_database_connected():
            return False
        
        db = get_database()
        await db.user_profiles.update_one(
            {"user_id": user_id},
            {"$set": {
                "genre_preferences": preferences,
                "updated_at": datetime.utcnow()
            }}
        )
        
        logging.info(f"Initialized onboard preferences for user {user_id}")
        return True
        
    except Exception as e:
        logging.error(f"Error initializing onboard preferences: {e}")
        return False