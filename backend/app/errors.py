from http import HTTPStatus
from typing import cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message


def error_response(
    status_code: int, code: str, message: str, details: list[dict[str, str]] | None = None
) -> JSONResponse:
    body: dict[str, object] = {"code": code, "message": message}
    if details:
        body["details"] = details
    return JSONResponse(body, status_code=status_code)


# Starlette передаёт обработчику Exception, поэтому сужаем тип внутри.
def handle_app_error(_request: Request, exc: Exception) -> JSONResponse:
    error = cast(AppError, exc)
    return error_response(error.status_code, error.code, error.message)


def handle_http_error(_request: Request, exc: Exception) -> JSONResponse:
    error = cast(HTTPException, exc)
    status = HTTPStatus(error.status_code)
    return error_response(status, status.phrase.lower().replace(" ", "_"), str(error.detail))


def handle_validation_error(_request: Request, exc: Exception) -> JSONResponse:
    details = [
        {"field": ".".join(str(part) for part in error["loc"]), "message": error["msg"]}
        for error in cast(RequestValidationError, exc).errors()
    ]
    return error_response(422, "validation_error", "Некорректные данные запроса", details)


def handle_unexpected_error(_request: Request, _exc: Exception) -> JSONResponse:
    return error_response(500, "internal_error", "Внутренняя ошибка сервера")


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, handle_app_error)
    app.add_exception_handler(HTTPException, handle_http_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
