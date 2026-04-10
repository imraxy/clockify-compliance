from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import User, UserRole
from app.services.csv_import import (
    import_time_entries_csv,
    import_time_entries_excel,
    import_attendance_csv,
    import_attendance_excel,
)

router = APIRouter(prefix="/api/v1/import", tags=["import"])


@router.post("/time-entries")
async def import_time_entries(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.admin))],
    file: UploadFile = File(...),
) -> dict:
    raw = await file.read()
    filename = file.filename or ""
    
    if filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls"):
        return import_time_entries_excel(db, raw)
    else:
        # Treat as CSV
        text = raw.decode("utf-8")
        return import_time_entries_csv(db, text)


@router.post("/attendance")
async def import_attendance(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.admin))],
    file: UploadFile = File(...),
) -> dict:
    raw = await file.read()
    filename = file.filename or ""
    
    if filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls"):
        return import_attendance_excel(db, raw)
    else:
        # Treat as CSV
        text = raw.decode("utf-8")
        return import_attendance_csv(db, text)