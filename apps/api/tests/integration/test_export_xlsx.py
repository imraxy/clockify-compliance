def test_export_xlsx_returns_bytes(client, seed_users):
    r = client.post("/api/v1/auth/login", json={"email": "reviewer@example.com", "password": "reviewer123"})
    token = r.json()["access_token"]
    resp = client.get(
        "/api/v1/compliance/month/export.xlsx",
        params={"year": 2026, "month": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/vnd.openxmlformats")
    assert len(resp.content) > 200
