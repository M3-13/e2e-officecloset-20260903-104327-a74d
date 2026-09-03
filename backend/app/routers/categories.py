"""Category endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[CategoryOut]:
    raise HTTPException(status_code=501, detail="categories #14 implements this")


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CategoryOut:
    raise HTTPException(status_code=501, detail="categories #14 implements this")


@router.patch("/{id}", response_model=CategoryOut)
def update_category(
    id: int,
    payload: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CategoryOut:
    raise HTTPException(status_code=501, detail="categories #14 implements this")


@router.delete("/{id}", status_code=204)
def delete_category(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    raise HTTPException(status_code=501, detail="categories #14 implements this")
