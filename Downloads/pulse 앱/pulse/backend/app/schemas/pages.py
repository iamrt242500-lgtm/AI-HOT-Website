"""
Pages Schemas
Pydantic models for the Pages list (Top Revenue Pages) API
and Page Detail API.
"""

from pydantic import BaseModel
from typing import List, Optional


# ── List (Top Pages) ──────────────────────────────────────────────────

class PageItem(BaseModel):
    """Single page row in the Top Pages list."""
    page_key: str          # URL hash – used for detail lookup
    page_url: str
    pageviews: int = 0
    revenue: float = 0.0
    rpm: float = 0.0
    trend_percent: Optional[float] = None  # revenue change % vs previous period


class PageListMeta(BaseModel):
    """Pagination & filter metadata."""
    site_id: int
    range_days: int
    sort: str
    search: Optional[str] = None
    page: int
    limit: int
    total: int


class PageListResponse(BaseModel):
    """Envelope for the paginated page list."""
    data: List[PageItem]
    meta: PageListMeta


# ── Detail ────────────────────────────────────────────────────────────

class TrendPoint(BaseModel):
    """Single data point for a daily time-series."""
    date: str       # YYYY-MM-DD
    value: float


class ChannelItem(BaseModel):
    """Traffic channel summary row (dummy for MVP)."""
    channel: str
    users: int
    percent: float  # share of total users (0-100)


class RpmSummary(BaseModel):
    """RPM summary for the page."""
    current: float
    previous: Optional[float] = None
    change_percent: Optional[float] = None


class PageAction(BaseModel):
    """Rule-based recommended action for a page."""
    action_id: str
    title: str
    reason: str


class PageDetailData(BaseModel):
    page_key: str
    page_url: str
    revenue_trend: List[TrendPoint]
    pageviews_trend: List[TrendPoint]
    channel_summary: List[ChannelItem]
    rpm_summary: RpmSummary
    page_actions: List[PageAction]


class PageDetailMeta(BaseModel):
    site_id: int
    range_days: int
    date_from: str
    date_to: str


class PageDetailResponse(BaseModel):
    data: PageDetailData
    meta: PageDetailMeta
