# Hardcoding Violations - Code Fix Examples

## CRITICAL: JWT Secret Key (server.py:150)

### Current (INSECURE)
```python
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-do-not-use-in-production')
```

### Fixed
```python
# In config/settings.py
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')

if not JWT_SECRET_KEY:
    if ENVIRONMENT == 'production':
        raise RuntimeError(
            'CRITICAL: JWT_SECRET_KEY must be set in production environment. '
            'Set it in Render Dashboard → Settings → Environment'
        )
    # Development: allow missing key but warn
    logging.warning('⚠️  JWT_SECRET_KEY not set - using UNSAFE development default')
    JWT_SECRET_KEY = 'dev-only-key-never-for-production'

JWT_ALGORITHM = "HS256"

# In server.py
from config.settings import JWT_SECRET_KEY, JWT_ALGORITHM

# Then log startup status:
if JWT_SECRET_KEY == 'dev-only-key-never-for-production':
    logging.error("❌ USING DEVELOPMENT JWT SECRET - DO NOT DEPLOY TO PRODUCTION")
else:
    logging.info("✓ JWT_SECRET_KEY is set (production-safe)")
```

### Environment Variables
```bash
# .env (development)
JWT_SECRET_KEY=dev-only-unsafe-key

# Render Dashboard (production)
JWT_SECRET_KEY=<generate with: python3 -c "import secrets; print(secrets.token_urlsafe(32))">
```

---

## CRITICAL: OpenAI API Key Check (ai_service.py:29, 73, 129, 232)

### Current (BRITTLE)
```python
if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
    return fallback_content
```

### Fixed
```python
# In config/settings.py
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

def validate_openai_api_key() -> bool:
    """Validate that OpenAI API key is properly configured."""
    if not OPENAI_API_KEY:
        return False
    # Don't validate against placeholder strings; just check it exists
    if OPENAI_API_KEY.startswith('sk-'):  # Valid OpenAI key format
        return True
    return False

# In ai_service.py
from config.settings import OPENAI_API_KEY, validate_openai_api_key

async def convert_text_to_speech(text: str) -> Dict[str, Any]:
    """Convert text to speech using OpenAI TTS."""
    try:
        logging.info(f"Starting TTS conversion for text length: {len(text)}")
        
        if not validate_openai_api_key():
            raise ValueError(
                "OpenAI API key not configured. "
                "Set OPENAI_API_KEY in environment variables."
            )
        
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        # ... rest of function
```

### Environment Variables
```bash
# .env (development)
OPENAI_API_KEY=sk-proj-your-actual-key-here

# Render production: set in Dashboard
OPENAI_API_KEY=sk-proj-...
```

---

## HIGH: CORS Allowed Origins (server.py:202-211)

### Current (HARDCODED)
```python
ALLOWED_ORIGINS = [
    "https://audion.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "exp://localhost:19000",
    "exp://localhost:19001",
    "http://localhost:8003",
    "http://localhost:8004",
]

cors_origins = ALLOWED_ORIGINS if ENVIRONMENT == 'production' else ["*"]
```

### Fixed
```python
# In config/settings.py
def parse_allowed_origins() -> List[str]:
    """Parse comma-separated CORS origins from environment."""
    origins_str = os.environ.get('CORS_ALLOWED_ORIGINS', '')
    
    if not origins_str:
        # Provide sensible defaults per environment
        if ENVIRONMENT == 'production':
            return [
                "https://audion.onrender.com",
            ]
        else:  # development
            return ["*"]  # Allow all in development
    
    # Parse comma-separated list
    return [origin.strip() for origin in origins_str.split(',')]

CORS_ALLOWED_ORIGINS = parse_allowed_origins()

# In server.py
from config.settings import CORS_ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

logging.info(f"CORS Allowed Origins: {CORS_ALLOWED_ORIGINS}")
```

### Environment Variables
```bash
# .env (development)
CORS_ALLOWED_ORIGINS=*

# .env.production (Render Dashboard)
CORS_ALLOWED_ORIGINS=https://audion.onrender.com

# Or multiple origins:
CORS_ALLOWED_ORIGINS=https://audion.onrender.com,https://audion.app,exp://localhost:19000
```

---

## HIGH: Hardcoded Timeouts (database.py:30, server.py:93+)

### Current (SCATTERED)
```python
await asyncio.wait_for(db.command('ping'), timeout=5.0)
# ... multiple places with timeout=10.0, timeout=5.0
```

### Fixed
```python
# In config/settings.py
# Database operation timeouts
DB_PING_TIMEOUT = float(os.environ.get('DB_PING_TIMEOUT', '5.0'))
DB_OPERATION_TIMEOUT = float(os.environ.get('DB_OPERATION_TIMEOUT', '10.0'))
DB_BATCH_TIMEOUT = float(os.environ.get('DB_BATCH_TIMEOUT', '5.0'))

# In config/database.py
from config.settings import DB_PING_TIMEOUT, DB_OPERATION_TIMEOUT

async def connect_to_database():
    """Establishes connection to MongoDB database."""
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Use configuration constant instead of hardcoded value
        await asyncio.wait_for(db.command('ping'), timeout=DB_PING_TIMEOUT)
        db_connected = True
        logging.info("Connected to MongoDB successfully")
        return db, True
    except asyncio.TimeoutError:
        logging.error(f"Database connection timeout after {DB_PING_TIMEOUT}s")
        return None, False

# In server.py - apply to all timeout calls
await asyncio.wait_for(
    db.users.find_one({"email": email}),
    timeout=DB_OPERATION_TIMEOUT
)
```

### Environment Variables
```bash
# .env (development - faster for local testing)
DB_PING_TIMEOUT=3.0
DB_OPERATION_TIMEOUT=10.0
DB_BATCH_TIMEOUT=5.0

# .env.production (Render - slower for cloud connection)
DB_PING_TIMEOUT=10.0
DB_OPERATION_TIMEOUT=30.0
DB_BATCH_TIMEOUT=15.0
```

---

## HIGH: Cache Expiry Seconds (server.py:33, settings.py:28)

### Current (HARDCODED)
```python
RSS_CACHE_EXPIRY_SECONDS = 300  # 5 minutes
CACHE_EXPIRY_SECONDS = 300
```

### Fixed
```python
# In config/settings.py
RSS_CACHE_EXPIRY_SECONDS = int(os.environ.get(
    'RSS_CACHE_EXPIRY_SECONDS',
    '300'  # 5 minutes default
))

# In server.py - reference from config
from config.settings import RSS_CACHE_EXPIRY_SECONDS

# Use the constant
if time.time() - last_update_time > RSS_CACHE_EXPIRY_SECONDS:
    # Refresh cache
```

### Environment Variables
```bash
# .env (development - short cache for testing)
RSS_CACHE_EXPIRY_SECONDS=60

# .env.production (Render - longer cache to reduce API calls)
RSS_CACHE_EXPIRY_SECONDS=1800
```

---

## HIGH: Hardcoded Localhost URLs (ai_service.py:220, storage_service.py:160)

### Current (HARDCODED URLS)
```python
# ai_service.py:220
dummy_audio_url = "http://localhost:8001/audio_files/SampleAudio_0.4mb.mp3"

# ai_service.py:204
public_url = f"http://localhost:8001/audio/{filename}"

# storage_service.py:160
local_url = f"http://localhost:8001/profile-images/{image_filename}"
```

### Fixed
```python
# In config/settings.py
# This is already partially done in server.py but not used consistently
MOCK_AUDIO_URL_BASE = os.environ.get('MOCK_AUDIO_URL_BASE', 'http://localhost:8001')
FILE_SERVER_URL = os.environ.get('FILE_SERVER_URL', MOCK_AUDIO_URL_BASE)

# In ai_service.py
from config.settings import MOCK_AUDIO_URL_BASE

def create_mock_audio_file() -> tuple[str, int]:
    """Create mock audio file data for testing/fallback."""
    dummy_audio_url = f"{MOCK_AUDIO_URL_BASE}/audio_files/SampleAudio_0.4mb.mp3"
    dummy_duration = 30
    return dummy_audio_url, dummy_duration

async def save_audio_locally(audio_content: bytes, filename: str) -> str:
    """Save audio content to local storage as fallback."""
    # ... save file ...
    public_url = f"{MOCK_AUDIO_URL_BASE}/audio/{filename}"
    logging.info(f"Audio saved locally: {public_url}")
    return public_url

# In storage_service.py
from config.settings import FILE_SERVER_URL

async def save_profile_image(image_data: str, user_id: str) -> str:
    """Save a base64 encoded profile image locally."""
    # ... decode and save ...
    local_url = f"{FILE_SERVER_URL}/profile-images/{image_filename}"
    logging.info(f"Profile image saved locally: {local_url}")
    return local_url
```

### Environment Variables
```bash
# .env (development)
MOCK_AUDIO_URL_BASE=http://localhost:8001
FILE_SERVER_URL=http://localhost:8001

# .env.production (Render Dashboard)
MOCK_AUDIO_URL_BASE=https://audion.onrender.com
FILE_SERVER_URL=https://audion.onrender.com
```

---

## MEDIUM: Frontend API Configuration (config/api.ts:44, 49)

### Current (HARDCODED URLS & PORTS)
```typescript
const detectBackendUrl = (): string => {
  let envUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) {
    return envUrl;
  }

  if (!__DEV__) {
    return 'https://api.audion.app';  // Hardcoded production
  }

  const host = resolveDevHost();
  return `http://${host || 'localhost'}:8003`;  // Hardcoded port
};
```

### Fixed
```typescript
const PROD_API_URL = process.env.EXPO_PUBLIC_PROD_API_URL || 'https://api.audion.app';
const DEV_API_PORT = process.env.EXPO_PUBLIC_DEV_API_PORT || '8003';
const DEFAULT_API_TIMEOUT_MS = 30000;  // 30 seconds - now a named constant

const detectBackendUrl = (): string => {
  // Prefer explicit env vars
  let envUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) {
    console.log('Found env URL:', envUrl);
    envUrl = envUrl.replace(/\/api\/?$/, '');
    if (__DEV__ && envUrl.includes('localhost') && Platform.OS !== 'web') {
      const host = resolveDevHost();
      if (host && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
        envUrl = envUrl.replace('localhost', host);
      }
    }
    return envUrl;
  }

  // Production fallback
  if (!__DEV__) {
    return PROD_API_URL;  // Use constant
  }

  // Development sensible default with configurable port
  const host = resolveDevHost();
  return `http://${host || 'localhost'}:${DEV_API_PORT}`;
};

export const API_CONFIG = {
  BASE_URL: detectBackendUrl(),
  TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || String(DEFAULT_API_TIMEOUT_MS)),
} as const;
```

### Environment Variables
```bash
# .env.development
EXPO_PUBLIC_PROD_API_URL=https://api.audion.app
EXPO_PUBLIC_DEV_API_PORT=8003
EXPO_PUBLIC_API_TIMEOUT=60000
```

---

## MEDIUM: OpenAI Model Names (ai_service.py:48, 102, 136, 240)

### Current (HARDCODED MODELS)
```python
model="gpt-4o"
model="tts-1"
voice="alloy"
```

### Fixed
```python
# In config/settings.py
OPENAI_CHAT_MODEL = os.environ.get('OPENAI_CHAT_MODEL', 'gpt-4o')
OPENAI_TTS_MODEL = os.environ.get('OPENAI_TTS_MODEL', 'tts-1')
OPENAI_TTS_VOICE = os.environ.get('OPENAI_TTS_VOICE', 'alloy')
OPENAI_TEST_MODEL = os.environ.get('OPENAI_TEST_MODEL', 'gpt-3.5-turbo')

# In ai_service.py
from config.settings import (
    OPENAI_CHAT_MODEL,
    OPENAI_TTS_MODEL,
    OPENAI_TTS_VOICE,
    OPENAI_TEST_MODEL
)

async def generate_audio_title_with_openai(articles_content: List[str]) -> str:
    # ...
    chat_completion = await client.chat.completions.create(
        messages=[...],
        model=OPENAI_CHAT_MODEL,  # Use constant
    )

async def summarize_articles_with_openai(articles_content: List[str]) -> str:
    # ...
    chat_completion = await client.chat.completions.create(
        messages=[...],
        model=OPENAI_CHAT_MODEL,  # Use constant
    )

async def convert_text_to_speech(text: str) -> Dict[str, Any]:
    # ...
    response = await client.audio.speech.create(
        model=OPENAI_TTS_MODEL,  # Use constant
        voice=OPENAI_TTS_VOICE,  # Use constant
        input=text,
    )

async def test_openai_connection() -> bool:
    # ...
    response = await client.chat.completions.create(
        messages=[{"role": "user", "content": "Test"}],
        model=OPENAI_TEST_MODEL,  # Use constant
        max_tokens=5
    )
```

### Environment Variables
```bash
# .env (development)
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=alloy
OPENAI_TEST_MODEL=gpt-3.5-turbo

# .env.production (cost optimization)
OPENAI_CHAT_MODEL=gpt-3.5-turbo
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova
```

---

## Summary of Changes Required

### Backend Files to Update

1. **config/settings.py** - ADD configuration constants:
   - DB_PING_TIMEOUT
   - DB_OPERATION_TIMEOUT
   - DB_BATCH_TIMEOUT
   - RSS_CACHE_EXPIRY_SECONDS
   - RECOMMENDED_WORD_COUNT
   - INSIGHT_WORD_COUNT
   - OPENAI_CHAT_MODEL
   - OPENAI_TTS_MODEL
   - OPENAI_TTS_VOICE
   - OPENAI_TEST_MODEL
   - FILE_SERVER_URL
   - MOCK_AUDIO_URL_BASE (ensure it exists)
   - CORS_ALLOWED_ORIGINS
   - Update AWS_REGION and S3_BUCKET_NAME to be required

2. **server.py** - MODIFY:
   - JWT_SECRET_KEY handling (remove default, add validation)
   - CORS setup (use from settings)
   - Cache constants (use from settings)

3. **config/database.py** - MODIFY:
   - Database timeouts (use from settings)

4. **services/ai_service.py** - MODIFY:
   - API key validation (use proper validation)
   - Model names (use from settings)
   - URLs (use from settings)

5. **services/storage_service.py** - MODIFY:
   - File server URLs (use from settings)

### Frontend Files to Update

1. **config/api.ts** - MODIFY:
   - Add PROD_API_URL constant from env
   - Add DEV_API_PORT constant from env
   - Add DEFAULT_API_TIMEOUT_MS constant

2. **.env.development** - ADD:
   - EXPO_PUBLIC_PROD_API_URL
   - EXPO_PUBLIC_DEV_API_PORT
   - EXPO_PUBLIC_API_TIMEOUT

---

## Testing the Changes

After making these changes, verify with:

```bash
# Backend startup should show configuration
# Should see: ✓ JWT_SECRET_KEY is set
# Should see: CORS Allowed Origins: [...]
# Should see: DB_PING_TIMEOUT: 5.0

# Frontend should log detected API URL
# Should see: 🔗 API_CONFIG.BASE_URL: http://localhost:8003
```

---
