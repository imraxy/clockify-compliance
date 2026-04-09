from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import User, UserRole
from app.schemas import JiraVarianceRequest, JiraVarianceRow
from app.services.jira_variance import compute_variances

router = APIRouter(prefix="/api/v1/jira", tags=["jira"])


@router.post("/variance", response_model=list[JiraVarianceRow])
def variance(
    body: JiraVarianceRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.reviewer, UserRole.admin))],
) -> list[JiraVarianceRow]:
    _ = db  # reserved for future persisted mappings
    rows = compute_variances(
        body.estimates_hours,
        body.actual_hours,
        threshold_ratio=body.threshold_ratio,
    )
    return [
        JiraVarianceRow(
            issue_key=r.issue_key,
            estimated_hours=r.estimated_hours,
            actual_hours=r.actual_hours,
            variance_hours=r.variance_hours,
            exceeds_threshold=r.exceeds_threshold,
        )
        for r in rows
    ]
