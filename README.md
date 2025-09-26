# 🎧 Audion - AI-Powered Audio News Platform

RSS記事やWebコンテンツを高品質な音声コンテンツに変換し、いつでもどこでも「聴く」ことで情報収集を可能にするReact NativeプラットフォームとFastAPIバックエンド。

## 📋 Project Documentation

### **📖 Primary Documentation**
- **[CODEX_PROJECT_OVERVIEW.md](./CODEX_PROJECT_OVERVIEW.md)** - Compact hand-off for Codex (run, endpoints, pitfalls)
- **This README** - Quick start and current architecture

### **📚 Supporting Documentation**
- `docs/BACKEND.md` - Backend env, endpoints, integration notes
- `docs/DEVELOPMENT_GUIDE.md` - Dev practices, testing, debug tips

### **🗂️ Archived Documentation**
Historical/plan documents are consolidated under `docs_archive/` to reduce clutter.

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

### **Frontend (Choose One)**
```bash
# Option 1: Main project frontend (✅ Active)
cd audion-app
npm install
npx expo start
# ✅ 現在のアクティブなフロントエンド（AutoPick統合済み）

# Option 2: (旧) 記述の整理前フロント  
# 現在は `audion-app/` に集約済みのため未使用
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

### **Frontend**
```
audion-app/              # ✅ Active frontend (Expo Router)
├── app/(tabs)/          # Tab screens
├── components/          # 70+ components (AutoPick統合)
├── services/            # API integration (Unified Audio, RSS, Auth)
└── context/             # Auth, RSS, Settings state
```

### **Backend**
```
backend/
├── server.py            # ✅ Main FastAPI server (Unified TTS integrated)
├── services/            # ✅ Unified Audio & TTS processing services
│   ├── tts_service.py      # ✅ NEW: Unified TTS service with XML processing  
│   ├── unified_audio_service.py # Audio generation consolidation
│   └── ai_service.py       # Legacy compatibility layer
├── utils/               # ✅ NEW: Text processing utilities
│   └── text_utils.py       # XML→clean text extraction
├── models/              # Database models (MongoDB)
└── routers/             # API endpoint organization
```

#### CORS / Upload Limits (env)
- `ALLOWED_ORIGINS`: 許可するフロントエンドのオリジン（カンマ区切り）
- `MAX_UPLOAD_SIZE_MB`: POST/PUT/PATCHの最大ボディサイズ（MB, 既定10）

#### Content Rights Policy
- 詳細は `docs/CONTENT_RIGHTS_POLICY.md` を参照（出典明記、要約方針、二次配布禁止 等）

## ✅ Current Features (January 2025)

### **Core Functionality**
- **✅ User Authentication**: JWT-based login/registration system
- **✅ RSS Article Integration**: 6 sources, 65+ articles successfully fetched
- **✅ AutoPick AI Audio Generation**: OpenAI GPT + TTS with real-time progress monitoring
- **✅ Audio Library**: Real API integration with playback controls
- **✅ Search & Discovery**: Advanced fuzzy search with relevance scoring

- **✅ Unified Audio System (Jan 2025)**: 統合されたTTSサービスとXML処理パイプライン
- **✅ Progress Monitoring**: AutoPick進捗監視（React NativeではSSE互換のポーリング方式を採用）
- **✅ Task Manager**: Background audio generation with progress tracking
- **✅ EventSource Compatibility**: react-native-sse integration for React Native
- **✅ Library Integration**: Converted from mock data to real API calls
- **✅ Code Quality Improvement**: sys.path操作排除、クリーン依存関係

## 🎯 Development Status

### **✅ Working & Verified**
- Backend operational at `http://192.168.11.30:8003`
- RSS article fetching from 6 configured sources  
- AutoPick audio generation with progress monitoring
- Authentication system with JWT tokens
- Basic audio playback functionality

### **🚧 In Progress**
- Frontend architecture consolidation (`audion-app/` vs `audion_new_frontend/`)
- Backend modular refactoring (server.py → clean architecture)
- Production deployment preparation

### **📋 Planned**
- Social & community features (user-generated content sharing)
- Freemium monetization system implementation
- Content rights & licensing framework
- Advanced personalization algorithms

## ⚠️ Important Documentation Rules

### **Single Source of Truth**
**All project information should reference [PROJECT_MASTER_PLAN.md](./PROJECT_MASTER_PLAN.md) as the authoritative source.**

### **Update Protocol**
1. **Architecture changes** → Update `PROJECT_MASTER_PLAN.md` first
2. **Feature implementations** → Update status immediately upon completion  
3. **Bug reports** → Reference current architecture in master plan

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

**📅 Last Updated**: January 30, 2025  
**📋 For complete project status**: See [PROJECT_MASTER_PLAN.md](./PROJECT_MASTER_PLAN.md)  
**🤖 AI Development**: See [CLAUDE.md](./CLAUDE.md) for AI collaboration guidelines
