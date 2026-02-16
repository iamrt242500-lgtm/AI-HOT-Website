"""
Dummy Data Generation Service
Generates realistic mock data for page_daily_metrics and revenue_daily_metrics.
"""

import random
from datetime import date, timedelta
from typing import List, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.page_daily_metric import PageDailyMetric
from app.models.revenue_daily_metric import RevenueDailyMetric

# ── Page URL templates ──────────────────────────────────────────────────
_CATEGORIES = [
    "tech", "finance", "health", "travel", "food",
    "lifestyle", "education", "entertainment", "sports", "business",
]

_SLUG_WORDS = [
    "guide", "tips", "review", "best", "how-to",
    "top-10", "ultimate", "complete", "beginners", "advanced",
    "2025", "2024", "tutorial", "comparison", "checklist",
    "strategy", "mistakes", "secrets", "tools", "resources",
]


def _generate_page_urls(count: int = 30) -> List[str]:
    """Generate realistic blog-style page URLs."""
    urls: List[str] = []
    used: set = set()
    while len(urls) < count:
        cat = random.choice(_CATEGORIES)
        slug1 = random.choice(_SLUG_WORDS)
        slug2 = random.choice(_SLUG_WORDS)
        slug = f"/{cat}/{slug1}-{slug2}-{random.randint(1, 999)}"
        if slug not in used:
            used.add(slug)
            urls.append(slug)
    return urls


def _generate_day_metrics(
    page_urls: List[str],
    day: date,
    base_traffic_scale: float,
) -> Tuple[List[dict], List[dict]]:
    """
    Generate page + revenue metrics for a single day.
    Revenue has a weak positive correlation with pageviews.
    """
    # Weekend traffic dip
    is_weekend = day.weekday() >= 5
    weekend_factor = 0.65 if is_weekend else 1.0

    page_rows: List[dict] = []
    revenue_rows: List[dict] = []

    for url in page_urls:
        # ── Traffic metrics ──
        base_pv = random.randint(20, 800)
        pageviews = max(1, int(base_pv * base_traffic_scale * weekend_factor
                                * random.uniform(0.7, 1.3)))
        users = max(1, int(pageviews * random.uniform(0.5, 0.85)))
        sessions = max(users, int(users * random.uniform(1.0, 1.4)))
        avg_duration = round(random.uniform(30, 300), 1)
        bounce = round(random.uniform(0.25, 0.80), 4)

        page_rows.append(dict(
            date=day,
            page_url=url,
            users=users,
            pageviews=pageviews,
            sessions=sessions,
            avg_session_duration=avg_duration,
            bounce_rate=bounce,
        ))

        # ── Revenue metrics (weakly correlated to pageviews) ──
        impressions = max(1, int(pageviews * random.uniform(0.8, 1.5)))
        rpm_val = round(random.uniform(1.0, 12.0), 2)
        revenue_val = round(impressions * rpm_val / 1000, 4)
        clicks = max(0, int(impressions * random.uniform(0.005, 0.04)))
        ctr_val = round(clicks / impressions, 4) if impressions > 0 else 0.0

        revenue_rows.append(dict(
            date=day,
            page_url=url,
            revenue=revenue_val,
            impressions=impressions,
            clicks=clicks,
            ctr=ctr_val,
            rpm=rpm_val,
        ))

    return page_rows, revenue_rows


def generate_dummy_data(
    db: Session,
    site_id: int,
    days: int = 30,
    page_count: int = 30,
) -> dict:
    """
    Generate and upsert dummy data for a site.
    
    Returns summary dict with counts.
    """
    today = date.today()
    start_date = today - timedelta(days=days - 1)
    page_urls = _generate_page_urls(count=page_count)

    # Random per-site traffic scale so different sites look different
    base_traffic_scale = random.uniform(0.6, 1.8)

    total_page_rows = 0
    total_revenue_rows = 0

    # ── Delete existing data in the date range (upsert via replace) ──
    db.query(PageDailyMetric).filter(
        and_(
            PageDailyMetric.site_id == site_id,
            PageDailyMetric.date >= start_date,
            PageDailyMetric.date <= today,
        )
    ).delete(synchronize_session=False)

    db.query(RevenueDailyMetric).filter(
        and_(
            RevenueDailyMetric.site_id == site_id,
            RevenueDailyMetric.date >= start_date,
            RevenueDailyMetric.date <= today,
        )
    ).delete(synchronize_session=False)

    # ── Generate day by day ──
    for day_offset in range(days):
        current_day = start_date + timedelta(days=day_offset)
        page_rows, revenue_rows = _generate_day_metrics(
            page_urls, current_day, base_traffic_scale
        )

        for row in page_rows:
            db.add(PageDailyMetric(site_id=site_id, **row))
        for row in revenue_rows:
            db.add(RevenueDailyMetric(site_id=site_id, **row))

        total_page_rows += len(page_rows)
        total_revenue_rows += len(revenue_rows)

    db.flush()

    return {
        "site_id": site_id,
        "date_range": f"{start_date} ~ {today}",
        "page_urls_generated": len(page_urls),
        "page_metric_rows": total_page_rows,
        "revenue_metric_rows": total_revenue_rows,
    }
