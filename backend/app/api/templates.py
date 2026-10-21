from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.template import CollectionState, TemplateIn, TemplateOut
from app.services import templates

router = APIRouter(prefix="/templates", tags=["templates"])


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
