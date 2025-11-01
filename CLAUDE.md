# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Guidelines

**最終的な回答は日本語で作成してください。** (Please provide final responses in Japanese.)
- 推論や技術的な過程は英語でも問題ありません
- ただし、ユーザーへの最終的な説明・結果・アクション項目は必ず日本語にしてください
- エラーメッセージや技術用語は英語のままで構いません

## Implementation Policy

**分析・計画・提案のみのクエリに対しては実装を行わない**
- 分析、計画、提案、検討などの要求に対しては実装コードを書かない
- コードの分析や説明は行うが、新しいコードの実装は控える
- 明示的な実装指示がある場合のみコードを書く

## Project Overview

Audion is a full-stack podcast generation application that uses AI to convert RSS articles into conversational podcast scripts. The app consists of a React Native frontend built with Expo and a FastAPI Python backend.

## Architecture

### Frontend (audion-app-fresh/)
- Legacy `audion-app/` は削除済み。React Native 開発は全て `audion-app-fresh/` を使用してください。
- **Technology**: React Native with Expo (SDK 54), Expo Router
- **Navigation**: Tab-based navigation with feed, library, sources, and explore tabs
- **Authentication**: Context-based auth system with AsyncStorage persistence
- **State Management**: React Context (GlobalAudioContext, Settings, Auth)
- **UI Components**: Custom themed components with Expo design system

### Backend (backend/)
- **Technology**: FastAPI with async/await patterns
- **Database**: MongoDB Atlas (cloud-hosted MongoDB)
- **Authentication**: JWT tokens with Bearer authentication (production: strong random key required)
- **AI Integration**: OpenAI GPT for script generation, text-to-speech for audio generation
- **File Storage**: AWS S3 for audio file storage (production), local filesystem fallback (development)
- **Deployment**: Render.com for production hosting with automatic deployment from main branch
- **RSS Processing**: Feedparser for RSS feed ingestion with 5-minute caching

## Development Commands

### Frontend Development
```bash
cd audion-app-fresh
npm install                      # Install dependencies
npx expo start --tunnel         # Start development server
npx expo start --android        # Start with Android emulator
npx expo start --ios            # Start with iOS simulator
npm run lint                     # Run ESLint
```

### Backend Development

**🚨 IMPORTANT: Check SERVER_PORTS.md before starting servers!**

#### User Development Server (Main)
```bash
# From project root
python -m venv venv           # Create virtual environment
source venv/bin/activate      # Activate virtual environment (macOS/Linux)
pip install -r backend/requirements.txt  # Install dependencies
cd backend
uvicorn server:app --reload --port 8003   # Start development server (User - port 8003)
```

#### Claude AI Debug Server (Separate)
```bash
# For Claude AI debugging only
cd backend
uvicorn server:app --reload --port 8002   # Start development server (Claude - port 8002)
```

### Production Deployment (Render)

**For complete Render deployment guide, see: [docs/DEPLOYMENT_ATLAS_RENDER.md](docs/DEPLOYMENT_ATLAS_RENDER.md)**

#### Quick Deploy Checklist
```bash
# 1. Generate production JWT secret
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"

# 2. Ensure render.yaml exists in project root
ls -la render.yaml

# 3. Push to main branch (Render auto-deploys)
git add .
git commit -m "chore: production deployment configuration"
git push origin main

# 4. Monitor deployment
# Visit: https://dashboard.render.com → audion-backend → Events
```

#### Required Environment Variables (Set in Render Dashboard)
- `ENVIRONMENT=production`
- `MONGO_URL=<mongodb-atlas-connection-string>`
- `DB_NAME=audion_atlas_DB`
- `JWT_SECRET_KEY=<generated-secret>`
- `OPENAI_API_KEY=<your-api-key>`
- `AWS_ACCESS_KEY_ID=<aws-access-key>`
- `AWS_SECRET_ACCESS_KEY=<aws-secret-key>`
- `AWS_REGION=ap-southeast-2`
- `S3_BUCKET_NAME=audion-audio-files`
- `BACKEND_URL=https://audion.onrender.com`
- `LOG_LEVEL=INFO`
- `PYTHON_VERSION=3.13`

#### Verify Production Deployment
```bash
# Health check
curl https://audion.onrender.com/health

# Test login
curl -X POST https://audion.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'
```

#### Update Frontend Configuration
```bash
# audion-app-fresh/.env.development
EXPO_PUBLIC_API_BASE_URL=https://audion.onrender.com
```

### Testing
```bash
python backend_test.py        # Run comprehensive API tests
```

## Key File Locations

### Frontend Structure
- `audion-app-fresh/app/(tabs)/` - Main tab screens (feed, library, sources, explore)
- `audion-app-fresh/context/AuthContext.tsx` - Authentication state management
- `audion-app-fresh/components/` - Reusable UI components
- `audion-app-fresh/constants/Colors.ts` - Theme colors

### Backend Structure
- `backend/server.py` - Main FastAPI application with all endpoints
- `backend/requirements.txt` - Python dependencies

## Environment Variables

### Backend (.env in backend/)

**Development**:
- `MONGO_URL` - MongoDB Atlas connection string
- `DB_NAME` - MongoDB database name (audion_atlas_DB)
- `OPENAI_API_KEY` - OpenAI API key for script generation
- `JWT_SECRET_KEY` - Secret key for JWT token signing
- `ENVIRONMENT` - Set to "development" (defaults to "development")
- `AWS_ACCESS_KEY_ID` - (Optional) AWS S3 access key
- `AWS_SECRET_ACCESS_KEY` - (Optional) AWS S3 secret key
- `AWS_REGION` - AWS region for S3 (default: us-east-1)
- `S3_BUCKET_NAME` - S3 bucket name (default: audion-audio-files)
- `BACKEND_URL` - Backend URL for audio file URLs (default: http://localhost:8000)

**Production** (see `.env.production` template):
- All development variables required
- `ENVIRONMENT=production` - Enables security features (strict CORS)
- `JWT_SECRET_KEY` - Must be a strong random key (generate with: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`)
- AWS credentials required (S3 storage is mandatory in production)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### RSS Sources
- `GET /api/sources` - Get user's RSS sources
- `POST /api/sources` - Add new RSS source
- `DELETE /api/sources/{source_id}` - Delete RSS source

### Articles
- `GET /api/articles` - Get articles from user's RSS sources

### Audio Generation
- `POST /api/audio/create` - Create podcast from articles (uses AI)
- `GET /api/audio/library` - Get user's generated podcasts
- `PUT /api/audio/{audio_id}/rename` - Rename podcast
- `DELETE /api/audio/{audio_id}` - Delete podcast

## Development Notes

### AI Integration
The system generates conversational podcast scripts using OpenAI GPT with a two-host format ("HOST 1" and "HOST 2"). Scripts are stored in the database for playback.

### Authentication Flow
Users authenticate via email/password, receive JWT tokens, and the token serves as user identification throughout the app.

### RSS Processing
RSS feeds are cached for 5 minutes to reduce external API calls. Articles are fetched on-demand when users request them.

### File Storage
Audio files are stored using Vercel Blob storage with generated UUIDs for unique identification.

### Testing
Use `backend_test.py` to run comprehensive API tests including authentication, RSS management, article fetching, and AI-powered audio generation.

## Current Development Status & Roadmap

### ✅ Phase 1: MVP Core Features (COMPLETED)
- **Authentication System**: Complete user registration/login with JWT tokens
- **RSS Management**: Full CRUD operations for RSS sources with auto-sync
- **AI Content Generation**: OpenAI integration for script generation with multiple prompt styles
- **Audio Pipeline**: Google TTS integration with Vercel Blob storage
- **Basic UI**: Spotify-inspired interface with tab navigation

### ✅ Phase 2: Advanced Settings & UX (COMPLETED)
- **Comprehensive Settings System**: 50+ organized settings across 7 categories
- **Freemium Plan System**: Three-tier subscription model (Free/Basic/Premium)
- **Debug System**: Developer-grade debug menu with subscription tier testing
- **Advanced Content Management**:
  - Feed & Auto-Pick Settings with genre preferences
  - Schedule Content Settings with automated generation
  - Custom prompt system with user-created prompts
  - Smart content filtering and article count controls
- **UI/UX Improvements**:
  - Theme system (Light/Dark/System)
  - Scroll position preservation across all screens
  - Profile image management with upload/camera capture
  - Storage management with deleted items recovery

### 🚀 Phase 3: Current Focus Areas
#### 3.1 Production Readiness
- [ ] **Performance Optimization**
  - Bundle size optimization
  - Memory usage optimization
  - Network request optimization
- [ ] **Error Handling & Monitoring**
  - Comprehensive error boundary implementation
  - User-friendly error messages
  - Crash reporting integration
- [ ] **Testing & Quality Assurance**
  - Unit tests for core components
  - Integration tests for API endpoints
  - E2E testing for critical user flows

#### 3.2 Enhanced User Experience
- [ ] **Content Discovery**
  - Smart article recommendations
  - Trending topics integration
  - User preference learning
- [ ] **Audio Experience**
  - Playback speed controls
  - Audio quality selection
  - Offline download capabilities
- [ ] **Social Features**
  - Podcast sharing functionality
  - User favorites and bookmarks
  - Community-driven content curation

### 🔮 Phase 4: Advanced Features (Future)
#### 4.1 AI & Personalization
- [ ] **Advanced AI Features**
  - Voice cloning for personalized hosts
  - Dynamic content adaptation based on user behavior
  - Real-time news integration with breaking news alerts
- [ ] **Smart Automation**
  - Intelligent scheduling based on user habits
  - Auto-categorization of content
  - Predictive content generation

#### 4.2 Platform Expansion
- [ ] **Multi-Platform Support**
  - Web application deployment
  - Desktop applications (Electron)
  - Smart speaker integration (Alexa/Google Home)
- [ ] **Enterprise Features**
  - Team collaboration tools
  - Corporate content management
  - Advanced analytics dashboard

### 🛠️ Technical Debt & Infrastructure
- [ ] **Backend Scalability**
  - Database optimization and indexing
  - API rate limiting and caching
  - Microservices architecture migration
- [ ] **Security Enhancements**
  - OAuth2 integration
  - End-to-end encryption for user data
  - Advanced authentication methods (2FA, biometric)

### 📊 Current Architecture Status
- **Frontend**: Expo React Native (audion-app-fresh) - Production ready
  - URL: https://audion.onrender.com (configured in .env.development)
  - Tunnel mode for development: `npx expo start --tunnel`
- **Backend**: FastAPI Python - Production deployed on Render
  - URL: https://audion.onrender.com
  - Auto-deploys from main branch via Render
  - Render health check: `/health` endpoint
- **Database**: MongoDB Atlas - Cloud-hosted, production-grade
  - Database: audion_atlas_DB
  - Network access configured for Render IPs
- **AI Integration**: OpenAI GPT - Stable
- **Storage**: AWS S3 - Production storage for audio files
  - Bucket: audion-audio-files (ap-southeast-2 region)
  - Fallback: Local filesystem in development
- **Deployment**: Render.com - Automated production deployment
  - Configuration: render.yaml in project root
  - Environment variables: Set in Render Dashboard

### 🎯 Next Immediate Actions
1. **Production Deployment Pipeline Setup**
2. **Performance Monitoring Implementation**
3. **User Onboarding Flow Enhancement**
4. **Content Quality Assurance System**
5. **Subscription Payment Integration**
