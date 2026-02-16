"""
Actions Schemas
Pydantic models for the rule-based Actions API.
"""

from pydantic import BaseModel
from typing import List, Optional


class ActionItem(BaseModel):
    """A single recommended action."""
    action_id: str
    title: str
    reason: str
    target_page_key: Optional[str] = None
    target_page_url: Optional[str] = None
    priority: int  # 1 = high, 2 = medium, 3 = low


class ActionsMeta(BaseModel):
    site_id: int
    range_days: int
    total: int


class ActionsResponse(BaseModel):
    data: List[ActionItem]
    meta: ActionsMeta
