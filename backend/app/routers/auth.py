"""Authentication endpoints (register, login, logout, current user)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import TokenOut, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> TokenOut:
    raise HTTPException(status_code=501, detail="auth #9 implements this")


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenOut:
    raise HTTPException(status_code=501, detail="auth #9 implements this")


@router.post("/logout", status_code=204)
def logout(current_user: User = Depends(get_current_user)) -> None:
    raise HTTPException(status_code=501, detail="auth #9 implements this")


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    raise HTTPException(status_code=501, detail="auth #9 implements this")
