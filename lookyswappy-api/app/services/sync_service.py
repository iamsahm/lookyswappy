from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession


async def pull_changes(
    db: AsyncSession,
    device_id: str,
    last_pulled_at: datetime | None = None,
) -> dict:
    """Pull all changes since last sync.

    Args:
        db: Database session
        device_id: Device requesting changes
        last_pulled_at: Timestamp of last successful pull

    Returns:
        Dictionary of changes in WatermelonDB sync format
    """
    # TODO: Implement in SDR-14
    return {
        "changes": {
            "games": {"created": [], "updated": [], "deleted": []},
            "game_players": {"created": [], "updated": [], "deleted": []},
            "rounds": {"created": [], "updated": [], "deleted": []},
            "scores": {"created": [], "updated": [], "deleted": []},
        },
        "timestamp": datetime.now().timestamp(),
    }


async def push_changes(
    db: AsyncSession,
    device_id: str,
    changes: dict,
) -> dict:
    """Push local changes to server.

    Args:
        db: Database session
        device_id: Device pushing changes
        changes: Changes in WatermelonDB sync format

    Returns:
        Result of push operation
    """
    # TODO: Implement in SDR-14
    return {"success": True}
