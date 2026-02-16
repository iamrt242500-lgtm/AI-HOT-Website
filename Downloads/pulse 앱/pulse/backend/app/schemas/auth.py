"""
Authentication Schemas
Pydantic models for auth requests and responses
"""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class AuthCredentials(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserSummaryResponse(BaseModel):
    id: int
    email: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSummaryResponse


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    class Config:
        from_attributes = True
