"""AC-102: local defaults let sign-in over plain http succeed, and the
frontend dev server origin is accepted by CORS."""

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


def test_session_cookie_secure_defaults_to_false() -> None:
    assert settings.SESSION_COOKIE_SECURE is False


def test_default_cors_allows_the_vite_dev_server_origin() -> None:
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_default_cors_allows_the_127_0_0_1_vite_dev_server_origin() -> None:
    response = client.options(
        "/health",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:5173"
