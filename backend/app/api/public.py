from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from pydantic import StringConstraints

from app.api.deps import DbSession
from app.errors import AppError
from app.schemas.logo import LogoOut
from app.schemas.template import PublicTemplateOut, RecipientInfo
from app.services import logos, notifications, recipients, templates

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


RecipientToken = Annotated[str | None, Query(alias="r", max_length=32)]


@router.get("/{template_id}")
def get_template(template_id: str, db: DbSession, r: RecipientToken = None) -> PublicTemplateOut:
    template = templates.get_by_id(db, template_id)
    recipient = recipients.find_public(db, template, r)
    info = (
        RecipientInfo(
            company=recipient.company,
            logo_sent_at=recipient.logo.created_at if recipient.logo else None,
        )
        if recipient
        else None
    )
    return PublicTemplateOut.model_validate(template).model_copy(update={"recipient": info})


@router.post("/{template_id}/logos", status_code=201)
def upload_logo(
    template_id: str,
    company: Annotated[Company, Query()],
    data: Annotated[bytes, Depends(read_png)],
    db: DbSession,
    background: BackgroundTasks,
    r: RecipientToken = None,
) -> LogoOut:
    template = templates.get_by_id(db, template_id)
    recipient = recipients.find_public(db, template, r)
    is_replacement = recipient is not None and recipient.logo_id is not None
    logo = logos.save_png(db, template, company, data, recipient)
    if template.notify:
        # Письмо уходит после ответа: получатель не ждёт SMTP, а ошибка почты не ломает загрузку.
        background.add_task(notifications.send_logo_notice, template.id, logo.id, is_replacement)
    return LogoOut.model_validate(logo)
