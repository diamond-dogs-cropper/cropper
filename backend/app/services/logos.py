import io
import re
import zipfile

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import AppError
from app.models import Logo, Recipient, Template
from app.services import images, png
from app.storage.client import delete_logo, get_logo, put_logo

MAX_PNG_BYTES = 10 * 1024 * 1024


def save_png(
    db: Session, template: Template, company: str, data: bytes, recipient: Recipient | None
) -> Logo:
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
    if recipient is not None:
        previous = recipient.logo
        recipient.logo = logo
        if previous is not None:
            delete_logo(template.id, previous.id)
            db.delete(previous)
    db.commit()
    return logo


def list_for(db: Session, template: Template) -> list[Logo]:
    query = select(Logo).where(Logo.template_id == template.id)
    return list(db.scalars(query.order_by(Logo.created_at.desc())))


def get(db: Session, template: Template, logo_id: str) -> Logo:
    logo = db.get(Logo, logo_id)
    if logo is None or logo.template_id != template.id:
        raise AppError(404, "logo_not_found", "Логотип не найден")
    return logo


def list_names(db: Session, template: Template) -> dict[str, str]:
    query = select(Recipient.logo_id, Recipient.company).where(
        Recipient.template_id == template.id, Recipient.company != ""
    )
    return {logo_id: company for logo_id, company in db.execute(query).tuples() if logo_id}


def file_name(company: str, template: Template) -> str:
    safe = re.sub(r'[\\/:*?"<>|\x00-\x1f]', "_", company).strip(". ") or "logo"
    return f"{safe}.{template.output_format}"


def read_file(logo: Logo, template: Template) -> bytes:
    data = get_logo(template.id, logo.id)
    return images.convert(data, template.output_format, template.background_color)


def build_archive(db: Session, template: Template) -> bytes:
    # shortcut: архив собирается в памяти, при сотнях логотипов перейти на потоковую выдачу
    archive = io.BytesIO()
    used: set[str] = set()
    names = list_names(db, template)
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_STORED) as output:
        for logo in list_for(db, template):
            name = file_name(names.get(logo.id, logo.company), template)
            stem, extension = name.rsplit(".", 1)
            number = 1
            while name in used:
                number += 1
                name = f"{stem} ({number}).{extension}"
            used.add(name)
            output.writestr(name, read_file(logo, template))
    return archive.getvalue()


def delete(db: Session, template: Template, logo: Logo) -> None:
    delete_logo(template.id, logo.id)
    db.delete(logo)
    db.commit()
