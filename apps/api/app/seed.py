"""Development seed users (idempotent)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth_jwt import hash_password
from app.database import Base, SessionLocal, engine
from app.models import User, UserRole


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        if db.scalars(select(User).where(User.email == "admin@example.com")).first():
            return
        db.add(
            User(
                email="admin@example.com",
                hashed_password=hash_password("admin123"),
                full_name="Admin User",
                role=UserRole.admin,
            )
        )
        db.add(
            User(
                email="reviewer@example.com",
                hashed_password=hash_password("reviewer123"),
                full_name="Reviewer User",
                role=UserRole.reviewer,
            )
        )
        db.add(
            User(
                email="employee@example.com",
                hashed_password=hash_password("employee123"),
                full_name="Employee User",
                role=UserRole.employee,
            )
        )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
