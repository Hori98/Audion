# New Audion Backend - Development Commands
# Consistent with CLAUDE.md quality gates

.PHONY: install dev test lint format typecheck quality-check

install:
	poetry install

dev:
	poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8004

test:
	poetry run pytest app/tests/ -v

lint:
	poetry run ruff check app/

format:
	poetry run ruff format app/

typecheck:
	poetry run mypy app/

quality-check: lint typecheck test
	@echo "✅ All quality checks passed"

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

# Database migrations (when added)
migrate:
	poetry run alembic upgrade head

migrate-create:
	poetry run alembic revision --autogenerate -m "$(name)"