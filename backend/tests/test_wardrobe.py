"""Wardrobe (clothing item) endpoint tests."""

import os
import shutil
import tempfile
from pathlib import Path

import pytest

_tmp = tempfile.mkdtemp(prefix="officecloset-wardrobe-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "uploads")

from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.deps import get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.models import ClothingItem, User  # noqa: E402

UPLOAD_DIR = settings.upload_dir

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"fakedata"


def _fake_user(user_id: int) -> User:
    return User(id=user_id, email=f"user{user_id}@example.com", password_hash="unused")


@pytest.fixture(autouse=True)
def _reset():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.query(ClothingItem).delete()
        db.commit()
    finally:
        db.close()
    shutil.rmtree(UPLOAD_DIR, ignore_errors=True)
    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    yield


@pytest.fixture
def make_client():
    def _make(user_id: int = 1) -> TestClient:
        app.dependency_overrides[get_current_user] = lambda: _fake_user(user_id)
        return TestClient(app)

    yield _make
    app.dependency_overrides.clear()


def _post_item(
    client: TestClient,
    name: str = "Abendkleid",
    content: bytes = PNG_BYTES,
    content_type: str = "image/png",
    category_id: int | None = None,
    description: str | None = None,
    color: str | None = None,
):
    data: dict[str, str] = {"name": name}
    if category_id is not None:
        data["category_id"] = str(category_id)
    if description is not None:
        data["description"] = description
    if color is not None:
        data["color"] = color
    files = {"image": ("dress.png", content, content_type)}
    return client.post("/api/wardrobe", data=data, files=files)


def test_create_item_persists_and_returns_out(make_client):
    with make_client(1) as client:
        resp = _post_item(client, name="Abendkleid", color="Rot", description="Lang")
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Abendkleid"
        assert body["color"] == "Rot"
        assert body["description"] == "Lang"
        assert body["category_id"] is None
        assert body["image_url"] == f"/api/wardrobe/{body['id']}/image"
        assert body["created_at"]

        owner_dir = Path(UPLOAD_DIR) / "1"
        files = [p for p in owner_dir.glob("*") if p.is_file()]
        assert len(files) == 1
        assert files[0].read_bytes() == PNG_BYTES
        assert files[0].name != "dress.png"


def test_create_requires_name(make_client):
    with make_client(1) as client:
        resp = client.post(
            "/api/wardrobe",
            files={"image": ("a.png", PNG_BYTES, "image/png")},
        )
        assert resp.status_code == 422


def test_create_requires_image(make_client):
    with make_client(1) as client:
        resp = client.post("/api/wardrobe", data={"name": "Ohne Bild"})
        assert resp.status_code == 422


def test_create_rejects_wrong_type(make_client):
    with make_client(1) as client:
        resp = _post_item(client, name="X", content=b"plain text", content_type="text/plain")
        assert resp.status_code == 400


def test_create_rejects_oversized(make_client):
    with make_client(1) as client:
        big = b"x" * (5 * 1024 * 1024 + 1024)
        resp = _post_item(client, name="X", content=big, content_type="image/png")
        assert resp.status_code == 413
        # AC-15: rejected from the Content-Length check, not after reading the body.
        assert resp.json()["detail"] == "Anfrage zu groß (maximal 5 MB)."


def test_list_filters_and_searches(make_client):
    with make_client(1) as client:
        _post_item(client, name="Rotes Kleid", category_id=1, color="Rot")
        _post_item(client, name="Blaue Jacke", category_id=2, color="Blau")
        _post_item(client, name="Jeans", category_id=1, color="Blau")

        resp = client.get("/api/wardrobe", params={"category_id": 1})
        assert resp.status_code == 200
        assert {i["name"] for i in resp.json()} == {"Rotes Kleid", "Jeans"}

        resp = client.get("/api/wardrobe", params={"q": "jacke"})
        assert [i["name"] for i in resp.json()] == ["Blaue Jacke"]

        resp = client.get("/api/wardrobe", params={"q": "rot"})
        assert [i["name"] for i in resp.json()] == ["Rotes Kleid"]


def test_get_item(make_client):
    with make_client(1) as client:
        item_id = _post_item(client, name="Kleid").json()["id"]
        resp = client.get(f"/api/wardrobe/{item_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Kleid"


def test_patch_updates_fields_and_replaces_image(make_client):
    with make_client(1) as client:
        item_id = _post_item(client, name="Alt", description="d", color="Rot").json()["id"]

        new_bytes = b"\x89PNG\r\n\x1a\n" + b"newdata"
        resp = client.patch(
            f"/api/wardrobe/{item_id}",
            data={"name": "Neu", "color": "Blau"},
            files={"image": ("new.png", new_bytes, "image/png")},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Neu"
        assert body["color"] == "Blau"
        assert body["description"] == "d"

        files = [p for p in Path(UPLOAD_DIR).rglob("*") if p.is_file()]
        assert len(files) == 1
        assert files[0].read_bytes() == new_bytes


def test_patch_text_only(make_client):
    with make_client(1) as client:
        item_id = _post_item(client, name="Alt").json()["id"]
        resp = client.patch(f"/api/wardrobe/{item_id}", data={"name": "Neu"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Neu"


def test_delete_removes_item_and_image(make_client):
    with make_client(1) as client:
        item_id = _post_item(client, name="Zu löschen").json()["id"]
        resp = client.delete(f"/api/wardrobe/{item_id}")
        assert resp.status_code == 204
        assert client.get(f"/api/wardrobe/{item_id}").status_code == 404
        files = [p for p in Path(UPLOAD_DIR).rglob("*") if p.is_file()]
        assert files == []


def test_image_route_owner_only(make_client):
    with make_client(1) as client:
        item_id = _post_item(client, name="Kleid").json()["id"]
        resp = client.get(f"/api/wardrobe/{item_id}/image")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("image/png")
        assert resp.content == PNG_BYTES

    with make_client(2) as client:
        assert client.get(f"/api/wardrobe/{item_id}/image").status_code == 404


def test_isolation_between_users(make_client):
    with make_client(1) as client:
        item_id = _post_item(client, name="Privat").json()["id"]

    with make_client(2) as client:
        assert client.get("/api/wardrobe").json() == []
        assert client.get(f"/api/wardrobe/{item_id}").status_code == 404
        assert client.get(f"/api/wardrobe/{item_id}/image").status_code == 404
        assert client.patch(f"/api/wardrobe/{item_id}", data={"name": "Hacked"}).status_code == 404
        assert client.delete(f"/api/wardrobe/{item_id}").status_code == 404
