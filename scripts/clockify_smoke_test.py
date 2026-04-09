#!/usr/bin/env python3
"""
Smoke-test Clockify API access (free plan). Requires env:
  CLOCKIFY_API_KEY
  CLOCKIFY_WORKSPACE_ID
Optional:
  CLOCKIFY_API_BASE (default https://api.clockify.me/api/v1)
"""
from __future__ import annotations

import os
import sys

import httpx


def main() -> int:
    key = os.environ.get("CLOCKIFY_API_KEY", "").strip()
    ws = os.environ.get("CLOCKIFY_WORKSPACE_ID", "").strip()
    base = os.environ.get("CLOCKIFY_API_BASE", "https://api.clockify.me/api/v1").rstrip("/")
    if not key or not ws:
        print("Set CLOCKIFY_API_KEY and CLOCKIFY_WORKSPACE_ID", file=sys.stderr)
        return 2
    headers = {"X-Api-Key": key}
    with httpx.Client(base_url=base, headers=headers, timeout=60.0) as c:
        r = c.get(f"/workspaces/{ws}/users")
        print("GET /workspaces/.../users ->", r.status_code)
        r.raise_for_status()
        users = r.json()
        print("users:", len(users))
        if not users:
            return 0
        uid = users[0].get("id")
        if not uid:
            return 0
        r2 = c.get(f"/workspaces/{ws}/user/{uid}/time-entries", params={"page": "1", "page-size": "1"})
        print("GET time-entries sample ->", r2.status_code)
        r2.raise_for_status()
        print("ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
