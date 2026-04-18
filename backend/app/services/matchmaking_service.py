import json
import asyncio
import logging
from typing import Optional

import redis.asyncio as redis
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.user import User
from app.models.match import Match
from app.models.problem import Problem

settings = get_settings()
logger = logging.getLogger(__name__)

MATCHMAKING_QUEUE_KEY = "matchmaking_queue"
MATCHMAKING_USER_KEY = "matchmaking_user:{user_id}"


class MatchmakingService:
    """Redis Sorted Set based matchmaking with ELO range matching."""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def join_queue(self, user_id: str, rating: int) -> None:
        """Add user to matchmaking queue with their rating as score."""
        await self.redis.zadd(MATCHMAKING_QUEUE_KEY, {user_id: rating})
        # Store join timestamp for range expansion
        await self.redis.set(
            MATCHMAKING_USER_KEY.format(user_id=user_id),
            json.dumps({"rating": rating, "joined_at": asyncio.get_event_loop().time()}),
            ex=300,  # Auto-expire after 5 minutes
        )
        logger.info(f"User {user_id} joined queue with rating {rating}")

    async def leave_queue(self, user_id: str) -> None:
        """Remove user from matchmaking queue."""
        await self.redis.zrem(MATCHMAKING_QUEUE_KEY, user_id)
        await self.redis.delete(MATCHMAKING_USER_KEY.format(user_id=user_id))

    async def find_match(self, user_id: str, rating: int) -> Optional[str]:
        """Find a suitable opponent within ELO range. Expands range over time."""
        elo_range = settings.MATCHMAKING_RANGE

        # Retrieve user data for range expansion
        user_data_raw = await self.redis.get(MATCHMAKING_USER_KEY.format(user_id=user_id))
        if user_data_raw:
            user_data = json.loads(user_data_raw)
            elapsed = asyncio.get_event_loop().time() - user_data.get("joined_at", 0)
            # Expand range by 50 ELO every 10 seconds
            elo_range += int(elapsed / 10) * 50

        min_rating = rating - elo_range
        max_rating = rating + elo_range

        # Get candidates within range
        candidates = await self.redis.zrangebyscore(
            MATCHMAKING_QUEUE_KEY, min_rating, max_rating
        )

        # Filter out self
        candidates = [c for c in candidates if c != user_id]

        if not candidates:
            return None

        # Pick the closest-rated opponent
        best_match = None
        best_diff = float("inf")
        for candidate_id in candidates:
            candidate_rating = await self.redis.zscore(MATCHMAKING_QUEUE_KEY, candidate_id)
            if candidate_rating is not None:
                diff = abs(candidate_rating - rating)
                if diff < best_diff:
                    best_diff = diff
                    best_match = candidate_id

        if best_match:
            # Remove both players from queue
            await self.redis.zrem(MATCHMAKING_QUEUE_KEY, user_id, best_match)
            await self.redis.delete(
                MATCHMAKING_USER_KEY.format(user_id=user_id),
                MATCHMAKING_USER_KEY.format(user_id=best_match),
            )

        return best_match

    async def create_match(
        self, db: AsyncSession, player1_id: str, player2_id: str
    ) -> Match:
        """Create a match record with a random problem."""
        # Pick a random problem
        count_result = await db.execute(select(sa_func.count()).select_from(Problem))
        count = count_result.scalar()

        if count == 0:
            raise ValueError("No problems available")

        import random
        offset = random.randint(0, max(0, count - 1))
        result = await db.execute(select(Problem).offset(offset).limit(1))
        problem = result.scalar_one()

        match = Match(
            player1_id=player1_id,
            player2_id=player2_id,
            problem_id=problem.id,
            status="WAITING",
        )
        db.add(match)
        await db.flush()
        await db.refresh(match)
        return match

    async def is_in_queue(self, user_id: str) -> bool:
        """Check if user is already in the matchmaking queue."""
        score = await self.redis.zscore(MATCHMAKING_QUEUE_KEY, user_id)
        return score is not None
