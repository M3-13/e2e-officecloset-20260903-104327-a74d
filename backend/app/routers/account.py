"""Account deletion endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import ClothingItem, User
from app.storage import delete_image

router = APIRouter(prefix="/api/auth", tags=["account"])


@router.delete("/me", status_code=204)
def delete_me(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    """Delete the current account and every piece of data it owns.

    The clothing items' image paths are collected first, then the user row is
    deleted — the ORM cascade configured on ``User`` removes the user's
    categories, clothing items, outfits and outfit items in the same
    transaction — and finally the image files are removed from disk.
    """
    image_paths = db.scalars(
        select(ClothingItem.image_path).where(ClothingItem.owner_id == current_user.id)
    ).all()

    db.delete(current_user)
    db.commit()

    for path in image_paths:
        delete_image(path)
