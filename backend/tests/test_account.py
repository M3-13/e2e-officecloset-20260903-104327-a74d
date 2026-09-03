"""Account deletion tests.

DELETE /api/auth/me must remove the signed-in user together with every record
and image file they own — categories, clothing items, outfits and outfit items —
from both the database and the upload directory.
"""

import os
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

_tmp = tempfile.mkdtemp(prefix="officecloset-account-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "uploads")
os.environ["FRONTEND_ORIGIN"] = "http://localhost:5173"

from app.config import settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Category, ClothingItem, Outfit, OutfitItem, User  # noqa: E402
from app.routers.auth import limiter  # noqa: E402

UPLOAD_DIR = settings.upload_dir
PASSWORD = "supersecret123"
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"fakedata"


@pytest.fixture(autouse=True)
def _reset():
    Base.metadata.create_all(bind=engine)
    limiter.reset()
    with SessionLocal() as db:
        db.execute(delete(OutfitItem))
        db.execute(delete(Outfit))
        db.execute(delete(ClothingItem))
        db.execute(delete(Category))
        db.execute(delete(User))
        db.commit()
    shutil.rmtree(UPLOAD_DIR, ignore_errors=True)
    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _register(client: TestClient, email: str = "alice@example.com") -> dict:
    response = client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    assert response.status_code == 201, response.text
    return response.json()


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _uploaded_files() -> list[Path]:
    return [p for p in Path(UPLOAD_DIR).rglob("*") if p.is_file()]


def test_delete_account_removes_all_data_and_images(client):
    body = _register(client)
    token = body["access_token"]
    user_id = body["user"]["id"]
    headers = _auth(token)

    category = client.post("/api/categories", json={"name": "Kleider"}, headers=headers).json()

    item = client.post(
        "/api/wardrobe",
        data={"name": "Abendkleid", "category_id": str(category["id"])},
        files={"image": ("dress.png", PNG_BYTES, "image/png")},
        headers=headers,
    ).json()

    outfit = client.post(
        "/api/outfits", json={"name": "Gala", "item_ids": [item["id"]]}, headers=headers
    ).json()

    assert len(_uploaded_files()) == 1

    response = client.delete("/api/auth/me", headers=headers)
    assert response.status_code == 204

    # The token is no longer valid: the user row is gone.
    assert client.get("/api/auth/me", headers=headers).status_code == 401

    with SessionLocal() as db:
        assert db.get(User, user_id) is None
        assert db.get(Category, category["id"]) is None
        assert db.get(ClothingItem, item["id"]) is None
        assert db.get(Outfit, outfit["id"]) is None
        assert db.scalars(select(OutfitItem)).all() == []

    assert _uploaded_files() == []


def test_delete_account_requires_auth(client):
    assert client.delete("/api/auth/me").status_code == 401


def test_delete_account_only_removes_own_data(client):
    alice = _register(client, "alice@example.com")
    bob = _register(client, "bob@example.com")
    alice_headers = _auth(alice["access_token"])
    bob_headers = _auth(bob["access_token"])

    client.post(
        "/api/wardrobe",
        data={"name": "Alice Kleid"},
        files={"image": ("a.png", PNG_BYTES, "image/png")},
        headers=alice_headers,
    ).json()
    bob_item = client.post(
        "/api/wardrobe",
        data={"name": "Bob Kleid"},
        files={"image": ("b.png", PNG_BYTES, "image/png")},
        headers=bob_headers,
    ).json()

    assert client.delete("/api/auth/me", headers=alice_headers).status_code == 204

    # Bob's data and image survive Alice's account deletion.
    listed = client.get("/api/wardrobe", headers=bob_headers).json()
    assert [i["id"] for i in listed] == [bob_item["id"]]
    assert len(_uploaded_files()) == 1

    with SessionLocal() as db:
        assert db.get(User, alice["user"]["id"]) is None
        assert db.get(User, bob["user"]["id"]) is not None
        assert db.get(ClothingItem, bob_item["id"]) is not None
