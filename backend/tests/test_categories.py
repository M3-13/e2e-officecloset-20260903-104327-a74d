"""Category endpoint tests: CRUD, item_count, validation and cross-user isolation."""

import os
import tempfile
import uuid

import pytest
from fastapi.testclient import TestClient

_tmp = tempfile.mkdtemp(prefix="officecloset-categories-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "uploads")
os.environ["FRONTEND_ORIGIN"] = "http://localhost:5173"

from app.db import SessionLocal  # noqa: E402
from app.deps import get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Category, ClothingItem, User  # noqa: E402


def _unique_email() -> str:
    return f"{uuid.uuid4().hex}@example.com"


def _create_user() -> User:
    with SessionLocal() as db:
        user = User(email=_unique_email(), password_hash="unused")
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


def _create_item(owner_id: int, category_id: int | None, name: str = "dress") -> int:
    with SessionLocal() as db:
        item = ClothingItem(
            name=name,
            image_path=f"uploads/{uuid.uuid4().hex}.jpg",
            category_id=category_id,
            owner_id=owner_id,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item.id


def _as(user: User) -> None:
    app.dependency_overrides[get_current_user] = lambda: user


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_list_categories_empty(client):
    _as(_create_user())
    response = client.get("/api/categories")
    assert response.status_code == 200
    assert response.json() == []


def test_create_and_list_category(client):
    _as(_create_user())
    response = client.post("/api/categories", json={"name": "Sommer"})
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Sommer"
    assert body["item_count"] == 0
    assert isinstance(body["id"], int)

    listed = client.get("/api/categories").json()
    assert [c["name"] for c in listed] == ["Sommer"]


def test_item_count_reflects_items(client):
    user = _create_user()
    _as(user)
    created = client.post("/api/categories", json={"name": "Kleider"}).json()
    _create_item(user.id, created["id"], name="Abendkleid")
    _create_item(user.id, created["id"], name="Cocktailkleid")

    listed = client.get("/api/categories").json()
    assert listed[0]["item_count"] == 2


def test_create_name_validation(client):
    _as(_create_user())
    assert client.post("/api/categories", json={"name": ""}).status_code == 422
    assert client.post("/api/categories", json={"name": "x" * 51}).status_code == 422
    assert client.post("/api/categories", json={"name": "x" * 50}).status_code == 201


def test_update_category(client):
    _as(_create_user())
    created = client.post("/api/categories", json={"name": "Alt"}).json()
    response = client.patch(f"/api/categories/{created['id']}", json={"name": "Neu"})
    assert response.status_code == 200
    assert response.json()["name"] == "Neu"


def test_delete_category_nullifies_items(client):
    user = _create_user()
    _as(user)
    created = client.post("/api/categories", json={"name": "Kleider"}).json()
    category_id = created["id"]
    item_id = _create_item(user.id, category_id, name="Abendkleid")

    response = client.delete(f"/api/categories/{category_id}")
    assert response.status_code == 204

    with SessionLocal() as db:
        item = db.get(ClothingItem, item_id)
        assert item is not None
        assert item.category_id is None
        assert db.get(Category, category_id) is None


def test_nonexistent_category_404(client):
    _as(_create_user())
    assert client.patch("/api/categories/99999", json={"name": "x"}).status_code == 404
    assert client.delete("/api/categories/99999").status_code == 404


def test_isolation_user_b_cannot_access_user_a_category(client):
    user_a = _create_user()
    user_b = _create_user()

    _as(user_a)
    created = client.post("/api/categories", json={"name": "Privat"}).json()
    category_id = created["id"]

    _as(user_b)
    listed = client.get("/api/categories").json()
    assert all(c["id"] != category_id for c in listed)

    assert client.patch(f"/api/categories/{category_id}", json={"name": "Hack"}).status_code == 404
    assert client.delete(f"/api/categories/{category_id}").status_code == 404

    _as(user_a)
    listed = client.get("/api/categories").json()
    assert any(c["id"] == category_id and c["name"] == "Privat" for c in listed)
