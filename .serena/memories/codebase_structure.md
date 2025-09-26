# Codebase Structure Overview

## Project Root Structure
```
Audion_Emergent.AI_Demo/
├── audion-app/              # Main active frontend (React Native/Expo)
├── audion-app-fresh/        # Modern architecture frontend (90% complete)
├── backend/                 # FastAPI backend server
├── backend_refactored/      # Future modular backend architecture
├── docs/                    # Project documentation
├── logs/                    # Application logs
├── scripts/                 # Utility scripts
├── venv/                    # Python virtual environment
├── start-dev-fixed.sh       # Main development startup script
└── Various config & test files
```

## Frontend Structure (audion-app/)
```
audion-app/
├── app/                     # Expo Router pages
│   ├── (tabs)/             # Tab-based navigation screens
│   │   ├── index.tsx       # Home/Feed screen
│   │   ├── articles.tsx    # Articles screen
│   │   ├── discover.tsx    # Discover screen
│   │   └── _layout.tsx     # Tab layout configuration
│   ├── auth/               # Authentication screens
│   ├── settings/           # Settings screens
│   └── _layout.tsx         # Root layout
├── components/             # Reusable UI components (70+ components)
├── context/                # React Context providers
│   ├── AuthContext.tsx     # Authentication state
│   ├── RSSContext.tsx      # RSS feed state
│   └── SettingsContext.tsx # App settings state
├── services/               # API integration layer
│   ├── APIService.ts       # Main API client
│   ├── ArticleService.ts   # Article-related API calls
│   ├── AudioService.ts     # Audio generation API calls
│   └── AuthService.ts      # Authentication API calls
├── hooks/                  # Custom React hooks
├── constants/              # App constants and configuration
├── utils/                  # Utility functions
└── assets/                 # Images, fonts, etc.
```

## Backend Structure (backend/)
```
backend/
├── server.py               # Main FastAPI server (6,633 lines - monolithic)
├── services/               # Business logic services
│   ├── rss_service.py      # RSS feed processing
│   ├── audio_service.py    # Audio generation logic
│   ├── auth_service.py     # Authentication logic
│   ├── tts_service.py      # Text-to-speech service (unified)
│   └── unified_audio_service.py # Unified audio processing
├── models/                 # Pydantic data models
│   ├── article.py          # Article data structures
│   ├── audio.py           # Audio data structures
│   └── user.py            # User data structures
├── routers/                # API endpoint organization (partial)
│   ├── auth.py            # Authentication endpoints
│   ├── rss.py             # RSS management endpoints
│   ├── audio_unified.py   # Audio generation endpoints
│   └── [other routers]
├── utils/                  # Utility functions
│   ├── database.py        # Database connection utilities
│   └── text_utils.py      # Text processing utilities
├── config/                 # Configuration modules
├── requirements.txt        # Python dependencies
└── .env                   # Environment variables
```

## Key Architectural Decisions

### Frontend Architecture
- **Expo Router**: File-based routing system for React Native
- **Context Pattern**: Global state management without external libraries
- **Service Layer**: Abstraction layer for API calls
- **Component Composition**: Reusable components with consistent theming

### Backend Architecture  
- **Monolithic Design**: Single server.py file with all endpoints (current)
- **Gradual Modularization**: Services extracted, routers partially implemented
- **Async/Await**: Consistent async patterns throughout
- **MongoDB Integration**: Motor async driver for database operations

### Data Flow
1. **Frontend → Backend**: HTTP requests via Axios
2. **Backend → Database**: MongoDB operations via Motor
3. **Backend → External APIs**: OpenAI, AWS S3, RSS feeds
4. **Real-time Updates**: Server-Sent Events (SSE) for progress monitoring

## Development Workflow Integration
- **Hot Reload**: Both frontend (Expo) and backend (uvicorn) support hot reload
- **Network Access**: Backend configured for mobile device access (0.0.0.0:8003)
- **Environment Sync**: Consistent environment variables across frontend/backend
- **Logging**: Centralized logging to `logs/` directory