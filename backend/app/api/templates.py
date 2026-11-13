from urllib.parse import quote

from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, DbSession
from app.models import Logo, Template
from app.schemas.logo import LogoOut
from app.schemas.template import CollectionState, TemplateIn, TemplateOut
from app.services import images, logos, templates

router = APIRouter(prefix="/templates", tags=["templates"])


def attachment(data: bytes, media_type: str, name: str) -> Response:
    disposition = f"attachment; filename*=UTF-8''{quote(name)}"
    return Response(data, media_type=media_type, headers={"Content-Disposition": disposition})


def logo_file(logo: Logo, template: Template) -> Response:
    return attachment(
        logos.read_file(logo, template),
        images.MEDIA_TYPES[template.output_format],
        logos.file_name(logo, template),
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
def set_collection(
    template_id: str, body: CollectionState, user: CurrentUser, db: DbSession
) -> TemplateOut:
    template = templates.get_owned(db, user, template_id)
    return TemplateOut.model_validate(templates.set_open(db, template, body.is_open))


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, user: CurrentUser, db: DbSession) -> None:
    templates.delete(db, templates.get_owned(db, user, template_id))


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
    return logo_file(logos.get(db, template, logo_id), template)


@router.delete("/{template_id}/logos/{logo_id}", status_code=204)
def delete_logo(template_id: str, logo_id: str, user: CurrentUser, db: DbSession) -> None:
    template = templates.get_owned(db, user, template_id)
    logos.delete(db, template, logos.get(db, template, logo_id))
