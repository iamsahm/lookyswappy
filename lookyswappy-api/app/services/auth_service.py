import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Device

settings = get_settings()


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_device(self, device_id: str) -> tuple[Device, str]:
        """Register a new device or return existing one."""

        # Check if device already exists
        stmt = select(Device).where(Device.device_id == device_id)
        result = await self.db.execute(stmt)
        device = result.scalar_one_or_none()

        if device:
            # Update last_seen
            device.last_seen = datetime.now(timezone.utc)
        else:
            # Create new device
            device = Device(device_id=device_id)
            self.db.add(device)

        await self.db.commit()
        await self.db.refresh(device)

        # Generate token
        token = self._create_token(device)

        return device, token

    async def get_device_by_id(self, device_db_id: uuid.UUID) -> Device | None:
        """Get device by database ID."""
        stmt = select(Device).where(Device.id == device_db_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def refresh_token(self, device: Device) -> str:
        """Generate a new token for an existing device."""
        device.last_seen = datetime.now(timezone.utc)
        await self.db.commit()
        return self._create_token(device)

    def _create_token(self, device: Device) -> str:
        """Create a JWT token for the device."""
        expires = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)

        payload = {
            "sub": str(device.id),  # Device's database UUID
            "device_id": device.device_id,  # Client-generated UUID
            "exp": expires,
            "iat": datetime.now(timezone.utc),
        }

        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    @staticmethod
    def decode_token(token: str) -> dict | None:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
            )
            return payload
        except JWTError:
            return None
