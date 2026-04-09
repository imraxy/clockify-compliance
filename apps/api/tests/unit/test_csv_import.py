from app.services.csv_import import import_time_entries_csv


def test_import_time_entries_csv_roundtrip(db_session, seed_users):
    emp = seed_users["employee"]
    csv_text = (
        "employee_email,start,end,description,project\n"
        f"{emp.email},2026-01-10T09:00:00+00:00,2026-01-10T17:00:00+00:00,dev,projA\n"
    )
    res = import_time_entries_csv(db_session, csv_text)
    assert res["imported"] == 1
    assert not res["errors"]
