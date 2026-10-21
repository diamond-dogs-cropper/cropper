from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LogoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company: str
    created_at: datetime
