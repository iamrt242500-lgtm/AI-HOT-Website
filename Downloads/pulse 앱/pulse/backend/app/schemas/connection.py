from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime


class ConnectionCreate(BaseModel):
    site_id: int
    provider: Literal['ga4', 'adsense']
    property_id: Optional[str] = None
    property_name: Optional[str] = None
    
    @field_validator('provider')
    @classmethod
    def validate_provider(cls, v: str) -> str:
        if v not in ['ga4', 'adsense']:
            raise ValueError('Provider must be either "ga4" or "adsense"')
        return v


class ConnectionResponse(BaseModel):
    id: int
    site_id: int
    provider: str
    property_id: Optional[str] = None
    property_name: Optional[str] = None
    connected_at: datetime
    last_synced_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ConnectionListResponse(BaseModel):
    data: list[ConnectionResponse]
    meta: dict = Field(default_factory=dict)


class GA4PropertyOption(BaseModel):
    """Mock GA4 property options for development"""
    property_id: str
    property_name: str
    display_name: str


class AdSenseAccountOption(BaseModel):
    """Mock AdSense account options for development"""
    account_id: str
    account_name: str
    display_name: str
