"""Timezone utilities for converting between UTC and local time."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any

UTC = timezone.utc


def get_app_timezone() -> Any:
    """Return the application timezone (defaults to Asia/Kolkata/IST).
    
    Uses zoneinfo if available (Python 3.9+), otherwise falls back to
    a simple offset-based approach for common timezones.
    """
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo("Asia/Kolkata")
    except Exception:
        # Fallback: IST is UTC+5:30
        return timezone(timedelta(hours=5, minutes=30))


def to_local(dt: datetime, tz: Any | None = None) -> datetime:
    """Convert a datetime to local timezone.
    
    If dt is naive, assumes it's UTC.
    """
    if tz is None:
        tz = get_app_timezone()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(tz)


def local_date(dt: datetime, tz: Any | None = None) -> date:
    """Get the local calendar date for a datetime."""
    return to_local(dt, tz).date()


def split_entry_by_local_midnight(
    start: datetime,
    end: datetime,
    description: str,
    project_name: str,
    tz: Any | None = None,
) -> list[tuple[date, Any]]:
    """Split a time entry that crosses local midnight into multiple day segments.
    
    Returns list of (local_date, TimeSlice-like tuple) for each day the entry spans.
    """
    from app.services.rules import TimeSlice
    
    if tz is None:
        tz = get_app_timezone()
    
    # Ensure timezone-aware
    if start.tzinfo is None:
        start = start.replace(tzinfo=UTC)
    if end.tzinfo is None:
        end = end.replace(tzinfo=UTC)
    
    # Convert to local
    local_start = start.astimezone(tz)
    local_end = end.astimezone(tz)
    
    result: list[tuple[date, Any]] = []
    current = local_start
    
    while current.date() < local_end.date():
        # End of current local day
        day_end = datetime.combine(current.date(), time.max, tzinfo=tz)
        # Convert back to UTC for storage consistency
        result.append((
            current.date(),
            TimeSlice(
                start=current.astimezone(UTC),
                end=day_end.astimezone(UTC),
                description=description,
                project_name=project_name,
            )
        ))
        # Move to start of next day in local time
        current = datetime.combine(current.date() + timedelta(days=1), time.min, tzinfo=tz)
    
    # Final segment (or only segment if same day)
    if current <= local_end:
        result.append((
            current.date(),
            TimeSlice(
                start=current.astimezone(UTC),
                end=local_end.astimezone(UTC),
                description=description,
                project_name=project_name,
            )
        ))
    
    return result


def entries_for_local_day_tz(
    entries: list[Any],
    day: date,
    tz: Any | None = None,
) -> list[Any]:
    """Slice entries that overlap a local calendar day, accounting for timezone.
    
    Unlike the original entries_for_local_day which used UTC dates directly,
    this function converts to local time before determining which day an entry belongs to.
    
    Entries that span local midnight are split and attributed to the correct local day(s).
    """
    from app.services.rules import TimeSlice
    
    if tz is None:
        tz = get_app_timezone()
    
    out: list[TimeSlice] = []
    for e in entries:
        start = e.start
        end = e.end
        
        # Get local dates for this entry
        local_start_date = local_date(start, tz)
        local_end_date = local_date(end, tz)
        
        if local_start_date == day:
            # Entry starts on this day
            if local_end_date == day:
                # Whole entry is on this day
                out.append(TimeSlice(
                    start=start if start.tzinfo else start.replace(tzinfo=UTC),
                    end=end if end.tzinfo else end.replace(tzinfo=UTC),
                    description=e.description,
                    project_name=e.project_name,
                ))
            else:
                # Entry spans midnight - need to split
                segments = split_entry_by_local_midnight(
                    start, end, e.description, e.project_name, tz
                )
                for seg_date, seg_slice in segments:
                    if seg_date == day:
                        out.append(seg_slice)
                        break
        elif local_end_date == day and local_start_date < day:
            # Entry started on previous day and ends on this day
            segments = split_entry_by_local_midnight(
                start, end, e.description, e.project_name, tz
            )
            for seg_date, seg_slice in segments:
                if seg_date == day:
                    out.append(seg_slice)
                    break
    
    return out
