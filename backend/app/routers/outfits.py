"""Outfit endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import OutfitCreate, OutfitOut, OutfitUpdate

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


@router.get("", response_model=list[OutfitOut])
def list_outfits(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[OutfitOut]:
    raise HTTPException(status_code=501, detail="outfits #6 implements this")


@router.post("", response_model=OutfitOut, status_code=201)
def create_outfit(
    payload: OutfitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    raise HTTPException(status_code=501, detail="outfits #6 implements this")


@router.get("/{id}", response_model=OutfitOut)
def get_outfit(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    raise HTTPException(status_code=501, detail="outfits #6 implements this")


@router.patch("/{id}", response_model=OutfitOut)
def update_outfit(
    id: int,
    payload: OutfitUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    raise HTTPException(status_code=501, detail="outfits #6 implements this")


@router.delete("/{id}", status_code=204)
def delete_outfit(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    raise HTTPException(status_code=501, detail="outfits #6 implements this")
