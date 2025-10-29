# Render Deployment Environment Variables Guide

## Overview
This guide documents all environment variables required for deploying Audion to Render after the hardcoding remediation (Phase 7).

**Status:** All hardcoding violations have been fixed. The application is ready for production deployment with environment variable configuration.

## Required Environment Variables (CRITICAL)

These variables MUST be set in Render Dashboard. The application will fail to start without them.

### Authentication & Security
```
JWT_SECRET_KEY=<generate-with-secrets-module>
```
**Generation Command:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```
**Format:** URL-safe base64 encoded string of at least 32 bytes
**Example:** `dH7kL9mN2pQ5vX8yZ_aB-cD3eF6gH0jK`

### OpenAI Configuration
```
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=alloy
OPENAI_TEST_MODEL=gpt-3.5-turbo
```
**Where to Get:**
- OpenAI API Key: https://platform.openai.com/api-keys
- Keep other values as defaults unless you want to use different models

### AWS Configuration
```
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_REGION=us-east-1
S3_BUCKET_NAME=audion-audio-files
```
**Where to Get:**
- AWS Access Keys: AWS IAM Console
- S3 Bucket: Should already exist in your AWS account
- Region: Match your S3 bucket region

### MongoDB Configuration
```
MONGO_URL=<your-mongodb-connection-string>
DB_NAME=audion_db
```
**Where to Get:**
- MongoDB Atlas: https://cloud.mongodb.com
- Connection string format: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`

## Optional Environment Variables

These can be customized but have sensible defaults.

### CORS & Network Configuration
```
CORS_ALLOWED_ORIGINS=https://audion.onrender.com,https://yourfrontend.com
FILE_SERVER_URL=https://audion.onrender.com
MOCK_AUDIO_URL_BASE=https://audion.onrender.com
```
**Defaults:**
- `CORS_ALLOWED_ORIGINS`: `https://audion.onrender.com,http://localhost:3000,http://localhost:5173,exp://localhost:19000,exp://localhost:19001`
- `FILE_SERVER_URL`: `http://localhost:8001`
- `MOCK_AUDIO_URL_BASE`: `http://localhost:8001`

**For Production:**
Replace localhost with your actual Render backend URL.

### Content Generation Configuration
```
RSS_CACHE_EXPIRY_SECONDS=300
RECOMMENDED_WORD_COUNT=250
INSIGHT_WORD_COUNT=350
```
**Meaning:**
- RSS cache expires after 5 minutes (300 seconds)
- Recommended articles: 250 words target
- Insight articles: 350 words target

### Database Configuration
```
DB_PING_TIMEOUT=5.0
DB_OPERATION_TIMEOUT=10.0
DB_BATCH_TIMEOUT=5.0
```
**Meaning (in seconds):**
- Ping timeout: 5 seconds (MongoDB health check)
- Operation timeout: 10 seconds (individual operations)
- Batch timeout: 5 seconds (batch operations)

### Environment Detection
```
ENVIRONMENT=production
```
**Options:** `production`, `development`
**Default:** `development`

## Setup Instructions

### Step 1: Prepare Environment Variables
Gather all required values:
- [ ] JWT_SECRET_KEY (generate new)
- [ ] OPENAI_API_KEY (from OpenAI)
- [ ] AWS_ACCESS_KEY_ID (from AWS IAM)
- [ ] AWS_SECRET_ACCESS_KEY (from AWS IAM)
- [ ] AWS_REGION (your region)
- [ ] S3_BUCKET_NAME (your bucket)
- [ ] MONGO_URL (from MongoDB Atlas)
- [ ] DB_NAME (usually `audion_db`)

### Step 2: Access Render Dashboard
1. Go to https://dashboard.render.com
2. Find your Audion backend service
3. Click on the service name to open its settings

### Step 3: Add Environment Variables
1. Navigate to "Environment" tab
2. Click "Add Environment Variable"
3. Enter each variable from the CRITICAL section above
4. Click "Save"

### Step 4: Update CORS & Network URLs
Edit these variables to match your Render deployment:
```
FILE_SERVER_URL=https://<your-backend-url>.onrender.com
MOCK_AUDIO_URL_BASE=https://<your-backend-url>.onrender.com
CORS_ALLOWED_ORIGINS=https://<your-backend-url>.onrender.com,https://<your-frontend-url>
```

### Step 5: Deploy
1. Click "Deploy" in Render Dashboard
2. Wait for deployment to complete
3. Check logs for any configuration errors

## Verification Checklist

After setting all environment variables and deploying:

- [ ] Backend server starts without errors
- [ ] Health endpoint responds: `GET /api/health` → `{"status":"ok"}`
- [ ] Root endpoint responds: `GET /` → welcome message
- [ ] OpenAI API calls work (test with audio generation)
- [ ] AWS S3 operations work (test with file upload)
- [ ] MongoDB connections work (test with user creation)
- [ ] Frontend can connect to backend
- [ ] No hardcoded values in logs

## Testing Production Configuration Locally

Before deploying to Render, test with production-like configuration:

```bash
# 1. Create a .env.production file with all variables
cp backend/.env.example backend/.env.production

# 2. Edit with production values
nano backend/.env.production

# 3. Start server with production config
export $(cat backend/.env.production | xargs)
cd backend && uvicorn server:app --port 8000

# 4. Test endpoints
curl http://localhost:8000/api/health
curl http://localhost:8000/
```

## Security Best Practices

1. **Never commit .env files** - They contain secrets
2. **Use Render's environment variable system** - Not local files in production
3. **Rotate secrets regularly** - Change JWT_SECRET_KEY and API keys periodically
4. **Use separate AWS keys for production** - Different from development
5. **Monitor logs** - Watch for configuration errors and hardcoded values
6. **Test before deploying** - Verify all variables work locally first

## Troubleshooting

### Error: "JWT_SECRET_KEY environment variable must be set"
**Solution:** Add JWT_SECRET_KEY to Render environment variables

### Error: "OPENAI_API_KEY environment variable must be set to a valid OpenAI API key"
**Solution:** Verify OPENAI_API_KEY is set and is a valid key from OpenAI

### Error: "AWS credentials validation failed"
**Solution:** Check AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION are correct

### Error: "MongoDB connection failed"
**Solution:** Verify MONGO_URL is correct and your MongoDB Atlas cluster allows Render's IP

### Frontend can't connect to backend
**Solution:** Check FILE_SERVER_URL and CORS_ALLOWED_ORIGINS match your Render backend URL

## Reference

- **Render Docs:** https://render.com/docs
- **Environment Variables:** https://render.com/docs/environment-variables
- **Secrets Management:** https://render.com/docs/environment-variables#managing-secrets
- **.env.example file:** `backend/.env.example` (comprehensive variable documentation)

---

**Last Updated:** 2025-10-29
**Status:** Ready for Phase 8 (Final Deployment)
