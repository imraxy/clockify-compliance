from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class IssueVariance:
    issue_key: str
    estimated_hours: float
    actual_hours: float
    variance_hours: float
    exceeds_threshold: bool


def compute_variances(
    estimates_hours: dict[str, float],
    actual_hours: dict[str, float],
    *,
    threshold_ratio: float = 1.5,
) -> list[IssueVariance]:
    """
    Phase-2 helper: compare Jira original estimate (hours) vs aggregated actuals.
    Flag when actual > estimate * threshold_ratio.
    """
    out: list[IssueVariance] = []
    for key, est in estimates_hours.items():
        act = actual_hours.get(key, 0.0)
        var = act - est
        exceeds = est > 0 and act > est * threshold_ratio
        out.append(
            IssueVariance(
                issue_key=key,
                estimated_hours=est,
                actual_hours=act,
                variance_hours=var,
                exceeds_threshold=exceeds,
            )
        )
    return out
