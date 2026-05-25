import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db

SQLALCHEMY_TEST_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)
client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_register_success():
    resp = client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "Password1",
        "confirm_password": "Password1",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert data["plan"] == "free"


def test_register_duplicate_email():
    payload = {"name": "A", "email": "dup@ex.com", "password": "Password1", "confirm_password": "Password1"}
    client.post("/api/auth/register", json=payload)
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 400


def test_login_success():
    client.post("/api/auth/register", json={
        "name": "Test", "email": "login@ex.com", "password": "Password1", "confirm_password": "Password1",
    })
    resp = client.post("/api/auth/login", data={"username": "login@ex.com", "password": "Password1"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password():
    client.post("/api/auth/register", json={
        "name": "T", "email": "wp@ex.com", "password": "Password1", "confirm_password": "Password1",
    })
    resp = client.post("/api/auth/login", data={"username": "wp@ex.com", "password": "wrongpass"})
    assert resp.status_code == 401


def test_me_requires_auth():
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_authenticated():
    client.post("/api/auth/register", json={
        "name": "Me", "email": "me@ex.com", "password": "Password1", "confirm_password": "Password1",
    })
    login = client.post("/api/auth/login", data={"username": "me@ex.com", "password": "Password1"})
    token = login.json()["access_token"]
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@ex.com"
