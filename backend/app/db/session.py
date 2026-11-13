from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url, pool_pre_ping=True, connect_args={"connect_timeout": 3}
)
session_factory = sessionmaker(engine, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    with session_factory() as session:
        yield session
