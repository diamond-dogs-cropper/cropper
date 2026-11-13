from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LogoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company: str
    size_bytes: int
    created_at: datetime
