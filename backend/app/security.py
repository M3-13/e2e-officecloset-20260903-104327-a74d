"""Password hashing and JWT helpers.

These are stubs with the full, final signatures the rest of the sprint imports.
Their bodies answer 501 until the authentication ticket (#9) implements them.
"""

from fastapi import HTTPException


def hash_password(password: str) -> str:
    raise HTTPException(status_code=501, detail="auth #9 implements this")


def verify_password(password: str, hashed_password: str) -> bool:
    raise HTTPException(status_code=501, detail="auth #9 implements this")


def create_access_token(user_id: int) -> str:
    raise HTTPException(status_code=501, detail="auth #9 implements this")


def decode_token(token: str) -> int:
    raise HTTPException(status_code=501, detail="auth #9 implements this")
