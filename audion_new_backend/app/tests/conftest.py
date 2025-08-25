"""
Test configuration and shared fixtures
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_database
from app.main import app

# In-memory SQLite for testing with async support
SQLALCHEMY_TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=True,
)

TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


async def override_get_database():
    """Override database dependency for testing"""
    async with TestingSessionLocal() as db:
        yield db


@pytest.fixture(scope="function")
async def client():
    """Test client with in-memory database"""
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Override database dependency
    app.dependency_overrides[get_database] = override_get_database

    with TestClient(app) as test_client:
        yield test_client

    # Clean up
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    app.dependency_overrides.clear()
