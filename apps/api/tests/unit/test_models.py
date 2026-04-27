from datetime import timezone

from app.models import utc_now


def test_utc_now_returns_timezone_aware_datetime() -> None:
    assert utc_now().tzinfo is timezone.utc
