from typing import List
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import get_current_user_id
from app.models.user import User
from app.models.match import Match
from app.models.test_case import TestCase
from app.schemas.match import (
    MatchResponse,
    SubmissionCreate,
    SubmissionResponse,
    LeaderboardEntry,
)
from app.schemas.problem import TestCaseResponse
from app.services.matchmaking_service import MatchmakingService
from app.services.match_service import MatchService

router = APIRouter(tags=["Match"])
STALE_WAITING_MATCH_TTL = timedelta(minutes=2)


@router.post("/match/join", response_model=dict)
async def join_match(
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """Join the matchmaking queue. Returns match info if matched."""
    user_id = await get_current_user_id(request)

    # 1. Check if user is already in an active match (created but not finished)
    active_match_query = await db.execute(
        select(Match).where(
            ((Match.player1_id == user_id) | (Match.player2_id == user_id)) &
            (Match.status != "FINISHED")
        ).order_by(Match.created_at.desc()).limit(1)
    )
    active_match = active_match_query.scalar_one_or_none()
    
    if active_match:
        is_stale_waiting_match = (
            active_match.status == "WAITING"
            and active_match.created_at is not None
            and datetime.now(timezone.utc) - active_match.created_at >= STALE_WAITING_MATCH_TTL
        )

        if is_stale_waiting_match:
            active_match.status = "FINISHED"
            active_match.ended_at = datetime.now(timezone.utc)
            await db.commit()
        else:
            opponent_id = active_match.player2_id if active_match.player1_id == user_id else active_match.player1_id
            return {
                "status": "matched",
                "match_id": active_match.id,
                "opponent_id": opponent_id,
            }

    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    service = MatchmakingService(redis)

    # Check if already in queue
    if await service.is_in_queue(user_id):
        return {"status": "already_queued", "message": "Already in matchmaking queue"}

    # Join queue
    await service.join_queue(user_id, user.rating)

    # Try to find a match
    opponent_id = await service.find_match(user_id, user.rating)

    if opponent_id:
        # Match found! Create match record
        match = await service.create_match(db, user_id, opponent_id)

        await db.commit()

        # Publish match found event via Redis pub/sub
        import json
        match_data = json.dumps({
            "type": "match_found",
            "match_id": match.id,
            "player1_id": match.player1_id,
            "player2_id": match.player2_id,
            "problem_id": match.problem_id,
        })
        await redis.publish(f"user:{user_id}", match_data)
        await redis.publish(f"user:{opponent_id}", match_data)

        return {
            "status": "matched",
            "match_id": match.id,
            "opponent_id": opponent_id,
        }

    return {"status": "queued", "message": "Waiting for opponent..."}


@router.post("/match/leave")
async def leave_match(
    request: Request,
    redis=Depends(get_redis),
):
    """Leave the matchmaking queue."""
    user_id = await get_current_user_id(request)
    service = MatchmakingService(redis)
    await service.leave_queue(user_id)
    return {"status": "left_queue"}


@router.get("/match/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get match details."""
    user_id = await get_current_user_id(request)
    match = await MatchService.get_match(db, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if user_id not in (match.player1_id, match.player2_id):
        raise HTTPException(status_code=403, detail="Not part of this match")
    return MatchResponse.model_validate(match)


@router.get("/match/{match_id}/test-cases", response_model=List[TestCaseResponse])
async def get_match_test_cases(
    match_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get all test cases (including hidden) for a match problem. Only for match participants."""
    user_id = await get_current_user_id(request)
    match = await MatchService.get_match(db, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if user_id not in (match.player1_id, match.player2_id):
        raise HTTPException(status_code=403, detail="Not part of this match")

    result = await db.execute(
        select(TestCase).where(TestCase.problem_id == match.problem_id)
    )
    test_cases = result.scalars().all()
    return [TestCaseResponse.model_validate(tc) for tc in test_cases]


@router.post("/submit", response_model=SubmissionResponse)
async def submit_solution(
    body: SubmissionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """Submit a solution. If passed=True, declares winner."""
    user_id = await get_current_user_id(request)
    try:
        submission = await MatchService.submit_solution(
            db=db,
            match_id=body.match_id,
            user_id=user_id,
            code=body.code,
            passed=body.passed,
            runtime=body.runtime,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Notify via pub/sub if match is won
    if body.passed:
        import json
        event = json.dumps({
            "type": "match_end",
            "match_id": body.match_id,
            "winner_id": user_id,
        })
        match = await MatchService.get_match(db, body.match_id)
        if match:
            await redis.publish(f"match:{body.match_id}", event)

    return SubmissionResponse.model_validate(submission)


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Get top players sorted by rating."""
    result = await db.execute(
        select(User).order_by(User.rating.desc()).limit(min(limit, 100))
    )
    users = result.scalars().all()
    return [LeaderboardEntry.model_validate(u) for u in users]
