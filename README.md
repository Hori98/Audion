# 🎧 Audion - AI-Powered Audio News Platform

RSS記事やWebコンテンツを高品質な音声コンテンツに変換し、いつでもどこでも「聴く」ことで情報収集を可能にするReact NativeプラットフォームとFastAPIバックエンド。

## 📋 Project Documentation

### **📖 Primary Documentation**
- **[PROJECT_MASTER_PLAN.md](./PROJECT_MASTER_PLAN.md)** - 📌 **Single Source of Truth for all project information**
- **[CLAUDE.md](./CLAUDE.md)** - AI development guidelines and collaboration instructions  

### **📚 Supporting Documentation**
- `TECHNICAL_SPEC.md` - Technical specifications and API documentation
- `DEVELOPMENT_BEST_PRACTICES.md` - Code quality and development guidelines
- `TESTING_GUIDE.md` - Testing procedures and quality assurance

### **🗂️ Archived Documentation**
Historical documents moved to `docs_archive/` to prevent confusion with current status.

## 🚀 Quick Start

### **Backend (Required First)**
```bash
# Start backend server
./start-dev-fixed.sh
# Backend runs on: http://192.168.11.30:8003
```

### **Frontend (Choose One)**
```bash
# Option 1: Latest development frontend (Recommended)
cd audion_new_frontend
npm install
npx expo start

# Option 2: Main project frontend (More features, some incomplete)  
cd audion-app
npm install
npx expo start
```

### **Verification**
```bash
# Check backend is running
curl http://192.168.11.30:8003/api/articles
# Should return ~65 articles from 6 RSS sources
```

## 🏗️ Current Architecture

### **Frontend Options**
```
audion_new_frontend/     # ✅ Latest development (Recommended)
├── app/(tabs)/          # Main tab screens (articles, library, etc)
├── components/          # 40+ React Native components  
├── services/            # AutoPick progress, API integration
└── context/             # Authentication, AutoPick state management

audion-app/              # 🚧 Feature-rich but complex
├── app/(tabs)/          # Comprehensive tab system
├── components/          # 70+ components with advanced features
├── services/            # Extensive service layer
└── context/             # Complex state management
```

### **Backend**
```
backend/
├── server.py            # ✅ Main FastAPI server (5,653 lines)
├── services/            # AI, RSS, audio processing services  
├── models/              # Database models (MongoDB)
└── routers/             # API endpoint organization
```

## ✅ Current Features (January 2025)

### **Core Functionality**
- **✅ User Authentication**: JWT-based login/registration system
- **✅ RSS Article Integration**: 6 sources, 65+ articles successfully fetched
- **✅ AutoPick AI Audio Generation**: OpenAI GPT + TTS with real-time progress monitoring
- **✅ Audio Library**: Real API integration with playback controls
- **✅ Search & Discovery**: Advanced fuzzy search with relevance scoring

### **Recent Implementations**  
- **✅ Server-Sent Events (SSE)**: Real-time AutoPick progress monitoring
- **✅ Task Manager**: Background audio generation with progress tracking
- **✅ EventSource Compatibility**: react-native-sse integration for React Native
- **✅ Library Integration**: Converted from mock data to real API calls

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