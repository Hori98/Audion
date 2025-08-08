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