from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from pydantic import StringConstraints

from app.api.deps import DbSession
from app.errors import AppError
from app.schemas.logo import LogoOut
from app.schemas.template import TemplateOut
from app.services import logos, templates

router = APIRouter(prefix="/public/templates", tags=["public"])

Company = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


def too_large() -> AppError:
    return AppError(413, "file_too_large", "Файл больше 10 МБ")


async def read_png(request: Request) -> bytes:
    declared = request.headers.get("content-length", "")
    if declared.isdigit() and int(declared) > logos.MAX_PNG_BYTES:
        raise too_large()

    data = bytearray()
    async for chunk in request.stream():
        data += chunk
        if len(data) > logos.MAX_PNG_BYTES:
            raise too_large()
    return bytes(data)


@router.get("/{template_id}")
def get_template(template_id: str, db: DbSession) -> TemplateOut:
    return TemplateOut.model_validate(templates.get_by_id(db, template_id))


@router.post("/{template_id}/logos", status_code=201)
def upload_logo(
    template_id: str,
    company: Annotated[Company, Query()],
    data: Annotated[bytes, Depends(read_png)],
    db: DbSession,
) -> LogoOut:
    return LogoOut.model_validate(logos.save_png(db, template_id, company, data))
