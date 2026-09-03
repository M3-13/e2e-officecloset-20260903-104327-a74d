"""Outfit endpoints.

Outfits group clothing items that belong to the signed-in user. Every read and
write is scoped to ``current_user`` so a user can neither see nor modify another
user's outfits or items (AC-10): a foreign or missing outfit/item answers 404.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import ClothingItem, Outfit, OutfitItem, User
from app.schemas import ClothingItemOut, OutfitCreate, OutfitOut, OutfitUpdate

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


def _image_url(item_id: int) -> str:
    """The public URL a client uses to load an item's image."""
    return f"/api/wardrobe/{item_id}/image"


def _to_outfit_out(outfit: Outfit) -> OutfitOut:
    items = [
        ClothingItemOut(
            id=oi.clothing_item.id,
            name=oi.clothing_item.name,
            image_url=_image_url(oi.clothing_item.id),
            category_id=oi.clothing_item.category_id,
            description=oi.clothing_item.description,
            color=oi.clothing_item.color,
            created_at=oi.clothing_item.created_at,
        )
        for oi in outfit.outfit_items
    ]
    return OutfitOut(
        id=outfit.id,
        name=outfit.name,
        items=items,
        created_at=outfit.created_at,
    )


def _resolve_owned_items(db: Session, user_id: int, item_ids: list[int]) -> list[ClothingItem]:
    """Return the requested items in order, 404ing on any missing or foreign id."""
    unique_ids = list(dict.fromkeys(item_ids))
    if not unique_ids:
        return []
    items = db.scalars(select(ClothingItem).where(ClothingItem.id.in_(unique_ids))).all()
    by_id = {item.id: item for item in items}
    resolved: list[ClothingItem] = []
    for item_id in unique_ids:
        item = by_id.get(item_id)
        if item is None or item.owner_id != user_id:
            raise HTTPException(status_code=404, detail="Clothing item not found")
        resolved.append(item)
    return resolved


def _get_own_outfit(db: Session, outfit_id: int, user_id: int) -> Outfit:
    outfit = db.scalars(select(Outfit).where(Outfit.id == outfit_id)).first()
    if outfit is None or outfit.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Outfit not found")
    return outfit


@router.get("", response_model=list[OutfitOut])
def list_outfits(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[OutfitOut]:
    outfits = db.scalars(
        select(Outfit).where(Outfit.owner_id == current_user.id).order_by(Outfit.id)
    ).all()
    return [_to_outfit_out(outfit) for outfit in outfits]


@router.post("", response_model=OutfitOut, status_code=201)
def create_outfit(
    payload: OutfitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    items = _resolve_owned_items(db, current_user.id, payload.item_ids)
    outfit = Outfit(name=payload.name, owner_id=current_user.id)
    outfit.outfit_items = [OutfitItem(clothing_item=item) for item in items]
    db.add(outfit)
    db.commit()
    db.refresh(outfit)
    return _to_outfit_out(outfit)


@router.get("/{id}", response_model=OutfitOut)
def get_outfit(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    outfit = _get_own_outfit(db, id, current_user.id)
    return _to_outfit_out(outfit)


@router.patch("/{id}", response_model=OutfitOut)
def update_outfit(
    id: int,
    payload: OutfitUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    outfit = _get_own_outfit(db, id, current_user.id)
    items = _resolve_owned_items(db, current_user.id, payload.item_ids)
    outfit.name = payload.name
    outfit.outfit_items = [OutfitItem(clothing_item=item) for item in items]
    db.commit()
    db.refresh(outfit)
    return _to_outfit_out(outfit)


@router.delete("/{id}", status_code=204)
def delete_outfit(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    outfit = _get_own_outfit(db, id, current_user.id)
    db.delete(outfit)
    db.commit()
