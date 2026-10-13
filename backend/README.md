# backend

Бэкенд Cropper: FastAPI, PostgreSQL, MinIO.

## Запуск

Команды выполняются из папки `backend/`. Нужны Python 3.12+, uv, PostgreSQL и MinIO.

```bash
uv sync
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

`/api/health` проверяет базу и хранилище, Swagger на `/api/docs`.

## Настройки

Переменные окружения или `.env`, список в `.env.example`.

## Миграции

```bash
uv run alembic revision --autogenerate -m "add users"
uv run alembic upgrade head
```

Новые модели импортируйте в `migrations/env.py`, иначе автогенерация их не увидит.
