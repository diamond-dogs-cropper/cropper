import urllib3
from minio import Minio

from app.config import settings

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
