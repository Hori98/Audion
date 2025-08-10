# Codebase Structure

## Root Directory
```
/
├── backend/                 # FastAPI Python backend
├── audion-app/             # React Native mobile app (primary frontend)
├── src/                    # React web app (secondary frontend)
├── backend_test.py         # Comprehensive API test suite
├── CLAUDE.md              # Project instructions for Claude
├── README.md              # Project documentation
├── package.json           # Web frontend dependencies
└── .env.example           # Environment variable template
```

## Backend Structure (`backend/`)
```
backend/
├── server.py              # Main FastAPI application with all endpoints
├── requirements.txt       # Python dependencies
└── server.log            # Application logs
```

### Key Backend Files
- **server.py**: Complete FastAPI application (1500+ lines)
  - Authentication endpoints (`/auth/register`, `/auth/login`)
  - RSS source management (`/sources`)
  - Article fetching (`/articles`)
  - Audio creation and management (`/audio/*`)
  - User profile and interaction tracking
  - AI integration (OpenAI + Google TTS)

## React Native App Structure (`audion-app/`)
```
audion-app/
├── app/
│   ├── (tabs)/            # Main tab navigation screens
│   │   ├── index.tsx      # Home/Feed screen
│   │   ├── feed.tsx       # Article selection screen
│   │   ├── library.tsx    # Audio library screen
│   │   ├── explore.tsx    # Explore/discover screen
│   │   └── _layout.tsx    # Tab navigation layout
│   ├── auth.tsx           # Authentication screen
│   ├── sources.tsx        # RSS source management
│   └── settings.tsx       # App settings
├── components/            # Reusable UI components
├── context/              # React Context providers
│   └── AuthContext.tsx   # Authentication state management
├── hooks/                # Custom React hooks
├── services/             # API and utility services
├── constants/            # App constants and themes
├── types/                # TypeScript type definitions
└── package.json          # Dependencies and scripts
```

## Web App Structure (`src/`)
```
src/
├── components/           # React components
│   ├── AuthScreen.jsx    # Login/register interface
│   ├── FeedScreen.jsx    # Article browsing
│   ├── SourcesScreen.jsx # RSS source management
│   ├── LibraryScreen.jsx # Audio library
│   └── AudioPlayer.jsx  # Audio player component
├── contexts/            # React contexts
│   ├── AuthContext.jsx  # Authentication state
│   └── AudioContext.jsx # Audio player state
└── main.jsx            # App entry point
```

## Configuration Files
- **audion-app/eslint.config.js**: ESLint configuration for React Native
- **audion-app/tsconfig.json**: TypeScript configuration
- **audion-app/app.json**: Expo app configuration
- **tailwind.config.js**: Tailwind CSS configuration (web)
- **vercel.json**: Vercel deployment configuration

## Key Dependencies

### Backend (Python)
- FastAPI, uvicorn (web framework)
- pymongo, motor (MongoDB)
- openai, google-cloud-texttospeech (AI services)
- feedparser (RSS processing)
- pyjwt, passlib (authentication)
- vercel-blob (file storage)

### React Native
- expo (framework)
- @react-navigation/* (navigation)
- axios (HTTP client)
- @react-native-async-storage/async-storage (persistence)
- expo-av (audio playback)
- lucide-react-native (icons)

### Web React
- react, react-dom (framework)
- axios (HTTP client)
- tailwind CSS (styling)
- lucide-react (icons)
- date-fns (date formatting)

## Testing Structure
- **backend_test.py**: Comprehensive integration test suite
  - Tests complete user journey
  - Covers all API endpoints
  - Includes AI pipeline testing
  - Uses dynamic test data generation

## Environment Configuration
- **Backend**: Requires MongoDB, OpenAI API key, Google TTS key
- **Frontend**: Configurable API URL pointing to backend
- **Demo Mode**: Falls back to mock responses when demo API keys are used