from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

MIN_SIDE = 32
MAX_SIDE = 4000

OutputFormat = Literal["png", "jpg", "webp"]
UploadFormat = Literal["svg", "png", "jpg"]


class TemplateIn(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] = ""
    width: int = Field(ge=MIN_SIDE, le=MAX_SIDE)
    height: int = Field(ge=MIN_SIDE, le=MAX_SIDE)
    padding_top: int = Field(ge=0)
    padding_right: int = Field(ge=0)
    padding_bottom: int = Field(ge=0)
    padding_left: int = Field(ge=0)
    background_color: str | None = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    output_format: OutputFormat
    upload_formats: list[UploadFormat] = Field(default=["svg", "png", "jpg"], min_length=1)


class TemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    width: int
    height: int
    padding_top: int
    padding_right: int
    padding_bottom: int
    padding_left: int
    background_color: str | None
    output_format: OutputFormat
    upload_formats: list[UploadFormat]
    is_open: bool
    created_at: datetime


class CollectionState(BaseModel):
    is_open: bool
