from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.db.session import get_session
from app.errors import AppError
from app.storage.client import client

router = APIRouter()


@router.get("/health")
def health(session: Annotated[Session, Depends(get_session)]) -> dict[str, str]:
    try:
        session.execute(text("select 1"))
    except Exception as exc:
        raise AppError(503, "database_unavailable", "База данных недоступна") from exc
    try:
        client.bucket_exists(settings.minio_bucket)
    except Exception as exc:
        raise AppError(503, "storage_unavailable", "Хранилище файлов недоступно") from exc
    return {"status": "ok"}
