def test_jira_variance_endpoint(client, seed_users) -> None:
    r = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "admin123"})
    token = r.json()["access_token"]
    resp = client.post(
        "/api/v1/jira/variance",
        headers={"Authorization": f"Bearer {token}"},
        json={"estimates_hours": {"X1": 10}, "actual_hours": {"X1": 25}, "threshold_ratio": 1.5},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["exceeds_threshold"] is True
