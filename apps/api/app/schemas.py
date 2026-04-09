from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str


class ComplianceOverrideIn(BaseModel):
    user_id: int
    day: date
    status: str
    note: str = ""


class SyncRequest(BaseModel):
    start: datetime
    end: datetime


class JiraVarianceRequest(BaseModel):
    estimates_hours: dict[str, float] = Field(default_factory=dict)
    actual_hours: dict[str, float] = Field(default_factory=dict)
    threshold_ratio: float = 1.5


class JiraVarianceRow(BaseModel):
    issue_key: str
    estimated_hours: float
    actual_hours: float
    variance_hours: float
    exceeds_threshold: bool
