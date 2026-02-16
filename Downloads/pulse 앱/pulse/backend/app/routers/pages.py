"""
Pages Router
Top revenue pages list API with pagination, sorting, and search.
"""

import hashlib
from datetime import date, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case, literal

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.page_daily_metric import PageDailyMetric
from app.models.revenue_daily_metric import RevenueDailyMetric
from app.schemas.pages import (
    PageItem, PageListMeta, PageListResponse,
    TrendPoint, ChannelItem, RpmSummary, PageAction,
    PageDetailData, PageDetailMeta, PageDetailResponse,
)

router = APIRouter(prefix="/api/v1/pages")

ALLOWED_RANGES = {7, 30, 90}
ALLOWED_SORTS = {"revenue", "rpm", "pageviews"}
MAX_LIMIT = 100


def _page_key(page_url: str) -> str:
    """Deterministic short hash for a page URL (used as page_key)."""
    return hashlib.sha256(page_url.encode()).hexdigest()[:12]


@router.get("/top", response_model=PageListResponse)
async def get_top_pages(
    site_id: int = Query(..., description="Site ID"),
    range: int = Query(7, description="Date range in days (7, 30, 90)"),
    search: Optional[str] = Query(None, description="URL substring search"),
    sort: str = Query("revenue", description="Sort field: revenue | rpm | pageviews"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(20, ge=1, le=MAX_LIMIT, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return paginated list of top pages by revenue for a site.

    Supports:
    - range filtering (7/30/90 days)
    - partial URL search
    - sort by revenue / rpm / pageviews (desc)
    - page/limit pagination with total count
    - trend_percent: revenue change % vs the equivalent previous period
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

    # ── Validate sort ─────────────────────────────────────────────────
    if sort not in ALLOWED_SORTS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_SORT",
                "message": f"sort must be one of {sorted(ALLOWED_SORTS)}",
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

    # Previous period for trend calculation
    prev_date_to = date_from - timedelta(days=1)
    prev_date_from = prev_date_to - timedelta(days=range - 1)

    # ── Current period: aggregate per page_url ────────────────────────
    page_urls_sub = (
        db.query(PageDailyMetric.page_url.label("page_url"))
        .filter(
            PageDailyMetric.site_id == site_id,
            PageDailyMetric.date >= date_from,
            PageDailyMetric.date <= today,
        )
        .union(
            db.query(RevenueDailyMetric.page_url.label("page_url"))
            .filter(
                RevenueDailyMetric.site_id == site_id,
                RevenueDailyMetric.date >= date_from,
                RevenueDailyMetric.date <= today,
            )
        )
        .subquery("page_urls")
    )

    pv_sub = (
        db.query(
            PageDailyMetric.page_url,
            func.coalesce(func.sum(PageDailyMetric.pageviews), 0).label("pageviews"),
        )
        .filter(
            PageDailyMetric.site_id == site_id,
            PageDailyMetric.date >= date_from,
            PageDailyMetric.date <= today,
        )
        .group_by(PageDailyMetric.page_url)
        .subquery("pv")
    )

    rev_sub = (
        db.query(
            RevenueDailyMetric.page_url,
            func.coalesce(func.sum(RevenueDailyMetric.revenue), 0.0).label("revenue"),
        )
        .filter(
            RevenueDailyMetric.site_id == site_id,
            RevenueDailyMetric.date >= date_from,
            RevenueDailyMetric.date <= today,
        )
        .group_by(RevenueDailyMetric.page_url)
        .subquery("rev")
    )

    # ── Previous period: revenue per page_url (for trend) ─────────────
    prev_rev_sub = (
        db.query(
            RevenueDailyMetric.page_url,
            func.coalesce(func.sum(RevenueDailyMetric.revenue), 0.0).label("prev_revenue"),
        )
        .filter(
            RevenueDailyMetric.site_id == site_id,
            RevenueDailyMetric.date >= prev_date_from,
            RevenueDailyMetric.date <= prev_date_to,
        )
        .group_by(RevenueDailyMetric.page_url)
        .subquery("prev_rev")
    )

    # ── Join the three subqueries ─────────────────────────────────────
    # Use page_urls_sub so revenue-only pages are not dropped.
    pageviews_col = func.coalesce(pv_sub.c.pageviews, 0)
    revenue_col = func.coalesce(rev_sub.c.revenue, 0.0)
    prev_revenue_col = func.coalesce(prev_rev_sub.c.prev_revenue, 0.0)

    # RPM = revenue / pageviews * 1000  (0-division safe)
    rpm_expr = case(
        (pageviews_col > 0, revenue_col / pageviews_col * 1000),
        else_=literal(0.0),
    )

    # trend_percent = ((current - prev) / prev) * 100  (null if no prev data)
    trend_expr = case(
        (prev_revenue_col > 0, (revenue_col - prev_revenue_col) / prev_revenue_col * 100),
        else_=literal(None),
    )

    # Build a single materialized subquery so count/sort/paginate all
    # operate on the same derived table without re-joining.
    combined_sub = (
        db.query(
            page_urls_sub.c.page_url.label("page_url"),
            pageviews_col.label("pageviews"),
            revenue_col.label("revenue"),
            rpm_expr.label("rpm"),
            trend_expr.label("trend_percent"),
        )
        .outerjoin(pv_sub, page_urls_sub.c.page_url == pv_sub.c.page_url)
        .outerjoin(rev_sub, page_urls_sub.c.page_url == rev_sub.c.page_url)
        .outerjoin(prev_rev_sub, page_urls_sub.c.page_url == prev_rev_sub.c.page_url)
    )

    # ── Search filter ─────────────────────────────────────────────────
    if search:
        combined_sub = combined_sub.filter(page_urls_sub.c.page_url.ilike(f"%{search}%"))

    combined = combined_sub.subquery("combined")

    # ── Count total (before pagination) ───────────────────────────────
    total = db.query(func.count()).select_from(combined).scalar() or 0

    # ── Sorting ───────────────────────────────────────────────────────
    sort_map = {
        "revenue": combined.c.revenue.desc(),
        "rpm": combined.c.rpm.desc(),
        "pageviews": combined.c.pageviews.desc(),
    }

    final_query = (
        db.query(combined)
        .order_by(sort_map[sort])
    )

    # ── Pagination ────────────────────────────────────────────────────
    offset = (page - 1) * limit
    rows = final_query.offset(offset).limit(limit).all()

    # ── Build response ────────────────────────────────────────────────
    items = [
        PageItem(
            page_key=_page_key(row.page_url),
            page_url=row.page_url,
            pageviews=int(row.pageviews),
            revenue=round(float(row.revenue), 2),
            rpm=round(float(row.rpm), 2),
            trend_percent=round(float(row.trend_percent), 1) if row.trend_percent is not None else None,
        )
        for row in rows
    ]

    meta = PageListMeta(
        site_id=site_id,
        range_days=range,
        sort=sort,
        search=search,
        page=page,
        limit=limit,
        total=total,
    )

    return PageListResponse(data=items, meta=meta)


# ═══════════════════════════════════════════════════════════════════════
# Page Detail endpoint
# ═══════════════════════════════════════════════════════════════════════

def _resolve_page_url(db: Session, site_id: int, page_key: str) -> Optional[str]:
    """Resolve a page_key (sha256[:12]) back to a page_url for the given site."""
    # We scan page URLs from both page + revenue tables and hash-match.
    # With current MVP data size this is cheap; for scale, store page_key in DB.
    urls = (
        db.query(PageDailyMetric.page_url.label("page_url"))
        .filter(PageDailyMetric.site_id == site_id)
        .union(
            db.query(RevenueDailyMetric.page_url.label("page_url"))
            .filter(RevenueDailyMetric.site_id == site_id)
        )
        .all()
    )
    for (url,) in urls:
        if _page_key(url) == page_key:
            return url
    return None


def _generate_channel_summary(total_users: int) -> List[ChannelItem]:
    """Generate dummy channel breakdown (MVP placeholder)."""
    import random
    channels = ["Organic Search", "Direct", "Social", "Referral"]

    if total_users <= 0:
        return [
            ChannelItem(channel=channel, users=0, percent=0.0)
            for channel in channels
        ]

    remaining = 100.0
    items: List[ChannelItem] = []
    for i, ch in enumerate(channels):
        if i == len(channels) - 1:
            pct = round(remaining, 1)
        else:
            pct = round(random.uniform(10, remaining - (len(channels) - i - 1) * 5), 1)
            remaining -= pct
        users_count = int(round(total_users * pct / 100))
        items.append(ChannelItem(channel=ch, users=users_count, percent=pct))

    # Keep total channel users aligned with the period total.
    user_delta = total_users - sum(item.users for item in items)
    if user_delta != 0:
        items[0].users += user_delta

    return items


def _generate_actions(page_url: str, rpm: float, pageviews: int) -> List[PageAction]:
    """Generate 2 rule-based recommended actions for the page."""
    actions: List[PageAction] = []

    if rpm > 8 and pageviews < 500:
        actions.append(PageAction(
            action_id="promote_high_rpm",
            title="Promote this page on homepage",
            reason=f"High RPM (${rpm:.2f}) but low traffic ({pageviews} views). "
                   "Featuring it on the main page could increase revenue.",
        ))
    elif rpm < 4:
        actions.append(PageAction(
            action_id="optimize_ads",
            title="Optimize ad placement",
            reason=f"RPM is low (${rpm:.2f}). Review ad positions and consider "
                   "adding in-content ads to improve monetization.",
        ))
    else:
        actions.append(PageAction(
            action_id="maintain_performance",
            title="Maintain content freshness",
            reason=f"This page has solid RPM (${rpm:.2f}). Keep content updated "
                   "to maintain search ranking.",
        ))

    if pageviews > 1000:
        actions.append(PageAction(
            action_id="create_related",
            title="Create related content",
            reason=f"Strong traffic ({pageviews} views). Write follow-up articles "
                   "to capture related search queries.",
        ))
    else:
        actions.append(PageAction(
            action_id="improve_seo",
            title="Improve SEO for this page",
            reason=f"Traffic is moderate ({pageviews} views). Review title/meta "
                   "description and add internal links.",
        ))

    return actions[:2]


@router.get("/detail", response_model=PageDetailResponse)
async def get_page_detail(
    site_id: int = Query(..., description="Site ID"),
    page_key: str = Query(..., description="Page key (hash)"),
    range: int = Query(7, description="Date range: 7 or 30"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return detailed metrics for a single page:
    - Daily revenue & pageviews time-series
    - Channel breakdown (dummy for MVP)
    - RPM summary with previous-period comparison
    - 2 rule-based recommended actions
    """

    # ── Validate range ────────────────────────────────────────────────
    allowed = {7, 30, 90}
    if range not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_RANGE",
                "message": f"range must be one of {sorted(allowed)}",
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
            detail={"code": "SITE_NOT_FOUND", "message": "Site not found or access denied"},
        )

    # ── Resolve page_key → page_url ───────────────────────────────────
    page_url = _resolve_page_url(db, site_id, page_key)
    if not page_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PAGE_NOT_FOUND", "message": "No page found for the given page_key"},
        )

    # ── Date boundaries ───────────────────────────────────────────────
    today = date.today()
    date_from = today - timedelta(days=range - 1)
    prev_date_to = date_from - timedelta(days=1)
    prev_date_from = prev_date_to - timedelta(days=range - 1)

    # ── Revenue trend (daily) ─────────────────────────────────────────
    rev_rows = (
        db.query(
            RevenueDailyMetric.date,
            func.coalesce(func.sum(RevenueDailyMetric.revenue), 0.0).label("value"),
        )
        .filter(
            RevenueDailyMetric.site_id == site_id,
            RevenueDailyMetric.page_url == page_url,
            RevenueDailyMetric.date >= date_from,
            RevenueDailyMetric.date <= today,
        )
        .group_by(RevenueDailyMetric.date)
        .order_by(RevenueDailyMetric.date)
        .all()
    )
    rev_map = {r.date: float(r.value) for r in rev_rows}

    # ── Pageviews trend (daily) ───────────────────────────────────────
    pv_rows = (
        db.query(
            PageDailyMetric.date,
            func.coalesce(func.sum(PageDailyMetric.pageviews), 0).label("value"),
        )
        .filter(
            PageDailyMetric.site_id == site_id,
            PageDailyMetric.page_url == page_url,
            PageDailyMetric.date >= date_from,
            PageDailyMetric.date <= today,
        )
        .group_by(PageDailyMetric.date)
        .order_by(PageDailyMetric.date)
        .all()
    )
    pv_map = {r.date: int(r.value) for r in pv_rows}

    # Fill gaps (days with no data → 0)
    revenue_trend: List[TrendPoint] = []
    pageviews_trend: List[TrendPoint] = []
    import builtins
    for offset in builtins.range(range):
        d = date_from + timedelta(days=offset)
        ds = d.isoformat()
        revenue_trend.append(TrendPoint(date=ds, value=round(rev_map.get(d, 0.0), 2)))
        pageviews_trend.append(TrendPoint(date=ds, value=pv_map.get(d, 0)))

    # ── Aggregated totals for the current period ──────────────────────
    total_revenue = sum(t.value for t in revenue_trend)
    total_pageviews = sum(int(t.value) for t in pageviews_trend)
    total_users_row = (
        db.query(func.coalesce(func.sum(PageDailyMetric.users), 0))
        .filter(
            PageDailyMetric.site_id == site_id,
            PageDailyMetric.page_url == page_url,
            PageDailyMetric.date >= date_from,
            PageDailyMetric.date <= today,
        )
        .scalar()
    )
    total_users = int(total_users_row or 0)

    current_rpm = round(total_revenue / total_pageviews * 1000, 2) if total_pageviews > 0 else 0.0

    # ── Previous period RPM ───────────────────────────────────────────
    prev_rev = (
        db.query(func.coalesce(func.sum(RevenueDailyMetric.revenue), 0.0))
        .filter(
            RevenueDailyMetric.site_id == site_id,
            RevenueDailyMetric.page_url == page_url,
            RevenueDailyMetric.date >= prev_date_from,
            RevenueDailyMetric.date <= prev_date_to,
        )
        .scalar()
    )
    prev_pv = (
        db.query(func.coalesce(func.sum(PageDailyMetric.pageviews), 0))
        .filter(
            PageDailyMetric.site_id == site_id,
            PageDailyMetric.page_url == page_url,
            PageDailyMetric.date >= prev_date_from,
            PageDailyMetric.date <= prev_date_to,
        )
        .scalar()
    )
    prev_rev_val = float(prev_rev or 0)
    prev_pv_val = int(prev_pv or 0)
    prev_rpm = round(prev_rev_val / prev_pv_val * 1000, 2) if prev_pv_val > 0 else None
    rpm_change = (
        round((current_rpm - prev_rpm) / prev_rpm * 100, 1)
        if prev_rpm and prev_rpm > 0
        else None
    )

    rpm_summary = RpmSummary(
        current=current_rpm,
        previous=prev_rpm,
        change_percent=rpm_change,
    )

    # ── Channel summary (dummy) ───────────────────────────────────────
    channel_summary = _generate_channel_summary(total_users)

    # ── Page actions (rule-based) ─────────────────────────────────────
    page_actions = _generate_actions(page_url, current_rpm, total_pageviews)

    # ── Response ──────────────────────────────────────────────────────
    return PageDetailResponse(
        data=PageDetailData(
            page_key=page_key,
            page_url=page_url,
            revenue_trend=revenue_trend,
            pageviews_trend=pageviews_trend,
            channel_summary=channel_summary,
            rpm_summary=rpm_summary,
            page_actions=page_actions,
        ),
        meta=PageDetailMeta(
            site_id=site_id,
            range_days=range,
            date_from=date_from.isoformat(),
            date_to=today.isoformat(),
        ),
    )
