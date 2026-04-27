"""Tests for timezone utilities."""
from datetime import date, datetime, timezone

from app.services.rules import TimeSlice
from app.services.tz import (
    entries_for_local_day_tz,
    local_date,
    split_entry_by_local_midnight,
    to_local,
)


def test_to_local_converts_utc():
    """Test that UTC datetimes are converted to local time."""
    # 09:00 UTC = 14:30 IST (UTC+5:30)
    utc = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)
    local = to_local(utc)
    assert local.hour == 14
    assert local.minute == 30


def test_to_local_handles_naive():
    """Test that naive datetimes are treated as UTC."""
    naive = datetime(2026, 1, 5, 9, 0)
    local = to_local(naive)
    assert local.hour == 14
    assert local.minute == 30


def test_local_date_returns_correct_date():
    """Test that local_date returns the correct local calendar date."""
    # 19:30 UTC on Jan 5 = 01:00 IST on Jan 6
    utc = datetime(2026, 1, 5, 19, 30, tzinfo=timezone.utc)
    d = local_date(utc)
    assert d == date(2026, 1, 6)


def test_split_entry_same_day():
    """Test that entries on the same local day are not split."""
    # 09:00 to 17:00 IST (03:30 to 11:30 UTC)
    start = datetime(2026, 1, 5, 3, 30, tzinfo=timezone.utc)
    end = datetime(2026, 1, 5, 11, 30, tzinfo=timezone.utc)
    
    segments = split_entry_by_local_midnight(start, end, "work", "proj1")
    
    assert len(segments) == 1
    assert segments[0][0] == date(2026, 1, 5)
    assert segments[0][1].start == start
    assert segments[0][1].end == end


def test_split_entry_crosses_midnight():
    """Test that entries crossing local midnight are split correctly."""
    # 23:00 to 01:00 IST (17:30 to 19:30 UTC same day)
    # Actually let's do: 23:00 IST Jan 5 to 01:00 IST Jan 6
    # = 17:30 UTC Jan 5 to 19:30 UTC Jan 5
    start = datetime(2026, 1, 5, 17, 30, tzinfo=timezone.utc)
    end = datetime(2026, 1, 5, 19, 30, tzinfo=timezone.utc)
    
    segments = split_entry_by_local_midnight(start, end, "night work", "proj1")
    
    # Should be split into two days in local time (IST)
    assert len(segments) == 2
    
    # First segment: Jan 5, 23:00 to 23:59:59.999
    assert segments[0][0] == date(2026, 1, 5)
    
    # Second segment: Jan 6, 00:00:00 to 01:00
    assert segments[1][0] == date(2026, 1, 6)


def test_entries_for_local_day_tz_same_day():
    """Test entries that fall entirely on one local day."""
    # Entry: 09:00 to 17:00 IST = 03:30 to 11:30 UTC
    entry = type('obj', (object,), {
        'start': datetime(2026, 1, 5, 3, 30, tzinfo=timezone.utc),
        'end': datetime(2026, 1, 5, 11, 30, tzinfo=timezone.utc),
        'description': 'day work',
        'project_name': 'proj1',
    })()
    
    result = entries_for_local_day_tz([entry], date(2026, 1, 5))
    
    assert len(result) == 1
    assert result[0].description == 'day work'
    assert result[0].start == entry.start
    assert result[0].end == entry.end


def test_entries_for_local_day_tz_crosses_midnight():
    """Test entry that crosses local midnight is attributed to correct day(s)."""
    # Entry: 23:00 IST Jan 5 to 01:00 IST Jan 6 = 17:30 to 19:30 UTC Jan 5
    entry = type('obj', (object,), {
        'start': datetime(2026, 1, 5, 17, 30, tzinfo=timezone.utc),
        'end': datetime(2026, 1, 5, 19, 30, tzinfo=timezone.utc),
        'description': 'night shift',
        'project_name': 'proj1',
    })()
    
    # Query for Jan 5 - should get first segment
    result_jan5 = entries_for_local_day_tz([entry], date(2026, 1, 5))
    assert len(result_jan5) == 1
    
    # Query for Jan 6 - should get second segment  
    result_jan6 = entries_for_local_day_tz([entry], date(2026, 1, 6))
    assert len(result_jan6) == 1
    
    # Combined hours should equal original
    from app.services.rules import total_hours
    total_original = total_hours([TimeSlice(entry.start, entry.end)])
    total_split = total_hours(result_jan5) + total_hours(result_jan6)
    assert abs(total_original - total_split) < 0.001


def test_entries_for_local_day_tz_not_on_day():
    """Test entries that don't fall on the queried day are excluded."""
    # Entry: 09:00 to 17:00 IST on Jan 5
    entry = type('obj', (object,), {
        'start': datetime(2026, 1, 5, 3, 30, tzinfo=timezone.utc),
        'end': datetime(2026, 1, 5, 11, 30, tzinfo=timezone.utc),
        'description': 'day work',
        'project_name': 'proj1',
    })()
    
    # Query for Jan 6 - should get nothing
    result = entries_for_local_day_tz([entry], date(2026, 1, 6))
    assert len(result) == 0


def test_entries_for_local_day_tz_utc_boundary_issue():
    """Regression test: entry near UTC midnight should be on correct local day.
    
    This tests the bug where an entry logged at 19:00 IST (which is 13:30 UTC same day)
    was being attributed to the wrong day due to UTC date comparison.
    """
    # Entry: 19:00 to 20:00 IST = 13:30 to 14:30 UTC (same UTC day)
    # But old code would use UTC date (Jan 5) instead of local date (Jan 5) - both same here
    # Let's use a case where UTC and IST dates differ:
    # 23:30 IST Jan 5 = 18:00 UTC Jan 5 (both same day in this case too)
    # Actually need: 00:30 IST Jan 6 = 19:00 UTC Jan 5 (dates differ!)
    
    entry = type('obj', (object,), {
        'start': datetime(2026, 1, 5, 19, 0, tzinfo=timezone.utc),  # 00:30 IST Jan 6
        'end': datetime(2026, 1, 5, 20, 0, tzinfo=timezone.utc),   # 01:30 IST Jan 6
        'description': 'early morning',
        'project_name': 'proj1',
    })()
    
    # Old code would use UTC date (Jan 5), but local date is Jan 6
    # Query for Jan 6 - should find the entry
    result = entries_for_local_day_tz([entry], date(2026, 1, 6))
    
    assert len(result) == 1
    assert result[0].description == 'early morning'
