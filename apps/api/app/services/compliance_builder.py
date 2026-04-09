from __future__ import annotations

import calendar
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import load_yaml
from app.models import AttendanceDay, CompanyCalendarDay, ComplianceOverride, TimeEntry, User
from app.services.attendance_mapping import code_to_override_status
from app.services.rules import ReviewStatus, TimeSlice, Thresholds, classify_day, load_thresholds, repeated_identical_blocks, total_hours, weekend_day

UTC = timezone.utc


def month_date_range(year: int, month: int) -> tuple[date, date]:
    last = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last)


def entries_for_local_day(entries: list[TimeEntry], day: date) -> list[TimeSlice]:
    """Slice entries that overlap local calendar day (UTC boundary simplification: use entry start date)."""
    out: list[TimeSlice] = []
    for e in entries:
        s = e.start
        if s.tzinfo is None:
            s = s.replace(tzinfo=UTC)
        if s.date() == day:
            en = e.end
            if en.tzinfo is None:
                en = en.replace(tzinfo=UTC)
            out.append(TimeSlice(start=s, end=en, description=e.description, project_name=e.project_name))
    return out


def build_month_grid(db: Session, year: int, month: int) -> dict[str, Any]:
    thresholds = load_thresholds(load_yaml("thresholds.yaml"))
    start_d, end_d = month_date_range(year, month)

    users = list(db.scalars(select(User).where(User.is_active.is_(True))).all())
    cal_days = {
        c.day: c.kind.value
        for c in db.scalars(
            select(CompanyCalendarDay).where(
                CompanyCalendarDay.day >= start_d,
                CompanyCalendarDay.day <= end_d,
            )
        ).all()
    }

    all_entries = list(
        db.scalars(
            select(TimeEntry).where(
                TimeEntry.start >= datetime.combine(start_d, time.min, tzinfo=UTC) - timedelta(days=1),
                TimeEntry.start <= datetime.combine(end_d, time.max, tzinfo=UTC) + timedelta(days=1),
            )
        ).all()
    )
    entries_by_user: dict[int, list[TimeEntry]] = {}
    for e in all_entries:
        entries_by_user.setdefault(e.user_id, []).append(e)

    attendance_map: dict[tuple[int, date], str] = {}
    for a in db.scalars(
        select(AttendanceDay).where(
            AttendanceDay.day >= start_d,
            AttendanceDay.day <= end_d,
        )
    ).all():
        attendance_map[(a.user_id, a.day)] = a.code

    overrides: dict[tuple[int, date], ComplianceOverride] = {}
    for o in db.scalars(
        select(ComplianceOverride).where(
            ComplianceOverride.day >= start_d,
            ComplianceOverride.day <= end_d,
        )
    ).all():
        overrides[(o.user_id, o.day)] = o

    # repeated identical blocks across month per user
    rows: list[dict[str, Any]] = []
    for user in users:
        u_entries = entries_by_user.get(user.id, [])
        by_day: dict[date, list[TimeSlice]] = {}
        d = start_d
        while d <= end_d:
            by_day[d] = entries_for_local_day(u_entries, d)
            d += timedelta(days=1)
        repeat_flags = repeated_identical_blocks(by_day, min_repeat_days=3)

        days_out: dict[str, Any] = {}
        d = start_d
        while d <= end_d:
            slices = by_day[d]
            code = attendance_map.get((user.id, d))
            att_status = code_to_override_status(code) if code else None
            cal_kind = cal_days.get(d)
            ov = overrides.get((user.id, d))
            override_status = ReviewStatus(ov.status) if ov else None
            status, anomalies = classify_day(
                d,
                slices,
                thresholds=thresholds,
                attendance_status=att_status,
                calendar_kind=cal_kind,
                weekend_allowed=override_status == ReviewStatus.EXEMPT,
                override_status=override_status,
            )
            for rf in repeat_flags:
                if rf not in anomalies:
                    anomalies.append(rf)
            days_out[str(d.day)] = {
                "date": d.isoformat(),
                "status": status.value,
                "hours": round(total_hours(slices), 2),
                "anomalies": anomalies,
                "attendance_code": code,
            }
            d += timedelta(days=1)

        rows.append(
            {
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value,
                "days": days_out,
            }
        )

    return {
        "year": year,
        "month": month,
        "rows": rows,
        "thresholds": {
            "approved_min_hours": thresholds.approved_min_hours,
            "anomaly_long_day_hours": thresholds.anomaly_long_day_hours,
        },
    }
