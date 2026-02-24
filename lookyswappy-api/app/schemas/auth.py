from pydantic import BaseModel


class DeviceRegisterRequest(BaseModel):
    """Request to register a new device."""

    device_id: str


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
