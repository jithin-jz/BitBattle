import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import engine, Base
from app.core.redis import get_redis, close_redis
from app.api.auth import router as auth_router
from app.api.problems import router as problems_router
from app.api.match import router as match_router
from app.websocket.handler import handle_match_websocket, handle_lobby_websocket


settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    # Startup
    logger.info("🚀 Starting Arena Backend...")

    # Create tables (for development; use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables created")

    # Warm up Redis connection
    redis = await get_redis()
    await redis.ping()
    logger.info("✅ Redis connected")

    # Seed sample problems if none exist
    await seed_problems()

    yield

    # Shutdown
    await close_redis()
    await engine.dispose()
    logger.info("👋 Arena Backend shut down")


async def seed_problems():
    """Seed initial problems if the database is empty."""
    from sqlalchemy import select, func
    from app.core.database import async_session_factory
    from app.models.problem import Problem
    from app.models.test_case import TestCase

    async with async_session_factory() as db:
        result = await db.execute(select(func.count()).select_from(Problem))
        count = result.scalar()

        if count == 0:
            logger.info("🌱 Seeding sample problems...")

            problems = [
                {
                    "title": "Two Sum",
                    "description": (
                        "Given an array of integers `nums` and an integer `target`, "
                        "return the indices of the two numbers that add up to target.\n\n"
                        "You may assume each input has exactly one solution, and you may not "
                        "use the same element twice.\n\n"
                        "**Example:**\n"
                        "```\nInput: nums = [2,7,11,15], target = 9\n"
                        "Output: [0,1]\nExplanation: nums[0] + nums[1] = 2 + 7 = 9\n```\n\n"
                        "**Function Signature:**\n"
                        "```javascript\nfunction twoSum(nums, target) {\n  // your code here\n}\n```"
                    ),
                    "difficulty": "easy",
                    "time_limit": 600,
                    "test_cases": [
                        {"input": "[2,7,11,15]\n9", "expected_output": "[0,1]", "is_hidden": False},
                        {"input": "[3,2,4]\n6", "expected_output": "[1,2]", "is_hidden": False},
                        {"input": "[3,3]\n6", "expected_output": "[0,1]", "is_hidden": True},
                    ],
                },
                {
                    "title": "Reverse String",
                    "description": (
                        "Write a function that reverses a string.\n\n"
                        "**Example:**\n"
                        "```\nInput: \"hello\"\nOutput: \"olleh\"\n```\n\n"
                        "**Function Signature:**\n"
                        "```javascript\nfunction reverseString(s) {\n  // your code here\n}\n```"
                    ),
                    "difficulty": "easy",
                    "time_limit": 300,
                    "test_cases": [
                        {"input": "hello", "expected_output": "olleh", "is_hidden": False},
                        {"input": "world", "expected_output": "dlrow", "is_hidden": False},
                        {"input": "a", "expected_output": "a", "is_hidden": True},
                        {"input": "", "expected_output": "", "is_hidden": True},
                    ],
                },
                {
                    "title": "FizzBuzz",
                    "description": (
                        "Given an integer n, return a string array where:\n"
                        "- `answer[i] == \"FizzBuzz\"` if i is divisible by 3 and 5\n"
                        "- `answer[i] == \"Fizz\"` if i is divisible by 3\n"
                        "- `answer[i] == \"Buzz\"` if i is divisible by 5\n"
                        "- `answer[i] == i` (as a string) otherwise\n\n"
                        "**Example:**\n"
                        "```\nInput: n = 5\nOutput: [\"1\",\"2\",\"Fizz\",\"4\",\"Buzz\"]\n```\n\n"
                        "**Function Signature:**\n"
                        "```javascript\nfunction fizzBuzz(n) {\n  // your code here\n}\n```"
                    ),
                    "difficulty": "easy",
                    "time_limit": 300,
                    "test_cases": [
                        {"input": "3", "expected_output": "[\"1\",\"2\",\"Fizz\"]", "is_hidden": False},
                        {"input": "5", "expected_output": "[\"1\",\"2\",\"Fizz\",\"4\",\"Buzz\"]", "is_hidden": False},
                        {"input": "15", "expected_output": "[\"1\",\"2\",\"Fizz\",\"4\",\"Buzz\",\"Fizz\",\"7\",\"8\",\"Fizz\",\"Buzz\",\"11\",\"Fizz\",\"13\",\"14\",\"FizzBuzz\"]", "is_hidden": True},
                    ],
                },
                {
                    "title": "Palindrome Check",
                    "description": (
                        "Given a string s, return `true` if it is a palindrome, `false` otherwise.\n"
                        "Consider only alphanumeric characters and ignore cases.\n\n"
                        "**Example:**\n"
                        "```\nInput: \"A man, a plan, a canal: Panama\"\nOutput: true\n```\n\n"
                        "**Function Signature:**\n"
                        "```javascript\nfunction isPalindrome(s) {\n  // your code here\n}\n```"
                    ),
                    "difficulty": "easy",
                    "time_limit": 300,
                    "test_cases": [
                        {"input": "A man, a plan, a canal: Panama", "expected_output": "true", "is_hidden": False},
                        {"input": "race a car", "expected_output": "false", "is_hidden": False},
                        {"input": " ", "expected_output": "true", "is_hidden": True},
                    ],
                },
                {
                    "title": "Maximum Subarray",
                    "description": (
                        "Given an integer array nums, find the subarray with the largest sum, "
                        "and return its sum.\n\n"
                        "**Example:**\n"
                        "```\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\n"
                        "Explanation: The subarray [4,-1,2,1] has the largest sum 6.\n```\n\n"
                        "**Function Signature:**\n"
                        "```javascript\nfunction maxSubArray(nums) {\n  // your code here\n}\n```"
                    ),
                    "difficulty": "medium",
                    "time_limit": 600,
                    "test_cases": [
                        {"input": "[-2,1,-3,4,-1,2,1,-5,4]", "expected_output": "6", "is_hidden": False},
                        {"input": "[1]", "expected_output": "1", "is_hidden": False},
                        {"input": "[5,4,-1,7,8]", "expected_output": "23", "is_hidden": True},
                    ],
                },
            ]

            for p_data in problems:
                problem = Problem(
                    title=p_data["title"],
                    description=p_data["description"],
                    difficulty=p_data["difficulty"],
                    time_limit=p_data["time_limit"],
                )
                db.add(problem)
                await db.flush()

                for tc_data in p_data["test_cases"]:
                    tc = TestCase(
                        problem_id=problem.id,
                        input=tc_data["input"],
                        expected_output=tc_data["expected_output"],
                        is_hidden=tc_data["is_hidden"],
                    )
                    db.add(tc)

            await db.commit()
            logger.info(f"✅ Seeded {len(problems)} problems")


app = FastAPI(
    title="1v1 Coding Arena",
    description="Real-time competitive coding battle platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST Routers
app.include_router(auth_router)
app.include_router(problems_router)
app.include_router(match_router)


# WebSocket endpoint
@app.websocket("/ws/match/{match_id}")
async def match_websocket(websocket: WebSocket, match_id: str, token: str):
    await handle_match_websocket(websocket, match_id, token)


@app.websocket("/ws/lobby")
async def lobby_websocket(websocket: WebSocket, token: str = None):
    await handle_lobby_websocket(websocket, token)




@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "arena-backend"}

# Trigger reload
