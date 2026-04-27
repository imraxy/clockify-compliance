from __future__ import annotations

from datetime import date

from app.models import ComplianceOverride


def _login(client, email: str, password: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200
    return r.json()["access_token"]


def test_overrides_get_returns_audit_rows(client, seed_users, db_session) -> None:
    token = _login(client, "reviewer@example.com", "reviewer123")
    employee = seed_users["employee"]
    reviewer = seed_users["reviewer"]
    day = date(2026, 1, 7)
    db_session.add(
        ComplianceOverride(
            user_id=employee.id,
            day=day,
            status="APPROVED",
            note="Manager confirmed",
            created_by_user_id=reviewer.id,
        )
    )
    db_session.commit()

    r = client.get("/api/v1/overrides", headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 200
    assert r.json()["overrides"] == [
        {
            "user_id": employee.id,
            "user_email": "employee@example.com",
            "date": "2026-01-07",
            "status": "APPROVED",
            "note": "Manager confirmed",
            "approved_by": "reviewer@example.com",
            "created_at": r.json()["overrides"][0]["created_at"],
        }
    ]


def test_overrides_post_updates_existing_override(client, seed_users, db_session) -> None:
    token = _login(client, "admin@example.com", "admin123")
    employee = seed_users["employee"]
    reviewer = seed_users["reviewer"]
    admin = seed_users["admin"]
    day = date(2026, 1, 8)
    db_session.add(
        ComplianceOverride(
            user_id=employee.id,
            day=day,
            status="HALF_FILLED",
            note="Initial review",
            created_by_user_id=reviewer.id,
        )
    )
    db_session.commit()

    r = client.post(
        "/api/v1/overrides",
        json={"user_id": employee.id, "day": "2026-01-08", "status": "APPROVED", "note": "Corrected"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 200
    assert r.json() == {"ok": True}
    rows = db_session.query(ComplianceOverride).all()
    assert len(rows) == 1
    assert rows[0].status == "APPROVED"
    assert rows[0].note == "Corrected"
    assert rows[0].created_by_user_id == admin.id
