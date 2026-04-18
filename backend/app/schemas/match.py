from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MatchResponse(BaseModel):
    id: str
    player1_id: str
    player2_id: str
    winner_id: Optional[str] = None
    problem_id: str
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    # Added fields
    player1_username: Optional[str] = None
    player2_username: Optional[str] = None
    player1_avatar: Optional[str] = None
    player2_avatar: Optional[str] = None

    model_config = {"from_attributes": True}


class SubmissionCreate(BaseModel):
    match_id: str
    code: str
    passed: bool
    runtime: Optional[float] = None


class SubmissionResponse(BaseModel):
    id: str
    match_id: str
    user_id: str
    code: str
    status: str
    runtime: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    id: str
    username: Optional[str] = None
    email: Optional[str] = None
    rating: int
    wins: int
    losses: int

    model_config = {"from_attributes": True}
