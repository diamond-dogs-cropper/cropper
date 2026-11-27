import io
import logging
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from html import escape
from pathlib import Path
from string import Template as HtmlTemplate

from PIL import Image
from sqlalchemy import select

from app.config import settings
from app.db.session import session_factory
from app.errors import AppError
from app.models import Logo, Recipient, Template, User
from app.services import mail
from app.storage.client import get_logo

logger = logging.getLogger(__name__)

HTML_TEMPLATE = HtmlTemplate(
    (Path(__file__).parent / "logo_email.html").read_text(encoding="utf-8")
)
PREVIEW_BOX = (480, 240)
WAITING_SHOWN = 3


def preview_png(data: bytes) -> tuple[bytes, int, int]:
    image = Image.open(io.BytesIO(data))
    image.thumbnail(PREVIEW_BOX)
    result = io.BytesIO()
    image.save(result, "PNG")
    return result.getvalue(), image.width, image.height


def describe_progress(recipients: list[Recipient]) -> tuple[str, bool]:
    counted = [item for item in recipients if item.logo_id or item.mark != "skip"]
    ready = [item for item in counted if item.logo_id or item.mark == "done"]
    waiting = [
        item.company or item.email or "без названия" for item in counted if item not in ready
    ]
    if not counted:
        return "", False

    text = f"Готово {len(ready)} из {len(counted)}"
    if waiting:
        names = ", ".join(waiting[:WAITING_SHOWN])
        rest = len(waiting) - WAITING_SHOWN
        text += f" · ждём: {names}" + (f" и ещё {rest}" if rest > 0 else "")
    else:
        text += " — все логотипы собраны"
    return text, not waiting


def choose_subject(
    template: Template, company: str, is_complete: bool, is_replacement: bool
) -> tuple[str, str]:
    if is_complete:
        return f"Все компании прислали логотипы — {template.name}", "Последний логотип"
    if is_replacement:
        return f"Логотип обновлён: «{company}» — {template.name}", "Логотип обновлён"
    return f"Новый логотип: «{company}» — {template.name}", "Новый логотип"


def build_notice(
    template: Template,
    owner: User,
    company: str,
    data: bytes,
    recipients: list[Recipient],
    is_replacement: bool,
) -> EmailMessage:
    progress, is_complete = describe_progress(recipients)
    subject, kicker = choose_subject(template, company, is_complete, is_replacement)
    link = f"{settings.public_url.rstrip('/')}/templates/{template.id}"
    preview, width, height = preview_png(data)
    image_cid = make_msgid(domain="cropper")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((settings.mail_sender_name, settings.mail_from))
    message["To"] = owner.email
    message.set_content(
        f"{kicker} в шаблоне «{template.name}»: {company}.\n"
        + (f"{progress}.\n" if progress else "")
        + f"\nОткрыть шаблон: {link}\n\nОтключить такие письма можно на странице шаблона."
    )
    progress_html = (
        f'<p style="margin:0 0 24px;font-size:14px;line-height:21px;color:#4a5872;">'
        f"{escape(progress)}</p>"
        if progress
        else ""
    )
    message.add_alternative(
        HTML_TEMPLATE.substitute(
            brand=escape(settings.mail_sender_name),
            subject=escape(subject),
            kicker=kicker,
            company=escape(company),
            name=escape(template.name),
            image_cid=image_cid[1:-1],
            image_width=width,
            image_height=height,
            progress=progress_html,
            link=escape(link),
        ),
        subtype="html",
    )
    html_part = message.get_payload()[1]
    html_part.add_related(preview, "image", "png", cid=image_cid)
    return message


def send_logo_notice(template_id: str, logo_id: str, is_replacement: bool) -> None:
    with session_factory() as db:
        template = db.get(Template, template_id)
        logo = db.get(Logo, logo_id)
        if template is None or logo is None:
            return
        owner = db.get(User, template.owner_id)
        if owner is None:
            return
        recipients = list(
            db.scalars(
                select(Recipient)
                .where(Recipient.template_id == template.id)
                .order_by(Recipient.created_at)
            )
        )
        bound = next((item for item in recipients if item.logo_id == logo.id), None)
        company = (bound.company if bound else "") or logo.company
        data = get_logo(template.id, logo.id)
        message = build_notice(template, owner, company, data, recipients, is_replacement)
    try:
        mail.send(message)
    except AppError as error:
        logger.warning("Logo notice not sent: %s", error.message)
