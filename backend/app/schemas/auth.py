from pydantic import BaseModel, EmailStr
from typing import Optional


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    code: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    username: Optional[str] = None
    github_id: Optional[str] = None
    avatar_url: Optional[str] = None
    rating: int
    wins: int
    losses: int

    model_config = {"from_attributes": True}


# Resolve forward reference
TokenResponse.model_rebuild()
