import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db

SQLALCHEMY_TEST_URL = "sqlite:///./test_projects.db"
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


@pytest.fixture
def auth_token():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client.post("/api/auth/register", json={
        "name": "Creator", "email": "proj@ex.com",
        "password": "Password1", "confirm_password": "Password1",
    })
    resp = client.post("/api/auth/login", data={"username": "proj@ex.com", "password": "Password1"})
    return resp.json()["access_token"]


def test_create_project(auth_token):
    resp = client.post(
        "/api/projects",
        json={"title": "My First Video"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["title"] == "My First Video"
    assert resp.json()["status"] == "draft"


def test_list_projects(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    client.post("/api/projects", json={"title": "Video 1"}, headers=headers)
    client.post("/api/projects", json={"title": "Video 2"}, headers=headers)
    resp = client.get("/api/projects", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 2


def test_delete_project(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    create = client.post("/api/projects", json={"title": "To Delete"}, headers=headers)
    pid = create.json()["id"]
    del_resp = client.delete(f"/api/projects/{pid}", headers=headers)
    assert del_resp.status_code == 204


def test_cannot_access_other_user_project(auth_token):
    # Create another user and project
    client.post("/api/auth/register", json={
        "name": "Other", "email": "other@ex.com",
        "password": "Password1", "confirm_password": "Password1",
    })
    other_login = client.post("/api/auth/login", data={"username": "other@ex.com", "password": "Password1"})
    other_token = other_login.json()["access_token"]
    create = client.post(
        "/api/projects",
        json={"title": "Private"},
        headers={"Authorization": f"Bearer {other_token}"},
    )
    pid = create.json()["id"]
    resp = client.get(f"/api/projects/{pid}", headers={"Authorization": f"Bearer {auth_token}"})
    assert resp.status_code == 404
