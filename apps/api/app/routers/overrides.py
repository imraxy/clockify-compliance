from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import ComplianceOverride, User, UserRole
from app.schemas import ComplianceOverrideIn

router = APIRouter(prefix="/api/v1/overrides", tags=["overrides"])


@router.post("")
def create_override(
    body: ComplianceOverrideIn,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_roles(UserRole.reviewer, UserRole.admin))],
) -> dict:
    target = db.get(User, body.user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    existing = db.scalars(
        select(ComplianceOverride).where(
            ComplianceOverride.user_id == body.user_id,
            ComplianceOverride.day == body.day,
        )
    ).first()
    if existing:
        existing.status = body.status
        existing.note = body.note
        existing.created_by_user_id = current.id
        db.add(existing)
    else:
        db.add(
            ComplianceOverride(
                user_id=body.user_id,
                day=body.day,
                status=body.status,
                note=body.note,
                created_by_user_id=current.id,
            )
        )
    db.commit()
    return {"ok": True}
