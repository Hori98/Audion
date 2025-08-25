"""
Authentication endpoint tests
Comprehensive test coverage for auth functionality
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def test_user_data():
    """Test user data for registration/login"""
    return {
        "email": "test@example.com",
        "password": "securepassword123",
        "display_name": "Test User",
    }


class TestUserRegistration:
    """Test user registration functionality"""

    def test_register_new_user(self, client: TestClient, test_user_data):
        """Test successful user registration"""
        response = client.post("/api/v1/auth/register", json=test_user_data)

        assert response.status_code == 200
        data = response.json()

        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == test_user_data["email"]
        assert data["user"]["display_name"] == test_user_data["display_name"]
        assert data["message"] == "Registration successful"

    def test_register_duplicate_email(self, client: TestClient, test_user_data):
        """Test registration with existing email"""
        # Register first user
        client.post("/api/v1/auth/register", json=test_user_data)

        # Try to register again with same email
        response = client.post("/api/v1/auth/register", json=test_user_data)

        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_register_invalid_data(self, client: TestClient):
        """Test registration with invalid data"""
        invalid_data = {
            "email": "not-an-email",
            "password": "short",
            "display_name": "",
        }

        response = client.post("/api/v1/auth/register", json=invalid_data)
        assert response.status_code == 422


class TestUserLogin:
    """Test user login functionality"""

    @pytest.fixture(autouse=True)
    def setup_user(self, client: TestClient, test_user_data):
        """Register a user for login tests"""
        client.post("/api/v1/auth/register", json=test_user_data)

    def test_login_valid_credentials(self, client: TestClient, test_user_data):
        """Test login with valid credentials"""
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"],
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 200
        data = response.json()

        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == test_user_data["email"]

    def test_login_invalid_email(self, client: TestClient):
        """Test login with non-existent email"""
        login_data = {"email": "nonexistent@example.com", "password": "anypassword"}

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    def test_login_invalid_password(self, client: TestClient, test_user_data):
        """Test login with wrong password"""
        login_data = {"email": test_user_data["email"], "password": "wrongpassword"}

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]


class TestProtectedEndpoints:
    """Test endpoints requiring authentication"""

    @pytest.fixture
    def authenticated_headers(self, client: TestClient, test_user_data):
        """Get authentication headers for protected endpoints"""
        # Register and login
        client.post("/api/v1/auth/register", json=test_user_data)

        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"],
            },
        )

        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_get_current_user_authenticated(
        self, client: TestClient, authenticated_headers, test_user_data
    ):
        """Test getting current user info with valid token"""
        response = client.get("/api/v1/auth/me", headers=authenticated_headers)

        assert response.status_code == 200
        data = response.json()

        assert data["email"] == test_user_data["email"]
        assert data["display_name"] == test_user_data["display_name"]

    def test_get_current_user_unauthenticated(self, client: TestClient):
        """Test getting current user info without token"""
        response = client.get("/api/v1/auth/me")

        assert response.status_code == 403

    def test_get_current_user_invalid_token(self, client: TestClient):
        """Test getting current user info with invalid token"""
        headers = {"Authorization": "Bearer invalid-token"}
        response = client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401


class TestLogout:
    """Test logout functionality"""

    def test_logout_endpoint(self, client: TestClient):
        """Test logout endpoint (stateless JWT)"""
        response = client.post("/api/v1/auth/logout")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Logout successful"
