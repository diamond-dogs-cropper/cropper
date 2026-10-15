import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.errors import AppError
from app.models import User, UserSession

password_hasher = PasswordHasher()


def register(db: Session, email: str, password: str) -> User:
    email = email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise AppError(409, "email_taken", "Пользователь с такой почтой уже есть")
    user = User(email=email, password_hash=password_hasher.hash(password))
    db.add(user)
    db.commit()
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None or not password_matches(user.password_hash, password):
        raise AppError(401, "invalid_credentials", "Неверная почта или пароль")
    return user


def password_matches(password_hash: str, password: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def start_session(db: Session, user: User) -> str:
    now = datetime.now(UTC)
    db.execute(delete(UserSession).where(UserSession.expires_at <= now))
    token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(days=settings.session_lifetime_days)
    db.add(UserSession(token_hash=hash_token(token), user_id=user.id, expires_at=expires_at))
    db.commit()
    return token


def end_session(db: Session, token: str) -> None:
    db.execute(delete(UserSession).where(UserSession.token_hash == hash_token(token)))
    db.commit()


def find_user(db: Session, token: str) -> User | None:
    session = db.get(UserSession, hash_token(token))
    if session is None or session.expires_at <= datetime.now(UTC):
        return None
    return session.user


# в базе только хеш: утечка таблицы не даёт рабочих сессий
def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
