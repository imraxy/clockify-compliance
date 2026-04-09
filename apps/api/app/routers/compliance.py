from typing import Annotated

from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import User, UserRole
from app.services.alerts import build_manager_digest_text
from app.services.compliance_builder import build_month_grid
from app.services.excel_export import compliance_to_workbook

router = APIRouter(prefix="/api/v1/compliance", tags=["compliance"])


@router.get("/month")
def month_grid(
    year: int,
    month: int,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_roles(UserRole.reviewer, UserRole.employee, UserRole.admin))],
) -> dict:
    payload = build_month_grid(db, year, month)
    if current.role == UserRole.employee:
        payload["rows"] = [r for r in payload["rows"] if r["user_id"] == current.id]
    return payload


@router.get("/month/export.xlsx")
def export_month_xlsx(
    year: int,
    month: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.reviewer, UserRole.admin))],
) -> Response:
    payload = build_month_grid(db, year, month)
    data = compliance_to_workbook(payload)
    filename = f"compliance-{year}-{month:02d}.xlsx"
    return StreamingResponse(
        iter([data]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/month/digest.txt")
def month_digest(
    year: int,
    month: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.reviewer, UserRole.admin))],
) -> Response:
    payload = build_month_grid(db, year, month)
    text = build_manager_digest_text(payload)
    return Response(content=text, media_type="text/plain; charset=utf-8")
