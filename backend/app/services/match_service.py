import math
import logging
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import get_settings
from app.core.redis import get_redis
from app.models.user import User

from app.models.match import Match
from app.models.submission import Submission

settings = get_settings()
logger = logging.getLogger(__name__)


class ELOService:
    """ELO rating calculation and updates."""

    @staticmethod
    def calculate_elo(
        winner_rating: int, loser_rating: int, k: int = None
    ) -> tuple[int, int]:
        """Calculate new ELO ratings for winner and loser.
        Returns (new_winner_rating, new_loser_rating).
        """
        k = k or settings.ELO_K_FACTOR
        expected_winner = 1.0 / (1.0 + math.pow(10, (loser_rating - winner_rating) / 400))
        expected_loser = 1.0 - expected_winner

        new_winner = round(winner_rating + k * (1 - expected_winner))
        new_loser = round(loser_rating + k * (0 - expected_loser))

        # Floor at 100
        new_loser = max(100, new_loser)

        return new_winner, new_loser


class MatchService:
    """Handles match state transitions, submissions, and rating updates."""

    @staticmethod
    async def start_match(db: AsyncSession, match_id: str) -> Match:
        """Transition match from WAITING to STARTED."""
        result = await db.execute(
            select(Match)
            .options(joinedload(Match.player1), joinedload(Match.player2))
            .where(Match.id == match_id)
        )
        match = result.scalar_one_or_none()
        if not match:
            raise ValueError("Match not found")

        match.status = "STARTED"
        match.started_at = datetime.now(timezone.utc)
        await db.flush()
        return match

    @staticmethod
    async def submit_solution(
        db: AsyncSession,
        match_id: str,
        user_id: str,
        code: str,
        passed: bool,
        runtime: float = None,
    ) -> Submission:
        """Record a submission. If passed, declare winner and update ELO."""
        # Validate match is active or waiting (auto-start)
        result = await db.execute(select(Match).where(Match.id == match_id))
        match = result.scalar_one_or_none()
        if not match:
            raise ValueError("Match not found")
        
        if match.status == "WAITING":
            # Auto-start if someone submits while waiting (common in solo testing)
            match.status = "STARTED"
            match.started_at = datetime.now(timezone.utc)
        elif match.status != "STARTED":
            raise ValueError("Match is not active")
        if user_id not in (match.player1_id, match.player2_id):
            raise ValueError("User is not part of this match")

        # Check for duplicate win submissions
        if match.winner_id is not None:
            raise ValueError("Match already has a winner")

        # Create submission
        submission = Submission(
            match_id=match_id,
            user_id=user_id,
            code=code,
            status="passed" if passed else "failed",
            runtime=runtime,
        )
        db.add(submission)

        # If passed, declare winner
        if passed:
            match.winner_id = user_id
            match.status = "FINISHED"
            match.ended_at = datetime.now(timezone.utc)

            # Determine winner and loser
            loser_id = (
                match.player2_id if user_id == match.player1_id else match.player1_id
            )

            # Get users
            winner_result = await db.execute(select(User).where(User.id == user_id))
            loser_result = await db.execute(select(User).where(User.id == loser_id))
            winner = winner_result.scalar_one()
            loser = loser_result.scalar_one()

            # Calculate new ratings
            new_winner_rating, new_loser_rating = ELOService.calculate_elo(
                winner.rating, loser.rating
            )

            # Update ratings
            winner.rating = new_winner_rating
            winner.wins += 1
            loser.rating = new_loser_rating
            loser.losses += 1

            logger.info(
                f"Match {match_id} won by {user_id}. "
                f"Winner: {winner.rating} → {new_winner_rating}, "
                f"Loser: {loser.rating} → {new_loser_rating}"
            )

            # Notify global lobby/leaderboard
            import json
            redis = await get_redis()
            await redis.publish("global:lobby", json.dumps({
                "type": "leaderboard_update",
                "match_id": match_id,
                "winner_id": user_id
            }))

        await db.flush()

        return submission

    @staticmethod
    async def end_match_timeout(db: AsyncSession, match_id: str) -> Match:
        """End match due to timeout (draw)."""
        result = await db.execute(select(Match).where(Match.id == match_id))
        match = result.scalar_one_or_none()
        if match and match.status == "STARTED":
            match.status = "FINISHED"
            match.ended_at = datetime.now(timezone.utc)
            await db.flush()

            # Notify global lobby
            import json
            redis = await get_redis()
            await redis.publish("global:lobby", json.dumps({
                "type": "leaderboard_update",
                "match_id": match_id,
                "reason": "timeout"
            }))
        return match


    @staticmethod
    async def get_match(db: AsyncSession, match_id: str) -> Match:
        result = await db.execute(
            select(Match)
            .options(joinedload(Match.player1), joinedload(Match.player2))
            .where(Match.id == match_id)
        )
        return result.scalar_one_or_none()
