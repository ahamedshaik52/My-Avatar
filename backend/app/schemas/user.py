from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str

    @field_validator("name")
    @classmethod
    def name_min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    def model_post_init(self, __context) -> None:
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    email: str
    avatar_url: str | None
    plan: str
    credits: int
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
