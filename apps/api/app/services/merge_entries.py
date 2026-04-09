from __future__ import annotations

import hashlib
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import TimeEntry, User


def stable_csv_external_id(user_id: int, start: datetime, end: datetime, description: str) -> str:
    raw = f"{user_id}|{start.isoformat()}|{end.isoformat()}|{description}"
    return "csv:" + hashlib.sha256(raw.encode()).hexdigest()[:32]


def upsert_time_entry(
    db: Session,
    *,
    user_id: int,
    start: datetime,
    end: datetime,
    description: str,
    project_name: str,
    external_id: str | None,
    source: str,
) -> TimeEntry:
    duration_hours = max(0.0, (end - start).total_seconds() / 3600.0)
    ext = external_id or stable_csv_external_id(user_id, start, end, description)
    existing = db.scalars(
        select(TimeEntry).where(TimeEntry.external_id == ext, TimeEntry.source == source)
    ).first()
    if existing:
        existing.start = start
        existing.end = end
        existing.duration_hours = duration_hours
        existing.description = description
        existing.project_name = project_name
        db.add(existing)
        return existing
    te = TimeEntry(
        user_id=user_id,
        start=start,
        end=end,
        duration_hours=duration_hours,
        description=description,
        project_name=project_name,
        external_id=ext,
        source=source,
    )
    db.add(te)
    return te


def resolve_user_by_email(db: Session, email: str) -> User | None:
    return db.execute(select(User).where(User.email == email.lower().strip())).scalar_one_or_none()
