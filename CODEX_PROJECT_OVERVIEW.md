# Codex Project Overview (Hand-off Guide)

Purpose: Give Codex a compact, MECE, always-fresh picture of this repo so it can act fast without re-reading everything.

## 1) TL;DR
- App = React Native (Expo) frontend + FastAPI backend + MongoDB.
- Use `audion-app-fresh/` as the only active frontend. Ignore `audion-app/`.
- RSS sources split:
  - Home tab: fixed/preset RSS (public, curated endpoints).
  - Feed tab: user-managed RSS (auth required, per-user sources).
- Filters rely on source_name and normalized genres (shared taxonomy, 12 Japanese categories).
- Backend requires JWT. Missing token → many errors look like “Field required”/401/422.
- RSS cache can stale; clear via `DELETE /api/rss-sources/cache/clear` after changes.

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
- Frontend: `audion-app-fresh/`
  - `app/(tabs)/index.tsx` = Home (fixed RSS)
  - `app/(tabs)/articles.tsx` = Feed (user RSS)
  - `components/FeedUI.tsx` = Feed UI (renders props)
  - `hooks/useRSSFeed.ts` / `hooks/useUserFeed.ts` = data/filters
  - `services/*` = API clients
  - `types/rss.ts` = genre taxonomy (12 categories)
- Backend: `backend/`
  - `server.py` = main app
  - `routers/` = endpoints (rss.py, articles.py, auth.py, etc.)
  - `services/rss_service.py` = RSS fetch/merge/cache/parallel
  - `services/article_service.py` = genre classification + normalization

## 5) RSS Management (core flows)
- Home tab (no auth): `GET /api/articles/curated` (+ optional `genre`).
- Feed tab (auth): user-managed RSS via `routers/rss.py`:
  - List: `GET /api/rss-sources`
  - Add: preferred `POST /api/rss-sources` with `{ name, url }`
  - Fallback Add: `POST /api/rss-sources/add` with `{ custom_name, custom_url, is_active? }`
  - Update status: `PUT /api/rss-sources/{id}` with `{ is_active }`
  - Delete: `DELETE /api/rss-sources/{id}`
  - Cache maintenance: `DELETE /api/rss-sources/cache/clear`
- After add/remove/toggle: clear cache and re-fetch sources+articles to avoid stale content.

## 6) Filtering & Taxonomy (feed)
- Source filter uses source_name (not id). Normalize for comparison (trim+lowercase).
- Genre taxonomy (12):
  - すべて / 国内 / 国際 / 政治 / 経済・ビジネス / テクノロジー /
    科学・環境 / 健康・医療 / スポーツ / エンタメ・文化 / ライフスタイル / その他
- Backend normalization:
  - `classify_article_genre()` (coarse) → `normalize_genre()` (UI-aligned categories).
  - “国際・社会” → 政治/国際/国内、 “エンタメ・スポーツ” → スポーツ/エンタメ・文化、 “ライフスタイル” → 健康・医療を抽出、等。
- Feed rendering must use filtered list only (not raw list). We pass `filteredArticles` to `FeedUI`.

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

## 10) Conventions & Do/Don’t
- Do
  - Use `audion-app-fresh/` only.
  - Compare filters by `source_name` (normalized), not `id`.
  - Keep taxonomy in `types/rss.ts`. Prefer a single source of truth.
  - After RSS changes, clear cache and re-fetch.
- Don’t
  - Don’t rely on `audion-app/`.
  - Don’t pass raw `articles` into FeedUI; always use filtered list.
  - Don’t ignore 401/422; most are “auth missing/invalid”.

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

