from sqlalchemy.orm import Session

from app.errors import AppError
from app.models import Logo
from app.services import png, templates
from app.storage.client import put_logo

MAX_PNG_BYTES = 10 * 1024 * 1024


def save_png(db: Session, template_id: str, company: str, data: bytes) -> Logo:
    template = templates.get_by_id(db, template_id)
    if not template.is_open:
        raise AppError(409, "collection_closed", "Сбор логотипов по этой ссылке закрыт")

    width, height = png.read_size(data)
    if (width, height) != (template.width, template.height):
        raise AppError(
            422,
            "wrong_size",
            f"Размер плашки должен быть {template.width}×{template.height} px, "
            f"получено {width}×{height} px",
        )

    logo = Logo(template_id=template.id, company=company, size_bytes=len(data))
    db.add(logo)
    db.flush()
    put_logo(template.id, logo.id, data)
    db.commit()
    return logo
