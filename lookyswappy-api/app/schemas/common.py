from pydantic import BaseModel


class BaseResponse(BaseModel):
    """Base response model."""

    message: str
