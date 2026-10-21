from typing import Annotated

from fastapi import APIRouter, Cookie, Response

from app.api.deps import SESSION_COOKIE, CurrentUser, DbSession
from app.config import settings
from app.schemas.auth import Credentials, UserOut
from app.services import auth

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(body: Credentials, db: DbSession, response: Response) -> UserOut:
    user = auth.register(db, body.email, body.password)
    set_session_cookie(response, auth.start_session(db, user))
    return UserOut.model_validate(user)


@router.post("/login")
def login(body: Credentials, db: DbSession, response: Response) -> UserOut:
    user = auth.authenticate(db, body.email, body.password)
    set_session_cookie(response, auth.start_session(db, user))
    return UserOut.model_validate(user)


@router.post("/logout", status_code=204)
def logout(
    db: DbSession, response: Response, session: Annotated[str | None, Cookie()] = None
) -> None:
    if session:
        auth.end_session(db, session)
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.get("/me")
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_lifetime_days * 24 * 60 * 60,
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.session_cookie_secure,
    )
