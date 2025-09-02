# 🎧 Audion Project Master Plan 2025
**Single Source of Truth for All Project Information**

---

## 📋 Project Overview

### Application Concept
**Audion** - AI-Powered Audio News & Content Platform  
RSS記事やWebコンテンツを高品質な音声コンテンツに変換し、いつでもどこでも「聴く」ことで情報収集を可能にするプラットフォーム。

### Core Philosophy
1. **シンプルさ優先**: 複雑さを排除し、直感的な操作性を実現
2. **品質重視**: AI生成コンテンツの高品質化と安定性確保
3. **パフォーマンス**: 高速レスポンスと軽量設計
4. **スケーラビリティ**: 将来の機能拡張に対応できる柔軟な設計

---

## 🏗️ Current Architecture Status (January 2025)

### **Frontend Structure - Dual System Configuration**
プロジェクトには現在2つのフロントエンド構造が存在：

#### **1. Main Frontend: `audion-app/`** 
- **Technology**: React Native 0.79.5, Expo 53.0.20
- **Features**: 包括的機能セット（認証、プッシュ通知、スケジューリング、デバッグシステム）
- **Components**: 70+ components, 複雑な状態管理システム
- **Status**: ⚠️ 25+ TODO items, 高度だが未完成機能が多数存在

#### **2. Modified Frontend: `audion_new_frontend/`** 
- **Technology**: React Native 0.79.6, Expo ~53.0.22  
- **Features**: シンプル構造、フォーカスした実装
- **Components**: 40+ components, 統合されたAutoPickプログレス監視
- **Status**: ✅ 最新の開発作業が実装済み、動作確認済み

### **Backend Architecture - Stable & Operational**

#### **Current Backend: `backend/server.py`**
- **Technology**: FastAPI + MongoDB + Motor async driver
- **Status**: ✅ Full operational (192.168.11.30:8003)
- **API Endpoints**: 70+ endpoints, 5,653 lines (リファクタリング対象)
- **Features**: 
  - ✅ JWT認証システム
  - ✅ RSS記事取得・管理 (6ソース、65記事確認済み)
  - ✅ AI音声生成 (OpenAI GPT + OpenAI TTS)
  - ✅ AutoPick進捗監視システム (SSE実装)
  - ✅ プレイリスト・ライブラリ機能

#### **New Backend: `audion_new_backend/`** (Future Architecture)
- **Technology**: FastAPI + PostgreSQL + Clean Architecture
- **Status**: 🚧 設計完了、段階的移行予定
- **Structure**: Modular router system (auth.py, articles.py, audio.py)

### **Database & Storage**
- **Database**: MongoDB (現在) → PostgreSQL (将来)
- **Audio Storage**: Local files + AWS S3 integration
- **Authentication**: JWT Token with 30-day persistence

---

## 🎯 Implementation Status & Roadmap

### **✅ Completed Features (January 2025)**

#### **1. AutoPick Dynamic Progress Monitoring** 
- **Server-Sent Events (SSE)** implementation for real-time progress updates
- **TaskManager service** for background task processing  
- **AutoPickProgressBar** component for UI progress display
- **react-native-sse** integration to solve EventSource compatibility

#### **2. Real RSS Article Integration**
- **65 articles from 6 RSS sources** successfully fetched and displayed
- **Genre/Source filtering** with server-side optimization
- **Real-time article updates** with caching strategy

#### **3. Audio Generation & Playback**
- **OpenAI TTS integration** with tts-1 model (corrected from previous Google TTS reference)
- **Multiple generation modes**: AutoPick, Manual Selection, Instant Multi
- **Background audio processing** with progress tracking

#### **4. User Experience Enhancements**
- **Advanced search system** with fuzzy matching algorithm
- **Hero carousel** with infinite scroll and gradient effects  
- **Library screen** with real API integration (converted from mock data)

#### **5. Development Infrastructure**
- **Environment configuration** with development/production settings
- **Startup scripts** for unified development workflow
- **Comprehensive logging** and error tracking systems

### **🚧 Beta Version Roadmap (Phase 1: Next 3 months)**

#### **Priority 1: Code Consolidation**
**Goal**: 単一の動作するフロントエンドに統合

1. **Frontend Unification Decision**
   - Choose between `audion-app/` vs `audion_new_frontend/`
   - **Recommendation**: Use `audion_new_frontend/` as base, selectively port features from `audion-app/`
   - **Rationale**: Less technical debt, proven working AutoPick implementation

2. **Feature Integration Strategy**
   ```
   Core Features (必須):
   ✅ Authentication system
   ✅ RSS article fetching & display  
   ✅ AutoPick audio generation with progress monitoring
   ✅ Basic audio playback
   ✅ Library/playlist functionality
   
   Optional Features (評価後決定):
   - Advanced settings (50+ configuration options)
   - Complex notification system
   - Subscription tier management
   - Debug menus and developer tools
   ```

#### **Priority 2: Backend Architecture Cleanup**
**Goal**: server.pyの5,653行をクリーンなモジュール構造に分離

1. **Modular Router Implementation**
   - `/api/auth/*` - Authentication endpoints
   - `/api/articles/*` - RSS and article management
   - `/api/audio/*` - Audio generation and playback
   - `/api/user/*` - User profile and preferences

2. **Database Migration Planning**
   - MongoDB → PostgreSQL migration strategy
   - Data preservation and migration scripts
   - Performance optimization

#### **Priority 3: Production Readiness**
1. **Testing & Quality Assurance**
   - Unit test coverage > 80%
   - Integration tests for major workflows
   - Performance benchmarking
   
2. **Deployment Preparation** 
   - App Store & Google Play Store compliance
   - Production environment configuration
   - CI/CD pipeline setup

### **🌟 Full Launch Version (Phase 2: Next 6-12 months)**

#### **Advanced Features (Post-Beta)**
1. **Social & Community Features** ⭐ **必須機能**
   - User-generated content sharing
   - Community-created playlists
   - Following/follower system
   - Content creator attribution

2. **Monetization System**
   - Freemium plan implementation (Free/Basic/Premium tiers)
   - Subscription payment integration (Stripe/RevenueCat)
   - Usage analytics and billing

3. **Content Rights & Secondary Use** ⭐ **必須機能**
   - RSS source licensing compliance
   - Fair use compliance for AI summaries
   - Revenue sharing with content creators
   - Publisher partnership program

4. **Advanced Personalization**
   - Machine learning-based recommendations
   - Behavioral analysis and preference learning
   - Smart content discovery algorithms

---

## 📊 Current Working Configuration

### **Verified Working Components (January 2025)**
```bash
# Backend Status
URL: http://192.168.11.30:8003
Status: ✅ Operational
Authentication: ✅ Working (2003sohei@gmail.com)
RSS Sources: ✅ 6 sources configured
Articles: ✅ 65 articles fetched successfully
Audio Generation: ✅ OpenAI TTS functional
AutoPick Progress: ✅ SSE monitoring working

# Frontend Status (`audion_new_frontend/`)
Authentication: ✅ Login/logout functional
Article Display: ✅ Real RSS data displayed
AutoPick: ✅ Dynamic progress monitoring
Audio Playback: ✅ Basic controls working
Library: ✅ Real API integration complete
```

### **Quick Start Commands**
```bash
# Backend startup
./start-dev-fixed.sh

# Frontend startup (choose one)
cd audion_new_frontend
npx expo start

# OR
cd audion-app  
npx expo start

# Verification
curl http://192.168.11.30:8003/api/articles  # Should return ~65 articles
```

---

## 🚨 Known Issues & Technical Debt

### **Critical Issues Requiring Resolution**
1. **Frontend Architecture Decision**: Choose single frontend architecture  
2. **Backend Refactoring**: 5,653-line server.py requires modular restructuring
3. **Database Migration**: MongoDB → PostgreSQL migration planning
4. **Testing Coverage**: Insufficient automated testing (estimate <30% coverage)

### **Minor Issues**
1. **Documentation Fragmentation**: 18+ markdown files with overlapping/outdated information  
2. **Configuration Complexity**: Multiple environment configurations need consolidation
3. **Code Duplication**: Similar functionality implemented in multiple places

---

## 🎯 Success Metrics & Goals

### **Beta Version Success Criteria**
- **Technical**: Crash rate < 1%, API response < 2s, startup time < 3s
- **User Experience**: Weekly active users > 100, retention rate > 60%
- **Content Quality**: Daily audio generation > 50 episodes, completion rate > 70%

### **Full Launch Success Criteria**
- **Scale**: Daily active users > 10,000
- **Revenue**: Monthly revenue > ¥1,000,000
- **Quality**: App Store rating > 4.5 stars
- **Community**: User-generated content > 30% of total consumption

---

## 📚 Development Guidelines

### **Code Quality Standards**
- **TypeScript strict mode** for all frontend code
- **Python type hints** for all backend code  
- **Unit tests required** for all new features
- **ESLint & Prettier** for code formatting consistency

### **Git Workflow**
- **Feature branches** for all development work
- **Pull request reviews** required for main branch merges
- **Commit message format**: `🚀 Feature: Description` or `🐛 Fix: Description`

### **Architecture Principles**
1. **Single Responsibility**: Each module has one clear purpose
2. **Dependency Injection**: Clean separation of concerns
3. **Error Boundaries**: Comprehensive error handling at all levels
4. **Performance First**: Optimize for mobile device constraints

---

## 📖 Related Documentation

### **Active Documents (Keep)**
- `CLAUDE.md` - Development instructions and AI collaboration guidelines
- `PROJECT_MASTER_PLAN.md` - This document (Single Source of Truth)
- `README.md` - Basic setup and quick start instructions

### **Historical Documents (Archive Candidates)**
- `PROJECT_STATUS.md`, `COMPLETE_PROJECT_STATUS.md` - Superseded by this document
- `AUDION_FEATURE_COMPARISON_AND_TREE.md` - Historical feature analysis  
- `AI_DEVELOPMENT_FRAMEWORK.md` - Development philosophy (partially integrated)
- All files in `.serena/memories/` - Session history and context

---

## 🔄 Update Policy

**This document is the Single Source of Truth for all project information.**

### **Update Responsibility**
- **All major changes** must be reflected in this document first
- **Feature status updates** should be made immediately upon completion
- **Architecture decisions** require documentation before implementation

### **Review Schedule**
- **Weekly**: Update implementation status and current priorities
- **Monthly**: Review and adjust roadmap based on progress
- **Quarterly**: Comprehensive architecture and strategy review

---

## 📞 Quick Reference

### **Key Stakeholders**
- **Product Owner**: Defines requirements and priorities  
- **Technical Lead**: Claude Code (AI assistant for implementation)
- **Quality Assurance**: Gemini MCP (AI assistant for validation)

### **Emergency Contacts**
- **Backend Issues**: Check `./start-dev-fixed.sh` and server logs in `/logs/`
- **Frontend Issues**: Verify Expo CLI version and Node.js compatibility
- **Database Issues**: Check MongoDB connection and authentication credentials

### **Important File Locations**
```
# Core Configuration
audion_new_frontend/config/api.ts        # API endpoints
backend/server.py                        # Main backend logic
CLAUDE.md                               # AI development guidelines

# Current Development Focus
audion_new_frontend/services/AutoPickProgressService.ts
backend/services/task_manager.py
```

---

**Document Version**: 2025.01.30  
**Last Updated**: January 30, 2025  
**Next Review**: February 6, 2025

---

*This document represents the complete and authoritative status of the Audion project as of January 2025. All other project documentation should be considered historical unless explicitly referenced here.*