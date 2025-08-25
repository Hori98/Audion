"""
Basic health check tests
Ensures API is properly initialized and responding
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test root health check endpoint"""
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()

    assert data["message"] == "New Audion Backend"
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data


def test_health_endpoint():
    """Test detailed health check endpoint"""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data
    assert "database" in data
    assert "services" in data


def test_api_v1_prefix():
    """Test API v1 prefix is properly configured"""
    # This will be expanded as we add actual v1 endpoints
    # For now, just ensure the app is configured correctly
    assert app.title == "New Audion Backend"
