"""
Service modules for the Audion backend application.
Contains business logic and external service integrations.
"""

from .auth_service import (
    create_jwt_token, verify_jwt_token, get_current_user,
    authenticate_user, create_user, delete_user
)
from .rss_service import (
    get_user_rss_sources, create_rss_source, update_rss_source, delete_rss_source,
    parse_rss_feed, extract_articles_from_feed, get_articles_for_user,
    clear_rss_cache, get_cache_stats
)
from .article_service import (
    calculate_genre_scores, classify_article_genre, filter_articles_by_genre,
    score_article_for_user_preferences, get_article_diversity_score,
    extract_article_keywords, calculate_article_similarity
)
from .ai_service import (
    generate_audio_title_with_openai, summarize_articles_with_openai,
    convert_text_to_speech, save_audio_locally, create_mock_audio_file,
    test_openai_connection, classify_text_genre_with_ai
)
from .storage_service import (
    upload_to_s3, delete_from_s3, save_profile_image, delete_profile_image,
    get_storage_stats, is_s3_configured
)
from .audio_service import (
    create_audio_from_articles, get_user_audio_library, get_audio_by_id,
    rename_audio, soft_delete_audio, restore_audio, permanently_delete_audio,
    get_deleted_audio, clear_all_deleted_audio, cleanup_expired_deleted_audio,
    get_audio_statistics
)
from .user_service import (
    get_or_create_user_profile, update_user_preferences, get_user_insights,
    auto_pick_articles, record_audio_interaction, initialize_user_with_onboard_preferences
)

__all__ = [
    # Auth service
    "create_jwt_token", "verify_jwt_token", "get_current_user",
    "authenticate_user", "create_user", "delete_user",
    
    # RSS service  
    "get_user_rss_sources", "create_rss_source", "update_rss_source", "delete_rss_source",
    "parse_rss_feed", "extract_articles_from_feed", "get_articles_for_user",
    "clear_rss_cache", "get_cache_stats",
    
    # Article service
    "calculate_genre_scores", "classify_article_genre", "filter_articles_by_genre",
    "score_article_for_user_preferences", "get_article_diversity_score",
    "extract_article_keywords", "calculate_article_similarity",
    
    # AI service
    "generate_audio_title_with_openai", "summarize_articles_with_openai",
    "convert_text_to_speech", "save_audio_locally", "create_mock_audio_file",
    "test_openai_connection", "classify_text_genre_with_ai",
    
    # Storage service
    "upload_to_s3", "delete_from_s3", "save_profile_image", "delete_profile_image",
    "get_storage_stats", "is_s3_configured",
    
    # Audio service
    "create_audio_from_articles", "get_user_audio_library", "get_audio_by_id",
    "rename_audio", "soft_delete_audio", "restore_audio", "permanently_delete_audio",
    "get_deleted_audio", "clear_all_deleted_audio", "cleanup_expired_deleted_audio",
    "get_audio_statistics",
    
    # User service
    "get_or_create_user_profile", "update_user_preferences", "get_user_insights",
    "auto_pick_articles", "record_audio_interaction", "initialize_user_with_onboard_preferences"
]