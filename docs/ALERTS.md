# Alerts (email / Slack)

The API exposes a **plain-text digest** you can pull from automation:

```http
GET /api/v1/compliance/month/digest.txt?year=2026&month=1
Authorization: Bearer <reviewer_or_admin_token>
```

**Recommended v1:** schedule **cron** or **GitHub Actions** (or a worker) to:

1. Obtain a token (service account user) via `POST /api/v1/auth/login`.
2. `curl` the digest URL.
3. Post the body to **Slack incoming webhook** or **SMTP**.

Slack/email SDK integration inside the API can be added later behind the same digest builder (`app/services/alerts.py`).
