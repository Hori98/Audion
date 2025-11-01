# AutoPick Phase A – Short-Term Stabilization

Date: 2025-10-31

This patch delivers a minimal, backward-compatible improvement to AutoPick so
that frontend requests with richer parameters work reliably, and Home tab can
optionally use its candidate pool without server-side RSS fetching.

## What changed

- Added backend genre normalization utility
  - File: `backend/services/genre_mapping_service.py`
  - Purpose: Normalize JP/alias genre labels to canonical keys (e.g., テクノロジー → Technology)

- Extended AutoPick request models to accept richer FE payload
  - Files:
    - `backend/server.py` (inlined `AutoPickRequest`)
    - `backend/models/article.py` (`AutoPickRequest`, `ArticleCandidate`)
  - New optional fields tolerated: `voice_language`, `voice_name`, `prompt_style`,
    `custom_prompt`, `tab_scope`, `source_scope`, `selected_source_ids`, `candidates`

- Home scope can use FE-provided candidates as the article pool
  - Endpoints:
    - `POST /api/auto-pick`
    - `POST /api/auto-pick/create-audio`
  - Behavior: If `tab_scope == 'home'` and `candidates` present, use them; otherwise
    fallback to existing RSS-based fetching (feed scope/default)

- Preferred genres are normalized server-side before selection
  - Ensures FE-provided JP genres correctly influence selection/diversity

## How to test (local)

1) Start backend
```
cd backend
uvicorn server:app --host 0.0.0.0 --port 8005 --reload
```

2) Auto pick with candidates (Home scope)
```
curl -X POST http://localhost:8005/api/auto-pick \
  -H 'Content-Type: application/json' \
  -d '{
    "tab_scope": "home",
    "preferred_genres": ["テクノロジー", "エンタメ"],
    "max_articles": 3,
    "candidates": [
      {"id":"c1","title":"AI breakthrough","summary":"New model","link":"https://ex","source_name":"Demo"},
      {"id":"c2","title":"Market update","summary":"Stocks move","source_name":"Demo"}
    ]
  }'
```

3) One-step create audio via candidates
```
curl -X POST http://localhost:8005/api/auto-pick/create-audio \
  -H 'Content-Type: application/json' \
  -d '{
    "tab_scope": "home",
    "preferred_genres": ["テクノロジー"],
    "max_articles": 2,
    "candidates": [
      {"id":"c1","title":"AI news","summary":"...","source_name":"Demo"},
      {"id":"c2","title":"Robotics","summary":"...","source_name":"Demo"}
    ]
  }'
```

## Notes / Next

- This is Phase A only. Full V2 task API (`/api/v2/audio/autopick` and
  `/api/auto-pick/task-status/{id}`) will be added in the next phase.
- Frontend can continue using the existing synchronous flow; the server now
  tolerates extended request fields and home-candidates.
- Parallel guard: set `MAX_PARALLEL_AUTOPICK` (default 1). Starting a new V2 task
  returns HTTP 429 when the user already has a pending/in_progress task.
- Daily limit: set `DAILY_AUDIO_LIMIT` (default 5). V2 start and save enforce this
  with HTTP 429 when the quota is exceeded.
- Resilience: OpenAI Chat/TTS calls now have lightweight retry (max 2 retries)
  with exponential backoff to mitigate transient failures.
