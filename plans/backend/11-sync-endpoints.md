# 11 - Sync Endpoints

## Overview

Implement WatermelonDB-compatible sync protocol with pull/push endpoints, conflict detection, and timestamp-based change tracking.

---

## Sync Protocol

### Pull Flow
```
Client                          Server
  │                               │
  │  GET /sync/pull               │
  │  ?last_pulled_at=timestamp    │
  │  ─────────────────────────────►
  │                               │
  │                               │ Query all tables for
  │                               │ records where
  │                               │ last_modified > timestamp
  │                               │
  │  {                            │
  │    changes: {                 │
  │      games: { created, updated, deleted }
  │      game_players: { ... }    │
  │      rounds: { ... }          │
  │      scores: { ... }          │
  │    },                         │
  │    timestamp: <new_timestamp> │
  │  }                            │
  ◄─────────────────────────────  │
```

### Push Flow
```
Client                          Server
  │                               │
  │  POST /sync/push              │
  │  {                            │
  │    changes: { ... },          │
  │    last_pulled_at: timestamp  │
  │  }                            │
  │  ─────────────────────────────►
  │                               │
  │                               │ Check for conflicts:
  │                               │ Any server changes since
  │                               │ last_pulled_at?
  │                               │
  │                               │ If conflict: reject
  │                               │ If clean: apply changes
  │                               │
  │  { ok: true }                 │
  ◄─────────────────────────────  │
```

---

## Pydantic Schemas

### app/schemas/sync.py

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Any
import uuid


# --- Individual Record Schemas ---

class GameSync(BaseModel):
    """Game record for sync."""
    id: str = Field(..., description="WatermelonDB ID")
    name: str | None = None
    target_score: int = 100
    status: str = "active"
    winner_id: str | None = None
    started_at: datetime
    ended_at: datetime | None = None


class GamePlayerSync(BaseModel):
    """Player record for sync."""
    id: str
    game_id: str
    name: str
    position: int
    current_total: int = 0


class RoundSync(BaseModel):
    """Round record for sync."""
    id: str
    game_id: str
    round_number: int
    caller_id: str | None = None
    created_at: datetime


class ScoreSync(BaseModel):
    """Score record for sync."""
    id: str
    round_id: str
    player_id: str
    raw_score: int
    bonus_applied: int = 0
    final_score: int
    total_after: int


# --- Table Changes ---

class TableChanges[T](BaseModel):
    """Changes for a single table."""
    created: list[T] = Field(default_factory=list)
    updated: list[T] = Field(default_factory=list)
    deleted: list[str] = Field(
        default_factory=list,
        description="List of deleted record IDs",
    )


# --- Request/Response ---

class SyncChanges(BaseModel):
    """All changes across tables."""
    games: TableChanges[GameSync] = Field(default_factory=TableChanges)
    game_players: TableChanges[GamePlayerSync] = Field(default_factory=TableChanges)
    rounds: TableChanges[RoundSync] = Field(default_factory=TableChanges)
    scores: TableChanges[ScoreSync] = Field(default_factory=TableChanges)


class PullRequest(BaseModel):
    """Request params for pull (via query string)."""
    last_pulled_at: float = Field(
        default=0,
        description="Unix timestamp of last successful pull",
    )


class PullResponse(BaseModel):
    """Response from pull endpoint."""
    changes: SyncChanges
    timestamp: float = Field(
        ...,
        description="Server timestamp to use for next pull",
    )


class PushRequest(BaseModel):
    """Request body for push endpoint."""
    changes: SyncChanges
    last_pulled_at: float = Field(
        ...,
        description="Timestamp from last pull (for conflict detection)",
    )


class PushResponse(BaseModel):
    """Response from push endpoint."""
    ok: bool = True
    errors: list[str] = Field(default_factory=list)
```

---

## Sync Service

### app/services/sync_service.py

```python
from datetime import datetime, timezone
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.models import Game, GamePlayer, Round, Score, Device
from app.schemas.sync import (
    SyncChanges,
    TableChanges,
    GameSync,
    GamePlayerSync,
    RoundSync,
    ScoreSync,
)


class SyncService:
    def __init__(self, db: AsyncSession, device: Device):
        self.db = db
        self.device = device

    async def pull(self, last_pulled_at: float) -> tuple[SyncChanges, float]:
        """
        Get all changes since last_pulled_at for this device.
        Returns (changes, new_timestamp).
        """
        # Convert timestamp to datetime
        if last_pulled_at > 0:
            since = datetime.fromtimestamp(last_pulled_at, tz=timezone.utc)
        else:
            since = datetime.min.replace(tzinfo=timezone.utc)

        # Get current server time for next pull
        now = datetime.now(timezone.utc)
        new_timestamp = now.timestamp()

        changes = SyncChanges()

        # Pull games
        changes.games = await self._pull_table(
            Game,
            GameSync,
            since,
            game_id_filter=None,  # Games filtered by device
            device_filter=True,
        )

        # Get game IDs for this device to filter related records
        game_ids = await self._get_device_game_ids()

        # Pull players, rounds, scores (filtered by device's games)
        changes.game_players = await self._pull_table(
            GamePlayer,
            GamePlayerSync,
            since,
            game_id_filter=game_ids,
        )

        changes.rounds = await self._pull_table(
            Round,
            RoundSync,
            since,
            game_id_filter=game_ids,
        )

        # For scores, we need round IDs
        round_ids = await self._get_round_ids(game_ids)
        changes.scores = await self._pull_scores(since, round_ids)

        return changes, new_timestamp

    async def push(
        self,
        changes: SyncChanges,
        last_pulled_at: float,
    ) -> tuple[bool, list[str]]:
        """
        Apply client changes to server.
        Returns (success, errors).
        """
        errors: list[str] = []

        # Check for conflicts (any server changes since last pull)
        has_conflicts = await self._check_conflicts(last_pulled_at)
        if has_conflicts:
            return False, ["Conflict detected. Please pull first."]

        try:
            # Apply changes in order (respecting foreign keys)
            await self._apply_game_changes(changes.games)
            await self._apply_player_changes(changes.game_players)
            await self._apply_round_changes(changes.rounds)
            await self._apply_score_changes(changes.scores)

            await self.db.commit()
            return True, []

        except Exception as e:
            await self.db.rollback()
            errors.append(str(e))
            return False, errors

    async def _pull_table(
        self,
        model,
        schema,
        since: datetime,
        game_id_filter: list[uuid.UUID] | None = None,
        device_filter: bool = False,
    ) -> TableChanges:
        """Generic pull for a syncable table."""
        changes = TableChanges()

        # Base query
        query = select(model).where(model.last_modified > since)

        if device_filter:
            query = query.where(model.device_id == self.device.id)
        elif game_id_filter is not None:
            query = query.where(model.game_id.in_(game_id_filter))

        result = await self.db.execute(query)
        records = result.scalars().all()

        for record in records:
            data = schema.model_validate(record)

            if record.is_deleted:
                changes.deleted.append(record.client_id or str(record.id))
            elif record.client_id is None:
                # Created on server (shouldn't happen in this app)
                changes.created.append(data)
            else:
                changes.updated.append(data)

        return changes

    async def _pull_scores(
        self,
        since: datetime,
        round_ids: list[uuid.UUID],
    ) -> TableChanges[ScoreSync]:
        """Pull scores for the given rounds."""
        changes = TableChanges()

        if not round_ids:
            return changes

        query = select(Score).where(
            and_(
                Score.last_modified > since,
                Score.round_id.in_(round_ids),
            )
        )

        result = await self.db.execute(query)
        records = result.scalars().all()

        for record in records:
            data = ScoreSync.model_validate(record)

            if record.is_deleted:
                changes.deleted.append(record.client_id or str(record.id))
            else:
                changes.updated.append(data)

        return changes

    async def _get_device_game_ids(self) -> list[uuid.UUID]:
        """Get all game IDs for this device."""
        query = select(Game.id).where(
            and_(
                Game.device_id == self.device.id,
                Game.is_deleted == False,
            )
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _get_round_ids(self, game_ids: list[uuid.UUID]) -> list[uuid.UUID]:
        """Get all round IDs for the given games."""
        if not game_ids:
            return []

        query = select(Round.id).where(
            and_(
                Round.game_id.in_(game_ids),
                Round.is_deleted == False,
            )
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _check_conflicts(self, last_pulled_at: float) -> bool:
        """Check if there are any server changes since last pull."""
        since = datetime.fromtimestamp(last_pulled_at, tz=timezone.utc)

        # Check games table for any modifications
        query = select(Game.id).where(
            and_(
                Game.device_id == self.device.id,
                Game.last_modified > since,
            )
        ).limit(1)

        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

    async def _apply_game_changes(self, changes: TableChanges[GameSync]):
        """Apply game changes from client."""
        for game_data in changes.created:
            game = Game(
                client_id=game_data.id,
                device_id=self.device.id,
                name=game_data.name,
                target_score=game_data.target_score,
                status=game_data.status,
                started_at=game_data.started_at,
            )
            self.db.add(game)

        for game_data in changes.updated:
            query = select(Game).where(Game.client_id == game_data.id)
            result = await self.db.execute(query)
            game = result.scalar_one_or_none()

            if game:
                game.name = game_data.name
                game.target_score = game_data.target_score
                game.status = game_data.status
                game.ended_at = game_data.ended_at

        for client_id in changes.deleted:
            query = select(Game).where(Game.client_id == client_id)
            result = await self.db.execute(query)
            game = result.scalar_one_or_none()

            if game:
                game.is_deleted = True

    async def _apply_player_changes(self, changes: TableChanges[GamePlayerSync]):
        """Apply player changes from client."""
        for data in changes.created:
            # Look up server game ID
            game = await self._get_game_by_client_id(data.game_id)
            if not game:
                continue

            player = GamePlayer(
                client_id=data.id,
                game_id=game.id,
                name=data.name,
                position=data.position,
                current_total=data.current_total,
            )
            self.db.add(player)

        for data in changes.updated:
            query = select(GamePlayer).where(GamePlayer.client_id == data.id)
            result = await self.db.execute(query)
            player = result.scalar_one_or_none()

            if player:
                player.name = data.name
                player.position = data.position
                player.current_total = data.current_total

        for client_id in changes.deleted:
            query = select(GamePlayer).where(GamePlayer.client_id == client_id)
            result = await self.db.execute(query)
            player = result.scalar_one_or_none()

            if player:
                player.is_deleted = True

    async def _apply_round_changes(self, changes: TableChanges[RoundSync]):
        """Apply round changes from client."""
        # Similar pattern to players...
        pass  # Implementation follows same pattern

    async def _apply_score_changes(self, changes: TableChanges[ScoreSync]):
        """Apply score changes from client."""
        # Similar pattern...
        pass  # Implementation follows same pattern

    async def _get_game_by_client_id(self, client_id: str) -> Game | None:
        """Look up a game by its WatermelonDB ID."""
        query = select(Game).where(Game.client_id == client_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
```

---

## Endpoints

### app/api/v1/sync.py

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import CurrentDevice
from app.schemas.sync import PullResponse, PushRequest, PushResponse
from app.services.sync_service import SyncService

router = APIRouter()


@router.get(
    "/pull",
    response_model=PullResponse,
    summary="Pull changes from server",
    description="Get all changes since last_pulled_at timestamp for this device.",
)
async def pull(
    device: CurrentDevice,
    db: AsyncSession = Depends(get_db),
    last_pulled_at: float = Query(
        default=0,
        description="Unix timestamp of last successful pull (0 for first sync)",
    ),
):
    sync_service = SyncService(db, device)
    changes, timestamp = await sync_service.pull(last_pulled_at)

    return PullResponse(changes=changes, timestamp=timestamp)


@router.post(
    "/push",
    response_model=PushResponse,
    summary="Push changes to server",
    description="Send local changes to server. Will fail if there are conflicts.",
)
async def push(
    request: PushRequest,
    device: CurrentDevice,
    db: AsyncSession = Depends(get_db),
):
    sync_service = SyncService(db, device)
    ok, errors = await sync_service.push(request.changes, request.last_pulled_at)

    return PushResponse(ok=ok, errors=errors)
```

---

## Frontend Sync Implementation

### services/sync.ts

```typescript
import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from '@/database'
import { getAuthHeaders } from './auth'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

export async function syncDatabase() {
  const headers = await getAuthHeaders()

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      const response = await fetch(
        `${API_URL}/api/v1/sync/pull?last_pulled_at=${lastPulledAt || 0}`,
        { headers }
      )

      if (!response.ok) {
        throw new Error('Pull failed')
      }

      const { changes, timestamp } = await response.json()
      return { changes, timestamp }
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      const response = await fetch(`${API_URL}/api/v1/sync/push`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ changes, last_pulled_at: lastPulledAt }),
      })

      if (!response.ok) {
        throw new Error('Push failed')
      }
    },
    migrationsEnabledAtVersion: 1,
  })
}
```

---

## Tasks

- [ ] Create sync schemas with proper typing
- [ ] Implement SyncService with pull/push logic
- [ ] Create sync endpoints
- [ ] Test pull with empty database
- [ ] Test pull with existing data
- [ ] Test push with new records
- [ ] Test conflict detection
- [ ] Implement frontend sync integration
- [ ] Test end-to-end sync flow
