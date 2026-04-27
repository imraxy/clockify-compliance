from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import aliased
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import ComplianceOverride, User, UserRole
from app.schemas import ComplianceOverrideIn

router = APIRouter(prefix="/api/v1/overrides", tags=["overrides"])


@router.get("")
def list_overrides(
    db: Annotated[Session, Depends(get_db)],
    _current: Annotated[User, Depends(require_roles(UserRole.reviewer, UserRole.admin))],
) -> dict:
    target_user = aliased(User)
    creator_user = aliased(User)
    rows = db.execute(
        select(ComplianceOverride, target_user.email, creator_user.email)
        .join(target_user, ComplianceOverride.user_id == target_user.id)
        .join(creator_user, ComplianceOverride.created_by_user_id == creator_user.id)
        .order_by(ComplianceOverride.day.desc(), target_user.email)
    ).all()
    return {
        "overrides": [
            {
                "user_id": override.user_id,
                "user_email": user_email,
                "date": override.day.isoformat(),
                "status": override.status,
                "note": override.note,
                "approved_by": approved_by,
                "created_at": override.created_at.isoformat(),
            }
            for override, user_email, approved_by in rows
        ]
    }


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
