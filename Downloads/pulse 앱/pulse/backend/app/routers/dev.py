"""
Dev Router
Development-only endpoints for testing and data generation.
"""

import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.sync_job import SyncJob
from app.services.dummy_data import generate_dummy_data

router = APIRouter(prefix="/api/v1/dev")


def require_dev_endpoints_enabled() -> None:
    """
    Guard development-only endpoints in non-dev environments.
    Priority:
    1) ENABLE_DEV_ENDPOINTS=true/false (explicit override)
    2) APP_ENV/ENV defaults to development behavior
    """
    explicit_flag = os.getenv("ENABLE_DEV_ENDPOINTS")
    if explicit_flag is not None:
        enabled = explicit_flag.lower() in {"1", "true", "yes", "on"}
    else:
        env_name = os.getenv("APP_ENV", os.getenv("ENV", "development")).lower()
        enabled = env_name in {"dev", "development", "local", "test"}

    if not enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "ENDPOINT_NOT_AVAILABLE",
                "message": "This endpoint is not available in the current environment.",
            },
        )


# ── Request / Response Schemas ───────────────────────────────────────────
class SyncDummyRequest(BaseModel):
    site_id: int
    days: int = Field(default=30, ge=1, le=90)
    page_count: int = Field(default=30, ge=20, le=50)


class SyncDummySummary(BaseModel):
    site_id: int
    date_range: str
    page_urls_generated: int
    page_metric_rows: int
    revenue_metric_rows: int


class SyncDummyResponse(BaseModel):
    data: SyncDummySummary
    sync_job_id: int
    message: str


# ── Endpoint ─────────────────────────────────────────────────────────────
@router.post("/sync-dummy", response_model=SyncDummyResponse)
async def sync_dummy_data(
    body: SyncDummyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: None = Depends(require_dev_endpoints_enabled),
):
    """
    Generate dummy page_daily_metrics and revenue_daily_metrics
    for the specified site. Re-running replaces existing data
    in the date range (upsert semantics).

    Requires authentication & site ownership.
    """
    # ── Verify site ownership ─────────────────────────────────────────
    site = db.query(Site).filter(
        Site.id == body.site_id,
        Site.user_id == current_user.id,
    ).first()

    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "SITE_NOT_FOUND",
                "message": "Site not found or access denied",
            },
        )

    # ── Create sync_job record ────────────────────────────────────────
    sync_job = SyncJob(
        site_id=body.site_id,
        provider="dummy",
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(sync_job)
    db.commit()
    db.refresh(sync_job)

    # ── Generate data ─────────────────────────────────────────────────
    try:
        summary = generate_dummy_data(
            db=db,
            site_id=body.site_id,
            days=body.days,
            page_count=body.page_count,
        )

        sync_job.status = "completed"
        sync_job.completed_at = datetime.now(timezone.utc)
        sync_job.records_synced = (
            summary["page_metric_rows"] + summary["revenue_metric_rows"]
        )

        db.commit()

        return SyncDummyResponse(
            data=SyncDummySummary(**summary),
            sync_job_id=sync_job.id,
            message="Dummy data generated successfully",
        )

    except Exception as exc:
        db.rollback()
        failed_sync_job = db.get(SyncJob, sync_job.id)
        if failed_sync_job:
            failed_sync_job.status = "failed"
            failed_sync_job.completed_at = datetime.now(timezone.utc)
            failed_sync_job.error_message = str(exc)
            db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "SYNC_FAILED",
                "message": f"Dummy data generation failed: {str(exc)}",
            },
        )
