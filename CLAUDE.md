# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 開発方針：共通化ファースト・保守性重視

**重要**: 新機能実装・コード修正時は必ず以下を確認してください：

### 必須確認事項
1. **既存類似機能の検索**: `grep -r "関連キーワード" . --include="*.tsx" --include="*.py"`
2. **共通化可能性の判定**: 同じ入力/出力/ロジックの機能が存在するか
3. **実装方針決定**: 共通化 > 部分共通化 > 新規実装の優先順位

### 自動適用ルール
- 同じ動作が確認できる場合は**共通化を最優先**
- 重複実装は技術負債として即座に対処
- 保守性 > パフォーマンス（明確な必要性がない限り）

詳細は `DEVELOPMENT_BEST_PRACTICES.md` を参照してください。

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
- **File Storage**: AWS S3 for audio file storage
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
Audio files are stored using AWS S3 storage with generated UUIDs for unique identification.

### Testing
Use `backend_test.py` to run comprehensive API tests including authentication, RSS management, article fetching, and AI-powered audio generation.

## Current Development Status & Roadmap

### ✅ Phase 1: MVP Core Features (COMPLETED)
- **Authentication System**: Complete user registration/login with JWT tokens
- **RSS Management**: Full CRUD operations for RSS sources with auto-sync
- **AI Content Generation**: OpenAI integration for script generation with multiple prompt styles
- **Audio Pipeline**: Google TTS integration with AWS S3 storage
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

### ✅ Phase 3: Production Optimization & Bug Fixes (COMPLETED)
#### 3.1 Performance & Stability Optimization
- **✅ Cache Strategy Optimization**: Client-side genre filtering for instant response
- **✅ Genre Classification Enhancement**: Improved accuracy with conflict resolution
- **✅ Audio Playback Improvements**: PanResponder drag controls for seek bar
- **✅ Cross-Platform Compatibility**: Web & native environment support
- **✅ Error Handling**: Background audio service notifications and Web API compatibility

#### 3.2 Article Reader System Overhaul
- **✅ Complete Article Display Rewrite**: New modal-based article reader system
- **✅ Navigation Stability**: Eliminated router-based navigation issues
- **✅ Multi-View Support**: Summary, full-text, and web view modes
- **✅ Enhanced User Experience**: Smooth transitions and fallback mechanisms
- **✅ Cross-Platform Reader**: Works seamlessly on web and native environments

#### 3.3 Developer Experience & Debugging
- **✅ Log Optimization**: Removed excessive debug output for cleaner development
- **✅ Error Boundaries**: Comprehensive error handling and user feedback
- **✅ Testing Infrastructure**: Simulator and browser testing compatibility
- **✅ Code Quality**: Modernized component architecture and TypeScript consistency

### 🚀 Phase 4: Enhanced Content & User Experience
#### 4.1 Content Discovery & Personalization
- [ ] **Smart Article Recommendations**
  - Machine learning-based content suggestions
  - User behavior analysis and preference learning
  - Trending topics integration with real-time updates
- [ ] **Advanced Search & Filtering**
  - Full-text article search capabilities
  - Advanced filter combinations (source + genre + date)
  - Search history and saved searches
- [ ] **Content Quality Enhancement**
  - Article duplicate detection and merging
  - Source reliability scoring system
  - Content freshness indicators

#### 4.2 Audio Experience Enhancement
- [ ] **Advanced Playback Features**
  - Variable playback speed with pitch preservation
  - Audio quality selection (bandwidth optimization)
  - Offline download capabilities with storage management
- [ ] **Voice & Audio Customization**
  - Multiple AI voice options (male/female, accents)
  - Voice speed and tone customization
  - Background music and sound effects options
- [ ] **Smart Audio Features**
  - Auto-resume from last position across devices
  - Chapter markers for long-form content
  - Sleep timer and auto-pause functionality
- [ ] **Playlist Content Evolution**
  - UGC (User Generated Content) integration
  - Scheduled content delivery system
  - Weekly audio summaries and compilation features
  - Advanced script and source management for content creation
  - Content remix and reuse functionality for personalized experiences
- [ ] **Community Audio & Shared Content System** ⭐ **必須機能**
  - Other users' audio discovery and playback functionality
  - Community-created content sharing platform
  - Official/Operator-generated daily news summaries
  - Breaking news instant audio delivery system
  - Download filtering (offline-first experience)
  - Content creator attribution and following system
  - Playlist categorization (Self-created vs. Community vs. Official)
- [ ] **SNS & Social Features** ⭐ **必須機能**
  - User profile system with avatar, bio, and social stats
  - Follow/Following functionality for content creators
  - Like, comment, and share interactions on audio content
  - User-generated content feeds and discovery algorithms
  - Social proof indicators (trending creators, popular content)
  - Community moderation and content reporting systems
- [ ] **News Content Rights & Secondary Use Strategy** ⭐ **必須機能**
  - Comprehensive licensing framework for RSS source content
  - Fair use compliance for AI-generated audio summaries
  - Attribution system for original news sources
  - Content transformation logging for legal compliance
  - Partnership agreements with news publishers
  - Revenue sharing models for content creators and publishers

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

### 📊 Current Architecture Status (Updated December 2024)
- **Frontend**: Expo React Native - ✅ Production ready with cross-platform article reader
- **Backend**: FastAPI Python - ✅ MVP complete and stable, ready for scaling  
- **Database**: MongoDB - ✅ Optimized with improved genre classification
- **AI Integration**: OpenAI GPT + Google TTS - ✅ Stable with enhanced error handling
- **Storage**: AWS S3 - ✅ Suitable for current scale
- **Deployment**: ✅ Development environment optimized, ready for production
- **User Experience**: ✅ Comprehensive settings, modal-based article reading, cache optimization
- **Cross-Platform Support**: ✅ Web and native environments fully supported

### 🎯 Next Immediate Actions (Priority Order)
1. **🚀 Production Deployment Pipeline Setup**
   - App Store / Google Play Store preparation
   - Environment configuration for staging/production
   - CI/CD pipeline implementation
2. **📊 Analytics & Monitoring Implementation**
   - User behavior tracking integration
   - Performance monitoring setup
   - Error reporting and crash analytics
3. **💰 Monetization Strategy Implementation**
   - Subscription payment integration (Stripe/RevenueCat)
   - Premium feature gating
   - Usage analytics for freemium model
4. **🎯 User Onboarding & Retention**
   - Interactive tutorial for new users
   - First-time experience optimization
   - Push notification engagement system
5. **🔍 Content Quality Assurance System**
   - Source reliability scoring
   - Duplicate article detection
   - Content moderation workflow

### 🏆 Recent Achievements (December 2024)
- ✅ **Zero Critical Bugs**: All major navigation and display issues resolved
- ✅ **Cross-Platform Compatibility**: Seamless experience on web and native
- ✅ **Performance Optimized**: Instant genre switching, optimized cache strategy
- ✅ **Production-Ready UI**: Modal-based article reader with excellent UX
- ✅ **Developer Experience**: Clean codebase, minimal debug output, proper error handling