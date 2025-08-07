# Audion Project Overview

## Purpose
Audion is a full-stack podcast generation application that uses AI to convert RSS articles into conversational podcast scripts. It allows users to manage RSS sources, select articles, and generate AI-powered audio summaries in podcast format.

## Architecture

### Backend (FastAPI + Python)
- **Location**: `backend/` directory
- **Technology**: FastAPI with async/await patterns
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens with Bearer authentication
- **AI Integration**: OpenAI GPT for script generation, Google Text-to-Speech for audio
- **File Storage**: Vercel Blob for audio file storage
- **RSS Processing**: Feedparser for RSS feed ingestion with caching

### Frontend Options
1. **React Native Mobile App** (`audion-app/`):
   - Built with Expo Router for file-based routing
   - Tab-based navigation with feed, library, sources, and explore tabs
   - Authentication via Context with AsyncStorage persistence
   - Custom themed components with Expo design system

2. **Web UI** (`src/`):
   - React 18 with Vite build system
   - Styled with Tailwind CSS
   - Uses Axios for API calls

## Key Features
- User authentication and management
- RSS source management (CRUD operations)
- Article fetching and selection from RSS feeds
- AI-powered podcast script generation using conversational format ("HOST 1" and "HOST 2")
- Audio generation using Google Text-to-Speech
- Audio library management with playback controls
- Audio file storage and serving

## Development Environment
- **Backend**: Python with virtual environment
- **Frontend Mobile**: React Native with Expo
- **Frontend Web**: React with Vite
- **Database**: MongoDB
- **Platform**: Darwin (macOS)