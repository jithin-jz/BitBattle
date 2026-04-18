from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.problem import Problem
from app.models.test_case import TestCase
from app.schemas.problem import (
    ProblemCreate,
    ProblemResponse,
    ProblemDetailResponse,
    TestCaseResponse,
)

router = APIRouter(prefix="/problems", tags=["Problems"])


@router.get("/", response_model=List[ProblemResponse])
async def list_problems(db: AsyncSession = Depends(get_db)):
    """List all problems."""
    result = await db.execute(select(Problem).order_by(Problem.created_at.desc()))
    problems = result.scalars().all()
    return [ProblemResponse.model_validate(p) for p in problems]


@router.get("/{problem_id}", response_model=ProblemDetailResponse)
async def get_problem(problem_id: str, db: AsyncSession = Depends(get_db)):
    """Get problem with visible test cases (hidden ones excluded for non-match viewing)."""
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Get visible test cases only
    tc_result = await db.execute(
        select(TestCase).where(
            TestCase.problem_id == problem_id,
            TestCase.is_hidden == False,
        )
    )
    test_cases = tc_result.scalars().all()

    response = ProblemDetailResponse.model_validate(problem)
    response.test_cases = [TestCaseResponse.model_validate(tc) for tc in test_cases]
    return response


@router.post("/", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    body: ProblemCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new problem with test cases."""
    problem = Problem(
        title=body.title,
        description=body.description,
        difficulty=body.difficulty,
        time_limit=body.time_limit,
    )
    db.add(problem)
    await db.flush()

    for tc in body.test_cases:
        test_case = TestCase(
            problem_id=problem.id,
            input=tc.input,
            expected_output=tc.expected_output,
            is_hidden=tc.is_hidden,
        )
        db.add(test_case)

    await db.flush()
    await db.refresh(problem)
    return ProblemResponse.model_validate(problem)
