import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ["DATABASE_URL"] = "sqlite+pysqlite:////tmp/pulse_auth_refactor.db"
os.environ["APP_ENV"] = "development"

from app.auth import hash_password, verify_password
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.site import Site
from app.models.user import User


def _setup_client() -> tuple[TestClient, SessionLocal]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return TestClient(app), SessionLocal()


def test_signup_creates_user_and_returns_jwt_without_site():
    client, db = _setup_client()
    try:
        res = client.post(
            "/api/v1/auth/signup",
            json={"email": "new-user@test.com", "password": "StrongPass123!"},
        )

        assert res.status_code == 201
        body = res.json()
        assert isinstance(body["access_token"], str)
        assert body["token_type"] == "bearer"
        assert body["user"]["email"] == "new-user@test.com"

        user = db.query(User).filter(User.email == "new-user@test.com").first()
        assert user is not None
        assert user.password_hash != "StrongPass123!"
        assert verify_password("StrongPass123!", user.password_hash)
        assert db.query(Site).filter(Site.user_id == user.id).count() == 0
    finally:
        db.close()


def test_signup_duplicate_email_returns_409():
    client, db = _setup_client()
    try:
        existing = User(
            email="duplicate@test.com",
            password_hash=hash_password("StrongPass123!"),
        )
        db.add(existing)
        db.commit()

        res = client.post(
            "/api/v1/auth/signup",
            json={"email": "duplicate@test.com", "password": "AnotherPass123!"},
        )
        assert res.status_code == 409
    finally:
        db.close()


def test_login_success_and_me_with_user_only_auth():
    client, db = _setup_client()
    try:
        user = User(
            email="login-user@test.com",
            password_hash=hash_password("ValidPass123!"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": "login-user@test.com", "password": "ValidPass123!"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

        me_res = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_res.status_code == 200
        me = me_res.json()
        assert me["id"] == user.id
        assert me["email"] == user.email
    finally:
        db.close()


def test_login_wrong_password_returns_401():
    client, db = _setup_client()
    try:
        user = User(
            email="wrong-pass@test.com",
            password_hash=hash_password("CorrectPass123!"),
        )
        db.add(user)
        db.commit()

        res = client.post(
            "/api/v1/auth/login",
            json={"email": "wrong-pass@test.com", "password": "WrongPass123!"},
        )
        assert res.status_code == 401
    finally:
        db.close()


def test_auth_password_too_short_returns_422():
    client, db = _setup_client()
    try:
        res = client.post(
            "/api/v1/auth/signup",
            json={"email": "short-pass@test.com", "password": "short"},
        )
        assert res.status_code == 422
    finally:
        db.close()
