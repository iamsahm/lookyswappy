import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Device
from app.services.auth_service import AuthService

# Database session dependency
DBSession = Annotated[AsyncSession, Depends(get_db)]

# Security scheme
security = HTTPBearer()


async def get_current_device(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Device:
    """Validate token and return the authenticated device."""

    token = credentials.credentials
    payload = AuthService.decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    device_id = payload.get("sub")
    if not device_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    auth_service = AuthService(db)
    device = await auth_service.get_device_by_id(uuid.UUID(device_id))

    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device not found",
        )

    return device


# Type alias for cleaner endpoint signatures
CurrentDevice = Annotated[Device, Depends(get_current_device)]
