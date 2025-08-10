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

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'audion-audio-files')

# Cache Configuration
RSS_CACHE_EXPIRY_SECONDS = 300  # Cache for 5 minutes

# Application Settings
MAX_AUTO_PICK_ARTICLES = 5
AUDIO_FILE_EXTENSIONS = ['.mp3', '.wav', '.m4a']
MAX_FILE_SIZE_MB = 50

# JWT Configuration
JWT_ALGORITHM = "HS256"
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-here')

# Logging Configuration
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

# CORS Settings
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:19006",
    "exp://localhost:19000",
    "exp://localhost:19006",
    "*"  # Allow all origins for development
]

# File Storage Paths
AUDIO_STORAGE_PATH = ROOT_DIR / "audio_files"
PROFILE_IMAGES_PATH = ROOT_DIR / "profile_images"

# Ensure directories exist
AUDIO_STORAGE_PATH.mkdir(exist_ok=True)
PROFILE_IMAGES_PATH.mkdir(exist_ok=True)