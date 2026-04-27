from datetime import datetime, timezone

from app.models import TimeEntry
from app.services.clockify_client import parse_clockify_entry
from app.services.clockify_sync import sync_workspace_range


def test_parse_clockify_entry_shape() -> None:
    row = {
        "id": "abc",
        "description": "task",
        "projectId": None,
        "timeInterval": {
            "start": "2026-01-06T09:00:00Z",
            "end": "2026-01-06T17:00:00Z",
        },
    }
    s, e, desc, pname, eid = parse_clockify_entry(row)
    assert eid == "abc"
    assert desc == "task"
    assert s.tzinfo is not None
    assert (e - s).total_seconds() == 8 * 3600


class FakeClockifyClient:
    def list_users(self, _workspace_id: str):
        return [{"id": "u1", "email": "employee@example.com"}]

    def list_projects(self, _workspace_id: str):
        return [{"id": "p1", "name": "Client Project"}]

    def list_time_entries(self, _workspace_id: str, _user_id: str, *, start: datetime, end: datetime):
        return [
            {
                "id": "e1",
                "description": "task",
                "projectId": "p1",
                "timeInterval": {
                    "start": "2026-01-06T09:00:00Z",
                    "end": "2026-01-06T17:00:00Z",
                },
            }
        ]


def test_sync_workspace_range_persists_project_names(db_session, seed_users) -> None:
    result = sync_workspace_range(
        db_session,
        FakeClockifyClient(),
        "workspace",
        start=datetime(2026, 1, 6, tzinfo=timezone.utc),
        end=datetime(2026, 1, 7, tzinfo=timezone.utc),
    )

    assert result["imported_entries"] == 1
    entry = db_session.query(TimeEntry).one()
    assert entry.project_name == "Client Project"
