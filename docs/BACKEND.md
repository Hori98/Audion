# Backend Notes

- Framework: FastAPI (see `backend/server.py`)
- Health: `GET /api/health` → `{ status: ok, database_connected: true }`
- Auth: JWT (Bearer). Required for user RSS endpoints.
- Core endpoints:
  - RSS sources (user-managed):
    - `GET /api/rss-sources`
    - `POST /api/rss-sources` (body: `{ name, url }`)
    - `POST /api/rss-sources/add` (fallback: `{ custom_name, custom_url, is_active? }`)
    - `PUT /api/rss-sources/{id}` (body: `{ is_active }`)
    - `DELETE /api/rss-sources/{id}`
    - Cache: `DELETE /api/rss-sources/cache/clear`
  - Articles (feed): `GET /api/articles` (query: `genre`, `source`)
  - Curated (home): `GET /api/articles/curated` (public)
- ENV (see `.env.example`): `MONGO_URL`, `DB_NAME`, `ALLOWED_ORIGINS`, optional `OPENAI_API_KEY`.
- Genre normalization: `services/article_service.py::normalize_genre()`

