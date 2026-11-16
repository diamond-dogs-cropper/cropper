from pydantic import BaseModel, EmailStr


class InviteIn(BaseModel):
    email: EmailStr
