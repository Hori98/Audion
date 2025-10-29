# Audion Emergent.AI_Demo - Hardcoding Violations Analysis

## Executive Summary
Found **15+ hardcoding violations** across frontend and backend codebases that violate the development checklist, ranging from CRITICAL security issues to MEDIUM configuration issues.

---

## CRITICAL SEVERITY

### 1. Hardcoded JWT Secret in Backend (server.py)
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/server.py`
**Lines:** 150, 159-160
**Issue:** Default JWT_SECRET_KEY hardcoded for development
```python
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-do-not-use-in-production')
```
**Violation:** Hardcoded credentials/API keys
**Impact:** If this default is used in production, all JWT tokens are cryptographically weak and easily forged
**Fix:** 
- Ensure JWT_SECRET_KEY is ALWAYS set via environment variables
- Remove the fallback default value in production deployments
- Implement startup check that raises error if key is missing in production
- Use deployment-specific secrets management (Render Dashboard, AWS Secrets Manager, etc.)

---

### 2. Hardcoded OpenAI API Key Check
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/services/ai_service.py`
**Lines:** 29, 73, 129, 232
**Issue:** Checking against literal string "your-openai-key"
```python
if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-key":
    return (fallback content)
```
**Violation:** Hardcoded demo/test data strings
**Impact:** Code assumes placeholder values; API keys not properly validated
**Fix:**
- Use proper environment variable validation utility
- Raise exceptions for missing required credentials instead of silent fallbacks
- Implement configuration validation at startup, not at runtime

---

### 3. Hardcoded AWS Credential Check
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/services/storage_service.py`
**Lines:** 39, 255
**Issue:** Checking against literal string "your-aws-access-key"
```python
if AWS_ACCESS_KEY_ID == "your-aws-access-key":
    raise ValueError("AWS credentials not properly configured")
```
**Violation:** Hardcoded example credential strings
**Impact:** Placeholder detection logic is brittle and could fail silently
**Fix:**
- Validate credentials are set at application startup
- Don't use hardcoded placeholder strings for validation
- Implement proper configuration validation schema

---

## HIGH SEVERITY

### 4. Hardcoded Port Numbers in CORS Configuration
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/server.py`
**Lines:** 202-211
**Issue:** Multiple hardcoded localhost ports in ALLOWED_ORIGINS
```python
ALLOWED_ORIGINS = [
    "https://audion.onrender.com",
    "http://localhost:3000",    # Hardcoded
    "http://localhost:5173",    # Hardcoded
    "http://127.0.0.1:5173",    # Hardcoded
    "exp://localhost:19000",    # Hardcoded
    "exp://localhost:19001",    # Hardcoded
    "http://localhost:8003",    # Hardcoded
    "http://localhost:8004",    # Hardcoded
]
```
**Violation:** Hardcoded port numbers - should be configurable
**Impact:** 
- Cannot easily change development ports without code modification
- Port numbers are development-specific configuration
- Production allowed origins differ from development
**Fix:**
- Create `ALLOWED_ORIGINS_DEV` and `ALLOWED_ORIGINS_PROD` environment variable lists
- Parse from environment at startup: `os.environ.get('CORS_ALLOWED_ORIGINS', '...').split(',')`
- Example `.env`: `CORS_ALLOWED_ORIGINS=https://audion.onrender.com,exp://localhost:19000`

---

### 5. Hardcoded Localhost URLs in Storage Service
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/services/storage_service.py`
**Lines:** 160
**Issue:** Hardcoded localhost URL for profile image serving
```python
local_url = f"http://localhost:8001/profile-images/{image_filename}"
```
**Violation:** Hardcoded URL with hardcoded port 8001
**Impact:** 
- Cannot change file server port without code change
- Production environment will fail with localhost URL
- S3 fallback assumes different port than main backend
**Fix:**
- Use environment variable: `os.environ.get('FILE_SERVER_URL', 'http://localhost:8001')`
- Set in `.env`: `FILE_SERVER_URL=http://localhost:8001` (dev), `FILE_SERVER_URL=https://audion.onrender.com` (prod)
- Build URL: `file_server_url = os.environ.get('FILE_SERVER_URL', 'http://localhost:8001')`

---

### 6. Hardcoded Localhost Audio Server URL in AI Service
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/services/ai_service.py`
**Lines:** 220
**Issue:** Hardcoded mock/dummy audio URL with localhost and port
```python
dummy_audio_url = "http://localhost:8001/audio_files/SampleAudio_0.4mb.mp3"
```
**Violation:** Hardcoded localhost URL and port number
**Impact:** 
- Test fallback uses hardcoded port
- Cannot test with different port numbers
- Port mismatch between main backend (8000) and audio server (8001)
**Fix:**
- Use config: `MOCK_AUDIO_URL_BASE = os.environ.get('MOCK_AUDIO_URL_BASE', 'http://localhost:8001')`
- This is already done in server.py (line 78) but not used in ai_service.py
- Import and use: `public_url = f"{MOCK_AUDIO_URL_BASE}/audio_files/{filename}"`

---

### 7. Hardcoded Localhost Audio Save URL in AI Service
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/services/ai_service.py`
**Lines:** 204
**Issue:** Another hardcoded localhost URL for audio serving
```python
public_url = f"http://localhost:8001/audio/{filename}"
```
**Violation:** Hardcoded localhost URL with port
**Impact:** Same as issue #6
**Fix:**
- Use environment variable `MOCK_AUDIO_URL_BASE` or `BACKEND_AUDIO_URL`
- Make configurable per environment

---

### 8. Hardcoded Database Timeout Values
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/config/database.py`
**Lines:** 30
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/server.py`
**Lines:** 93, and multiple other locations with `timeout=5.0` and `timeout=10.0`
**Issue:** Hardcoded timeout values scattered throughout
```python
await asyncio.wait_for(db.command('ping'), timeout=5.0)  # Database ping timeout
# Multiple instances of timeout=10.0 for various database operations
# timeout=5.0 for batch operations
```
**Violation:** Hardcoded timeout/delay values - should be configurable
**Impact:**
- Cannot adjust timeouts per environment without code change
- Network conditions vary (local dev vs. cloud production)
- Different operations have different timeout requirements
- Production might need higher timeouts; testing might need lower
**Fix:**
- Create constants in settings.py:
  ```python
  DB_PING_TIMEOUT = float(os.environ.get('DB_PING_TIMEOUT', '5.0'))
  DB_OPERATION_TIMEOUT = float(os.environ.get('DB_OPERATION_TIMEOUT', '10.0'))
  DB_BATCH_TIMEOUT = float(os.environ.get('DB_BATCH_TIMEOUT', '5.0'))
  ```
- Use in code: `await asyncio.wait_for(db.command('ping'), timeout=DB_PING_TIMEOUT)`
- Set in `.env`:
  ```
  DB_PING_TIMEOUT=5.0
  DB_OPERATION_TIMEOUT=10.0
  DB_BATCH_TIMEOUT=5.0
  ```

---

### 9. Hardcoded Cache Expiry Seconds
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/server.py`
**Lines:** 33
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/config/settings.py`
**Lines:** 28
**Issue:** Hardcoded RSS cache expiry to 5 minutes
```python
RSS_CACHE_EXPIRY_SECONDS = 300  # Cache for 5 minutes
CACHE_EXPIRY_SECONDS = 300
```
**Violation:** Hardcoded timeout/delay value
**Impact:**
- Cannot change cache duration without code modification
- 5 minutes might be too long/short for different scenarios
- Testing and production need different cache times
**Fix:**
- Make configurable: `RSS_CACHE_EXPIRY_SECONDS = int(os.environ.get('RSS_CACHE_EXPIRY_SECONDS', '300'))`
- Set in `.env`: `RSS_CACHE_EXPIRY_SECONDS=300` (dev), `RSS_CACHE_EXPIRY_SECONDS=1800` (prod - 30 min)

---

### 10. Hardcoded Word Count in Prompts
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/server.py`
**Lines:** (multiple prompt strings with "200-300 words" and "300-400 words")
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/services/ai_service.py`
**Lines:** 88
**Issue:** Hardcoded word count ranges in prompts
```python
"Keep it around 200-300 words."
"insight": "...300-400語で..."
```
**Violation:** Hardcoded demo/test data and magic numbers
**Impact:**
- Cannot adjust content length for different use cases
- Word count requirements are business logic, not hardcoded strings
- Makes A/B testing different lengths difficult
**Fix:**
- Create prompt template variables:
  ```python
  RECOMMENDED_WORD_COUNT = int(os.environ.get('RECOMMENDED_WORD_COUNT', '250'))
  INSIGHT_WORD_COUNT = int(os.environ.get('INSIGHT_WORD_COUNT', '350'))
  ```
- Use in prompts: `f"Keep it around {RECOMMENDED_WORD_COUNT} words."`
- Set in `.env`:
  ```
  RECOMMENDED_WORD_COUNT=250
  INSIGHT_WORD_COUNT=350
  ```

---

## MEDIUM SEVERITY

### 11. Hardcoded IP Address in Frontend .env.user
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/audion-app/.env.user`
**Lines:** 2
**Issue:** Hardcoded local IP address instead of dynamic resolution
```
EXPO_PUBLIC_BACKEND_URL=http://192.168.11.60:8000
```
**Violation:** Hardcoded IP address and port - should be environment or dynamically resolved
**Impact:**
- IP address changes when network changes or laptop moves
- Different developers have different IP addresses
- Not portable across machines
- Error-prone for team development
**Fix:**
- Use localhost for development: `EXPO_PUBLIC_BACKEND_URL=http://localhost:8000`
- Or use dynamic IP detection (already implemented in api.ts with resolveDevHost)
- Let api.ts config/api.ts handle dynamic resolution (which it already does)
- Remove hardcoded IP from .env.user; let Expo Go debugger detect host

---

### 12. Hardcoded Fallback API Endpoint
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/audion-app-fresh/config/api.ts`
**Lines:** 44, 49
**Issue:** Hardcoded production and development fallback URLs
```typescript
if (!__DEV__) {
  return 'https://api.audion.app';  // Hardcoded production URL
}
return `http://${host || 'localhost'}:8003`;  // Hardcoded port 8003
```
**Violation:** Hardcoded URLs and port numbers - should be environment variables
**Impact:**
- Production URL (api.audion.app) is hardcoded
- Development port 8003 is hardcoded
- Cannot easily switch between multiple environments
- Prevents testing with different backends
**Fix:**
- Add environment variables:
  ```typescript
  const PROD_API_URL = process.env.EXPO_PUBLIC_PROD_API_URL || 'https://api.audion.app';
  const DEV_API_PORT = process.env.EXPO_PUBLIC_DEV_API_PORT || '8003';
  ```
- Use: 
  ```typescript
  if (!__DEV__) return PROD_API_URL;
  return `http://${host || 'localhost'}:${DEV_API_PORT}`;
  ```
- Set in `.env.development`:
  ```
  EXPO_PUBLIC_PROD_API_URL=https://api.audion.app
  EXPO_PUBLIC_DEV_API_PORT=8003
  ```

---

### 13. Hardcoded API Timeout
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/audion-app-fresh/config/api.ts`
**Lines:** 55
**Issue:** While using environment variable, default timeout is hardcoded
```typescript
TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000'),
```
**Violation:** Hardcoded magic number (30000ms = 30 seconds)
**Impact:**
- Default timeout not documented as a constant
- Different operations might need different timeouts
- 30 seconds might be too short/long for various operations
**Fix:**
- Create named constant:
  ```typescript
  const DEFAULT_API_TIMEOUT_MS = 30000;  // 30 seconds
  TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || String(DEFAULT_API_TIMEOUT_MS)),
  ```
- Better: Create per-endpoint timeouts
- Set in `.env`: `EXPO_PUBLIC_API_TIMEOUT=60000` for slower networks

---

### 14. Hardcoded OpenAI Model Names
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/services/ai_service.py`
**Lines:** 48, 102, 136, 240
**Issue:** Hardcoded specific OpenAI model names
```python
model="gpt-4o"      # Lines 48, 102
model="tts-1"       # Line 136
voice="alloy"       # Line 137
model="gpt-3.5-turbo"  # Line 240 (test)
```
**Violation:** Hardcoded service configuration values
**Impact:**
- Cannot switch models without code change
- Costly to use gpt-4o for all operations; should be configurable
- Voice selection hardcoded (no user choice)
- Test model different from production model
**Fix:**
- Create settings in config/settings.py:
  ```python
  OPENAI_CHAT_MODEL = os.environ.get('OPENAI_CHAT_MODEL', 'gpt-4o')
  OPENAI_TTS_MODEL = os.environ.get('OPENAI_TTS_MODEL', 'tts-1')
  OPENAI_TTS_VOICE = os.environ.get('OPENAI_TTS_VOICE', 'alloy')
  OPENAI_TEST_MODEL = os.environ.get('OPENAI_TEST_MODEL', 'gpt-3.5-turbo')
  ```
- Use: `model=OPENAI_CHAT_MODEL, voice=OPENAI_TTS_VOICE`
- Set in `.env`:
  ```
  OPENAI_CHAT_MODEL=gpt-4o
  OPENAI_TTS_MODEL=tts-1
  OPENAI_TTS_VOICE=alloy
  OPENAI_TEST_MODEL=gpt-3.5-turbo
  ```

---

### 15. Hardcoded AWS Region Default
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/server.py`
**Lines:** 71
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/config/settings.py`
**Lines:** 24
**Issue:** Hardcoded default AWS region
```python
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'audion-audio-files')
```
**Violation:** Hardcoded default values and bucket name
**Impact:**
- Default region (us-east-1) might not match actual infrastructure
- Default S3 bucket name ('audion-audio-files') is hardcoded
- Cannot test with different regions easily
- Multiple bucket names for different environments
**Fix:**
- Make required without defaults or use specific defaults per env:
  ```python
  AWS_REGION = os.environ.get('AWS_REGION')  # REQUIRED
  if not AWS_REGION:
      raise RuntimeError('AWS_REGION environment variable must be set')
  
  S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')  # REQUIRED
  if not S3_BUCKET_NAME:
      raise RuntimeError('S3_BUCKET_NAME environment variable must be set')
  ```
- Set explicit values in .env per environment:
  ```
  # Development
  AWS_REGION=ap-southeast-2
  S3_BUCKET_NAME=audion-dev-audio-files
  
  # Production (set in Render Dashboard)
  AWS_REGION=ap-southeast-2
  S3_BUCKET_NAME=audion-prod-audio-files
  ```

---

## LOW SEVERITY

### 16. Hardcoded Database Names
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/.env`
**Lines:** 18, 41
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/backend/.env.production`
**Lines:** 15
**Issue:** Database name is 'audion_atlas_DB' in all environments
```
DB_NAME=audion_atlas_DB
```
**Violation:** Hardcoded database name - should support multiple databases per environment
**Impact:**
- Development and testing use same database as staging
- Cannot have isolated test databases
- Accidental data pollution in development
**Fix (Best Practice):**
- Use environment-specific database names:
  ```
  # .env (development)
  DB_NAME=audion_dev_db
  
  # Render production
  DB_NAME=audion_prod_db
  ```
- Or use same name but environment-specific MongoDB instance

---

### 17. Hardcoded Default Favicon/App Config
**File:** `/Users/hori/Desktop/audion_project_final/Audion_Emergent.AI_Demo/audion-app-fresh/.env.development`
**Lines:** 18-19
**Issue:** App name and version hardcoded
```
EXPO_PUBLIC_APP_NAME=Audion Development
EXPO_PUBLIC_APP_VERSION=1.0.0-dev
```
**Violation:** Hardcoded demo/development values mixed with configuration
**Impact:**
- Development app name visible in production builds if .env not properly managed
- Version hardcoding requires code change for releases
- Cannot dynamically read version from package.json
**Fix (Best Practice):**
- Read version from package.json instead:
  ```typescript
  import { version } from './package.json';
  const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION || version;
  ```
- Remove from .env or use package.json as source of truth
- Keep only in .env.development for override: `EXPO_PUBLIC_APP_VERSION=1.0.0-dev`

---

## Summary Table

| # | Severity | Category | File | Issue | Fix |
|---|----------|----------|------|-------|-----|
| 1 | CRITICAL | Credentials | server.py | Hardcoded JWT secret default | Env var required, no fallback |
| 2 | CRITICAL | Credentials | ai_service.py | Hardcoded API key check strings | Proper validation |
| 3 | CRITICAL | Credentials | storage_service.py | Hardcoded AWS key check strings | Startup validation |
| 4 | HIGH | URLs/Ports | server.py | Hardcoded CORS localhost ports | CORS_ALLOWED_ORIGINS env var |
| 5 | HIGH | URLs | storage_service.py | Hardcoded localhost file server URL | FILE_SERVER_URL env var |
| 6 | HIGH | URLs | ai_service.py | Hardcoded mock audio URL | Use MOCK_AUDIO_URL_BASE |
| 7 | HIGH | URLs | ai_service.py | Hardcoded audio save URL | Environment variable |
| 8 | HIGH | Timeouts | database.py, server.py | Hardcoded database timeouts | DB_*_TIMEOUT env vars |
| 9 | HIGH | Timeouts | server.py, settings.py | Hardcoded cache expiry (300s) | CACHE_EXPIRY_SECONDS env var |
| 10 | HIGH | Magic Numbers | server.py, ai_service.py | Hardcoded word counts in prompts | WORD_COUNT env vars |
| 11 | MEDIUM | Network | .env.user | Hardcoded IP address 192.168.11.60 | Use localhost or dynamic |
| 12 | MEDIUM | URLs | api.ts | Hardcoded fallback URLs & port 8003 | PROD_API_URL, DEV_API_PORT env vars |
| 13 | MEDIUM | Timeouts | api.ts | Hardcoded timeout default 30000ms | Named constant + env var |
| 14 | MEDIUM | Configuration | ai_service.py | Hardcoded OpenAI model names | OPENAI_*_MODEL env vars |
| 15 | MEDIUM | Configuration | server.py, settings.py | Hardcoded AWS region & bucket defaults | Required env vars, no defaults |
| 16 | LOW | Database | .env files | Hardcoded database name 'audion_atlas_DB' | Env-specific DB_NAME |
| 17 | LOW | Configuration | .env.development | Hardcoded app name & version | Read from package.json |

---

## Recommendations by Priority

### Immediate (Critical)
1. Remove fallback JWT_SECRET_KEY default in production
2. Implement proper startup validation for credentials
3. Add configuration validation module

### Short-term (High)
4. Extract all hardcoded URLs to environment variables
5. Create constants file for all timeout values
6. Parameterize OpenAI model selection

### Medium-term (Medium)
7. Standardize environment variable naming convention
8. Create environment-specific .env files
9. Add configuration validation schemas

### Long-term (Low)
10. Implement feature flags system
11. Add configuration management dashboard
12. Create environment-specific Docker/deployment configs

---

## Files That Need Updates

**Backend:**
- `/backend/server.py` - JWT secret, CORS, timeouts, defaults
- `/backend/config/settings.py` - All configuration centralization
- `/backend/config/database.py` - Database timeouts
- `/backend/services/ai_service.py` - Model names, URLs, timeouts
- `/backend/services/storage_service.py` - URLs, paths

**Frontend:**
- `/audion-app-fresh/config/api.ts` - API URLs, ports, timeouts
- `/audion-app-fresh/.env.development` - App config

**Configuration:**
- Create `/backend/config/constants.py` for all magic numbers
- Update `/backend/.env` documentation
- Update `/audion-app-fresh/.env.development` documentation

