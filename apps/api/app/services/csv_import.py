from __future__ import annotations

import csv
import io
from datetime import date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AttendanceDay, User
from app.services.merge_entries import resolve_user_by_email, upsert_time_entry


def _parse_dt(value: str) -> datetime:
    v = value.strip()
    if v.endswith("Z"):
        v = v[:-1] + "+00:00"
    return datetime.fromisoformat(v)


def import_time_entries_csv(db: Session, text: str) -> dict[str, Any]:
    """
    CSV columns: employee_email,start,end,description,project
    ISO-8601 datetimes for start/end.
    """
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return {"imported": 0, "errors": ["empty csv"]}
    errors: list[str] = []
    count = 0
    for i, row in enumerate(rows, start=2):
        try:
            email = (row.get("employee_email") or "").strip().lower()
            if not email:
                errors.append(f"row {i}: missing employee_email")
                continue
            user = resolve_user_by_email(db, email)
            if not user:
                errors.append(f"row {i}: unknown user {email}")
                continue
            start = _parse_dt(row.get("start") or "")
            end = _parse_dt(row.get("end") or "")
            desc = (row.get("description") or "").strip()
            proj = (row.get("project") or "").strip()
            upsert_time_entry(
                db,
                user_id=user.id,
                start=start,
                end=end,
                description=desc,
                project_name=proj,
                external_id=None,
                source="csv",
            )
            count += 1
        except Exception as e:  # noqa: BLE001 — surface row errors
            errors.append(f"row {i}: {e}")
    db.commit()
    return {"imported": count, "errors": errors}


def import_attendance_csv(db: Session, text: str) -> dict[str, Any]:
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    errors: list[str] = []
    count = 0
    for i, row in enumerate(rows, start=2):
        try:
            email = (row.get("employee_email") or "").strip().lower()
            day_s = (row.get("date") or "").strip()
            code = (row.get("code") or "").strip()
            if not email or not day_s or not code:
                errors.append(f"row {i}: missing fields")
                continue
            user = resolve_user_by_email(db, email)
            if not user:
                errors.append(f"row {i}: unknown user {email}")
                continue
            d = date.fromisoformat(day_s)
            existing = db.scalars(
                select(AttendanceDay).where(
                    AttendanceDay.user_id == user.id,
                    AttendanceDay.day == d,
                )
            ).first()
            if existing:
                existing.code = code
            else:
                db.add(AttendanceDay(user_id=user.id, day=d, code=code))
            count += 1
        except Exception as e:  # noqa: BLE001
            errors.append(f"row {i}: {e}")
    db.commit()
    return {"imported": count, "errors": errors}
