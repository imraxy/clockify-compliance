from app.services.alerts import build_manager_digest_text, summarize_month_for_digest
from app.services.jira_variance import compute_variances


def test_digest_counts() -> None:
    payload = {
        "year": 2026,
        "month": 1,
        "rows": [
            {
                "days": {
                    "1": {"status": "APPROVED", "anomalies": []},
                    "2": {"status": "NOT_FILLED", "anomalies": []},
                    "3": {"status": "HALF_FILLED", "anomalies": ["x"]},
                }
            }
        ],
    }
    s = summarize_month_for_digest(payload)
    assert s["approved"] == 1
    assert s["not_filled"] == 1
    assert s["half_filled"] == 1
    assert s["anomaly_cells"] == 1
    text = build_manager_digest_text(payload)
    assert "2026-01" in text


def test_jira_variance_flags() -> None:
    rows = compute_variances({"K1": 10.0}, {"K1": 20.0}, threshold_ratio=1.5)
    assert rows[0].exceeds_threshold is True
