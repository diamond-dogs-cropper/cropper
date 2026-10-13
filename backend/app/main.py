from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import health
from app.errors import register_error_handlers
from app.storage.client import ensure_bucket


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    ensure_bucket()
    yield


app = FastAPI(title="Cropper", lifespan=lifespan)
register_error_handlers(app)
app.include_router(health.router)
