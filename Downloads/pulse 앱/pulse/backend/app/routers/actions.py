"""
Actions Router
Rule-based recommended actions API.
"""

import hashlib
from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.site import Site
from app.models.page_daily_metric import PageDailyMetric
from app.models.revenue_daily_metric import RevenueDailyMetric
from app.schemas.actions import ActionItem, ActionsMeta, ActionsResponse

router = APIRouter(prefix="/api/v1/actions")

ALLOWED_RANGES = {7, 30, 90}


def _page_key(page_url: str) -> str:
    """Deterministic short hash for a page URL."""
    return hashlib.sha256(page_url.encode()).hexdigest()[:12]


def _generate_actions(
    db: Session,
    site_id: int,
    date_from: date,
    today: date,
    range_days: int,
) -> List[ActionItem]:
    """
    Analyse page + revenue metrics and generate rule-based actions.

    Rules:
    1. High RPM + Low traffic → "Promote on homepage"
    2. High traffic + Low RPM → "Optimize ad placement"
    3. Trending up (recent surge) → "Create related content"
    4. Falling revenue → "Review content freshness"
    5. Best performer → "Replicate this success"
    """

    # ── Aggregate per page_url ────────────────────────────────────────
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
            func.coalesce(func.sum(PageDailyMetric.users), 0).label("users"),
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

    rows = (
        db.query(
            page_urls_sub.c.page_url,
            func.coalesce(pv_sub.c.pageviews, 0).label("pageviews"),
            func.coalesce(pv_sub.c.users, 0).label("users"),
            func.coalesce(rev_sub.c.revenue, 0.0).label("revenue"),
        )
        .outerjoin(pv_sub, page_urls_sub.c.page_url == pv_sub.c.page_url)
        .outerjoin(rev_sub, page_urls_sub.c.page_url == rev_sub.c.page_url)
        .all()
    )

    if not rows:
        return []

    # ── Compute RPM per page ──────────────────────────────────────────
    pages = []
    for r in rows:
        pv = int(r.pageviews)
        rev = float(r.revenue)
        rpm = round(rev / pv * 1000, 2) if pv > 0 else 0.0
        pages.append({
            "url": r.page_url,
            "pageviews": pv,
            "users": int(r.users),
            "revenue": rev,
            "rpm": rpm,
        })

    # Sort helpers
    avg_rpm = sum(p["rpm"] for p in pages) / len(pages)
    avg_pv = sum(p["pageviews"] for p in pages) / len(pages)

    # ── Previous period for trend detection ───────────────────────────
    prev_date_to = date_from - timedelta(days=1)
    prev_date_from = prev_date_to - timedelta(days=range_days - 1)

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
        .all()
    )
    prev_map = {r.page_url: float(r.prev_revenue) for r in prev_rev_sub}

    actions: List[ActionItem] = []
    action_counter = 0

    # Sort by RPM descending to find high-RPM pages first
    by_rpm = sorted(pages, key=lambda p: p["rpm"], reverse=True)
    # Sort by pageviews descending for traffic analysis
    by_pv = sorted(pages, key=lambda p: p["pageviews"], reverse=True)

    # Rule 1: High RPM + Low traffic — promote
    for p in by_rpm:
        if p["rpm"] > avg_rpm * 1.3 and p["pageviews"] < avg_pv * 0.7:
            action_counter += 1
            actions.append(ActionItem(
                action_id=f"action_{action_counter}",
                title="Promote this high-RPM page",
                reason=f'"{p["url"]}" has RPM ${p["rpm"]:.2f} (above avg ${avg_rpm:.2f}) '
                       f"but only {p['pageviews']} views. Feature it on your homepage.",
                target_page_key=_page_key(p["url"]),
                target_page_url=p["url"],
                priority=1,
            ))
            if len(actions) >= 2:
                break

    # Rule 2: High traffic + Low RPM — optimize ads
    for p in by_pv:
        if p["pageviews"] > avg_pv * 1.3 and p["rpm"] < avg_rpm * 0.7:
            action_counter += 1
            actions.append(ActionItem(
                action_id=f"action_{action_counter}",
                title="Optimize ads on high-traffic page",
                reason=f'"{p["url"]}" gets {p["pageviews"]} views but RPM is only '
                       f'${p["rpm"]:.2f}. Review ad placement and density.',
                target_page_key=_page_key(p["url"]),
                target_page_url=p["url"],
                priority=1,
            ))
            if sum(1 for a in actions if "Optimize" in a.title) >= 2:
                break

    # Rule 3: Recent surge — create related content
    for p in pages:
        prev_rev_val = prev_map.get(p["url"], 0)
        if prev_rev_val > 0 and p["revenue"] > prev_rev_val * 1.5:
            action_counter += 1
            change = round((p["revenue"] - prev_rev_val) / prev_rev_val * 100, 0)
            actions.append(ActionItem(
                action_id=f"action_{action_counter}",
                title="Create related content for trending page",
                reason=f'"{p["url"]}" revenue surged +{change}%. Write follow-up '
                       f"articles to capture related queries.",
                target_page_key=_page_key(p["url"]),
                target_page_url=p["url"],
                priority=2,
            ))
            if sum(1 for a in actions if "trending" in a.title) >= 2:
                break

    # Rule 4: Falling revenue — review content
    for p in pages:
        prev_rev_val = prev_map.get(p["url"], 0)
        if prev_rev_val > 1 and p["revenue"] < prev_rev_val * 0.5:
            action_counter += 1
            drop = round((1 - p["revenue"] / prev_rev_val) * 100, 0)
            actions.append(ActionItem(
                action_id=f"action_{action_counter}",
                title="Review declining page",
                reason=f'"{p["url"]}" revenue dropped {drop}%. Check if content is '
                       f"outdated or search ranking has changed.",
                target_page_key=_page_key(p["url"]),
                target_page_url=p["url"],
                priority=2,
            ))
            if sum(1 for a in actions if "declining" in a.title) >= 1:
                break

    # Rule 5: Top performer — replicate
    top = max(pages, key=lambda p: p["revenue"])
    if top["revenue"] > 0:
        action_counter += 1
        actions.append(ActionItem(
            action_id=f"action_{action_counter}",
            title="Replicate top performer strategy",
            reason=f'Your best page "{top["url"]}" earned ${top["revenue"]:.2f} '
                   f"with RPM ${top['rpm']:.2f}. Analyze its structure and apply "
                   f"the same approach to lower-performing pages.",
            target_page_key=_page_key(top["url"]),
            target_page_url=top["url"],
            priority=3,
        ))

    # Ensure a practical minimum list size for the Actions UI.
    if len(actions) < 3:
        covered_urls = {a.target_page_url for a in actions if a.target_page_url}
        candidates = sorted(
            pages,
            key=lambda p: (p["revenue"], p["pageviews"], p["rpm"]),
            reverse=True,
        )
        for p in candidates:
            if len(actions) >= 3:
                break
            if p["url"] in covered_urls:
                continue
            action_counter += 1
            actions.append(ActionItem(
                action_id=f"action_{action_counter}",
                title="Strengthen internal linking",
                reason=f'Use "{p["url"]}" as a hub page and add internal links to related '
                       f"articles to distribute traffic.",
                target_page_key=_page_key(p["url"]),
                target_page_url=p["url"],
                priority=3,
            ))
            covered_urls.add(p["url"])

    if len(actions) < 3:
        generic_fallbacks = [
            (
                "Review top landing page UX",
                "Check page speed, above-the-fold layout, and CTA clarity on your highest-traffic pages.",
            ),
            (
                "Run ad placement A/B test",
                "Compare ad density and position on one template for 7 days to improve RPM safely.",
            ),
            (
                "Refresh stale content cluster",
                "Update internal links and metadata for older posts to recover long-tail traffic.",
            ),
        ]
        for title, reason in generic_fallbacks:
            if len(actions) >= 3:
                break
            action_counter += 1
            actions.append(ActionItem(
                action_id=f"action_{action_counter}",
                title=title,
                reason=reason,
                target_page_key=None,
                target_page_url=None,
                priority=3,
            ))

    # Sort by priority, limit to reasonable count
    actions.sort(key=lambda a: a.priority)
    return actions[:10]


@router.get("", response_model=ActionsResponse)
async def get_actions(
    site_id: int = Query(..., description="Site ID"),
    range: int = Query(7, description="Date range: 7, 30, 90"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate rule-based recommended actions for a site.
    Analyses page metrics and revenue to produce actionable insights.
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
            detail={"code": "SITE_NOT_FOUND", "message": "Site not found or access denied"},
        )

    # ── Date boundaries ───────────────────────────────────────────────
    today = date.today()
    date_from = today - timedelta(days=range - 1)

    # ── Generate actions ──────────────────────────────────────────────
    actions = _generate_actions(db, site_id, date_from, today, range)

    return ActionsResponse(
        data=actions,
        meta=ActionsMeta(
            site_id=site_id,
            range_days=range,
            total=len(actions),
        ),
    )
