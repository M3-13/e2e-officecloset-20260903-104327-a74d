"""Outfit endpoint tests, including user isolation.

Isolation (AC-10) is the core promise here: a user can create, list, update and
delete their own outfits, but never see or touch another user's outfits or
clothing items — not even by guessing ids.
"""

import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="officecloset-outfits-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "uploads")
os.environ["FRONTEND_ORIGIN"] = "http://localhost:5173"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.db import Base, get_db  # noqa: E402
from app.deps import get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.models import ClothingItem, User  # noqa: E402


@pytest.fixture()
def ctx(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client, session_factory
    app.dependency_overrides.clear()
    engine.dispose()


def _authenticate(user: User) -> None:
    app.dependency_overrides[get_current_user] = lambda: user


def _create_user(session, email: str) -> User:
    user = User(email=email, password_hash="x")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _create_item(session, owner: User, name: str) -> ClothingItem:
    item = ClothingItem(name=name, image_path=f"{name}.jpg", owner_id=owner.id)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def test_list_outfits_returns_only_own_outfits(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    bob = _create_user(session, "bob@example.com")
    alice_item = _create_item(session, alice, "alice-shirt")
    bob_item = _create_item(session, bob, "bob-shirt")

    _authenticate(alice)
    own = client.post(
        "/api/outfits", json={"name": "alice outfit", "item_ids": [alice_item.id]}
    ).json()

    _authenticate(bob)
    client.post("/api/outfits", json={"name": "bob outfit", "item_ids": [bob_item.id]})

    _authenticate(alice)
    response = client.get("/api/outfits")
    assert response.status_code == 200
    data = response.json()
    assert [outfit["name"] for outfit in data] == ["alice outfit"]
    assert [outfit["id"] for outfit in data] == [own["id"]]


def test_create_outfit_returns_201_with_items(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    shirt = _create_item(session, alice, "shirt")
    pants = _create_item(session, alice, "pants")

    _authenticate(alice)
    response = client.post(
        "/api/outfits", json={"name": "casual", "item_ids": [shirt.id, pants.id]}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "casual"
    assert [item["id"] for item in data["items"]] == [shirt.id, pants.id]
    assert data["items"][0]["image_url"] == f"/api/wardrobe/{shirt.id}/image"
    assert "created_at" in data


def test_create_outfit_rejects_foreign_item(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    bob = _create_user(session, "bob@example.com")
    bob_item = _create_item(session, bob, "bob-shirt")

    _authenticate(alice)
    response = client.post("/api/outfits", json={"name": "stolen", "item_ids": [bob_item.id]})
    assert response.status_code == 404


def test_create_outfit_rejects_missing_item(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")

    _authenticate(alice)
    response = client.post("/api/outfits", json={"name": "ghost", "item_ids": [9999]})
    assert response.status_code == 404


def test_create_outfit_requires_name_and_item_ids(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")

    _authenticate(alice)
    assert client.post("/api/outfits", json={"name": "no items"}).status_code == 422
    assert client.post("/api/outfits", json={"item_ids": []}).status_code == 422


def test_get_outfit_returns_outfit(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    shirt = _create_item(session, alice, "shirt")

    _authenticate(alice)
    created = client.post("/api/outfits", json={"name": "casual", "item_ids": [shirt.id]}).json()

    response = client.get(f"/api/outfits/{created['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "casual"


def test_get_foreign_outfit_returns_404(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    bob = _create_user(session, "bob@example.com")
    bob_item = _create_item(session, bob, "bob-shirt")

    _authenticate(bob)
    bob_outfit = client.post(
        "/api/outfits", json={"name": "bob outfit", "item_ids": [bob_item.id]}
    ).json()

    _authenticate(alice)
    assert client.get(f"/api/outfits/{bob_outfit['id']}").status_code == 404


def test_update_outfit_replaces_name_and_items(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    shirt = _create_item(session, alice, "shirt")
    pants = _create_item(session, alice, "pants")

    _authenticate(alice)
    created = client.post("/api/outfits", json={"name": "casual", "item_ids": [shirt.id]}).json()

    response = client.patch(
        f"/api/outfits/{created['id']}",
        json={"name": "formal", "item_ids": [pants.id]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "formal"
    assert [item["id"] for item in data["items"]] == [pants.id]


def test_update_foreign_outfit_returns_404(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    bob = _create_user(session, "bob@example.com")
    bob_item = _create_item(session, bob, "bob-shirt")

    _authenticate(bob)
    bob_outfit = client.post(
        "/api/outfits", json={"name": "bob outfit", "item_ids": [bob_item.id]}
    ).json()

    _authenticate(alice)
    response = client.patch(
        f"/api/outfits/{bob_outfit['id']}",
        json={"name": "hijacked", "item_ids": [bob_item.id]},
    )
    assert response.status_code == 404


def test_update_outfit_rejects_foreign_item(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    bob = _create_user(session, "bob@example.com")
    shirt = _create_item(session, alice, "shirt")
    bob_item = _create_item(session, bob, "bob-shirt")

    _authenticate(alice)
    created = client.post("/api/outfits", json={"name": "casual", "item_ids": [shirt.id]}).json()

    response = client.patch(
        f"/api/outfits/{created['id']}",
        json={"name": "stolen", "item_ids": [bob_item.id]},
    )
    assert response.status_code == 404


def test_delete_outfit_returns_204(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    shirt = _create_item(session, alice, "shirt")

    _authenticate(alice)
    created = client.post("/api/outfits", json={"name": "casual", "item_ids": [shirt.id]}).json()

    response = client.delete(f"/api/outfits/{created['id']}")
    assert response.status_code == 204
    assert client.get(f"/api/outfits/{created['id']}").status_code == 404


def test_delete_foreign_outfit_returns_404(ctx):
    client, session_factory = ctx
    session = session_factory()
    alice = _create_user(session, "alice@example.com")
    bob = _create_user(session, "bob@example.com")
    bob_item = _create_item(session, bob, "bob-shirt")

    _authenticate(bob)
    bob_outfit = client.post(
        "/api/outfits", json={"name": "bob outfit", "item_ids": [bob_item.id]}
    ).json()

    _authenticate(alice)
    assert client.delete(f"/api/outfits/{bob_outfit['id']}").status_code == 404
