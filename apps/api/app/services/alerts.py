from __future__ import annotations

from typing import Any


def summarize_month_for_digest(payload: dict[str, Any]) -> dict[str, int]:
    counts = {
        "not_filled": 0,
        "half_filled": 0,
        "approved": 0,
        "anomaly_cells": 0,
    }
    for row in payload.get("rows") or []:
        for _day, cell in (row.get("days") or {}).items():
            st = (cell.get("status") or "").upper()
            if st == "NOT_FILLED":
                counts["not_filled"] += 1
            elif st == "HALF_FILLED":
                counts["half_filled"] += 1
            elif st == "APPROVED":
                counts["approved"] += 1
            an = cell.get("anomalies") or []
            if an:
                counts["anomaly_cells"] += 1
    return counts


def build_manager_digest_text(payload: dict[str, Any]) -> str:
    s = summarize_month_for_digest(payload)
    y, m = payload.get("year"), payload.get("month")
    lines = [
        f"Compliance digest {y}-{m:02d}",
        f"Approved day-cells: {s['approved']}",
        f"Half filled day-cells: {s['half_filled']}",
        f"Not filled day-cells: {s['not_filled']}",
        f"Cells with anomalies: {s['anomaly_cells']}",
    ]
    return "\n".join(lines)
