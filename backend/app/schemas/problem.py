from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TestCaseCreate(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False


class TestCaseResponse(BaseModel):
    id: str
    input: str
    expected_output: str
    is_hidden: bool

    model_config = {"from_attributes": True}


class ProblemCreate(BaseModel):
    title: str
    description: str
    difficulty: str  # easy, medium, hard
    time_limit: int = 900
    test_cases: List[TestCaseCreate] = []


class ProblemResponse(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    time_limit: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProblemDetailResponse(ProblemResponse):
    test_cases: List[TestCaseResponse] = []
