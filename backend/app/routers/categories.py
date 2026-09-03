"""Category endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Category, ClothingItem, User
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])

_MAX_NAME_LENGTH = 50


def _validate_name(name: str) -> str:
    if len(name) > _MAX_NAME_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"name must be at most {_MAX_NAME_LENGTH} characters",
        )
    return name


def _to_out(category: Category) -> CategoryOut:
    return CategoryOut(id=category.id, name=category.name, item_count=len(category.items))


def _get_own_category(category_id: int, current_user: User, db: Session) -> Category:
    category = db.get(Category, category_id)
    if category is None or category.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.get("", response_model=list[CategoryOut])
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CategoryOut]:
    categories = db.scalars(
        select(Category).where(Category.owner_id == current_user.id).order_by(Category.id)
    ).all()
    return [_to_out(c) for c in categories]


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CategoryOut:
    category = Category(name=_validate_name(payload.name), owner_id=current_user.id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return _to_out(category)


@router.patch("/{id}", response_model=CategoryOut)
def update_category(
    id: int,
    payload: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CategoryOut:
    category = _get_own_category(id, current_user, db)
    category.name = _validate_name(payload.name)
    db.commit()
    db.refresh(category)
    return _to_out(category)


@router.delete("/{id}", status_code=204)
def delete_category(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    category = _get_own_category(id, current_user, db)
    db.execute(
        update(ClothingItem)
        .where(
            ClothingItem.category_id == category.id,
            ClothingItem.owner_id == current_user.id,
        )
        .values(category_id=None)
    )
    db.delete(category)
    db.commit()
