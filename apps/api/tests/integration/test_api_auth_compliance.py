from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import TimeEntry


def test_login_and_compliance_month(client, seed_users, db_session: Session) -> None:
    emp = seed_users["employee"]
    base = datetime(2026, 1, 6, 9, 0, tzinfo=timezone.utc)
    db_session.add(
        TimeEntry(
            user_id=emp.id,
            start=base,
            end=base + timedelta(hours=8),
            duration_hours=8.0,
            description="work",
            project_name="proj",
            external_id="e1",
            source="clockify_api",
        )
    )
    db_session.commit()

    r = client.post("/api/v1/auth/login", json={"email": "reviewer@example.com", "password": "reviewer123"})
    assert r.status_code == 200
    token = r.json()["access_token"]

    gr = client.get(
        "/api/v1/compliance/month",
        params={"year": 2026, "month": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert gr.status_code == 200
    body = gr.json()
    assert body["year"] == 2026
    row = next(x for x in body["rows"] if x["email"] == "employee@example.com")
    assert row["days"]["6"]["status"] == "APPROVED"
