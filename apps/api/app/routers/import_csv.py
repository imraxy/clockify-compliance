from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import User, UserRole
from app.services.csv_import import import_attendance_csv, import_time_entries_csv

router = APIRouter(prefix="/api/v1/import", tags=["import"])


@router.post("/time-entries")
async def import_time_entries(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.admin))],
    file: UploadFile = File(...),
) -> dict:
    raw = (await file.read()).decode("utf-8")
    return import_time_entries_csv(db, raw)


@router.post("/attendance")
async def import_attendance(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.admin))],
    file: UploadFile = File(...),
) -> dict:
    raw = (await file.read()).decode("utf-8")
    return import_attendance_csv(db, raw)
