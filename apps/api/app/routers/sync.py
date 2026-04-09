from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import require_roles
from app.models import User, UserRole
from app.schemas import SyncRequest
from app.services.clockify_client import ClockifyClient
from app.services.clockify_sync import sync_workspace_range

router = APIRouter(prefix="/api/v1/sync", tags=["sync"])


@router.post("/clockify")
def sync_clockify(
    body: SyncRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.admin))],
) -> dict:
    settings = get_settings()
    if not settings.clockify_api_key or not settings.clockify_workspace_id:
        raise HTTPException(status_code=400, detail="Clockify API key or workspace id not configured")
    client = ClockifyClient(settings.clockify_api_base, settings.clockify_api_key)
    return sync_workspace_range(
        db,
        client,
        settings.clockify_workspace_id,
        start=body.start,
        end=body.end,
    )
