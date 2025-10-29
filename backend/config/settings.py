"""
Configuration settings for the Audion backend application.
Centralizes environment variables and application constants.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# Database Configuration
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# API Keys
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# AWS S3 Configuration (REQUIRED - no defaults)
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.environ.get('AWS_REGION')  # REQUIRED
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')  # REQUIRED

# Cache Configuration
RSS_CACHE_EXPIRY_SECONDS = int(os.environ.get('RSS_CACHE_EXPIRY_SECONDS', '300'))

# Database Timeouts (configurable per environment)
DB_PING_TIMEOUT = float(os.environ.get('DB_PING_TIMEOUT', '5.0'))
DB_OPERATION_TIMEOUT = float(os.environ.get('DB_OPERATION_TIMEOUT', '10.0'))
DB_BATCH_TIMEOUT = float(os.environ.get('DB_BATCH_TIMEOUT', '5.0'))

# Content Configuration
RECOMMENDED_WORD_COUNT = int(os.environ.get('RECOMMENDED_WORD_COUNT', '250'))
INSIGHT_WORD_COUNT = int(os.environ.get('INSIGHT_WORD_COUNT', '350'))

# OpenAI Model Configuration
OPENAI_CHAT_MODEL = os.environ.get('OPENAI_CHAT_MODEL', 'gpt-4o')
OPENAI_TTS_MODEL = os.environ.get('OPENAI_TTS_MODEL', 'tts-1')
OPENAI_TTS_VOICE = os.environ.get('OPENAI_TTS_VOICE', 'alloy')
OPENAI_TEST_MODEL = os.environ.get('OPENAI_TEST_MODEL', 'gpt-3.5-turbo')

# Network Configuration
CORS_ALLOWED_ORIGINS_STR = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'https://audion.onrender.com,http://localhost:3000,http://localhost:5173,exp://localhost:19000,exp://localhost:19001'
)
FILE_SERVER_URL = os.environ.get('FILE_SERVER_URL', 'http://localhost:8001')
MOCK_AUDIO_URL_BASE = os.environ.get('MOCK_AUDIO_URL_BASE', 'http://localhost:8001')

# Application Settings
MAX_AUTO_PICK_ARTICLES = 5
AUDIO_FILE_EXTENSIONS = ['.mp3', '.wav', '.m4a']
MAX_FILE_SIZE_MB = 50

# JWT Configuration
JWT_ALGORITHM = "HS256"
# CRITICAL: JWT_SECRET_KEY MUST be set in environment variables (Render Dashboard)
# Never use the default value in production
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not JWT_SECRET_KEY:
    if os.environ.get('ENVIRONMENT') == 'production':
        raise RuntimeError('JWT_SECRET_KEY must be set in production environment')
    # Development only: use a default key
    JWT_SECRET_KEY = 'dev-only-key-not-for-production'

# Logging Configuration
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

# CORS Settings (configurable via environment)
ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS_STR.split(',')]

# File Storage Paths
AUDIO_STORAGE_PATH = ROOT_DIR / "audio_files"
PROFILE_IMAGES_PATH = ROOT_DIR / "profile_images"

# Ensure directories exist
AUDIO_STORAGE_PATH.mkdir(exist_ok=True)
PROFILE_IMAGES_PATH.mkdir(exist_ok=True)