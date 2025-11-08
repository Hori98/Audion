# 🎧 Audion - AI-Powered Audio News Platform

RSS記事やWebコンテンツを高品質な音声コンテンツに変換し、いつでもどこでも「聴く」ことで情報収集を可能にするReact NativeプラットフォームとFastAPIバックエンド。

## 📋 Project Documentation

### **📖 Primary Documentation**
- **[CODEX_PROJECT_OVERVIEW.md](./CODEX_PROJECT_OVERVIEW.md)** - Compact hand-off for Codex (run, endpoints, pitfalls)
- **This README** - Quick start and current architecture

### **📚 Supporting Documentation**
- **[docs/BACKEND.md](./docs/BACKEND.md)** - Backend env, endpoints, integration notes
- **[docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md)** - Dev practices, testing, debug tips

### **🗂️ Archived Documentation**
Historical/plan documents are consolidated under `docs_archive/` to reduce clutter.

### **📝 Note: Documentation is Based on Actual Implementation**
All documentation reflects the current codebase state. If documentation and code conflict, **the code is correct**.

## 🚀 Quick Start

### **🔄 ターミナル再起動後の開発環境復旧手順**

**プロジェクトルートに移動後、以下を実行：**

```bash
# 1. バックエンドサーバー起動 (自動的にIPアドレス検出・表示)
./start-dev-fixed.sh
# ✅ Backend will start on: http://<YOUR_IP>:8003
# ✅ Virtual environment (venv/) automatically activated
# ✅ Network IP automatically detected and displayed

# 2. 新しいターミナルウィンドウでフロントエンド起動
cd audion-app
npm install  # (初回のみ)
npx expo start
# ✅ Use the IP address displayed by start-dev-fixed.sh
```

### **Backend (Required First)**
```bash
# Start backend server
./start-dev-fixed.sh
# Backend runs on: http://<YOUR_IP>:8003
```

### **Frontend**
```bash
# ✅ Active frontend (Latest implementation with genreUtils)
cd audion-app-fresh
npm install
npx expo start

# ⚠️ Legacy: audion-app/ は旧実装のため使用しないでください
```

### **✅ 動作確認**
```bash
# バックエンドが正常動作しているかチェック
curl http://<表示されたIP>:8003/api/articles
# ✅ Should return ~65 articles from 6 RSS sources

# 新しい統合TTSサービスの動作確認
curl http://<表示されたIP>:8003/api/health
# ✅ Should return {"status": "healthy"}

# 認証システムの確認
curl -X POST http://<表示されたIP>:8003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
# ✅ Should return authentication token
```

## 🏗️ Current Architecture

### **Frontend (Active)**
```
audion-app-fresh/        # ✅ Active frontend (Expo Router + genreUtils)
├── app/
│   ├── (tabs)/          # 4 main tabs
│   │   ├── index.tsx       # ホーム（固定RSSキュレーション）
│   │   ├── articles.tsx    # フィード（ユーザーRSS管理）
│   │   ├── discover.tsx    # ディスカバー（コミュニティ）
│   │   └── two.tsx         # ライブラリ（音声再生）
│   ├── auth/            # Login, Register screens
│   └── settings/        # Settings screens
├── components/          # 38 components (Unified UI)
├── services/            # 13 services (API clients)
├── hooks/               # useCuratedFeed, useUserFeed, etc.
├── utils/               # genreUtils.ts (shared filtering logic)
└── context/             # Auth, Settings, Audio state
```

### **Backend**
```
backend/
├── server.py            # ✅ Main FastAPI server
├── routers/             # 14 API routers
│   ├── articles.py         # Article endpoints (GET /articles/curated)
│   ├── rss.py              # RSS management (user sources)
│   ├── auth.py             # Authentication (JWT)
│   ├── audio_unified.py    # Unified audio generation
│   ├── audio.py            # Legacy audio endpoints
│   ├── user.py             # User profile & settings
│   ├── subscription.py     # Freemium plans
│   ├── archive.py          # Article archiving
│   ├── bookmarks.py        # Bookmarks
│   ├── downloads.py        # Download management
│   ├── albums.py           # Audio playlists
│   ├── notifications.py    # Push notifications
│   ├── onboard.py          # User onboarding
│   └── __init__.py
├── services/            # 16 services
│   ├── rss_service.py      # RSS fetch/cache/parallel
│   ├── article_service.py  # Genre classification
│   ├── auth_service.py     # JWT token management
│   ├── unified_audio_service.py # Audio generation
│   ├── tts_service.py      # Text-to-Speech
│   ├── scheduler_service.py # SchedulePick
│   ├── task_manager.py     # Progress tracking
│   ├── dynamic_prompt_service.py # AI prompts
│   └── ...
├── models/              # MongoDB models
└── utils/               # Text processing utilities
    ├── error_handler.py    # Unified error responses
    └── logging_config.py   # Structured logging
```

#### CORS / Upload Limits (env)
- `ALLOWED_ORIGINS`: 許可するフロントエンドのオリジン（カンマ区切り）
- `MAX_UPLOAD_SIZE_MB`: POST/PUT/PATCHの最大ボディサイズ（MB, 既定10）

#### Content Rights Policy
- 詳細は `docs/CONTENT_RIGHTS_POLICY.md` を参照（出典明記、要約方針、二次配布禁止 等）

## ✅ Current Features (November 2025)

### **Core Functionality**
- **✅ User Authentication**: JWT-based login/registration system
- **✅ RSS Article Integration**:
  - Home: Fixed RSS (curated sources)
  - Feed: User-managed RSS (personal sources)
- **✅ Genre Filtering**: 12 Japanese categories with shared taxonomy
  - `utils/genreUtils.ts` - Centralized filtering logic
  - Dynamic genre tabs based on available content
- **✅ AutoPick AI Audio Generation**: OpenAI GPT + TTS with real-time progress monitoring
- **✅ ManualPick**: Multi-article selection for custom audio
- **✅ SchedulePick**: Scheduled audio generation
- **✅ Audio Library**: Full playback controls with chapter navigation
- **✅ Search & Discovery**: Advanced fuzzy search with relevance scoring
- **✅ Archive System**: Article bookmarking and organization
- **✅ Freemium System**: Subscription plans with usage tracking
- **✅ Progress Monitoring**: AutoPick進捗監視（React NativeではSSE互換のポーリング方式を採用）
- **✅ Task Manager**: Background audio generation with progress tracking
- **✅ Error Handling**: Unified error responses with correlation IDs
- **✅ Structured Logging**: Domain-specific loggers (auth, rss, audio, api, database)

## 🎯 Development Status

### **✅ Working & Verified**
- Backend operational (FastAPI + MongoDB)
- RSS article fetching (Home: fixed sources, Feed: user sources)
- Genre filtering with shared taxonomy (12 categories)
- AutoPick/ManualPick/SchedulePick audio generation
- Authentication system with JWT tokens
- Full audio playback with chapter navigation
- Archive & bookmark system
- Freemium subscription system
- Progress monitoring with SSE-compatible polling
- Unified error handling and structured logging

### **🚧 In Progress**
- UI enhancements (documented in `audion-app-fresh/HOME_UI_ENHANCEMENT_REQUIREMENTS.md`)
- Performance optimization
- Additional audio generation modes

### **📋 Planned**
- Emergency news API integration (Layer 1 RSS)
- Advanced personalization algorithms
- Community features expansion
- Production deployment optimization

## ⚠️ Important Documentation Rules

### **Documentation Policy**
**When documentation and code conflict, the code is always correct.**

### **Primary References**
1. **[CODEX_PROJECT_OVERVIEW.md](./CODEX_PROJECT_OVERVIEW.md)** - Quick handoff guide
2. **[docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md)** - Development practices
3. **This README** - Current architecture and status

### **Historical Context**
Documents in `docs_archive/` are preserved for historical reference but should not be used for current development decisions.

## 🔧 Development Environment

### **Requirements**
- **Backend**: Python 3.13+, MongoDB, OpenAI API key
- **Frontend**: Node.js 18+, Expo CLI, React Native development environment
- **Mobile Testing**: iOS Simulator, Android Emulator, or physical device

### **Environment Variables**
```bash
# Backend (.env)
OPENAI_API_KEY=your_openai_key
MONGO_URL=mongodb_connection_string

# Frontend (expo config)
API_BASE_URL=http://192.168.11.30:8003
```

---

**📅 Last Updated**: November 8, 2025
**📋 Quick Reference**: See [CODEX_PROJECT_OVERVIEW.md](./CODEX_PROJECT_OVERVIEW.md)
**🛠️ Development Guide**: See [docs/DEVELOPMENT_GUIDE.md](./docs/DEVELOPMENT_GUIDE.md)
