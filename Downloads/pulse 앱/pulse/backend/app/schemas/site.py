from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import re


class SiteCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    domain: str = Field(..., min_length=3, max_length=255)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    
    @field_validator('domain')
    @classmethod
    def validate_domain(cls, v: str) -> str:
        # Remove protocol if present
        domain = v.lower().strip()
        domain = re.sub(r'^https?://', '', domain)
        domain = re.sub(r'^www\.', '', domain)
        domain = domain.rstrip('/')
        
        # Basic domain validation
        domain_pattern = r'^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$'
        if not re.match(domain_pattern, domain):
            raise ValueError('Invalid domain format. Example: example.com')
        
        return domain
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        name = v.strip()
        if len(name) < 2:
            raise ValueError('Site name must be at least 2 characters')
        return name


class SiteResponse(BaseModel):
    id: int
    user_id: int
    name: str
    domain: str
    currency: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SiteListResponse(BaseModel):
    data: list[SiteResponse]
    meta: dict = Field(default_factory=dict)
