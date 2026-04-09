from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any, Iterable


class ReviewStatus(str, Enum):
    APPROVED = "APPROVED"
    HALF_FILLED = "HALF_FILLED"
    NOT_FILLED = "NOT_FILLED"
    LEAVE = "LEAVE"
    HOLIDAY = "HOLIDAY"
    WEEK_OFF = "WEEK_OFF"
    HACKATHON = "HACKATHON"
    EXEMPT = "EXEMPT"


@dataclass(frozen=True)
class TimeSlice:
    start: datetime
    end: datetime
    description: str = ""
    project_name: str = ""


@dataclass(frozen=True)
class Thresholds:
    approved_min_hours: float = 8.0
    anomaly_long_day_hours: float = 12.0
    anomaly_critical_day_hours: float = 14.0


def load_thresholds(data: dict[str, Any] | None) -> Thresholds:
    if not data:
        return Thresholds()
    return Thresholds(
        approved_min_hours=float(data.get("approved_min_hours", 8.0)),
        anomaly_long_day_hours=float(data.get("anomaly_long_day_hours", 12.0)),
        anomaly_critical_day_hours=float(data.get("anomaly_critical_day_hours", 14.0)),
    )


def total_hours(entries: Iterable[TimeSlice]) -> float:
    return sum(max(0.0, (e.end - e.start).total_seconds() / 3600.0) for e in entries)


def intervals_overlap(a: TimeSlice, b: TimeSlice) -> bool:
    return a.start < b.end and b.start < a.end


def find_overlaps(entries: list[TimeSlice]) -> list[tuple[int, int]]:
    overlaps: list[tuple[int, int]] = []
    for i, a in enumerate(entries):
        for j in range(i + 1, len(entries)):
            b = entries[j]
            if intervals_overlap(a, b):
                overlaps.append((i, j))
    return overlaps


def repeated_identical_blocks(entries_by_day: dict[date, list[TimeSlice]], min_repeat_days: int = 3) -> list[str]:
    """Flag if same (duration, description, project) appears on >= min_repeat_days distinct days."""
    signature_map: dict[tuple[float, str, str], set[date]] = {}
    for d, ents in entries_by_day.items():
        for e in ents:
            h = (round((e.end - e.start).total_seconds() / 3600.0, 4), e.description.strip(), e.project_name.strip())
            signature_map.setdefault(h, set()).add(d)
    flags: list[str] = []
    for sig, days in signature_map.items():
        if len(days) >= min_repeat_days:
            flags.append(f"repeated_block:{sig[0]}h:{sig[1][:40]}:{len(days)}_days")
    return flags


def weekend_day(d: date) -> bool:
    return d.weekday() >= 5


def classify_day(
    day: date,
    entries: list[TimeSlice],
    *,
    thresholds: Thresholds,
    attendance_status: ReviewStatus | None,
    calendar_kind: str | None,
    is_weekend: bool | None = None,
    weekend_allowed: bool = False,
    override_status: ReviewStatus | None = None,
) -> tuple[ReviewStatus, list[str]]:
    anomalies: list[str] = []
    wknd = is_weekend if is_weekend is not None else weekend_day(day)

    if override_status is not None:
        return override_status, anomalies

    if calendar_kind == "HOLIDAY":
        return ReviewStatus.HOLIDAY, anomalies
    if calendar_kind == "HACKATHON":
        return ReviewStatus.HACKATHON, anomalies

    if attendance_status == ReviewStatus.WEEK_OFF:
        return ReviewStatus.WEEK_OFF, anomalies
    if attendance_status == ReviewStatus.LEAVE:
        return ReviewStatus.LEAVE, anomalies

    hours = total_hours(entries)
    if hours >= thresholds.anomaly_critical_day_hours:
        anomalies.append("hours_ge_14")
    elif hours >= thresholds.anomaly_long_day_hours:
        anomalies.append("hours_ge_12")

    ovs = find_overlaps(entries)
    if ovs:
        anomalies.append(f"overlapping_entries:{len(ovs)}")

    if wknd and hours > 0 and not weekend_allowed:
        anomalies.append("weekend_work_unapproved")

    if attendance_status in (ReviewStatus.HOLIDAY, ReviewStatus.HACKATHON):
        return attendance_status, anomalies

    if hours <= 0:
        status = ReviewStatus.NOT_FILLED if not wknd else ReviewStatus.WEEK_OFF
        return status, anomalies

    if hours < thresholds.approved_min_hours:
        return ReviewStatus.HALF_FILLED, anomalies

    return ReviewStatus.APPROVED, anomalies
