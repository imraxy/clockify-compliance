from datetime import date, datetime, timedelta, timezone

from app.services.rules import (
    ReviewStatus,
    Thresholds,
    TimeSlice,
    classify_day,
    find_overlaps,
    load_thresholds,
    repeated_identical_blocks,
    total_hours,
)


def test_total_hours_sums() -> None:
    base = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)
    entries = [
        TimeSlice(base, base + timedelta(hours=4)),
        TimeSlice(base + timedelta(hours=4), base + timedelta(hours=8)),
    ]
    assert total_hours(entries) == 8.0


def test_classify_approved_and_half() -> None:
    th = Thresholds()
    day = date(2026, 1, 6)  # Tuesday
    base = datetime(2026, 1, 6, 9, 0, tzinfo=timezone.utc)
    ok, _ = classify_day(
        day,
        [TimeSlice(base, base + timedelta(hours=8))],
        thresholds=th,
        attendance_status=None,
        calendar_kind=None,
    )
    assert ok == ReviewStatus.APPROVED

    half, _ = classify_day(
        day,
        [TimeSlice(base, base + timedelta(hours=5))],
        thresholds=th,
        attendance_status=None,
        calendar_kind=None,
    )
    assert half == ReviewStatus.HALF_FILLED


def test_overlap_detection() -> None:
    base = datetime(2026, 1, 6, 9, 0, tzinfo=timezone.utc)
    a = TimeSlice(base, base + timedelta(hours=2))
    b = TimeSlice(base + timedelta(hours=1), base + timedelta(hours=3))
    assert find_overlaps([a, b])


def test_load_thresholds_from_dict() -> None:
    th = load_thresholds({"approved_min_hours": 7.5})
    assert th.approved_min_hours == 7.5


def test_repeated_blocks_flag() -> None:
    base = date(2026, 1, 5)
    t0 = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)
    block = TimeSlice(t0, t0 + timedelta(hours=2), description="x", project_name="p")
    by_day = {
        base: [block],
        base + timedelta(days=1): [block],
        base + timedelta(days=2): [block],
    }
    flags = repeated_identical_blocks(by_day, min_repeat_days=3)
    assert flags


def test_anomaly_time_entries_on_leave() -> None:
    """GH #20: Time entries logged on a Leave day should flag anomaly."""
    th = Thresholds()
    day = date(2026, 1, 6)
    base = datetime(2026, 1, 6, 9, 0, tzinfo=timezone.utc)
    
    status, anomalies = classify_day(
        day,
        [TimeSlice(base, base + timedelta(hours=8))],  # 8 hours logged
        thresholds=th,
        attendance_status=ReviewStatus.LEAVE,
        calendar_kind=None,
    )
    
    assert status == ReviewStatus.LEAVE  # Still shows as Leave
    assert "time_entries_on_leave" in anomalies


def test_anomaly_time_entries_on_holiday() -> None:
    """GH #20: Time entries logged on a Holiday should flag anomaly."""
    th = Thresholds()
    day = date(2026, 1, 6)
    base = datetime(2026, 1, 6, 9, 0, tzinfo=timezone.utc)
    
    status, anomalies = classify_day(
        day,
        [TimeSlice(base, base + timedelta(hours=4))],
        thresholds=th,
        attendance_status=None,
        calendar_kind="HOLIDAY",
    )
    
    assert status == ReviewStatus.HOLIDAY
    assert "time_entries_on_holiday" in anomalies


def test_anomaly_time_entries_on_week_off() -> None:
    """GH #20: Time entries logged on Week Off should flag anomaly."""
    th = Thresholds()
    day = date(2026, 1, 3)  # Saturday
    base = datetime(2026, 1, 3, 9, 0, tzinfo=timezone.utc)
    
    status, anomalies = classify_day(
        day,
        [TimeSlice(base, base + timedelta(hours=6))],
        thresholds=th,
        attendance_status=ReviewStatus.WEEK_OFF,
        calendar_kind=None,
    )
    
    assert status == ReviewStatus.WEEK_OFF
    assert "time_entries_on_week_off" in anomalies


def test_no_anomaly_when_no_entries_on_leave() -> None:
    """No anomaly when leave day has no time entries."""
    th = Thresholds()
    day = date(2026, 1, 6)
    
    status, anomalies = classify_day(
        day,
        [],  # No entries
        thresholds=th,
        attendance_status=ReviewStatus.LEAVE,
        calendar_kind=None,
    )
    
    assert status == ReviewStatus.LEAVE
    assert "time_entries_on_leave" not in anomalies
    assert len(anomalies) == 0


def test_weekend_work_allowed_no_anomaly() -> None:
    """When weekend_allowed=True, no anomaly for weekend with entries."""
    th = Thresholds()
    day = date(2026, 1, 3)  # Saturday
    base = datetime(2026, 1, 3, 9, 0, tzinfo=timezone.utc)
    
    # 8 hours on weekend with weekend_allowed=True -> APPROVED
    status, anomalies = classify_day(
        day,
        [TimeSlice(base, base + timedelta(hours=8))],
        thresholds=th,
        attendance_status=None,  # No explicit week_off code
        calendar_kind=None,
        is_weekend=True,
        weekend_allowed=True,  # Approved weekend work
    )
    
    assert status == ReviewStatus.APPROVED
    assert "weekend_work_unapproved" not in anomalies
    assert "time_entries_on_week_off" not in anomalies  # Not a week_off status day
