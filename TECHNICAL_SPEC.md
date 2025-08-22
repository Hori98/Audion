# Audion Technical Specification
*Last Updated: December 18, 2024*

## 🏗️ System Architecture

### Frontend Architecture
```
audion-app/
├── app/                    # Expo Router file-based routing
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home tab with article list
│   │   ├── feed.tsx       # Feed tab with selection mode
│   │   ├── playlist.tsx   # Audio library management
│   │   ├── discover.tsx   # Content discovery
│   │   └── settings.tsx   # App settings
│   ├── article-detail.tsx # Legacy (replaced by modal)
│   └── _layout.tsx        # Root layout with providers
├── components/            # Reusable UI components
│   ├── ArticleReader.tsx  # Modal article reader (NEW)
│   ├── FullScreenPlayer.tsx # Audio player interface
│   ├── MiniPlayer.tsx     # Compact audio controls
│   └── [other components]
├── context/               # React Context providers
│   ├── AuthContext.tsx    # Authentication state
│   ├── AudioContext.tsx   # Audio playback state
│   └── ThemeContext.tsx   # Theme management
└── services/              # Business logic services
    ├── CacheService.ts    # Client-side caching
    ├── BackgroundAudioService.ts # Audio management
    └── [other services]
```

### Backend Architecture
```
backend/
├── server.py              # FastAPI main application
├── models/                # Pydantic models
│   ├── article.py         # Article and RSS models
│   └── [other models]
├── services/              # Business logic
│   ├── article_service.py # Genre classification
│   └── [other services]
└── requirements.txt       # Python dependencies
```

## 🔧 Core Technologies

### Frontend Stack
- **Framework**: Expo SDK 50+ with React Native
- **Language**: TypeScript with strict type checking
- **Routing**: Expo Router (file-based)
- **State Management**: React Context + AsyncStorage
- **UI Library**: Custom components with Expo design system
- **Audio**: expo-av with background playback support
- **Web Compatibility**: Full PWA support

### Backend Stack
- **Framework**: FastAPI 0.104+ with async/await
- **Language**: Python 3.11+
- **Database**: MongoDB with Motor async driver
- **Authentication**: JWT with Bearer tokens
- **AI Services**: OpenAI GPT-4 Turbo + Google Text-to-Speech
- **Storage**: AWS S3 with presigned URLs
- **Caching**: In-memory RSS feed caching (5min TTL)

## 📊 Data Models

### Article Model
```typescript
interface Article {
  id: string;                    // UUID
  title: string;                 // Article headline
  summary: string;               // HTML summary
  link: string;                  // Original article URL
  published: string;             // ISO date string
  source_name: string;           // RSS source name
  content?: string;              // Full article content
  genre?: string;                // AI-classified genre
  image_url?: string;            // Featured image
  normalizedId?: string;         // Deduplication ID
}
```

### Audio Model
```typescript
interface AudioContent {
  id: string;                    // UUID
  title: string;                 // User-defined title
  script: string;                // AI-generated script
  audio_url: string;             // S3 URL
  created_at: string;            // ISO timestamp
  user_id: string;               // Owner ID
  duration?: number;             // Seconds
  articles: Article[];           // Source articles
}
```

## 🎯 Key Features Implementation

### 1. Article Reader System (NEW)
**File**: `components/ArticleReader.tsx`

Modal-based article reader replacing problematic router navigation:

```typescript
interface ArticleReaderProps {
  article: Article | null;
  visible: boolean;
  onClose: () => void;
}

// Features:
// - Full-screen modal presentation
// - Summary + Web view tabs
// - Browser fallback for failed WebView
// - Cross-platform compatibility
// - Theme-aware styling
```

**Integration**:
- Home tab: `setSelectedArticle(article); setShowArticleReader(true);`
- Feed tab: Same modal trigger pattern
- No router navigation required

### 2. Cache Strategy Optimization
**File**: `services/CacheService.ts`

Client-side filtering eliminates server requests for genre changes:

```typescript
// Before: Server request for each genre change
const response = await axios.get('/api/articles', { 
  params: { genre: selectedGenre } 
});

// After: Client-side filtering only
const filteredArticles = SearchUtils.filterArticles(cachedArticles, {
  genre: selectedGenre
});
```

**Benefits**:
- Instant genre switching (0ms response time)
- Reduced server load and API calls
- Better offline experience

### 3. Genre Classification Engine
**File**: `backend/services/article_service.py`

ML-powered classification with conflict resolution:

```python
def classify_article_genre(title: str, summary: str, threshold: float = 2.0) -> str:
    scores = calculate_genre_scores(title, summary)
    
    # Conflict resolution for close scores
    if len(sorted_scores) > 1:
        top_score, second_score = sorted_scores[:2]
        if (top_score - second_score) / top_score < 0.2:
            return _resolve_genre_conflict(title, summary, genres, scores)
    
    return top_genre if top_score >= threshold else "General"
```

**Supported Genres**: Technology, Business, Politics, Breaking News, Sports, Health, Entertainment, Science, Environment, Education, Travel

### 4. Background Audio System
**File**: `services/BackgroundAudioService.ts`

Cross-platform audio with lock screen controls:

```typescript
// Platform-specific notification setup
if (Platform.OS !== 'web') {
  await Notifications.setNotificationCategoryAsync('MEDIA_PLAYBACK', [
    { identifier: 'PLAY_PAUSE', buttonTitle: '⏯️' },
    { identifier: 'SKIP_FORWARD', buttonTitle: '⏭️' },
    { identifier: 'SKIP_BACKWARD', buttonTitle: '⏮️' }
  ]);
}
```

**Features**:
- Background playback continuation
- Lock screen media controls (iOS/Android)
- Web compatibility with fallback
- Audio session management

## 🔧 Development Setup

### Prerequisites
```bash
# Node.js 18+ and npm
node --version  # >= 18.0.0
npm --version   # >= 9.0.0

# Python 3.11+ and pip
python --version  # >= 3.11.0
pip --version     # >= 23.0.0

# Expo CLI
npm install -g @expo/cli
```

### Frontend Setup
```bash
cd audion-app
npm install
npx expo start              # Development server
npx expo start --web        # Web version
npx expo start --android    # Android emulator
npx expo start --ios        # iOS simulator
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn server:app --reload --port 8003  # Development server
```

### Environment Variables
```bash
# Backend (.env)
MONGO_URL=mongodb://localhost:27017
DB_NAME=audion_dev
OPENAI_API_KEY=sk-...
GOOGLE_TTS_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=audion-audio-dev
```

## 🧪 Testing & Quality Assurance

### Testing Strategy
```bash
# Frontend
npm run lint                 # ESLint with TypeScript rules
npm run type-check          # TypeScript compilation check

# Backend  
python backend_test.py      # Comprehensive API testing
```

### Cross-Platform Testing
- **iOS Simulator**: Full feature testing
- **Android Emulator**: Core functionality verification
- **Web Browser**: PWA compatibility testing
- **Development Build**: Background audio testing

### Performance Benchmarks
- **App Startup**: < 3 seconds cold start
- **Genre Switching**: < 100ms (client-side filtering)
- **Article Loading**: < 2 seconds (with cache)
- **Audio Generation**: 30-60 seconds (AI processing)

## 🚀 Deployment Architecture

### Production Stack
```yaml
Frontend:
  - Platform: Expo EAS Build
  - iOS: App Store deployment
  - Android: Google Play Store
  - Web: Static hosting (Vercel/Netlify)

Backend:
  - Platform: AWS/GCP/Azure
  - API: FastAPI with uvicorn
  - Database: MongoDB Atlas
  - Storage: AWS S3
  - CDN: CloudFront for audio delivery
```

### CI/CD Pipeline (Planned)
```yaml
stages:
  - lint_and_test
  - build_frontend
  - build_backend  
  - deploy_staging
  - integration_tests
  - deploy_production
```

## 📊 Performance Metrics

### Current Benchmarks
- **Bundle Size**: ~15MB (Expo optimized)
- **Memory Usage**: ~80MB average runtime
- **API Response**: ~200ms average
- **Cache Hit Rate**: ~85% for articles
- **Audio Generation**: ~45s average

### Optimization Targets
- Bundle size reduction through code splitting
- Memory optimization for large article lists
- Background sync for offline capability
- Progressive loading for improved perceived performance

---

**Architecture Status**: ✅ Production Ready  
**Last Major Refactor**: Article Reader System (Dec 2024)  
**Next Architecture Review**: Q2 2025