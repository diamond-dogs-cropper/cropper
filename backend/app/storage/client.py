import io

import urllib3
from minio import Minio
from minio.deleteobjects import DeleteObject

from app.config import settings
from app.errors import AppError

# retries по умолчанию 5: упавший MinIO вешает запрос примерно на 30 с
http_client = urllib3.PoolManager(
    timeout=urllib3.Timeout(connect=3, read=30),
    retries=urllib3.Retry(total=1, backoff_factor=0.2),
)

client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=settings.minio_secure,
    http_client=http_client,
)


def ensure_bucket() -> None:
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)


def put_logo(template_id: str, logo_id: str, data: bytes) -> None:
    client.put_object(
        settings.minio_bucket,
        f"templates/{template_id}/{logo_id}.png",
        io.BytesIO(data),
        len(data),
        content_type="image/png",
    )


def delete_template_logos(template_id: str) -> None:
    found = client.list_objects(settings.minio_bucket, f"templates/{template_id}/", recursive=True)
    names = [DeleteObject(item.object_name) for item in found]
    for error in client.remove_objects(settings.minio_bucket, names):
        raise AppError(503, "storage_error", f"Не удалось удалить файл {error.object_name}")
