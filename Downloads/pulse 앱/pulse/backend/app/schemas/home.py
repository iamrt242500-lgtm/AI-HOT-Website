"""
Home Schemas
Pydantic models for Home KPI API responses.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HomeKpiData(BaseModel):
    """KPI summary data for the Home screen."""
    users: int = 0
    pageviews: int = 0
    revenue: float = 0.0
    rpm: float = 0.0
    ctr: Optional[float] = None
    last_synced_at: Optional[datetime] = None


class HomeKpiMeta(BaseModel):
    site_id: int
    range_days: int
    date_from: str
    date_to: str


class HomeKpiResponse(BaseModel):
    data: HomeKpiData
    meta: HomeKpiMeta
