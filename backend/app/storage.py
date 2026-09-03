"""Image storage helpers.

Uploaded images are validated (JPEG/PNG/WebP), size-checked and written under
``UPLOAD_DIR/<owner_id>/`` with a random UUID filename. The client-supplied
filename is never used as a path component (AC-18).
"""

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import settings

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

_ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def save_image(file: UploadFile, owner_id: int) -> str:
    """Persist an uploaded image and return its stored relative path.

    The path returned is relative to ``UPLOAD_DIR`` (e.g. ``3/<uuid>.jpg``) and
    is what the caller persists in the database.
    """
    content_type = file.content_type or ""
    extension = _ALLOWED_CONTENT_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(
            status_code=400,
            detail="Ungültiger Bildtyp. Erlaubt sind JPEG, PNG und WebP.",
        )

    data = file.file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Leere Bilddatei.")
    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Bild zu groß (maximal 5 MB).")

    owner_dir = Path(settings.upload_dir) / str(owner_id)
    owner_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{extension}"
    (owner_dir / filename).write_bytes(data)

    return f"{owner_id}/{filename}"


def delete_image(path: str) -> None:
    """Delete a stored image file, if it exists."""
    if not path:
        return
    try:
        file_path = get_image_path(path)
    except HTTPException:
        return
    try:
        file_path.unlink(missing_ok=True)
    except OSError:
        return


def get_image_path(filename: str) -> Path:
    """Resolve a stored filename to its absolute filesystem path.

    The result is confined to ``UPLOAD_DIR`` so a stored filename can never
    escape the upload directory (path-traversal guard).
    """
    base = Path(settings.upload_dir).resolve()
    candidate = (base / filename).resolve()
    if not candidate.is_relative_to(base):
        raise HTTPException(status_code=404, detail="Bild nicht gefunden.")
    return candidate
