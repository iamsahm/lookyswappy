import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Device, Game, GamePlayer, Round, Score
from app.schemas.sync import (
    GamePlayerSync,
    GameSync,
    GameTableChanges,
    PlayerTableChanges,
    RoundSync,
    RoundTableChanges,
    ScoreSync,
    ScoreTableChanges,
    SyncChanges,
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

        # Pull games for this device
        changes.games = await self._pull_games(since)

        # Get game IDs for this device to filter related records
        game_ids = await self._get_device_game_ids()

        # Pull players, rounds (filtered by device's games)
        changes.game_players = await self._pull_players(since, game_ids)
        changes.rounds = await self._pull_rounds(since, game_ids)

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

    async def _pull_games(self, since: datetime) -> GameTableChanges:
        """Pull games for this device."""
        changes = GameTableChanges()

        query = select(Game).where(
            and_(
                Game.device_id == self.device.id,
                Game.last_modified > since,
            )
        )
        result = await self.db.execute(query)
        records = result.scalars().all()

        for record in records:
            sync_id = record.client_id or str(record.id)
            data = GameSync(
                id=sync_id,
                name=record.name,
                target_score=record.target_score,
                status=record.status.value if hasattr(record.status, "value") else record.status,
                winner_id=str(record.winner_id) if record.winner_id else None,
                started_at=record.started_at,
                ended_at=record.ended_at,
            )

            if record.is_deleted:
                changes.deleted.append(sync_id)
            elif record.client_id is None:
                changes.created.append(data)
            else:
                changes.updated.append(data)

        return changes

    async def _pull_players(
        self, since: datetime, game_ids: list[uuid.UUID]
    ) -> PlayerTableChanges:
        """Pull players for the given games."""
        changes = PlayerTableChanges()

        if not game_ids:
            return changes

        query = select(GamePlayer).where(
            and_(
                GamePlayer.game_id.in_(game_ids),
                GamePlayer.last_modified > since,
            )
        )
        result = await self.db.execute(query)
        records = result.scalars().all()

        for record in records:
            sync_id = record.client_id or str(record.id)
            # Get game's client_id for foreign key
            game_client_id = await self._get_client_id_for_game(record.game_id)

            data = GamePlayerSync(
                id=sync_id,
                game_id=game_client_id,
                name=record.name,
                position=record.position,
                current_total=record.current_total,
            )

            if record.is_deleted:
                changes.deleted.append(sync_id)
            elif record.client_id is None:
                changes.created.append(data)
            else:
                changes.updated.append(data)

        return changes

    async def _pull_rounds(
        self, since: datetime, game_ids: list[uuid.UUID]
    ) -> RoundTableChanges:
        """Pull rounds for the given games."""
        changes = RoundTableChanges()

        if not game_ids:
            return changes

        query = select(Round).where(
            and_(
                Round.game_id.in_(game_ids),
                Round.last_modified > since,
            )
        )
        result = await self.db.execute(query)
        records = result.scalars().all()

        for record in records:
            sync_id = record.client_id or str(record.id)
            game_client_id = await self._get_client_id_for_game(record.game_id)
            caller_client_id = None
            if record.caller_id:
                caller_client_id = await self._get_client_id_for_player(record.caller_id)

            data = RoundSync(
                id=sync_id,
                game_id=game_client_id,
                round_number=record.round_number,
                caller_id=caller_client_id,
                created_at=record.created_at,
            )

            if record.is_deleted:
                changes.deleted.append(sync_id)
            elif record.client_id is None:
                changes.created.append(data)
            else:
                changes.updated.append(data)

        return changes

    async def _pull_scores(
        self, since: datetime, round_ids: list[uuid.UUID]
    ) -> ScoreTableChanges:
        """Pull scores for the given rounds."""
        changes = ScoreTableChanges()

        if not round_ids:
            return changes

        query = select(Score).where(
            and_(
                Score.round_id.in_(round_ids),
                Score.last_modified > since,
            )
        )
        result = await self.db.execute(query)
        records = result.scalars().all()

        for record in records:
            sync_id = record.client_id or str(record.id)
            round_client_id = await self._get_client_id_for_round(record.round_id)
            player_client_id = await self._get_client_id_for_player(record.player_id)

            data = ScoreSync(
                id=sync_id,
                round_id=round_client_id,
                player_id=player_client_id,
                raw_score=record.raw_score,
                bonus_applied=record.bonus_applied,
                final_score=record.final_score,
                total_after=record.total_after,
            )

            if record.is_deleted:
                changes.deleted.append(sync_id)
            elif record.client_id is None:
                changes.created.append(data)
            else:
                changes.updated.append(data)

        return changes

    async def _get_device_game_ids(self) -> list[uuid.UUID]:
        """Get all game IDs for this device."""
        query = select(Game.id).where(
            and_(
                Game.device_id == self.device.id,
                Game.is_deleted == False,  # noqa: E712
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
                Round.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _check_conflicts(self, last_pulled_at: float) -> bool:
        """Check if there are any server changes since last pull."""
        since = datetime.fromtimestamp(last_pulled_at, tz=timezone.utc)

        query = (
            select(Game.id)
            .where(
                and_(
                    Game.device_id == self.device.id,
                    Game.last_modified > since,
                )
            )
            .limit(1)
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

    async def _get_client_id_for_game(self, server_id: uuid.UUID) -> str:
        """Get client_id for a game by its server ID."""
        query = select(Game.client_id, Game.id).where(Game.id == server_id)
        result = await self.db.execute(query)
        row = result.one_or_none()
        if row:
            return row[0] or str(row[1])
        return str(server_id)

    async def _get_client_id_for_player(self, server_id: uuid.UUID) -> str:
        """Get client_id for a player by its server ID."""
        query = select(GamePlayer.client_id, GamePlayer.id).where(
            GamePlayer.id == server_id
        )
        result = await self.db.execute(query)
        row = result.one_or_none()
        if row:
            return row[0] or str(row[1])
        return str(server_id)

    async def _get_client_id_for_round(self, server_id: uuid.UUID) -> str:
        """Get client_id for a round by its server ID."""
        query = select(Round.client_id, Round.id).where(Round.id == server_id)
        result = await self.db.execute(query)
        row = result.one_or_none()
        if row:
            return row[0] or str(row[1])
        return str(server_id)

    async def _apply_game_changes(self, changes: GameTableChanges) -> None:
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

    async def _apply_player_changes(self, changes: PlayerTableChanges) -> None:
        """Apply player changes from client."""
        for data in changes.created:
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

    async def _apply_round_changes(self, changes: RoundTableChanges) -> None:
        """Apply round changes from client."""
        for data in changes.created:
            game = await self._get_game_by_client_id(data.game_id)
            if not game:
                continue

            caller_id = None
            if data.caller_id:
                caller = await self._get_player_by_client_id(data.caller_id)
                if caller:
                    caller_id = caller.id

            round_obj = Round(
                client_id=data.id,
                game_id=game.id,
                round_number=data.round_number,
                caller_id=caller_id,
            )
            self.db.add(round_obj)

        for data in changes.updated:
            query = select(Round).where(Round.client_id == data.id)
            result = await self.db.execute(query)
            round_obj = result.scalar_one_or_none()

            if round_obj:
                round_obj.round_number = data.round_number
                if data.caller_id:
                    caller = await self._get_player_by_client_id(data.caller_id)
                    if caller:
                        round_obj.caller_id = caller.id

        for client_id in changes.deleted:
            query = select(Round).where(Round.client_id == client_id)
            result = await self.db.execute(query)
            round_obj = result.scalar_one_or_none()

            if round_obj:
                round_obj.is_deleted = True

    async def _apply_score_changes(self, changes: ScoreTableChanges) -> None:
        """Apply score changes from client."""
        for data in changes.created:
            round_obj = await self._get_round_by_client_id(data.round_id)
            player = await self._get_player_by_client_id(data.player_id)
            if not round_obj or not player:
                continue

            score = Score(
                client_id=data.id,
                round_id=round_obj.id,
                player_id=player.id,
                raw_score=data.raw_score,
                bonus_applied=data.bonus_applied,
                final_score=data.final_score,
                total_after=data.total_after,
            )
            self.db.add(score)

        for data in changes.updated:
            query = select(Score).where(Score.client_id == data.id)
            result = await self.db.execute(query)
            score = result.scalar_one_or_none()

            if score:
                score.raw_score = data.raw_score
                score.bonus_applied = data.bonus_applied
                score.final_score = data.final_score
                score.total_after = data.total_after

        for client_id in changes.deleted:
            query = select(Score).where(Score.client_id == client_id)
            result = await self.db.execute(query)
            score = result.scalar_one_or_none()

            if score:
                score.is_deleted = True

    async def _get_game_by_client_id(self, client_id: str) -> Game | None:
        """Look up a game by its WatermelonDB ID."""
        query = select(Game).where(Game.client_id == client_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _get_player_by_client_id(self, client_id: str) -> GamePlayer | None:
        """Look up a player by its WatermelonDB ID."""
        query = select(GamePlayer).where(GamePlayer.client_id == client_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _get_round_by_client_id(self, client_id: str) -> Round | None:
        """Look up a round by its WatermelonDB ID."""
        query = select(Round).where(Round.client_id == client_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
