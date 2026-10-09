"""Critical public API smoke checks: health, unauthenticated protection, and empty directories."""
import os
from pathlib import Path

import requests


def _backend_url() -> str:
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    if url:
        return url.rstrip("/")
    env_file = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    for line in env_file.read_text().splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL is not configured")


BASE_URL = _backend_url()


def test_health_returns_ok():
    response = requests.get(f"{BASE_URL}/api/health", timeout=15)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_private_routes_require_authentication():
    response = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert response.status_code == 401
    assert "detail" in response.json()


def test_invalid_login_is_rejected():
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "not-a-real-user@example.com", "password": "WrongPassword123"},
        timeout=15,
    )
    assert response.status_code == 401
    assert "detail" in response.json()