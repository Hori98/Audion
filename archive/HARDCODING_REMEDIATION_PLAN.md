# Hardcoding Violations - Remediation Plan

## Executive Summary

Comprehensive analysis of the **Audion_Emergent.AI_Demo** codebase identified **17 hardcoding violations** that violate the [Development Checklist](docs/DEVELOPMENT_CHECKLIST.md), specifically the requirements:
- **Line 12 (Backend)**: "No hardcoded credentials or sensitive information"
- **Line 156 (Git)**: "No sensitive information in commits"

### Violations by Severity

| Severity | Count | Security Risk | Scope |
|----------|-------|---------------|-------|
| **CRITICAL** | 3 | 🔴 HIGH | Credentials, JWT secrets |
| **HIGH** | 7 | 🟠 MEDIUM | URLs, Ports, Timeouts |
| **MEDIUM** | 4 | 🟡 LOW | Network Config, Models |
| **LOW** | 2 | 🟢 MINIMAL | Database, App Version |
| **TOTAL** | **17** | | |

---

## CRITICAL VIOLATIONS (Must Fix Immediately)

### 1️⃣ Hardcoded JWT Secret Default
- **File:** `backend/server.py:150`
- **Issue:** `JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-do-not-use-in-production')`
- **Risk:** Easily forgeable tokens if default is used
- **Fix:** Require JWT_SECRET_KEY via environment variable, no fallback in production
- **Status:** ⚠️ PENDING

### 2️⃣ Hardcoded OpenAI API Key Validation
- **File:** `backend/services/ai_service.py:29, 73, 129, 232`
- **Issue:** Checking against literal string `"your-openai-key"`
- **Risk:** Silent fallback when API key is missing
- **Fix:** Implement startup validation, raise error if missing
- **Status:** ⚠️ PENDING

### 3️⃣ Hardcoded AWS Credential Validation
- **File:** `backend/services/storage_service.py:39, 255`
- **Issue:** Checking against literal string `"your-aws-access-key"`
- **Risk:** Brittle placeholder detection
- **Fix:** Validate at startup, raise error if credentials missing
- **Status:** ⚠️ PENDING

---

## HIGH SEVERITY VIOLATIONS (Fix This Week)

### 4️⃣ Hardcoded CORS Port Numbers
- **File:** `backend/server.py:202-211`
- **Issue:** Multiple hardcoded localhost ports (3000, 5173, 19000, 19001, 8003, 8004)
- **Fix:** Extract to `CORS_ALLOWED_ORIGINS` environment variable
- **Status:** ⚠️ PENDING

### 5️⃣ Hardcoded File Server URL
- **File:** `backend/services/storage_service.py:160`
- **Issue:** `http://localhost:8001/profile-images/{image_filename}`
- **Fix:** Use `FILE_SERVER_URL` environment variable
- **Status:** ⚠️ PENDING

### 6️⃣ Hardcoded Mock Audio URLs
- **File:** `backend/services/ai_service.py:204, 220`
- **Issue:** `http://localhost:8001/audio/{filename}`
- **Fix:** Use `MOCK_AUDIO_URL_BASE` environment variable
- **Status:** ⚠️ PENDING

### 7️⃣ Hardcoded Database Timeouts
- **File:** `backend/config/database.py:30`, `backend/server.py:93`
- **Issue:** Scattered `timeout=5.0`, `timeout=10.0` magic numbers
- **Fix:** Create `DB_PING_TIMEOUT`, `DB_OPERATION_TIMEOUT` environment variables
- **Status:** ⚠️ PENDING

### 8️⃣ Hardcoded Cache Expiry
- **File:** `backend/config/settings.py:28`
- **Issue:** `CACHE_EXPIRY_SECONDS = 300` (5 minutes)
- **Fix:** Make configurable: `RSS_CACHE_EXPIRY_SECONDS = int(os.environ.get('RSS_CACHE_EXPIRY_SECONDS', '300'))`
- **Status:** ⚠️ PENDING

### 9️⃣ Hardcoded Word Counts in Prompts
- **File:** `backend/server.py`, `backend/services/ai_service.py:88`
- **Issue:** Literal strings like `"200-300 words"` and `"300-400語"`
- **Fix:** Create `RECOMMENDED_WORD_COUNT`, `INSIGHT_WORD_COUNT` environment variables
- **Status:** ⚠️ PENDING

### 🔟 Hardcoded OpenAI Models
- **File:** `backend/services/ai_service.py:48, 102, 136, 240`
- **Issue:** Hardcoded `gpt-4o`, `tts-1`, `alloy`, `gpt-3.5-turbo`
- **Fix:** Create `OPENAI_CHAT_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE` environment variables
- **Status:** ⚠️ PENDING

---

## MEDIUM SEVERITY VIOLATIONS (Fix Next 2 Weeks)

### 1️⃣1️⃣ Hardcoded IP Address in Frontend
- **File:** `audion-app/.env.user:2`
- **Issue:** `EXPO_PUBLIC_BACKEND_URL=http://192.168.11.60:8000`
- **Fix:** Use `localhost` or let dynamic resolution handle it
- **Status:** ⚠️ PENDING

### 1️⃣2️⃣ Hardcoded Frontend API Endpoints
- **File:** `audion-app-fresh/config/api.ts:44, 49`
- **Issue:** `https://api.audion.app` and port `8003` hardcoded
- **Fix:** Create `EXPO_PUBLIC_PROD_API_URL`, `EXPO_PUBLIC_DEV_API_PORT` environment variables
- **Status:** ⚠️ PENDING

### 1️⃣3️⃣ Hardcoded API Timeout Default
- **File:** `audion-app-fresh/config/api.ts:55`
- **Issue:** `parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000')`
- **Fix:** Create named constant `DEFAULT_API_TIMEOUT_MS = 30000`
- **Status:** ⚠️ PENDING

### 1️⃣4️⃣ Hardcoded AWS Region & S3 Bucket
- **File:** `backend/server.py:71`, `backend/config/settings.py:24`
- **Issue:** Default values `'us-east-1'` and `'audion-audio-files'`
- **Fix:** Make required environment variables with no defaults
- **Status:** ⚠️ PENDING

---

## LOW SEVERITY VIOLATIONS (Fix Next Sprint)

### 1️⃣5️⃣ Hardcoded Database Name
- **File:** `backend/.env:18`, `backend/.env.production:15`
- **Issue:** All environments use `audion_atlas_DB`
- **Fix:** Use environment-specific names: `audion_dev_db`, `audion_prod_db`
- **Status:** ⚠️ PENDING

### 1️⃣6️⃣ Hardcoded App Name & Version
- **File:** `audion-app-fresh/.env.development:18-19`
- **Issue:** `EXPO_PUBLIC_APP_VERSION=1.0.0-dev`
- **Fix:** Read version from `package.json` instead
- **Status:** ⚠️ PENDING

---

## Remediation Priority Matrix

```
CRITICAL (Do First)
├── JWT Secret Default → Remove, require env var
├── OpenAI API Validation → Implement startup check
└── AWS Credential Validation → Implement startup check

HIGH (Do This Week)
├── CORS URLs/Ports → Extract to env vars
├── Database Timeouts → Create timeout constants
├── Cache Expiry → Make configurable
├── Word Counts → Make configurable
└── Audio URLs → Extract to env vars

MEDIUM (Do Next 2 Weeks)
├── Frontend API Config → Extract to env vars
├── OpenAI Models → Make configurable
├── IP Address → Remove hardcoding
└── AWS Config → Make required env vars

LOW (Do Next Sprint)
├── Database Names → Environment-specific
└── App Version → Read from package.json
```

---

## Environment Variables to Create

### Backend (.env, .env.production, Render Dashboard)

**Security (CRITICAL):**
```env
JWT_SECRET_KEY=<strong-random-key>          # REQUIRED - no default!
OPENAI_API_KEY=sk-...                       # REQUIRED
AWS_ACCESS_KEY_ID=AKIA...                   # REQUIRED
AWS_SECRET_ACCESS_KEY=...                   # REQUIRED
```

**Network/URLs (HIGH):**
```env
CORS_ALLOWED_ORIGINS=https://audion.onrender.com,exp://localhost:19000,http://localhost:3000
FILE_SERVER_URL=http://localhost:8001
MOCK_AUDIO_URL_BASE=http://localhost:8001
```

**Database (HIGH):**
```env
DB_PING_TIMEOUT=5.0
DB_OPERATION_TIMEOUT=10.0
DB_BATCH_TIMEOUT=5.0
```

**Caching & Content (HIGH):**
```env
RSS_CACHE_EXPIRY_SECONDS=300
RECOMMENDED_WORD_COUNT=250
INSIGHT_WORD_COUNT=350
```

**AI Models (MEDIUM):**
```env
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=alloy
OPENAI_TEST_MODEL=gpt-3.5-turbo
```

**AWS & Storage (MEDIUM):**
```env
AWS_REGION=ap-southeast-2                   # REQUIRED
S3_BUCKET_NAME=audion-audio-files           # REQUIRED
```

**Database Config (LOW):**
```env
DB_NAME=audion_dev_db                       # or audion_prod_db
```

### Frontend (.env.development)

```env
EXPO_PUBLIC_PROD_API_URL=https://audion.onrender.com
EXPO_PUBLIC_DEV_API_PORT=8003
EXPO_PUBLIC_API_TIMEOUT=30000
EXPO_PUBLIC_APP_VERSION=1.0.0-dev
```

---

## Files Needing Changes

### Backend Files
- ✏️ `backend/server.py` - JWT, CORS, defaults
- ✏️ `backend/config/settings.py` - Centralize all configs
- ✏️ `backend/config/database.py` - Use timeout constants
- ✏️ `backend/services/ai_service.py` - Model names, URLs
- ✏️ `backend/services/storage_service.py` - File server URL

### Frontend Files
- ✏️ `audion-app-fresh/config/api.ts` - API URLs, timeouts
- ✏️ `audion-app-fresh/.env.development` - Add new variables
- ✏️ `audion-app/.env.user` - Remove hardcoded IP

### Configuration Files
- 📝 Create `backend/config/constants.py` - Timeout & magic numbers
- 📝 Update `backend/.env` - Document all variables
- 📝 Create `backend/.env.example` - Template for developers

---

## Testing Checklist

### Backend Tests
- [ ] `python backend_test.py` - All tests pass
- [ ] `uvicorn server:app --reload --port 8001` - Starts without errors
- [ ] JWT validation works with env var
- [ ] API key validation shows proper errors if missing
- [ ] AWS credential validation shows proper errors if missing
- [ ] CORS settings respect environment variables

### Frontend Tests
- [ ] `npx tsc --noEmit` - No TypeScript errors
- [ ] `npm run lint` - No linting errors
- [ ] `npx expo start` - Starts without errors
- [ ] API endpoints resolve correctly
- [ ] Timeout values are applied correctly

### Deployment Tests (Render)
- [ ] All environment variables set in Render Dashboard
- [ ] Backend starts successfully on Render
- [ ] Frontend connects to backend successfully
- [ ] No hardcoded values in production logs

---

## Estimated Effort

| Category | Violations | Time | Priority |
|----------|-----------|------|----------|
| CRITICAL | 3 | 2-3 hrs | Week 1 |
| HIGH | 7 | 4-5 hrs | Week 1-2 |
| MEDIUM | 4 | 3-4 hrs | Week 2-3 |
| LOW | 2 | 1-2 hrs | Week 3-4 |
| Testing & Deployment | - | 2-3 hrs | Week 3-4 |
| **TOTAL** | **17** | **~14-18 hrs** | **1-2 sprints** |

---

## Sign-Off Checklist

- [ ] All 3 CRITICAL violations fixed and tested
- [ ] All 7 HIGH violations fixed and tested
- [ ] All 4 MEDIUM violations fixed and tested
- [ ] All 2 LOW violations fixed and tested
- [ ] Environment variables documented in `.env.example`
- [ ] No hardcoded values remain in production code paths
- [ ] All tests pass (backend, frontend, TypeScript)
- [ ] Changes committed with clear message
- [ ] Changes pushed to main branch
- [ ] Render deployment verified
- [ ] No sensitive data in commit history
- [ ] Development checklist requirements met

---

## Reference Documents

1. **HARDCODING_VIOLATIONS_ANALYSIS.md** - Complete detailed analysis
2. **HARDCODING_CODE_FIX_EXAMPLES.md** - Before/after code examples
3. **HARDCODING_QUICK_REFERENCE.txt** - Quick lookup guide
4. **docs/DEVELOPMENT_CHECKLIST.md** - Development standards
5. **CLAUDE.md** - Technical documentation

---

**Created:** 2025-10-29
**Status:** Analysis Complete - Ready for Implementation
**Total Violations:** 17 (3 CRITICAL, 7 HIGH, 4 MEDIUM, 2 LOW)
**Estimated Total Fix Time:** 14-18 hours
