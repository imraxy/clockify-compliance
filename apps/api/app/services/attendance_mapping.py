from __future__ import annotations

from typing import Any

from app.config import load_yaml
from app.services.rules import ReviewStatus


def code_to_override_status(code: str) -> ReviewStatus | None:
    data = load_yaml("attendance_mapping.yaml")
    mapping: dict[str, Any] = data.get("attendance_code_to_status") or {}
    raw = mapping.get(code.strip())
    if raw is None:
        return None
    if raw == "null" or raw is None:
        return None
    return ReviewStatus(str(raw))
