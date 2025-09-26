# Audion Project Overview

## Project Purpose
**Audion** is an AI-powered audio news platform that converts RSS articles and web content into high-quality audio content. Users can "listen" to information anytime, anywhere through a React Native mobile app and FastAPI backend.

## Core Philosophy
1. **Simplicity First**: Eliminate complexity, achieve intuitive operability
2. **Quality Focus**: High-quality AI-generated content and stability assurance
3. **Performance**: Fast response and lightweight design
4. **Scalability**: Flexible design that can accommodate future feature extensions

## Technology Stack

### Frontend: React Native (Expo)
- **Framework**: React Native with Expo Router (file-based routing)
- **Version**: Expo SDK 50, React Native 0.73.6
- **UI Library**: React Native Paper, custom themed components
- **Navigation**: Tab-based navigation with file-based routing
- **State Management**: React Context (Auth, RSS, Settings)
- **Key Dependencies**: 
  - expo-audio, expo-av (audio playback)
  - react-native-sse (server-sent events)
  - axios (HTTP client)
  - @react-native-async-storage/async-storage (local storage)

### Backend: FastAPI + MongoDB
- **Framework**: FastAPI with uvicorn (async web framework)
- **Database**: MongoDB with Motor async driver
- **Authentication**: JWT tokens with Bearer authentication
- **AI Integration**: OpenAI GPT for script generation, OpenAI TTS for audio
- **Storage**: AWS S3 for audio files + local storage fallback
- **RSS Processing**: feedparser with caching mechanism
- **Key Dependencies**:
  - fastapi==0.110.1, uvicorn==0.25.0
  - motor==3.3.1 (MongoDB async driver)
  - openai (AI integration)
  - boto3 (AWS S3)
  - feedparser (RSS processing)

## Architecture Status

### Current Frontend: audion-app/
- **Status**: Active main frontend (99 files)
- **Features**: Complete implementation with authentication, audio generation, settings, UI
- **Technology**: Expo Router with comprehensive component library

### Frontend Alternative: audion-app-fresh/ (90% complete)
- **Status**: Modern architecture, 95 files, 90% feature complete
- **Advantages**: Latest Expo SDK, clean architecture, optimized dependencies
- **Readiness**: Operational at port 8084, connects to backend at port 8003

### Backend: backend/server.py
- **Status**: Fully operational (6,633 lines)
- **Endpoints**: 70+ API endpoints
- **Network**: Runs on 192.168.11.30:8003 (accessible from mobile devices)
- **Recent Updates**: Unified TTS service integration (January 2025)

## Key Features (Implemented)

### Core Functionality
- **User Authentication**: JWT-based login/registration system
- **RSS Integration**: 6 sources, 65+ articles successfully fetched
- **AI Audio Generation**: AutoPick with real-time progress monitoring
- **Audio Library**: Real API integration with playbook controls
- **Search & Discovery**: Advanced fuzzy search with relevance scoring

### Advanced Features
- **Unified Audio System**: Integrated TTS service and XML processing pipeline
- **Progress Monitoring**: Server-Sent Events (SSE) for real-time progress
- **Task Manager**: Background audio generation with progress tracking
- **Multiple Generation Modes**: AutoPick, Manual Selection, Instant Multi

## Development Environment

### Requirements
- **Backend**: Python 3.13+, MongoDB, OpenAI API key
- **Frontend**: Node.js 18+, Expo CLI, React Native development environment
- **Mobile Testing**: iOS Simulator, Android Emulator, or physical device

### Environment Variables
```bash
# Backend (.env)
OPENAI_API_KEY=your_openai_key
MONGO_URL=mongodb_connection_string
DB_NAME=database_name
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Frontend
EXPO_PUBLIC_API_BASE_URL=http://192.168.11.30:8003
```