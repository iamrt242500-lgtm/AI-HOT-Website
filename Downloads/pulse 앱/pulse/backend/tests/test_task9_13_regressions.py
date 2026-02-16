import os
import sys
from datetime import date, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ["DATABASE_URL"] = "sqlite+pysqlite:////tmp/pulse_task9_13_regressions.db"
os.environ["APP_ENV"] = "development"

from app.auth import create_access_token, hash_password
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.page_daily_metric import PageDailyMetric
from app.models.revenue_daily_metric import RevenueDailyMetric
from app.models.site import Site
from app.models.user import User
from app.routers.pages import _page_key


def _setup_client(email: str = "task913@test.com") -> tuple[TestClient, SessionLocal, Site, dict]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    user = User(email=email, password_hash=hash_password("Regression123!"))
    db.add(user)
    db.commit()
    db.refresh(user)

    site = Site(user_id=user.id, name="Test Site", domain=f"{email}.example.com", currency="USD")
    db.add(site)
    db.commit()
    db.refresh(site)

    token = create_access_token({"sub": str(user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    return TestClient(app), db, site, headers


def test_top_pages_includes_revenue_only_pages():
    client, db, site, headers = _setup_client("revenue-only@test.com")
    try:
        db.add(
            RevenueDailyMetric(
                site_id=site.id,
                date=date.today(),
                page_url="/revenue-only",
                revenue=99.0,
                impressions=1000,
                clicks=20,
                ctr=0.02,
                rpm=99.0,
            )
        )
        db.commit()

        res = client.get(
            f"/api/v1/pages/top?site_id={site.id}&range=7&sort=revenue&page=1&limit=20",
            headers=headers,
        )

        assert res.status_code == 200
        body = res.json()
        assert body["meta"]["total"] == 1
        assert len(body["data"]) == 1
        assert body["data"][0]["page_url"] == "/revenue-only"
    finally:
        db.close()


def test_page_detail_channel_users_are_zero_when_period_has_no_data():
    client, db, site, headers = _setup_client("detail-empty@test.com")
    try:
        old_day = date.today() - timedelta(days=120)
        old_url = "/legacy-page"

        db.add(
            PageDailyMetric(
                site_id=site.id,
                date=old_day,
                page_url=old_url,
                users=100,
                pageviews=200,
                sessions=220,
                avg_session_duration=60.0,
                bounce_rate=0.5,
            )
        )
        db.add(
            RevenueDailyMetric(
                site_id=site.id,
                date=old_day,
                page_url=old_url,
                revenue=10.0,
                impressions=500,
                clicks=10,
                ctr=0.02,
                rpm=20.0,
            )
        )
        db.commit()

        page_key = _page_key(old_url)
        res = client.get(
            f"/api/v1/pages/detail?site_id={site.id}&page_key={page_key}&range=7",
            headers=headers,
        )

        assert res.status_code == 200
        body = res.json()["data"]
        assert sum(point["value"] for point in body["pageviews_trend"]) == 0
        assert all(channel["users"] == 0 for channel in body["channel_summary"])
    finally:
        db.close()


def test_home_kpis_users_uses_period_unique_proxy():
    client, db, site, headers = _setup_client("home-kpi@test.com")
    try:
        d1 = date.today()
        d2 = date.today() - timedelta(days=1)

        rows = [
            PageDailyMetric(
                site_id=site.id,
                date=d1,
                page_url="/p1",
                users=70,
                pageviews=150,
                sessions=160,
                avg_session_duration=55.0,
                bounce_rate=0.4,
            ),
            PageDailyMetric(
                site_id=site.id,
                date=d1,
                page_url="/p2",
                users=50,
                pageviews=120,
                sessions=130,
                avg_session_duration=62.0,
                bounce_rate=0.45,
            ),
            PageDailyMetric(
                site_id=site.id,
                date=d2,
                page_url="/p1",
                users=40,
                pageviews=100,
                sessions=110,
                avg_session_duration=58.0,
                bounce_rate=0.5,
            ),
            PageDailyMetric(
                site_id=site.id,
                date=d2,
                page_url="/p2",
                users=30,
                pageviews=90,
                sessions=95,
                avg_session_duration=52.0,
                bounce_rate=0.55,
            ),
        ]
        db.add_all(rows)
        db.commit()

        res = client.get(f"/api/v1/home/kpis?site_id={site.id}&range=7", headers=headers)

        assert res.status_code == 200
        body = res.json()["data"]
        assert body["users"] == 120
        assert body["pageviews"] == 460
    finally:
        db.close()
