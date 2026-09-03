"""Account deletion endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["account"])


@router.delete("/me", status_code=204)
def delete_me(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    raise HTTPException(status_code=501, detail="account #2 implements this")
