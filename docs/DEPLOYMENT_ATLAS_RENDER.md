# Audion Backend Deployment on Render

Complete guide for deploying the Audion backend to Render with MongoDB Atlas and AWS S3.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  Frontend (React Native + Web)                           │
│  ├─ audion-app-fresh (Expo)                             │
│  └─ src/ (React/Vite)                                   │
│                                                           │
│  ⬇️  HTTPS (API calls)                                  │
│                                                           │
│  ┌────────────────────────────────────────┐             │
│  │  Render Backend Service                │             │
│  │  (audion.onrender.com)                 │             │
│  │  ├─ FastAPI Application                │             │
│  │  ├─ Uvicorn ASGI Server                │             │
│  │  └─ Port: Auto-assigned by Render      │             │
│  └────────────────────────────────────────┘             │
│                                                           │
│  ⬇️  Network (via Render)                               │
│                                                           │
│  ┌────────────────────────────────────────┐             │
│  │  MongoDB Atlas (Cloud)                 │             │
│  │  ├─ Database: audion_atlas_DB          │             │
│  │  └─ Region: US (or preferred)          │             │
│  └────────────────────────────────────────┘             │
│                                                           │
│  ┌────────────────────────────────────────┐             │
│  │  AWS S3 Bucket (Storage)               │             │
│  │  ├─ Bucket: audion-audio-files         │             │
│  │  └─ Region: ap-southeast-2             │             │
│  └────────────────────────────────────────┘             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

### 1. Render Account
- Account created at [https://render.com](https://render.com)
- GitHub account connected to Render

### 2. MongoDB Atlas
- MongoDB Atlas account: [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Database created: `audion_atlas_DB`
- User created with read/write permissions
- Network access configured (allow 0.0.0.0/0 for Render access)
- Connection string obtained

### 3. AWS Account
- AWS account with S3 access
- S3 bucket created: `audion-audio-files` in region `ap-southeast-2`
- IAM user created with S3 permissions
- Access keys generated

### 4. OpenAI API
- OpenAI API key obtained from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Billing configured with sufficient credits

---

## 🚀 Step 1: Prepare Backend Code

### 1.1 Verify render.yaml exists
```bash
ls -la render.yaml
# Should show: -rw-r--r-- ... render.yaml
```

### 1.2 Check backend structure
```bash
ls -la backend/
# Should include: server.py, requirements.txt, routers/, models/, etc.
```

### 1.3 Generate production JWT secret
```bash
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
# Output: JWT_SECRET_KEY=aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789

# Copy this value - you'll need it in Step 2
```

### 1.4 Verify MongoDB Atlas connection string
```bash
# From MongoDB Atlas Dashboard:
# 1. Click "Connect" on your cluster
# 2. Select "Drivers" option
# 3. Copy the connection string:
# mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority

# Format: mongodb+srv://user:password@cluster.mongodb.net/audion_atlas_DB?retryWrites=true&w=majority
```

---

## 🔧 Step 2: Configure Render Dashboard

### 2.1 Create new Web Service
1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Select branch: `main`

### 2.2 Service Configuration
- **Name**: `audion-backend`
- **Environment**: `Python 3`
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Region**: Choose closest to your users (e.g., Oregon for US)
- **Plan**: Starter (or free to test)

### 2.3 Set Environment Variables

In Render Dashboard, go to "Environment" and add these variables:

```
PYTHON_VERSION=3.13
ENVIRONMENT=production
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/audion_atlas_DB?retryWrites=true&w=majority
DB_NAME=audion_atlas_DB
JWT_SECRET_KEY=<your-generated-secret-from-step-1>
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-2
S3_BUCKET_NAME=audion-audio-files
LOG_LEVEL=INFO
```

**⚠️ CRITICAL SECURITY NOTES:**
- Never put secrets in code or render.yaml
- Always use Render Dashboard environment variables for sensitive data
- Regenerate JWT_SECRET_KEY every time you rotate it
- Keep AWS credentials secure and consider rotating them regularly

### 2.4 Configure Health Check
- **Path**: `/health`
- **Check Interval**: 10 seconds
- **Timeout**: 5 seconds

---

## ✅ Step 3: Deploy and Verify

### 3.1 Deploy
1. Render will automatically deploy from the `main` branch
2. Or manually trigger: Dashboard → "Manual Deploy" → "Deploy Latest Commit"
3. Monitor logs in real-time

### 3.2 Check Deployment Logs
Look for these success indicators:

```
✅ Build Phase
- "Installing Python dependencies" → Success
- "Successfully installed fastapi uvicorn motor" → Success

✅ Startup Phase
- "🚀 AUDION BACKEND STARTUP" → Service started
- "🔐 JWT_SECRET_KEY configured: True" → Security check passed
- "Connected to MongoDB successfully" → Database connected
- "Uvicorn running on 0.0.0.0:xxxxx" → Server listening
```

### 3.3 Verify Endpoints

**Health Check:**
```bash
curl https://audion.onrender.com/health
# Expected: {"status": "healthy", "database": "connected"}
```

**Authentication:**
```bash
# Register
curl -X POST https://audion.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123","name":"Test User"}'

# Login
curl -X POST https://audion.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'
```

### 3.4 Test with Frontend

**React Native (audion-app-fresh):**
```bash
cd audion-app-fresh

# Verify .env.development has:
# EXPO_PUBLIC_API_BASE_URL=https://audion.onrender.com

# Start Expo
npx expo start --tunnel

# Scan QR code and test login
```

**Web UI (src/):**
```bash
# Update .env with:
# VITE_API_URL=https://audion.onrender.com/api

# Start dev server
npm run dev

# Test login at http://localhost:5173
```

---

## 🔒 Security Checklist

- [ ] JWT_SECRET_KEY is strong and random
- [ ] All environment variables use Render Dashboard (not code)
- [ ] CORS is configured for specific domains (not wildcard in production)
- [ ] MongoDB connection string uses strong password
- [ ] AWS S3 bucket has proper access policies
- [ ] AWS credentials are limited to S3 access only
- [ ] OpenAI API key has spending limits set
- [ ] Render environment is set to `production`
- [ ] HTTPS is enabled (automatic with Render)
- [ ] Sensitive logs don't contain secrets

---

## 📊 Monitoring and Maintenance

### 3.1 Monitor Render Metrics
1. Go to Dashboard → audion-backend → Metrics
2. Monitor:
   - **CPU Usage**: Should be < 80%
   - **Memory Usage**: Should be < 512MB
   - **Restart Count**: Should be 0 or minimal
   - **HTTP Response Time**: Should be < 2 seconds

### 3.2 Monitor MongoDB Atlas
1. Go to MongoDB Atlas → Cluster → Monitoring
2. Monitor:
   - **Query Performance**: Slow queries > 100ms
   - **Connection Pool**: Usage patterns
   - **Network I/O**: In/Out bandwidth

### 3.3 Monitor AWS S3
1. Go to S3 → audion-audio-files → Metrics
2. Monitor:
   - **Bucket Size**: Total storage used
   - **Request Count**: Upload/download frequency
   - **Error Rate**: 4xx/5xx responses

### 3.4 Check Logs Regularly
```bash
# In Render Dashboard, view logs for:
- Errors or exceptions
- Failed database connections
- S3 upload failures
- JWT validation errors
```

---

## 🚨 Troubleshooting

### Problem: 502 Bad Gateway

**Cause 1: Build failed**
- Check build logs for Python dependency errors
- Verify `pip install -r backend/requirements.txt` syntax
- Test locally: `python -m pip install -r backend/requirements.txt`

**Cause 2: Startup failed**
- Check startup logs for missing environment variables
- Verify all required env vars are set in Render Dashboard
- Test start command locally: `cd backend && uvicorn server:app --reload`

**Cause 3: Database connection timeout**
- Verify MONGO_URL is correct
- Check MongoDB Atlas network access (should allow Render IPs)
- Test connection: `mongosh "mongodb+srv://..."`

### Problem: 401 Authentication Errors

**Cause: JWT_SECRET_KEY not set or changed**
- Verify JWT_SECRET_KEY is set in Render Dashboard
- Check logs for "JWT_SECRET_KEY configured: True"
- Ensure it hasn't been accidentally changed

**Solution:**
1. Get new secret: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
2. Update in Render Dashboard
3. Manually deploy

### Problem: S3 Upload Fails

**Cause 1: AWS credentials invalid**
- Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- Test with AWS CLI: `aws s3 ls s3://audion-audio-files/`

**Cause 2: Bucket policy not configured**
- S3 bucket must allow public read (for audio playback)
- Bucket policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::audion-audio-files/*"
    }
  ]
}
```

**Cause 3: Bucket name wrong**
- Verify S3_BUCKET_NAME matches actual bucket name
- Check for typos in Render environment variable

### Problem: Long Request Timeouts

**Cause: Free tier Render has 30-second timeout**
- Audio generation can take > 30 seconds
- Solution: Upgrade to Starter plan or implement async task queue

**Check current plan:**
1. Go to Render Dashboard → audion-backend
2. Look at "Plan" section
3. If Free: Consider upgrading to Starter ($7/month)

---

## 📚 Environment Variables Reference

### Required Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `MONGO_URL` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `DB_NAME` | `audion_atlas_DB` | Database name |
| `JWT_SECRET_KEY` | `aBcDeFgHiJk...` | Strong random secret for JWT signing |
| `ENVIRONMENT` | `production` | Environment mode (enables security checks) |
| `OPENAI_API_KEY` | `sk-...` | OpenAI API key for script generation |
| `AWS_ACCESS_KEY_ID` | `AKIA...` | AWS IAM access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | `...` | AWS IAM secret key for S3 |
| `AWS_REGION` | `ap-southeast-2` | AWS region for S3 bucket |
| `S3_BUCKET_NAME` | `audion-audio-files` | S3 bucket name |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `PYTHON_VERSION` | `3.13` | Python version |

---

## 🔄 Continuous Deployment

### Auto-Deploy from GitHub
- Render automatically deploys when you push to `main` branch
- Manual deploy available in Render Dashboard

### Deployment Process
1. Push code to GitHub: `git push origin main`
2. Render detects push
3. Starts build (installs dependencies)
4. Starts service (runs uvicorn)
5. Health check passes → service live

### Monitor Deployment
1. Go to Render Dashboard → audion-backend
2. Click "Events" tab
3. See deployment status in real-time

---

## 📞 Support

### Render Docs
- [Render Python Deployment](https://render.com/docs/deploy-python)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Health Checks](https://render.com/docs/health-checks)

### MongoDB Atlas Docs
- [Quickstart](https://docs.mongodb.com/atlas/getting-started/)
- [Network Access](https://docs.mongodb.com/atlas/security/ip-access-list/)

### AWS S3 Docs
- [Getting Started](https://docs.aws.amazon.com/s3/latest/userguide/GetStartedWithS3.html)
- [Bucket Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html)

---

## ✨ Success Indicators

You'll know deployment is successful when:

✅ Health check returns 200 OK
✅ Logs show "🚀 AUDION BACKEND STARTUP"
✅ Can register and login via API
✅ Can fetch articles from RSS sources
✅ Can generate audio files and upload to S3
✅ Frontend app connects successfully
✅ No errors in Render logs
✅ CPU/Memory usage is stable

---

## 🎉 Deployed!

Your Audion backend is now running on Render with production-grade MongoDB Atlas and AWS S3 storage.

**Production URL**: `https://audion.onrender.com`
**API Base**: `https://audion.onrender.com/api`
**Health Check**: `https://audion.onrender.com/health`
