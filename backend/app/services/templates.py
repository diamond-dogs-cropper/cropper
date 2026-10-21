from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import AppError
from app.models import Template, User
from app.schemas.template import TemplateIn


def create(db: Session, owner: User, data: TemplateIn) -> Template:
    if data.padding_left + data.padding_right >= data.width or (
        data.padding_top + data.padding_bottom >= data.height
    ):
        raise AppError(422, "padding_too_large", "Охранные отступы не должны занимать всю плашку")
    if data.background_color is None and data.output_format == "jpg":
        raise AppError(422, "transparent_jpg", "Прозрачный фон недоступен для формата JPG")
    template = Template(owner_id=owner.id, **data.model_dump())
    template.upload_formats = list(dict.fromkeys(data.upload_formats))
    db.add(template)
    db.commit()
    return template


def list_owned(db: Session, owner: User) -> list[Template]:
    query = select(Template).where(Template.owner_id == owner.id)
    return list(db.scalars(query.order_by(Template.created_at.desc())))


def get_by_id(db: Session, template_id: str) -> Template:
    template = db.get(Template, template_id)
    if template is None:
        raise AppError(404, "template_not_found", "Шаблон не найден")
    return template


def get_owned(db: Session, owner: User, template_id: str) -> Template:
    template = get_by_id(db, template_id)
    if template.owner_id != owner.id:
        raise AppError(404, "template_not_found", "Шаблон не найден")
    return template


def set_open(db: Session, template: Template, is_open: bool) -> Template:
    template.is_open = is_open
    db.commit()
    return template


def delete(db: Session, template: Template) -> None:
    db.delete(template)
    db.commit()
