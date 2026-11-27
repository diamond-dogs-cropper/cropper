import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from html import escape
from pathlib import Path
from string import Template

from app.config import settings
from app.errors import AppError
from app.models import Template as LogoTemplate

logger = logging.getLogger(__name__)


HTML_TEMPLATE = Template((Path(__file__).parent / "invite_email.html").read_text(encoding="utf-8"))
FORMAT_LABELS = {"png": "PNG", "jpg": "JPG", "webp": "WebP", "svg": "SVG"}
PLATE_BOX = (240, 120)


def plate_preview(template: LogoTemplate) -> dict[str, int]:
    scale = min(PLATE_BOX[0] / template.width, PLATE_BOX[1] / template.height)
    return {
        "plate_width": round(template.width * scale),
        "plate_height": round(template.height * scale),
        "pad_top": round(template.padding_top * scale),
        "pad_right": round(template.padding_right * scale),
        "pad_bottom": round(template.padding_bottom * scale),
        "pad_left": round(template.padding_left * scale),
    }


def build_invite(template: LogoTemplate, recipient: str, link: str) -> EmailMessage:
    subject = f"Загрузите логотип: {template.name}"
    upload_formats = ", ".join(FORMAT_LABELS[item] for item in template.upload_formats)
    description = (
        f'<p style="margin:0 0 24px;padding:12px 14px;border-left:3px solid #5268e8;'
        f'background:#f5f7fc;font-size:14px;line-height:21px;color:#4a5872;">'
        f"{escape(template.description)}</p>"
        if template.description
        else ""
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((settings.mail_sender_name, settings.mail_from))
    message["To"] = recipient
    message.set_content(
        f"Здравствуйте!\n\n"
        f"Вас просят прислать логотип компании для «{template.name}».\n"
        f"Откройте ссылку, загрузите файл, обрежьте и разместите логотип — "
        f"готовый файл сразу уйдёт организатору:\n\n{link}\n\n"
        f"Плашка {template.width} × {template.height} px, готовый файл "
        f"{FORMAT_LABELS[template.output_format]}, можно загрузить {upload_formats}.\n"
        f"Регистрация не нужна."
    )
    message.add_alternative(
        HTML_TEMPLATE.substitute(
            brand=escape(settings.mail_sender_name),
            subject=escape(subject),
            name=escape(template.name),
            description=description,
            link=escape(link),
            width=template.width,
            height=template.height,
            output_format=FORMAT_LABELS[template.output_format],
            upload_formats=upload_formats,
            plate_background=template.background_color or "#ffffff",
            **plate_preview(template),
        ),
        subtype="html",
    )
    return message


def send(message: EmailMessage) -> None:
    if not (settings.mail_username and settings.mail_password and settings.mail_from):
        raise AppError(503, "mail_not_configured", "Отправка писем не настроена")
    context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
    try:
        with smtplib.SMTP_SSL(
            settings.mail_host, settings.mail_port, context=context, timeout=15
        ) as smtp:
            smtp.login(settings.mail_username, settings.mail_password)
            smtp.send_message(message)
    except (smtplib.SMTPException, OSError) as error:
        logger.warning("SMTP error: %s", error)
        detail = "Не удалось отправить письмо, попробуйте позже"
        raise AppError(502, "mail_failed", detail) from error
