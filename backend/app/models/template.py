import secrets
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func, true
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def new_template_id() -> str:
    return secrets.token_urlsafe(8)


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(String(11), primary_key=True, default=new_template_id)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(500))
    width: Mapped[int]
    height: Mapped[int]
    padding_top: Mapped[int]
    padding_right: Mapped[int]
    padding_bottom: Mapped[int]
    padding_left: Mapped[int]
    background_color: Mapped[str | None] = mapped_column(String(7))
    output_format: Mapped[str] = mapped_column(String(4))
    upload_formats: Mapped[list[str]] = mapped_column(ARRAY(String(4)))
    is_open: Mapped[bool] = mapped_column(server_default=true())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
