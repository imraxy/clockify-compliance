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
