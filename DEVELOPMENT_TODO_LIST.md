# Development Todo List for Beta Version

## 🚨 Tier 1: Critical Beta Features (Must-Have - 1-2 weeks)

### 1. **Language Settings Enhancement**
**Current Status**: ⚠️ Partial (UI language exists, voice language missing)

**Tasks:**
- [ ] Extend LanguageContext to include voice/script language settings
- [ ] Add voice language selection to settings screen
- [ ] Update backend TTS integration to support multiple voice languages
- [ ] Test Japanese TTS voice quality and performance
- [ ] Add language-specific prompt templates for script generation
- [ ] Update audio creation API to accept voice language parameter

**Files to modify:**
- `audion-app/context/LanguageContext.tsx`
- `audion-app/app/settings.tsx`
- `backend/server.py` (TTS integration)

**Estimated Time**: 3-4 days

### 2. **Article Archive System**
**Current Status**: ❌ Missing

**Tasks:**
- [ ] Design article archive data structure (MongoDB schema)
- [ ] Add "Save Article" button to article cards in feed
- [ ] Create archived articles screen/tab
- [ ] Implement archive/unarchive API endpoints
- [ ] Add archive status to article filtering system
- [ ] Update article search to include archived articles
- [ ] Add archive sync across devices

**Files to create/modify:**
- New: `audion-app/app/(tabs)/archive.tsx`
- `audion-app/app/(tabs)/feed.tsx`
- `backend/server.py` (new endpoints)
- Database: new `archived_articles` collection

**Estimated Time**: 4-5 days

### 3. **Audio Generation Completion Notifications**
**Current Status**: ❌ Missing

**Tasks:**
- [ ] Implement push notification setup (Expo Notifications)
- [ ] Add notification permission request on app startup
- [ ] Send completion notification when audio generation finishes
- [ ] Add notification settings to settings screen
- [ ] Handle notification tap to navigate to created audio
- [ ] Test notification delivery on iOS/Android

**Files to modify:**
- `audion-app/app/_layout.tsx` (notification setup)
- `audion-app/app/settings.tsx`
- `audion-app/app/(tabs)/feed.tsx` (post-creation notification)
- New: `audion-app/services/NotificationService.ts`

**Estimated Time**: 2-3 days

### 4. **Data Export Functionality (GDPR Compliance)**
**Current Status**: ❌ Missing

**Tasks:**
- [ ] Create user data export API endpoint
- [ ] Export user profile, settings, RSS sources
- [ ] Export article history and interactions
- [ ] Export audio library metadata
- [ ] Generate downloadable JSON/CSV format
- [ ] Add export trigger in settings screen
- [ ] Add export status/progress indicator
- [ ] Email export file to user (optional)

**Files to create/modify:**
- `backend/server.py` (new export endpoint)
- `audion-app/app/settings.tsx`
- New: `backend/data_export.py`

**Estimated Time**: 3-4 days

### 5. **Article Reader Mode**
**Current Status**: ❌ Missing

**Tasks:**
- [ ] Create article reader screen with full content
- [ ] Implement article content fetching/parsing
- [ ] Add reader mode UI with proper typography
- [ ] Add reading progress tracking
- [ ] Navigation between articles in reader mode
- [ ] Mark articles as read when opened in reader mode
- [ ] Add sharing from reader mode

**Files to create/modify:**
- New: `audion-app/app/article-reader.tsx`
- New: `audion-app/services/ArticleContentService.ts`
- `audion-app/app/(tabs)/feed.tsx` (navigation to reader)
- Update navigation structure

**Estimated Time**: 5-6 days

**Total Tier 1 Estimated Time**: 17-22 days

---

## 🔶 Tier 2: Enhanced UX Features (Should-Have - 2-4 weeks)

### 6. **Variable Audio Playback Speed**
**Current Status**: ❌ Missing

**Tasks:**
- [ ] Update AudioContext with speed control state
- [ ] Add speed control UI to audio player
- [ ] Implement native audio speed adjustment (expo-av)
- [ ] Save user's preferred speed setting
- [ ] Add speed control to mini player
- [ ] Test speed adjustment across different audio formats

**Files to modify:**
- `audion-app/context/AudioContext.tsx`
- `audion-app/app/audio-player.tsx`
- Audio player components

**Estimated Time**: 2-3 days

### 7. **Multiple Voice Selection**
**Current Status**: ❌ Missing

**Tasks:**
- [ ] Research available TTS voice options (Google Cloud TTS)
- [ ] Add voice selection to settings
- [ ] Update backend to support multiple voice models
- [ ] Add voice preview functionality
- [ ] Update audio creation to use selected voice
- [ ] Cache voice settings per user

**Files to modify:**
- `audion-app/app/settings.tsx`
- `backend/server.py` (TTS integration)
- User profile schema

**Estimated Time**: 4-5 days

### 8. **RSS Folder Organization**
**Current Status**: ❌ Missing

**Tasks:**
- [ ] Design folder hierarchy data structure
- [ ] Update sources screen with folder management
- [ ] Add drag-and-drop folder organization
- [ ] Update feed filtering to support folders
- [ ] Add folder-based article filtering
- [ ] Sync folder organization across devices

**Files to modify:**
- `audion-app/app/sources.tsx`
- `audion-app/app/(tabs)/feed.tsx`
- `backend/server.py` (sources API)
- Database schema updates

**Estimated Time**: 5-6 days

### 9. **OPML Import/Export**
**Current Status**: ❌ Missing

**Tasks:**
- [ ] Add OPML file picker for import
- [ ] Parse OPML format and extract RSS feeds
- [ ] Bulk RSS source creation from OPML
- [ ] Generate OPML export from user's sources
- [ ] Add import/export UI to sources screen
- [ ] Handle import conflicts/duplicates

**Files to create/modify:**
- New: `audion-app/services/OPMLService.ts`
- `audion-app/app/sources.tsx`
- `backend/server.py` (bulk import endpoint)

**Estimated Time**: 3-4 days

### 10. **Article Search Functionality**
**Current Status**: ❌ Missing

**Tasks:**
- [ ] Add search input to feed screen
- [ ] Implement full-text search in MongoDB
- [ ] Add search filters (date, source, genre)
- [ ] Create search results UI
- [ ] Add search history/suggestions
- [ ] Optimize search performance with indexes

**Files to modify:**
- `audion-app/app/(tabs)/feed.tsx`
- `backend/server.py` (search endpoints)
- Database indexing strategy

**Estimated Time**: 4-5 days

**Total Tier 2 Estimated Time**: 18-23 days

---

## 🔹 Tier 3: Nice-to-Have Features (1-2 months)

### 11. **Article Thumbnail Display**
**Tasks:**
- [ ] Extract thumbnail URLs from RSS feeds
- [ ] Add image caching system
- [ ] Update article card UI with thumbnails
- [ ] Handle missing/broken images gracefully
- [ ] Optimize image loading performance

**Estimated Time**: 3-4 days

### 12. **Social Sharing Integration**
**Tasks:**
- [ ] Add share functionality to articles/audio
- [ ] Integrate with native sharing APIs
- [ ] Create shareable audio snippets
- [ ] Generate social media preview cards
- [ ] Track sharing analytics

**Estimated Time**: 4-5 days

### 13. **Usage Statistics Dashboard**
**Tasks:**
- [ ] Track detailed user activity metrics
- [ ] Create statistics visualization components
- [ ] Add usage insights screen
- [ ] Generate personalized reading reports
- [ ] Add goal tracking features

**Estimated Time**: 5-6 days

### 14. **Feed Health Monitoring**
**Tasks:**
- [ ] Implement RSS feed health checks
- [ ] Add error detection and reporting
- [ ] Notify users of problematic feeds
- [ ] Auto-retry failed feed updates
- [ ] Add feed status indicators

**Estimated Time**: 3-4 days

### 15. **AI-Powered Recommendations**
**Tasks:**
- [ ] Enhance existing auto-pick algorithm
- [ ] Add related article suggestions
- [ ] Implement collaborative filtering
- [ ] Create recommendation API endpoints
- [ ] Add recommendation UI components

**Estimated Time**: 6-8 days

**Total Tier 3 Estimated Time**: 21-27 days

---

## 📊 Development Timeline Summary

| Tier | Features | Estimated Time | Priority |
|------|----------|----------------|----------|
| **Tier 1** | 5 critical features | 17-22 days | Must-Have |
| **Tier 2** | 5 enhanced UX | 18-23 days | Should-Have |
| **Tier 3** | 5 nice-to-have | 21-27 days | Could-Have |
| **Total** | 15 features | 56-72 days | Full Beta |

## 🛠 Implementation Strategy

### Week 1-3: Tier 1 Critical Features
Focus on features that are essential for beta distribution and user privacy compliance.

### Week 4-6: Tier 2 Enhanced UX  
Improve core audio and RSS management experience to differentiate from competitors.

### Week 7-10: Tier 3 Advanced Features
Add sophisticated features for user engagement and long-term retention.

## 📋 Technical Considerations

### **Language Settings Implementation Notes:**
- Need to separate UI language from TTS voice language
- Consider regional variations (en-US, en-GB, ja-JP)
- TTS voice availability varies by platform/service
- May need fallback voice selection

### **Performance Considerations:**
- Article search requires careful database indexing
- Image thumbnail loading needs efficient caching
- Audio speed adjustment should maintain quality
- Large OPML imports need progress indicators

### **Platform-Specific Requirements:**
- iOS notification permissions and setup
- Android notification channels
- File picker implementations differ by platform
- Audio playback speed APIs vary

---

*Last Updated: August 11, 2025*
*Version: 1.0*