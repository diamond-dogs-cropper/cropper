from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.logo import LogoOut

Mark = Literal["done", "skip"]
CompanyName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]
# Та же простая проверка, что и на фронтенде: строгий EmailStr отклонял бы весь вставленный список
# из-за одного необычного адреса. Несуществующий адрес выяснится при отправке письма.
Email = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$"),
]
MAX_BATCH = 500


class RecipientIn(BaseModel):
    company: CompanyName = ""
    email: Email | None = None


class RecipientsIn(BaseModel):
    items: list[RecipientIn] = Field(min_length=1, max_length=MAX_BATCH)


class RecipientPatch(BaseModel):
    company: CompanyName = ""
    email: Email | None = None
    note: Note = ""
    mark: Mark | None = None
    logo_id: str | None = None


class RecipientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company: str
    email: str | None
    note: str
    mark: Mark | None
    invited_at: datetime | None
    created_at: datetime
    logo: LogoOut | None


class InviteBatchIn(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=MAX_BATCH)


class InviteBatchOut(BaseModel):
    recipients: list[RecipientOut]
    error: str | None
