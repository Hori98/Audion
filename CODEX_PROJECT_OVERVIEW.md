# Codex Project Overview (Hand-off Guide)

**Purpose**: Compact, MECE reference for the Audion codebase. Code is always the source of truth.

## 1) TL;DR
- **Stack**: React Native (Expo) frontend + FastAPI backend + MongoDB
- **Active Frontend**: `audion-app-fresh/` only. **Ignore** `audion-app/` (legacy)
- **RSS Architecture**:
  - Home tab: Fixed RSS (curated sources via `/api/articles/curated`)
  - Feed tab: User-managed RSS (auth required, `/api/rss-sources`)
- **Filtering**: `utils/genreUtils.ts` - shared logic for source_name + 12 Japanese genres
- **Auth**: JWT required for most endpoints. Missing token → 401/422/"Field required"
- **Cache**: RSS cache can stale; clear via `DELETE /api/rss-sources/cache/clear`

## 2) How to Run
- Backend (FastAPI): `./start-dev-fixed.sh` (activates venv, sets host/port, logs IP).
  - Health: `GET /api/health` → `{ status: ok, database_connected: true }` expected.
- Frontend (Expo, fresh):
  - `cd audion-app-fresh && npm i && npx expo start`
  - Ensure `EXPO_PUBLIC_API_BASE_URL` points to backend IP (not localhost on device). See `audion-app-fresh/config/api.ts`.

## 3) Environments
- Backend `.env` (see `backend/.env.example`): `MONGO_URL`, `DB_NAME`, `OPENAI_API_KEY`, `ALLOWED_ORIGINS`.
- Frontend env (Expo): `EXPO_PUBLIC_API_BASE_URL`, optional `EXPO_PUBLIC_API_TIMEOUT`.
- Authentication: JWT required for user RSS endpoints. Frontend stores token under `@audion_auth_token`.

## 4) Repo Map (active parts)
- **Frontend**: `audion-app-fresh/`
  - `app/(tabs)/index.tsx` = Home (fixed RSS キュレーション)
  - `app/(tabs)/articles.tsx` = Feed (user RSS管理)
  - `app/(tabs)/discover.tsx` = Discover (コミュニティ)
  - `app/(tabs)/two.tsx` = Library (音声ライブラリ)
  - `components/` = 38 components (ArticleCard, HeroCarousel, FeedUI, etc.)
  - `hooks/useCuratedFeed.ts` = Home用データ取得
  - `hooks/useUserFeed.ts` = Feed用データ取得（ソース/ジャンルフィルタ）
  - `utils/genreUtils.ts` = 共通フィルタリングロジック
  - `services/` = 13 API clients (ArticleService, RSSService, AudioService, etc.)
  - `types/rss.ts` = genre taxonomy (12 categories)
- **Backend**: `backend/`
  - `server.py` = main FastAPI app
  - `routers/` = 14 routers (articles, rss, auth, audio_unified, user, etc.)
  - `services/rss_service.py` = RSS fetch/merge/cache/parallel
  - `services/article_service.py` = genre classification + normalization
  - `services/unified_audio_service.py` = Audio generation (AutoPick/ManualPick/SchedulePick)
  - `utils/error_handler.py` = Unified error responses
  - `utils/logging_config.py` = Structured logging

## 5) RSS Management (core flows)

### Home Tab (Fixed RSS - no auth)
- Endpoint: `GET /api/articles/curated?genre={genre}`
- Returns curated articles from fixed sources (NHK, 朝日新聞, etc.)
- Uses `useCuratedFeed.ts` hook

### Feed Tab (User RSS - auth required)
Managed via `routers/rss.py`:
- **List**: `GET /api/rss-sources`
- **Add**: `POST /api/rss-sources` with `{ name, url }`
- **Fallback Add**: `POST /api/rss-sources/add` with `{ custom_name, custom_url, is_active? }`
- **Update**: `PUT /api/rss-sources/{source_id}` with `{ is_active }`
- **Delete**: `DELETE /api/rss-sources/{source_id}`
- **Cache Clear**: `DELETE /api/rss-sources/cache/clear` (must call after changes)

### Critical Flow
1. Add/Remove/Toggle RSS source
2. Clear cache (`DELETE /api/rss-sources/cache/clear`)
3. Re-fetch sources (`GET /api/rss-sources`)
4. Re-fetch articles (via `useUserFeed.ts`)

## 6) Filtering & Taxonomy

### Genre Taxonomy (12 categories - `types/rss.ts`)
```
すべて / 国内 / 国際 / 政治 / 経済・ビジネス / テクノロジー /
科学・環境 / 健康・医療 / スポーツ / エンタメ・文化 / ライフスタイル / その他
```

### Shared Filtering Logic (`utils/genreUtils.ts`)
- **`getAvailableGenresForHome()`**: Home専用（ソースフィルタなし）
- **`applyGenreFilterForHome()`**: Home専用フィルタリング
- **`getAvailableGenres()`**: Feed用（ソースフィルタ考慮）
- **`applyGenreFilter()`**: Feed用多段階フィルタ（ソース→ジャンル）
- **`normalizeGenre()`**: Backend "General" → "その他" マッピング
- **`generateGenreTabs()`**: UIタブデータ生成

### Backend Normalization
- `classify_article_genre()` → `normalize_genre()`
- Examples: "国際・社会" → 政治/国際/国内, "エンタメ・スポーツ" → スポーツ/エンタメ・文化

### Critical Rule
- **Always** use `filteredArticles` for rendering (not raw `articles`)
- Source filter uses `source_name` (normalized: trim + lowercase)

## 7) Known Pitfalls & Fixes
- “Field required” / 422 on RSS add/update: Usually missing Bearer token or wrong body.
  - Ensure logged in. Token in `@audion_auth_token`. /api/health must show `database_connected:true`.
  - Fallback to `/api/rss-sources/add` if standard add fails.
- Stale articles after add/remove/toggle: Clear cache (`DELETE /api/rss-sources/cache/clear`) then re-fetch.
- Device cannot reach backend: Don’t use `localhost` on device. Use LAN IP; `config/api.ts` already adjusts in dev.
- Filtering mismatch: Always compare by normalized `source_name`. Id/name confusion leads to “filter not working”.

## 8) What Codex Should Do First
- Verify backend health: `GET /api/health` (status ok, db connected).
- Confirm token present (login flow) → Add RSS sources.
- For feed issues: enforce cache clear → fetch sources → fetch articles → apply source_name/genre filters.
- If adding fails: inspect response/json; use fallback add; check auth header.

## 9) Minimal Commands (local)
- Backend: `./start-dev-fixed.sh` (or `cd backend && source ../venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 8003 --reload`)
- Frontend: `cd audion-app-fresh && npm i && npx expo start`
- Health: `curl http://<IP>:8003/api/health`
- Cache clear: `curl -X DELETE http://<IP>:8003/api/rss-sources/cache/clear -H "Authorization: Bearer <TOKEN>"`

## 10) Conventions & Do/Don't

### ✅ Do
- Use **`audion-app-fresh/`** only
- Use `utils/genreUtils.ts` for all filtering logic
- Compare filters by `source_name` (normalized), not `id`
- Keep taxonomy in `types/rss.ts` (single source of truth)
- After RSS changes: clear cache → re-fetch
- Check code when docs conflict (code = truth)

### ❌ Don't
- Don't use `audion-app/` (legacy)
- Don't pass raw `articles` to UI; use `filteredArticles`
- Don't ignore 401/422; check auth token
- Don't trust old docs without verifying code

## 11) Debug Tips
- Log BASE_URL from `config/api.ts` startup.
- Log `selectedSource/selectedGenre` and filtered count in feed hook during debugging.
- Inspect server logs for RSS errors; DB must be connected.

## 12) Future Enhancements (if asked)
- Auto cache-clear on RSS updates (frontend already hooks it; consider server-side hook).
- Share a `utils/genre.ts` for any frontend genre logic.
- Improve classification with Japanese morphological analysis or embeddings as needed.

---
This guide is designed to keep Codex fast and accurate without re-ingesting the entire repo each session.

