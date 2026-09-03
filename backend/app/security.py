"""Password hashing and JWT helpers."""

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.config import settings


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt and return the stored string."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Return True when ``password`` matches ``hashed_password``."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int) -> str:
    """Create a signed JWT carrying the user id and an expiration time."""
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> int:
    """Decode and verify a JWT, returning the user id it carries.

    Raises ``jwt.InvalidTokenError`` (or a subclass) when the token is missing,
    malformed, has an invalid signature or has expired.
    """
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    sub = payload.get("sub")
    if sub is None:
        raise jwt.InvalidTokenError("token missing subject")
    try:
        return int(sub)
    except (TypeError, ValueError):
        raise jwt.InvalidTokenError("token subject is not a valid user id") from None
