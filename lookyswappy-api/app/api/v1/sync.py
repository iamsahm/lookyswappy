from fastapi import APIRouter

router = APIRouter()


@router.get("/pull")
async def pull() -> dict[str, str]:
    """Pull changes from server since last sync."""
    # TODO: Implement in SDR-14
    return {"message": "Not implemented"}


@router.post("/push")
async def push() -> dict[str, str]:
    """Push local changes to server."""
    # TODO: Implement in SDR-14
    return {"message": "Not implemented"}
