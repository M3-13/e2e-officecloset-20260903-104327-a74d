"""Wardrobe (clothing item) endpoints."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import ClothingItemOut

router = APIRouter(prefix="/api/wardrobe", tags=["wardrobe"])


@router.get("", response_model=list[ClothingItemOut])
def list_items(
    category_id: int | None = Query(default=None),
    q: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ClothingItemOut]:
    raise HTTPException(status_code=501, detail="wardrobe #1 implements this")


@router.post("", response_model=ClothingItemOut, status_code=201)
def create_item(
    name: str = Form(...),
    image: UploadFile = File(...),
    category_id: int | None = Form(default=None),
    description: str | None = Form(default=None),
    color: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemOut:
    raise HTTPException(status_code=501, detail="wardrobe #1 implements this")


@router.get("/{id}", response_model=ClothingItemOut)
def get_item(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemOut:
    raise HTTPException(status_code=501, detail="wardrobe #1 implements this")


@router.patch("/{id}", response_model=ClothingItemOut)
def update_item(
    id: int,
    name: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
    category_id: int | None = Form(default=None),
    description: str | None = Form(default=None),
    color: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemOut:
    raise HTTPException(status_code=501, detail="wardrobe #1 implements this")


@router.delete("/{id}", status_code=204)
def delete_item(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    raise HTTPException(status_code=501, detail="wardrobe #1 implements this")


@router.get("/{id}/image")
def get_item_image(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    raise HTTPException(status_code=501, detail="wardrobe #1 implements this")
