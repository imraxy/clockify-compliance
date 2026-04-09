from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.services.clockify_client import ClockifyClient, parse_clockify_entry
from app.services.merge_entries import upsert_time_entry


def sync_workspace_range(
    db: Session,
    client: ClockifyClient,
    workspace_id: str,
    *,
    start: datetime,
    end: datetime,
) -> dict[str, Any]:
    users_payload = client.list_users(workspace_id)
    updated_users = 0
    imported_entries = 0
    errors: list[str] = []

    email_by_clockify_id: dict[str, str] = {}
    for u in users_payload:
        cid = u.get("id")
        email = (u.get("email") or "").lower().strip()
        if cid and email:
            email_by_clockify_id[str(cid)] = email

    db_users = {u.email.lower(): u for u in db.scalars(select(User)).all()}
    for cid, email in email_by_clockify_id.items():
        user = db_users.get(email)
        if user and user.clockify_user_id != cid:
            user.clockify_user_id = cid
            db.add(user)
            updated_users += 1
    db.commit()

    for u in users_payload:
        cid = str(u.get("id") or "")
        email = (u.get("email") or "").lower().strip()
        user = db_users.get(email)
        if not user or not cid:
            continue
        try:
            entries = client.list_time_entries(workspace_id, cid, start=start, end=end)
        except Exception as e:  # noqa: BLE001
            errors.append(f"sync user {email}: {e}")
            continue
        for row in entries:
            try:
                s, e, desc, pname, eid = parse_clockify_entry(row)
                upsert_time_entry(
                    db,
                    user_id=user.id,
                    start=s,
                    end=e,
                    description=desc,
                    project_name=pname,
                    external_id=eid or None,
                    source="clockify_api",
                )
                imported_entries += 1
            except Exception as ex:  # noqa: BLE001
                errors.append(f"entry parse {email}: {ex}")
    db.commit()
    return {
        "updated_user_links": updated_users,
        "imported_entries": imported_entries,
        "errors": errors,
    }
