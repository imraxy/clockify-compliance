from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx


@dataclass
class ClockifyTimeEntryPayload:
    id: str
    user_id: str
    time_interval: dict[str, str]
    description: str
    project_id: str | None


class ClockifyClient:
    def __init__(self, api_base: str, api_key: str) -> None:
        self._base = api_base.rstrip("/")
        self._headers = {"X-Api-Key": api_key}

    def _client(self) -> httpx.Client:
        return httpx.Client(base_url=self._base, headers=self._headers, timeout=60.0)

    def list_users(self, workspace_id: str) -> list[dict[str, Any]]:
        with self._client() as c:
            r = c.get(f"/workspaces/{workspace_id}/users")
            r.raise_for_status()
            return r.json()

    def list_time_entries(
        self,
        workspace_id: str,
        user_id: str,
        *,
        start: datetime,
        end: datetime,
    ) -> list[dict[str, Any]]:
        params = {
            "start": start.isoformat() + "Z",
            "end": end.isoformat() + "Z",
        }
        with self._client() as c:
            r = c.get(f"/workspaces/{workspace_id}/user/{user_id}/time-entries", params=params)
            r.raise_for_status()
            return r.json()


def parse_clockify_entry(row: dict[str, Any], project_names: dict[str, str] | None = None) -> tuple[datetime, datetime, str, str, str]:
    """Return start, end, description, project_name, external_id."""
    project_names = project_names or {}
    tid = row.get("timeInterval") or row.get("time_interval") or {}
    start_s = tid.get("start")
    end_s = tid.get("end")
    if not start_s or not end_s:
        raise ValueError("missing timeInterval")
    start = datetime.fromisoformat(start_s.replace("Z", "+00:00"))
    end = datetime.fromisoformat(end_s.replace("Z", "+00:00"))
    desc = str(row.get("description") or "")
    pid = row.get("projectId") or row.get("project_id")
    pname = project_names.get(str(pid), "") if pid else ""
    eid = str(row.get("id") or "")
    return start, end, desc, pname, eid
