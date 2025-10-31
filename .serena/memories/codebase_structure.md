# Codebase Structure (Updated 2025-10-28)

## Root Directory
```
/
├── backend/                 # FastAPI Python backend
├── audion-app/             # Original React Native app (legacy)
├── audion-app-fresh/       # Current React Native app (maintained)
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

## React Native App Structure (`audion-app-fresh/` - CURRENT)

```
audion-app-fresh/
├── app/
│   ├── (tabs)/                  # Main tab navigation screens
│   │   ├── _layout.tsx          # Tab navigation layout
│   │   ├── index.tsx            # ⭐ Home/Feed screen (48KB, MAIN)
│   │   ├── articles.tsx         # Article detail/selection screen
│   │   ├── discover.tsx         # Discover/explore screen
│   │   └── two.tsx              # Additional tab screen
│   ├── settings/                # Settings pages (app directory)
│   │   ├── index.tsx
│   │   ├── autopick.tsx
│   │   ├── content-playback.tsx
│   │   ├── rss-sources.tsx
│   │   └── schedule.tsx
│   ├── auth/                    # Authentication pages (app directory)
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── trending.tsx             # Trending articles screen
│   ├── personalized.tsx         # Personalized articles screen
│   ├── _layout.tsx              # Root layout
│   ├── modal.tsx                # Modal screen
│   ├── player.tsx               # Audio player screen
│   ├── article-webview.tsx      # Web view for articles
│   ├── dev-test.tsx             # Development testing screen
│   ├── test-api.tsx             # API testing screen
│   └── +not-found.tsx           # 404 handler
│
├── components/                  # Reusable UI components
│   ├── common/
│   │   ├── SectionPlaceholder.tsx    # Loading state skeleton (IMPLEMENTED)
│   │   ├── Icon.tsx
│   │   ├── UnifiedArticleList.tsx
│   │   ├── SectionDivider.tsx
│   │   └── ... (other common components)
│   ├── HeroCarousel.tsx         # Featured articles carousel
│   ├── TrendingCarousel.tsx     # Trending articles carousel
│   ├── PersonalizedGrid.tsx     # Personalized articles grid
│   ├── AudioRecommendationCarousel.tsx # Audio recommendations
│   ├── ArticleCard.tsx          # Article card component
│   ├── CompactCard.tsx
│   ├── BreakingNewsCard.tsx     # Emergency/breaking news card
│   ├── SectionHeader.tsx        # Section header with title
│   ├── UnifiedHeader.tsx
│   ├── SearchModal.tsx
│   ├── ArticleDetailModal.tsx
│   ├── FloatingAutoPickButton.tsx
│   ├── LoadMoreButton.tsx
│   └── ... (other components)
│
├── context/                     # React Context providers
│   ├── AuthContext.tsx          # Authentication state
│   ├── ArticleContext.tsx       # Article selection and read status
│   ├── AutoPickContext.tsx      # Auto-pick task management
│   ├── GlobalAudioContext.tsx   # Global audio playback state
│   ├── SettingsContext.tsx      # User settings
│   └── ... (other contexts)
│
├── hooks/                       # Custom React hooks
│   ├── useCuratedFeed.ts        # Article fetching and filtering
│   ├── useAutoPickProgress.ts
│   └── ... (other hooks)
│
├── services/                    # API and utility services
│   ├── ArticleService.ts        # Article operations
│   ├── AudioService.ts          # Audio generation
│   ├── AutoPickProgressService.ts
│   ├── AudioMetadataService.ts
│   ├── SubscriptionService.ts
│   ├── SettingsSyncService.ts
│   ├── NotificationService.ts
│   └── ... (other services)
│
├── styles/                      # Styling and theme
│   └── commonStyles.ts          # Global colors and spacing (COLORS, SPACING)
│
├── constants/                   # App constants
│   └── ... (theme, defaults)
│
├── types/                       # TypeScript type definitions
│   └── rss.ts                   # RSS feed types
│
├── data/                        # Mock data
│   ├── mock-audio-recommendations.ts
│   └── ... (other mock data)
│
├── utils/                       # Utility functions
│   ├── genreUtils.ts           # Genre filtering and tab generation
│   └── ... (other utils)
│
├── config/                      # Configuration
│   ├── api.ts                  # API endpoints and settings
│   └── uiFlags.ts              # Feature flags
│
├── app.json                     # Expo app configuration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── .env.development             # Development environment variables
└── README.md                    # App documentation
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

## Key Implementation Details

### audion-app-fresh (Current Implementation)
- **Main Screen**: `app/(tabs)/index.tsx` - 48KB file containing:
  - Hero Carousel section (Line 772)
  - Breaking News section (Line 784)
  - Trending Carousel section (Line 839)
  - Audio Recommendations section (Line 862)
  - Personalized Grid section (Line 888)
  - Latest Articles section (Line 911)

- **SectionPlaceholder Integration** (COMPLETED - Commit 6103108):
  - All sections show loading skeletons during data fetch
  - Empty states display when no data available
  - Uses `sectionsLoading` state from `useCuratedFeed()` hook

- **Key State Variables**:
  - `[sectionsLoading, setSectionsLoading]`: Loading state for trending/personalized
  - `[loading]`: From useCuratedFeed hook for main article loading
  - `[audioLoading, setAudioLoading]`: Loading state for audio recommendations

### Legacy audion-app (Not Maintained)
- Kept for reference but no longer the primary development target
- Use `audion-app-fresh` for all new development

## Configuration Files
- **audion-app-fresh/eslint.config.js**: ESLint configuration
- **audion-app-fresh/tsconfig.json**: TypeScript configuration
- **audion-app-fresh/app.json**: Expo app configuration
- **audion-app-fresh/.env.development**: Development environment
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

## Important Notes

1. **Branch Strategy**: All development on `main` branch (unified strategy)
2. **React Router v7**: Uses expo-router for navigation (file-based routing)
3. **Styling**: Uses `commonStyles.ts` with COLORS and SPACING constants
4. **Component Pattern**: All components support TypeScript types
5. **State Management**: React Context + useState for component state
6. **API Integration**: Centralized services layer for API calls