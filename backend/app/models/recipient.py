from __future__ import annotations

import secrets
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.logo import Logo


def new_recipient_id() -> str:
    return secrets.token_urlsafe(12)


class Recipient(Base):
    __tablename__ = "recipients"

    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=new_recipient_id)
    template_id: Mapped[str] = mapped_column(
        ForeignKey("templates.id", ondelete="CASCADE"), index=True
    )
    company: Mapped[str] = mapped_column(String(100), server_default="")
    email: Mapped[str | None] = mapped_column(String(254))
    note: Mapped[str] = mapped_column(String(200), server_default="")
    mark: Mapped[str | None] = mapped_column(String(4))
    invited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    logo_id: Mapped[str | None] = mapped_column(
        ForeignKey("logos.id", ondelete="SET NULL"), unique=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    logo: Mapped[Logo | None] = relationship()
