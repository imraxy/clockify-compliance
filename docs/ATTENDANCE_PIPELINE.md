# Attendance pipeline

## Source of truth

1. **Primary for automation:** CSV export from HR/ops (or nightly export from `Attendance.xlsx`).
2. **Cadence:** Nightly batch import recommended; API `POST /api/v1/attendance/import` accepts the same CSV for ad-hoc loads.

## CSV format

Header row (case-insensitive):

```text
employee_email,date,code
alice@example.com,2026-01-15,P
alice@example.com,2026-01-16,EL
```

- `date`: ISO `YYYY-MM-DD`
- `code`: values aligned with `Attendance.xlsx` (P, WO, EL, WFH, …)

## Mapping

See [`config/attendance_mapping.yaml`](../config/attendance_mapping.yaml). Codes that map to `null` mean “use Clockify hours for compliance that day.”

## Hackathon / public holiday

Use **`company_calendar`** entries (`HOLIDAY`, `HACKATHON`) via API or seed SQL so Book-style labels match without per-employee rows.
