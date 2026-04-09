from datetime import datetime, timezone

from app.services.clockify_client import parse_clockify_entry


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
