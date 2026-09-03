"""Image storage helpers.

Stubs with the full, final signatures the rest of the sprint imports. Their
bodies answer 501 until the wardrobe ticket (#1) implements them.
"""

from pathlib import Path

from fastapi import HTTPException, UploadFile


def save_image(file: UploadFile) -> str:
    """Persist an uploaded image and return its stored relative path."""
    raise HTTPException(status_code=501, detail="wardrobe #1 implements this")


def delete_image(path: str) -> None:
    """Delete a stored image file, if it exists."""
    raise HTTPException(status_code=501, detail="wardrobe #1 implements this")


def get_image_path(filename: str) -> Path:
    """Resolve a stored filename to its absolute filesystem path."""
    raise HTTPException(status_code=501, detail="wardrobe #1 implements this")
