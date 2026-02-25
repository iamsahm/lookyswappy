from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentDevice
from app.database import get_db
from app.schemas.sync import PullResponse, PushRequest, PushResponse, SyncChanges
from app.services.sync_service import SyncService

router = APIRouter()


@router.get(
    "/pull",
    response_model=PullResponse,
    summary="Pull changes from server",
    description="Get all changes since last_pulled_at timestamp for this device.",
)
async def pull(
    device: CurrentDevice,
    db: AsyncSession = Depends(get_db),
    last_pulled_at: float = Query(
        default=0,
        description="Unix timestamp of last successful pull (0 for first sync)",
    ),
) -> PullResponse:
    sync_service = SyncService(db, device)
    changes, timestamp = await sync_service.pull(last_pulled_at)

    return PullResponse(changes=changes, timestamp=timestamp)


@router.post(
    "/push",
    response_model=PushResponse,
    summary="Push changes to server",
    description="Send local changes to server. Will fail if there are conflicts.",
)
async def push(
    request: PushRequest,
    device: CurrentDevice,
    db: AsyncSession = Depends(get_db),
) -> PushResponse:
    sync_service = SyncService(db, device)
    ok, errors = await sync_service.push(request.changes, request.last_pulled_at)

    return PushResponse(ok=ok, errors=errors)
