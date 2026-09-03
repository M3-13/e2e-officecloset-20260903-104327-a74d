"""Authentication tests: register, login, me, logout, error and rate-limit cases."""

import os
import tempfile
from datetime import UTC, datetime, timedelta

_tmp = tempfile.mkdtemp(prefix="officecloset-auth-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "uploads")
os.environ["FRONTEND_ORIGIN"] = "http://localhost:5173"

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import delete  # noqa: E402

from app.config import settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.routers.auth import limiter  # noqa: E402

PASSWORD = "supersecret123"


@pytest.fixture(autouse=True)
def _reset_state():
    Base.metadata.create_all(bind=engine)
    limiter.reset()
    with SessionLocal() as db:
        db.execute(delete(User))
        db.commit()
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _register(client: TestClient, email: str = "alice@example.com") -> dict:
    response = client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    assert response.status_code == 201, response.text
    return response.json()


def test_register_returns_token_and_user(client):
    body = _register(client)
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]
    assert body["user"]["email"] == "alice@example.com"
    assert isinstance(body["user"]["id"], int)


def test_register_invalid_email_returns_422(client):
    response = client.post(
        "/api/auth/register", json={"email": "not-an-email", "password": PASSWORD}
    )
    assert response.status_code == 422


def test_register_short_password_returns_422(client):
    response = client.post(
        "/api/auth/register", json={"email": "bob@example.com", "password": "short"}
    )
    assert response.status_code == 422


def test_register_duplicate_email_returns_409(client):
    _register(client)
    response = client.post(
        "/api/auth/register", json={"email": "alice@example.com", "password": PASSWORD}
    )
    assert response.status_code == 409


def test_login_returns_token_and_user(client):
    _register(client)
    response = client.post(
        "/api/auth/login", json={"email": "alice@example.com", "password": PASSWORD}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "alice@example.com"


def test_login_wrong_password_returns_401(client):
    _register(client)
    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_login_unknown_email_returns_401(client):
    response = client.post(
        "/api/auth/login", json={"email": "ghost@example.com", "password": PASSWORD}
    )
    assert response.status_code == 401


def test_me_without_token_returns_401(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_with_invalid_token_returns_401(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_me_returns_current_user(client):
    body = _register(client)
    token = body["access_token"]
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == body["user"]


def test_logout_returns_204(client):
    body = _register(client)
    token = body["access_token"]
    response = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 204


def test_expired_token_returns_401(client):
    body = _register(client)
    user_id = body["user"]["id"]
    expired = jwt.encode(
        {"sub": str(user_id), "exp": datetime.now(UTC) - timedelta(minutes=1)},
        settings.jwt_secret,
        algorithm="HS256",
    )
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert response.status_code == 401


def test_login_rate_limit_returns_429(client):
    for _ in range(5):
        response = client.post(
            "/api/auth/login",
            json={"email": "alice@example.com", "password": "wrong-password"},
        )
        assert response.status_code == 401
    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 429


def test_register_rate_limit_returns_429(client):
    for index in range(5):
        response = client.post(
            "/api/auth/register",
            json={"email": f"user{index}@example.com", "password": PASSWORD},
        )
        assert response.status_code == 201
    response = client.post(
        "/api/auth/register",
        json={"email": "user6@example.com", "password": PASSWORD},
    )
    assert response.status_code == 429
