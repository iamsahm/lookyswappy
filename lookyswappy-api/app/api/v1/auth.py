from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentDevice
from app.config import get_settings
from app.database import get_db
from app.schemas.auth import DeviceInfo, DeviceRegisterRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()
settings = get_settings()


@router.post(
    "/register-device",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a device",
    description="Register a new device or retrieve token for existing device.",
)
async def register_device(
    request: DeviceRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    auth_service = AuthService(db)
    device, token = await auth_service.register_device(request.device_id)

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)

    return TokenResponse(
        access_token=token,
        expires_at=expires_at,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh token",
    description="Get a new token before the current one expires.",
)
async def refresh_token(
    device: CurrentDevice,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    auth_service = AuthService(db)
    token = await auth_service.refresh_token(device)

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)

    return TokenResponse(
        access_token=token,
        expires_at=expires_at,
    )


@router.get(
    "/me",
    response_model=DeviceInfo,
    summary="Get current device info",
    description="Get information about the authenticated device.",
)
async def get_me(device: CurrentDevice) -> DeviceInfo:
    return DeviceInfo.model_validate(device)
