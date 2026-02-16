"""
Home Router
Home screen KPI API endpoints.
"""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.page_daily_metric import PageDailyMetric
from app.models.revenue_daily_metric import RevenueDailyMetric
from app.models.sync_job import SyncJob
from app.schemas.home import HomeKpiData, HomeKpiMeta, HomeKpiResponse

router = APIRouter(prefix="/api/v1/home")

ALLOWED_RANGES = {7, 30, 90}


@router.get("/kpis", response_model=HomeKpiResponse)
async def get_home_kpis(
    site_id: int = Query(..., description="Site ID"),
    range: int = Query(7, alias="range", description="Date range in days (7, 30, 90)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Home KPI summary.

    Returns aggregated users, pageviews, revenue, rpm, ctr
    for the given site and date range.
    """
    # ── Validate range ────────────────────────────────────────────────
    if range not in ALLOWED_RANGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_RANGE",
                "message": f"range must be one of {sorted(ALLOWED_RANGES)}",
            },
        )

    # ── Verify site ownership ─────────────────────────────────────────
    site = db.query(Site).filter(
        Site.id == site_id,
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

    # ── Date boundaries ───────────────────────────────────────────────
    today = date.today()
    date_from = today - timedelta(days=range - 1)

    # ── Aggregate page metrics ────────────────────────────────────────
    # Users proxy:
    # PageDailyMetric is page-granularity, so summing users across pages/days
    # can overcount. We use max(daily summed users) as a conservative period
    # unique-users proxy with the current schema.
    daily_page_agg = (
        db.query(
            PageDailyMetric.date.label("metric_date"),
            func.coalesce(func.sum(PageDailyMetric.users), 0).label("daily_users"),
            func.coalesce(func.sum(PageDailyMetric.pageviews), 0).label("daily_pageviews"),
        )
        .filter(
            and_(
                PageDailyMetric.site_id == site_id,
                PageDailyMetric.date >= date_from,
                PageDailyMetric.date <= today,
            )
        )
        .group_by(PageDailyMetric.date)
        .subquery("daily_page_agg")
    )

    page_agg = db.query(
        func.coalesce(func.max(daily_page_agg.c.daily_users), 0).label("users"),
        func.coalesce(func.sum(daily_page_agg.c.daily_pageviews), 0).label("pageviews"),
    ).one()

    total_users = int(page_agg.users)
    total_pageviews = int(page_agg.pageviews)

    # ── Aggregate revenue metrics ─────────────────────────────────────
    rev_agg = db.query(
        func.coalesce(func.sum(RevenueDailyMetric.revenue), 0.0).label("revenue"),
        func.coalesce(func.sum(RevenueDailyMetric.clicks), 0).label("clicks"),
        func.coalesce(func.sum(RevenueDailyMetric.impressions), 0).label("impressions"),
    ).filter(
        and_(
            RevenueDailyMetric.site_id == site_id,
            RevenueDailyMetric.date >= date_from,
            RevenueDailyMetric.date <= today,
        )
    ).one()

    total_revenue = float(rev_agg.revenue)
    total_clicks = int(rev_agg.clicks)
    total_impressions = int(rev_agg.impressions)

    # ── Calculated KPIs (0-division safe) ─────────────────────────────
    rpm = round(total_revenue / total_pageviews * 1000, 2) if total_pageviews > 0 else 0.0
    ctr = round(total_clicks / total_impressions, 4) if total_impressions > 0 else None

    # ── Last sync time ────────────────────────────────────────────────
    last_sync = db.query(SyncJob.completed_at).filter(
        SyncJob.site_id == site_id,
        SyncJob.status == "completed",
    ).order_by(SyncJob.completed_at.desc()).first()

    last_synced_at = last_sync.completed_at if last_sync else None

    # ── Response ──────────────────────────────────────────────────────
    return HomeKpiResponse(
        data=HomeKpiData(
            users=total_users,
            pageviews=total_pageviews,
            revenue=round(total_revenue, 2),
            rpm=rpm,
            ctr=ctr,
            last_synced_at=last_synced_at,
        ),
        meta=HomeKpiMeta(
            site_id=site_id,
            range_days=range,
            date_from=str(date_from),
            date_to=str(today),
        ),
    )
