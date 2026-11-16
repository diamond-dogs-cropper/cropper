from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str = "logos"
    minio_secure: bool = False
    session_lifetime_days: int = 30
    session_cookie_secure: bool = False
    public_url: str = "http://localhost"
    mail_host: str = "smtp.resend.com"
    mail_port: int = 2465
    mail_username: str = "resend"
    mail_password: str = ""
    mail_from: str = ""
    mail_sender_name: str = "Cropper"


settings = Settings()
