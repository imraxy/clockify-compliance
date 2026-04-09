from __future__ import annotations

import os

# Configure before importing the application package.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ["CONFIG_DIR"] = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "config")
)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth_jwt import hash_password
from app.database import Base, engine, get_db
from app.main import app
from app.models import User, UserRole


@pytest.fixture(autouse=True)
def _reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db_session() -> Session:
    from app.database import SessionLocal

    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture
def client(db_session: Session):
    def _get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def seed_users(db_session: Session):
    u1 = User(
        email="admin@example.com",
        hashed_password=hash_password("admin123"),
        full_name="Admin",
        role=UserRole.admin,
    )
    u2 = User(
        email="reviewer@example.com",
        hashed_password=hash_password("reviewer123"),
        full_name="Reviewer",
        role=UserRole.reviewer,
    )
    u3 = User(
        email="employee@example.com",
        hashed_password=hash_password("employee123"),
        full_name="Employee",
        role=UserRole.employee,
    )
    db_session.add_all([u1, u2, u3])
    db_session.commit()
    for u in (u1, u2, u3):
        db_session.refresh(u)
    return {"admin": u1, "reviewer": u2, "employee": u3}
