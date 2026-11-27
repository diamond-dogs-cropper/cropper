from urllib.parse import quote

from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, DbSession
from app.models import Logo, Template
from app.schemas.invite import InviteIn
from app.schemas.logo import LogoOut
from app.schemas.recipient import (
    InviteBatchIn,
    InviteBatchOut,
    RecipientOut,
    RecipientPatch,
    RecipientsIn,
)
from app.schemas.template import TemplateIn, TemplateOut, TemplatePatch
from app.services import images, logos, recipients, templates

router = APIRouter(prefix="/templates", tags=["templates"])


def attachment(data: bytes, media_type: str, name: str) -> Response:
    disposition = f"attachment; filename*=UTF-8''{quote(name)}"
    return Response(data, media_type=media_type, headers={"Content-Disposition": disposition})


def logo_file(logo: Logo, template: Template, company: str) -> Response:
    return attachment(
        logos.read_file(logo, template),
        images.MEDIA_TYPES[template.output_format],
        logos.file_name(company, template),
    )


@router.post("", status_code=201)
def create_template(body: TemplateIn, user: CurrentUser, db: DbSession) -> TemplateOut:
    return TemplateOut.model_validate(templates.create(db, user, body))


@router.get("")
def list_templates(user: CurrentUser, db: DbSession) -> list[TemplateOut]:
    return [TemplateOut.model_validate(template) for template in templates.list_owned(db, user)]


@router.get("/{template_id}")
def get_template(template_id: str, user: CurrentUser, db: DbSession) -> TemplateOut:
    return TemplateOut.model_validate(templates.get_owned(db, user, template_id))


@router.patch("/{template_id}")
def update_template(
    template_id: str, body: TemplatePatch, user: CurrentUser, db: DbSession
) -> TemplateOut:
    template = templates.get_owned(db, user, template_id)
    return TemplateOut.model_validate(templates.update(db, template, body))


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, user: CurrentUser, db: DbSession) -> None:
    templates.delete(db, templates.get_owned(db, user, template_id))


@router.post("/{template_id}/invites", status_code=201)
def send_invite(template_id: str, body: InviteIn, user: CurrentUser, db: DbSession) -> RecipientOut:
    template = templates.get_owned(db, user, template_id)
    recipients.ensure_open(template)
    return RecipientOut.model_validate(recipients.invite_by_email(db, template, str(body.email)))


@router.get("/{template_id}/recipients")
def list_recipients(template_id: str, user: CurrentUser, db: DbSession) -> list[RecipientOut]:
    template = templates.get_owned(db, user, template_id)
    return [RecipientOut.model_validate(item) for item in recipients.list_for(db, template)]


@router.post("/{template_id}/recipients", status_code=201)
def add_recipients(
    template_id: str, body: RecipientsIn, user: CurrentUser, db: DbSession
) -> list[RecipientOut]:
    template = templates.get_owned(db, user, template_id)
    added = recipients.add(db, template, body.items)
    return [RecipientOut.model_validate(item) for item in added]


@router.post("/{template_id}/recipients/invites")
def invite_recipients(
    template_id: str, body: InviteBatchIn, user: CurrentUser, db: DbSession
) -> InviteBatchOut:
    template = templates.get_owned(db, user, template_id)
    recipients.ensure_open(template)
    sent, error = recipients.invite_many(db, template, body.ids)
    return InviteBatchOut(
        recipients=[RecipientOut.model_validate(item) for item in sent], error=error
    )


@router.patch("/{template_id}/recipients/{recipient_id}")
def update_recipient(
    template_id: str, recipient_id: str, body: RecipientPatch, user: CurrentUser, db: DbSession
) -> RecipientOut:
    template = templates.get_owned(db, user, template_id)
    recipient = recipients.get(db, template, recipient_id)
    recipients.update(db, template, recipient, body)
    return RecipientOut.model_validate(recipient)


@router.delete("/{template_id}/recipients/{recipient_id}", status_code=204)
def delete_recipient(template_id: str, recipient_id: str, user: CurrentUser, db: DbSession) -> None:
    template = templates.get_owned(db, user, template_id)
    recipients.delete(db, recipients.get(db, template, recipient_id))


@router.get("/{template_id}/logos")
def list_logos(template_id: str, user: CurrentUser, db: DbSession) -> list[LogoOut]:
    template = templates.get_owned(db, user, template_id)
    return [LogoOut.model_validate(logo) for logo in logos.list_for(db, template)]


@router.get("/{template_id}/logos/archive")
def download_archive(template_id: str, user: CurrentUser, db: DbSession) -> Response:
    template = templates.get_owned(db, user, template_id)
    return attachment(logos.build_archive(db, template), "application/zip", f"{template.name}.zip")


@router.get("/{template_id}/logos/{logo_id}/file")
def download_logo(template_id: str, logo_id: str, user: CurrentUser, db: DbSession) -> Response:
    template = templates.get_owned(db, user, template_id)
    logo = logos.get(db, template, logo_id)
    return logo_file(logo, template, logos.list_names(db, template).get(logo.id, logo.company))


@router.delete("/{template_id}/logos/{logo_id}", status_code=204)
def delete_logo(template_id: str, logo_id: str, user: CurrentUser, db: DbSession) -> None:
    template = templates.get_owned(db, user, template_id)
    logos.delete(db, template, logos.get(db, template, logo_id))
