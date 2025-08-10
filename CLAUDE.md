# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audion is a full-stack podcast generation application that uses AI to convert RSS articles into conversational podcast scripts. The app consists of a React Native frontend built with Expo and a FastAPI Python backend.

## Architecture

### Frontend (audion-app/)
- **Technology**: React Native with Expo Router for file-based routing
- **Navigation**: Tab-based navigation with feed, library, sources, and explore tabs
- **Authentication**: Context-based auth system with AsyncStorage persistence
- **State Management**: React Context for authentication and global state
- **UI Components**: Custom themed components with Expo design system

### Backend (backend/)
- **Technology**: FastAPI with async/await patterns
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens with Bearer authentication
- **AI Integration**: OpenAI GPT for script generation, Google Text-to-Speech for audio
- **File Storage**: Vercel Blob for audio file storage
- **RSS Processing**: Feedparser for RSS feed ingestion with caching

## Development Commands

### Frontend Development
```bash
cd audion-app
npm install                    # Install dependencies
npx expo start                # Start development server
npx expo start --android     # Start with Android emulator
npx expo start --ios         # Start with iOS simulator
npx expo start --web         # Start web version
npm run lint                  # Run ESLint
npm run reset-project        # Reset to blank project
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

### Testing
```bash
python backend_test.py        # Run comprehensive API tests
```

## Key File Locations

### Frontend Structure
- `audion-app/app/(tabs)/` - Main tab screens (feed, library, sources, explore)
- `audion-app/context/AuthContext.tsx` - Authentication state management
- `audion-app/components/` - Reusable UI components
- `audion-app/constants/Colors.ts` - Theme colors

### Backend Structure
- `backend/server.py` - Main FastAPI application with all endpoints
- `backend/requirements.txt` - Python dependencies

## Environment Variables

### Backend (.env in backend/)
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - MongoDB database name
- `OPENAI_API_KEY` - OpenAI API key for script generation
- `GOOGLE_TTS_KEY` - Google Text-to-Speech API key

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
- **Frontend**: Expo React Native - Production ready
- **Backend**: FastAPI Python - MVP complete, needs scaling
- **Database**: MongoDB - Optimized for current load
- **AI Integration**: OpenAI GPT + Google TTS - Stable
- **Storage**: Vercel Blob - Suitable for current scale
- **Deployment**: Development environment only

### 🎯 Next Immediate Actions
1. **Production Deployment Pipeline Setup**
2. **Performance Monitoring Implementation**
3. **User Onboarding Flow Enhancement**
4. **Content Quality Assurance System**
5. **Subscription Payment Integration**