"""Wardrobe (clothing item) endpoints."""

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import ClothingItem, User
from app.schemas import ClothingItemOut
from app.storage import MAX_IMAGE_SIZE, delete_image, get_image_path, save_image

router = APIRouter(prefix="/api/wardrobe", tags=["wardrobe"])

_MEDIA_BY_SUFFIX: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def _check_content_length(request: Request) -> None:
    """Reject oversized uploads from the declared Content-Length (AC-15).

    This runs as a dependency, so it is resolved before FastAPI parses the
    multipart body — the request body is never read for an oversized upload.
    """
    raw = request.headers.get("content-length")
    if raw is None:
        return
    try:
        length = int(raw)
    except ValueError:
        return
    if length > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Anfrage zu groß (maximal 5 MB).")


def _to_out(item: ClothingItem) -> ClothingItemOut:
    return ClothingItemOut(
        id=item.id,
        name=item.name,
        image_url=f"/api/wardrobe/{item.id}/image",
        category_id=item.category_id,
        description=item.description,
        color=item.color,
        created_at=item.created_at,
    )


def _get_owned_item(item_id: int, user: User, db: Session) -> ClothingItem:
    item = db.get(ClothingItem, item_id)
    if item is None or item.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Kleidungsstück nicht gefunden.")
    return item


@router.get("", response_model=list[ClothingItemOut])
def list_items(
    category_id: int | None = Query(default=None),
    q: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ClothingItemOut]:
    stmt = select(ClothingItem).where(ClothingItem.owner_id == current_user.id)
    if category_id is not None:
        stmt = stmt.where(ClothingItem.category_id == category_id)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                ClothingItem.name.ilike(pattern),
                ClothingItem.description.ilike(pattern),
                ClothingItem.color.ilike(pattern),
            )
        )
    stmt = stmt.order_by(ClothingItem.id)
    items = db.scalars(stmt).all()
    return [_to_out(item) for item in items]


@router.post("", response_model=ClothingItemOut, status_code=201)
def create_item(
    name: str = Form(...),
    image: UploadFile = File(...),
    category_id: int | None = Form(default=None),
    description: str | None = Form(default=None),
    color: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: None = Depends(_check_content_length),
) -> ClothingItemOut:
    clean_name = name.strip()
    if not clean_name:
        raise HTTPException(status_code=422, detail="Name darf nicht leer sein.")

    image_path = save_image(image, current_user.id)

    item = ClothingItem(
        name=clean_name,
        image_path=image_path,
        category_id=category_id,
        description=description,
        color=color,
        owner_id=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.get("/{id}", response_model=ClothingItemOut)
def get_item(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemOut:
    item = _get_owned_item(id, current_user, db)
    return _to_out(item)


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
    _: None = Depends(_check_content_length),
) -> ClothingItemOut:
    item = _get_owned_item(id, current_user, db)

    if name is not None:
        clean_name = name.strip()
        if not clean_name:
            raise HTTPException(status_code=422, detail="Name darf nicht leer sein.")
        item.name = clean_name
    if category_id is not None:
        item.category_id = category_id
    if description is not None:
        item.description = description.strip()
    if color is not None:
        item.color = color.strip()
    if image is not None:
        old_path = item.image_path
        item.image_path = save_image(image, current_user.id)
        delete_image(old_path)

    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.delete("/{id}", status_code=204)
def delete_item(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    item = _get_owned_item(id, current_user, db)
    image_path = item.image_path
    db.delete(item)
    db.commit()
    delete_image(image_path)


@router.get("/{id}/image")
def get_item_image(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    item = _get_owned_item(id, current_user, db)
    path = get_image_path(item.image_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Bild nicht gefunden.")
    media_type = _MEDIA_BY_SUFFIX.get(path.suffix.lower())
    return FileResponse(path, media_type=media_type)
