"""Pydantic schemas shared across the API.

The response shapes match the sprint contract character-for-character; the
request shapes mirror the documented bodies.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _serialize_datetime(value: object) -> object:
    if isinstance(value, datetime):
        return value.isoformat()
    return value


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    item_count: int


class ClothingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    image_url: str
    category_id: int | None = None
    description: str | None = None
    color: str | None = None
    created_at: str

    _serialize_created_at = field_validator("created_at", mode="before")(_serialize_datetime)


class OutfitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    items: list[ClothingItemOut]
    created_at: str

    _serialize_created_at = field_validator("created_at", mode="before")(_serialize_datetime)


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1)


class CategoryUpdate(BaseModel):
    name: str = Field(min_length=1)


class OutfitCreate(BaseModel):
    name: str = Field(min_length=1)
    item_ids: list[int]


class OutfitUpdate(BaseModel):
    name: str = Field(min_length=1)
    item_ids: list[int]
