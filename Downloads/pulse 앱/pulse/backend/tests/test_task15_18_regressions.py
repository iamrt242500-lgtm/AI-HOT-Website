import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ["DATABASE_URL"] = "sqlite+pysqlite:////tmp/pulse_task15_18_regressions.db"
os.environ["APP_ENV"] = "development"

from app.auth import create_access_token, hash_password
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.site import Site
from app.models.sync_job import SyncJob
from app.models.user import User


def _setup_client(email: str = "task1518@test.com") -> tuple[TestClient, SessionLocal, Site, dict]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    user = User(email=email, password_hash=hash_password("Regression123!"))
    db.add(user)
    db.commit()
    db.refresh(user)

    site = Site(user_id=user.id, name="Task15-18 Site", domain=f"{email}.example.com", currency="USD")
    db.add(site)
    db.commit()
    db.refresh(site)

    token = create_access_token({"sub": str(user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    return TestClient(app), db, site, headers


def test_actions_minimum_count_and_target_page_key():
    client, db, site, headers = _setup_client("actions-reg@test.com")
    try:
        sync_res = client.post(
            "/api/v1/dev/sync-dummy",
            headers=headers,
            json={"site_id": site.id, "days": 30, "page_count": 30},
        )
        assert sync_res.status_code == 200

        res = client.get(f"/api/v1/actions?site_id={site.id}&range=30", headers=headers)
        assert res.status_code == 200

        body = res.json()
        assert len(body["data"]) >= 3

        for item in body["data"]:
            assert item["priority"] in {1, 2, 3}
            if item.get("target_page_url"):
                assert isinstance(item.get("target_page_key"), str)
                assert len(item["target_page_key"]) == 12
    finally:
        db.close()


def test_delete_site_removes_related_sync_jobs():
    client, db, site, headers = _setup_client("delete-reg@test.com")
    try:
        sync_res = client.post(
            "/api/v1/dev/sync-dummy",
            headers=headers,
            json={"site_id": site.id, "days": 30, "page_count": 30},
        )
        assert sync_res.status_code == 200
        assert db.query(SyncJob).filter(SyncJob.site_id == site.id).count() > 0

        delete_res = client.delete(f"/api/v1/sites/{site.id}", headers=headers)
        assert delete_res.status_code == 204

        assert db.query(SyncJob).filter(SyncJob.site_id == site.id).count() == 0
        assert db.query(Site).filter(Site.id == site.id).count() == 0
    finally:
        db.close()
