from datetime import datetime, timedelta, timezone

from jose import jwt

from app.config import get_settings

settings = get_settings()


def create_access_token(device_id: str) -> tuple[str, int]:
    """Create a JWT access token for a device.

    Returns:
        Tuple of (token, expires_in_seconds)
    """
    expires_delta = timedelta(days=settings.jwt_expire_days)
    expire = datetime.now(timezone.utc) + expires_delta

    to_encode = {
        "sub": device_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }

    token = jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    expires_in = int(expires_delta.total_seconds())
    return token, expires_in


def verify_token(token: str) -> str | None:
    """Verify a JWT token and return the device ID.

    Returns:
        Device ID if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload.get("sub")
    except jwt.JWTError:
        return None
