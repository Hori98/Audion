# Technology Stack

## Backend
- **Framework**: FastAPI 0.110.1
- **Runtime**: Python with uvicorn server
- **Database**: MongoDB with Motor async driver (pymongo 4.5.0, motor 3.3.1)
- **Authentication**: JWT tokens (pyjwt, python-jose, passlib)
- **AI Services**: 
  - OpenAI API for script generation
  - Google Cloud Text-to-Speech for audio generation
- **File Storage**: Vercel Blob storage
- **RSS Processing**: feedparser library
- **Other Dependencies**: 
  - pydantic for data validation
  - requests for HTTP calls
  - python-dotenv for environment variables
  - aiofiles for async file operations
  - mutagen for audio metadata

## Frontend - React Native (Primary)
- **Framework**: Expo SDK 53.0.20
- **Language**: TypeScript 5.8.3
- **Navigation**: Expo Router with file-based routing
- **State Management**: React Context API
- **Storage**: AsyncStorage for persistence
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Icons**: Lucide React Native
- **Audio**: Expo AV for audio playback
- **Additional**: Expo Blur, Expo Image, Expo Haptics

## Frontend - Web (Secondary)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS 4.1.11
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **UI Components**: Headless UI

## Development Tools
- **Linting**: ESLint with Expo config
- **Type Checking**: TypeScript
- **Package Management**: npm/yarn
- **Testing**: Python pytest for backend, comprehensive test suite in backend_test.py

## Database Schema
- **Users**: Authentication and profile data
- **RSS Sources**: User's subscribed RSS feeds
- **Articles**: Fetched article metadata
- **Audio**: Generated podcast files with metadata
- **User Interactions**: Usage tracking and preferences