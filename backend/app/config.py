"""Application configuration.

All values are read from the environment at import time with a working dev
default where one is legitimate, so a freshly cloned repository boots without
any manual setup. The one secret (JWT_SECRET) is read from the environment and,
when absent, rolled freshly per process so that a signing key never lives in
the repository.
"""

import os
import secrets


def _generate_secret() -> str:
    return secrets.token_hex(32)


class Settings:
    def __init__(self) -> None:
        self.database_url: str = os.environ.get("DATABASE_URL", "sqlite:///./backend/data/app.db")
        self.upload_dir: str = os.environ.get("UPLOAD_DIR", "./backend/uploads")
        self.frontend_origin: str = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
        self.jwt_secret: str = os.environ.get("JWT_SECRET", _generate_secret())
        self.jwt_expires_minutes: int = int(os.environ.get("JWT_EXPIRES_MINUTES", "60"))


settings = Settings()
