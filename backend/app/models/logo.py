import secrets
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def new_logo_id() -> str:
    return secrets.token_urlsafe(12)


class Logo(Base):
    __tablename__ = "logos"

    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=new_logo_id)
    template_id: Mapped[str] = mapped_column(
        ForeignKey("templates.id", ondelete="CASCADE"), index=True
    )
    company: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
