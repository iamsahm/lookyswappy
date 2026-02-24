from fastapi import APIRouter

router = APIRouter()


@router.post("/register-device")
async def register_device() -> dict[str, str]:
    """Register a new device and return a JWT token."""
    # TODO: Implement in SDR-13
    return {"message": "Not implemented"}


@router.post("/refresh")
async def refresh_token() -> dict[str, str]:
    """Refresh an existing JWT token."""
    # TODO: Implement in SDR-13
    return {"message": "Not implemented"}
