from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.errors import AppError
from app.models import Recipient, Template
from app.schemas.recipient import RecipientIn, RecipientPatch
from app.services import logos, mail


def recipient_link(template: Template, recipient: Recipient) -> str:
    return f"{settings.public_url.rstrip('/')}/t/{template.id}?r={recipient.id}"


def list_for(db: Session, template: Template) -> list[Recipient]:
    query = select(Recipient).where(Recipient.template_id == template.id)
    return list(db.scalars(query.order_by(Recipient.created_at, Recipient.id)))


def get(db: Session, template: Template, recipient_id: str) -> Recipient:
    recipient = db.get(Recipient, recipient_id)
    if recipient is None or recipient.template_id != template.id:
        raise AppError(404, "recipient_not_found", "Компания не найдена в списке")
    return recipient


def find_public(db: Session, template: Template, recipient_id: str | None) -> Recipient | None:
    recipient = db.get(Recipient, recipient_id) if recipient_id else None
    return recipient if recipient and recipient.template_id == template.id else None


def add(db: Session, template: Template, items: list[RecipientIn]) -> list[Recipient]:
    # Одно now() на всю вставку перемешало бы порядок, поэтому время задаём сами с шагом.
    start = datetime.now(UTC)
    added = [
        Recipient(
            template_id=template.id,
            company=item.company,
            email=item.email,
            created_at=start + timedelta(microseconds=index),
        )
        for index, item in enumerate(items)
    ]
    db.add_all(added)
    db.commit()
    return added


def update(db: Session, template: Template, recipient: Recipient, patch: RecipientPatch) -> None:
    changes = patch.model_dump(exclude_unset=True)
    if "logo_id" in changes and changes["logo_id"] is not None:
        logo = logos.get(db, template, changes["logo_id"])
        holder = db.scalar(select(Recipient).where(Recipient.logo_id == logo.id))
        if holder is not None and holder.id != recipient.id:
            holder.logo_id = None
            db.flush()
    for field, value in changes.items():
        setattr(recipient, field, value)
    db.commit()
    db.refresh(recipient)


def delete(db: Session, recipient: Recipient) -> None:
    db.delete(recipient)
    db.commit()


def ensure_open(template: Template) -> None:
    if not template.is_open:
        message = "Сбор закрыт — откройте его, чтобы отправить письма"
        raise AppError(409, "collection_closed", message)


def send_invite(db: Session, template: Template, recipient: Recipient) -> None:
    if not recipient.email:
        raise AppError(422, "no_email", "У компании не указана почта")
    mail.send(mail.build_invite(template, recipient.email, recipient_link(template, recipient)))
    recipient.invited_at = datetime.now(UTC)
    db.commit()


def invite_by_email(db: Session, template: Template, email: str) -> Recipient:
    query = select(Recipient).where(
        Recipient.template_id == template.id, func.lower(Recipient.email) == email.lower()
    )
    recipient = db.scalars(query).first()
    if recipient is None:
        recipient = Recipient(template_id=template.id, email=email)
        db.add(recipient)
        db.flush()
    send_invite(db, template, recipient)
    db.refresh(recipient)
    return recipient


def invite_many(
    db: Session, template: Template, ids: list[str]
) -> tuple[list[Recipient], str | None]:
    sent: list[Recipient] = []
    for recipient_id in dict.fromkeys(ids):
        recipient = get(db, template, recipient_id)
        if not recipient.email:
            continue
        try:
            send_invite(db, template, recipient)
        except AppError as error:
            name = recipient.company or recipient.email
            return sent, f"Не отправлено «{name}»: {error.message}"
        sent.append(recipient)
    return sent, None
