"""
Tests for NovaBank API.
Run: pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import Base, get_db
from app.models import *  # noqa

# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///./test_novabank.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


# ── Helpers ───────────────────────────────────────────────────────────────────

def register_user(email="test@novabank.ao", phone="+244923456789", password="Test@1234"):
    return client.post("/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": email,
        "phone": phone,
        "password": password,
    })


def get_token(email="test@novabank.ao", password="Test@1234"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ── Health ─────────────────────────────────────────────────────────────────────

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


# ── Auth ───────────────────────────────────────────────────────────────────────

def test_register_success():
    res = register_user()
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_register_duplicate_email():
    register_user()
    res = register_user()
    assert res.status_code == 409


def test_register_invalid_password():
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Test",
        "email": "x@novabank.ao",
        "phone": "+244923111111",
        "password": "weak",
    })
    assert res.status_code == 422


def test_login_success():
    register_user()
    res = client.post("/api/v1/auth/login", json={
        "email": "test@novabank.ao",
        "password": "Test@1234",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password():
    register_user()
    res = client.post("/api/v1/auth/login", json={
        "email": "test@novabank.ao",
        "password": "WrongPassword1",
    })
    assert res.status_code == 401


# ── Profile ────────────────────────────────────────────────────────────────────

def test_get_profile():
    register_user()
    token = get_token()
    res = client.get("/api/v1/me/", headers=auth_headers(token))
    assert res.status_code == 200
    assert res.json()["email"] == "test@novabank.ao"


def test_update_profile():
    register_user()
    token = get_token()
    res = client.patch("/api/v1/me/", json={"full_name": "Updated Name"}, headers=auth_headers(token))
    assert res.status_code == 200
    assert res.json()["full_name"] == "Updated Name"


# ── Accounts ───────────────────────────────────────────────────────────────────

def test_list_accounts():
    register_user()
    token = get_token()
    res = client.get("/api/v1/accounts/", headers=auth_headers(token))
    assert res.status_code == 200
    data = res.json()
    assert data["total_accounts"] == 1  # auto-created on register
    assert data["currency"] == "AOA"


def test_get_balance():
    register_user()
    token = get_token()
    accounts = client.get("/api/v1/accounts/", headers=auth_headers(token)).json()
    account_id = accounts["accounts"][0]["id"]
    res = client.get(f"/api/v1/accounts/{account_id}/balance", headers=auth_headers(token))
    assert res.status_code == 200
    assert "balance" in res.json()


# ── Transactions ───────────────────────────────────────────────────────────────

def test_list_transactions_empty():
    register_user()
    token = get_token()
    res = client.get("/api/v1/transactions/", headers=auth_headers(token))
    assert res.status_code == 200
    assert res.json()["total"] == 0


def test_transfer_requires_kyc():
    register_user()
    token = get_token()
    accounts = client.get("/api/v1/accounts/", headers=auth_headers(token)).json()
    account_id = accounts["accounts"][0]["id"]

    res = client.post("/api/v1/transactions/transfer", json={
        "sender_account_id": account_id,
        "receiver_account_number": "NVB0000000001",
        "amount": 1000,
    }, headers=auth_headers(token))
    # KYC not verified → 403
    assert res.status_code == 403


# ── Notifications ──────────────────────────────────────────────────────────────

def test_notifications():
    register_user()
    token = get_token()
    res = client.get("/api/v1/me/notifications", headers=auth_headers(token))
    assert res.status_code == 200
    assert "notifications" in res.json()


# ── KYC Status ─────────────────────────────────────────────────────────────────

def test_kyc_status():
    register_user()
    token = get_token()
    res = client.get("/api/v1/me/kyc/status", headers=auth_headers(token))
    assert res.status_code == 200
    assert res.json()["kyc_status"] == "pending"
