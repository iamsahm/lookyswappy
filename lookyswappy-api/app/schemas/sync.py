from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SyncPullRequest(BaseModel):
    """Request for pulling changes from server."""

    last_pulled_at: Optional[datetime] = None


class SyncPushRequest(BaseModel):
    """Request for pushing changes to server."""

    changes: dict


class SyncResponse(BaseModel):
    """Response from sync operations."""

    changes: dict
    timestamp: datetime
