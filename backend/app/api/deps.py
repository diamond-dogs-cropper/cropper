from typing import Annotated

from fastapi import Cookie, Depends
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.errors import AppError
from app.models import User
from app.services import auth

SESSION_COOKIE = "session"

DbSession = Annotated[Session, Depends(get_session)]


def current_user(
    db: DbSession,
    session: Annotated[str | None, Cookie()] = None,
) -> User:
    user = auth.find_user(db, session) if session else None
    if user is None:
        raise AppError(401, "not_authenticated", "Нужно войти в кабинет")
    return user


CurrentUser = Annotated[User, Depends(current_user)]
