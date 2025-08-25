# 🎧 New Audion Backend

Clean rewrite of Audion backend with modern FastAPI architecture.

## 🏗️ Architecture

```
app/
├── api/v1/           # API endpoints (versioned)
├── core/             # Core configuration & utilities
├── models/           # Database models & Pydantic schemas
├── services/         # Business logic layer
├── tests/            # Test suite
└── utils/            # Helper functions
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Poetry
- PostgreSQL 15+
- Redis (for caching)

### Installation
```bash
# Install dependencies
make install

# Copy environment template
cp .env.sample .env
# Edit .env with your configuration

# Run development server
make dev
```

### Quality Gates
```bash
# Run all quality checks (required before commit)
make quality-check

# Individual checks
make lint      # Code linting
make typecheck # Type checking
make test      # Unit tests
```

## 📊 API Documentation

- **Development**: http://localhost:8004/docs (Swagger UI)
- **Alternative**: http://localhost:8004/redoc (ReDoc)

## 🎯 Beta Version Features

Based on `AUDION_FEATURE_COMPARISON_AND_TREE.md`:

1. ✅ **User Authentication** - JWT-based auth system
2. 🔄 **Article Management** - RSS article fetching & display  
3. 🔄 **Audio Generation** - AI summarization + TTS
4. 🔄 **Basic Playlist** - "Listen Later" functionality
5. 🔄 **Settings** - Core user preferences

## 🧪 Testing

```bash
# Run all tests
make test

# Run specific test file
poetry run pytest app/tests/test_main.py -v

# Run with coverage
poetry run pytest --cov=app
```

## 📋 Development Workflow

Following `CLAUDE.md` quality guardrails:

1. **PLAN**: Define goal, scope, and contracts before coding
2. **IMPLEMENT**: Make minimal changes with proper tests
3. **QUALITY CHECK**: Run `make quality-check` 
4. **SUMMARY**: Document changes and impact

## 🔄 Database Migrations

```bash
# Create new migration
make migrate-create name="description_of_changes"

# Apply migrations
make migrate
```

## 🌟 Design Principles

- **Contract-First**: API schemas before implementation
- **Test-Driven**: Tests written alongside features
- **Single Responsibility**: One concern per module/class
- **Clean Architecture**: Clear separation of layers
- **Type Safety**: Full type coverage with mypy