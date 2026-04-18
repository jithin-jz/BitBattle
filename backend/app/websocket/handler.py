import json
import asyncio
import logging
from typing import Dict, Set
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.security import decode_token
from app.core.database import async_session_factory
from app.core.redis import get_redis
from app.models.match import Match
from app.models.problem import Problem
from app.models.test_case import TestCase
from app.services.match_service import MatchService

logger = logging.getLogger(__name__)


class LobbyManager:
    """Manages global WebSocket connections (lobby, leaderboard)."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"Lobby WS connected. Total: {len(self.active_connections)}")
        await self.broadcast_online_count()

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        await self.broadcast_online_count()

    async def broadcast_online_count(self):
        """Broadcast the current number of online users."""
        await self.broadcast({
            "type": "online_count",
            "count": len(self.active_connections)
        })

    async def broadcast(self, message: dict):
        """Broadcast message to everyone in the lobby."""
        disconnected = []
        for ws in self.active_connections:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            await self.disconnect(ws)


class ConnectionManager:

    """Manages WebSocket connections per match."""

    def __init__(self):
        # match_id -> {user_id: WebSocket}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # match_id -> asyncio.Task (timer)
        self.match_timers: Dict[str, asyncio.Task] = {}

    async def connect(self, match_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if match_id not in self.active_connections:
            self.active_connections[match_id] = {}
        self.active_connections[match_id][user_id] = websocket
        logger.info(f"WS connected: user={user_id}, match={match_id}")

    def disconnect(self, match_id: str, user_id: str, websocket: WebSocket = None) -> bool:
        if match_id in self.active_connections:
            current_ws = self.active_connections[match_id].get(user_id)
            if current_ws is None:
                return False
            if websocket is not None and current_ws is not websocket:
                return False

            self.active_connections[match_id].pop(user_id, None)
            if not self.active_connections[match_id]:
                del self.active_connections[match_id]
            return True

        return False

    async def send_to_match(self, match_id: str, message: dict):
        """Broadcast message to all connections in a match."""
        connections = self.active_connections.get(match_id, {})
        disconnected = []
        for user_id, ws in list(connections.items()):
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(user_id)

        for uid in disconnected:
            self.disconnect(match_id, uid)

    async def send_to_user(self, match_id: str, user_id: str, message: dict):
        """Send message to a specific user in a match."""
        connections = self.active_connections.get(match_id, {})
        ws = connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(match_id, user_id)

    def get_connected_count(self, match_id: str) -> int:
        return len(self.active_connections.get(match_id, {}))

    def stop_match_timer(self, match_id: str):
        if match_id in self.match_timers:
            self.match_timers[match_id].cancel()
            del self.match_timers[match_id]
            logger.info(f"Timer stopped for match {match_id}")


manager = ConnectionManager()
lobby_manager = LobbyManager()



async def load_match_start_payload(db: AsyncSession, match_id: str) -> dict:
    """Load the full payload needed to start or restore a match session."""
    result = await db.execute(
        select(Match)
        .options(joinedload(Match.player1), joinedload(Match.player2))
        .where(Match.id == match_id)
    )
    match = result.scalar_one()

    problem_result = await db.execute(select(Problem).where(Problem.id == match.problem_id))
    problem = problem_result.scalar_one()

    test_case_result = await db.execute(
        select(TestCase).where(TestCase.problem_id == problem.id)
    )
    test_cases = test_case_result.scalars().all()

    return {
        "type": "match_start",
        "match_id": match_id,
        "player1_id": match.player1_id,
        "player2_id": match.player2_id,
        "player1_username": match.player1_username,
        "player2_username": match.player2_username,
        "player1_avatar": match.player1_avatar,
        "player2_avatar": match.player2_avatar,
        "problem": {
            "id": problem.id,
            "title": problem.title,
            "description": problem.description,
            "difficulty": problem.difficulty,
            "time_limit": problem.time_limit,
        },
        "test_cases": [
            {
                "id": tc.id,
                "input": tc.input,
                "expected_output": tc.expected_output,
                "is_hidden": tc.is_hidden,
            }
            for tc in test_cases
        ],
    }


async def run_match_timer(match_id: str, time_limit: int):
    """Run countdown timer for a match. Broadcasts timer updates every second."""
    remaining = time_limit

    while remaining > 0:
        await manager.send_to_match(match_id, {
            "type": "timer_update",
            "remaining": remaining,
        })
        await asyncio.sleep(1)
        remaining -= 1

    # Check if match still active before ending
    async with async_session_factory() as db:
        match = await MatchService.end_match_timeout(db, match_id)
        if match and match.ended_at:
             await db.commit()
             await manager.send_to_match(match_id, {
                "type": "match_end",
                "reason": "timeout",
                "winner_id": None,
            })
    
    if match_id in manager.match_timers:
        del manager.match_timers[match_id]



async def handle_match_websocket(websocket: WebSocket, match_id: str, token: str):
    """Main WebSocket handler for a match."""
    # Authenticate
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Validate user belongs to match
    async with async_session_factory() as db:
        result = await db.execute(select(Match).where(Match.id == match_id))
        match = result.scalar_one_or_none()

        if not match:
            await websocket.close(code=4004, reason="Match not found")
            return
        if user_id not in (match.player1_id, match.player2_id):
            await websocket.close(code=4003, reason="Not part of this match")
            return
        player1_id = match.player1_id
        player2_id = match.player2_id
        match_is_already_started = match.status == "STARTED"

    # Connect
    await manager.connect(match_id, user_id, websocket)

    # Redis listener setup
    from app.core.redis import get_redis
    redis_client = await get_redis()
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"match:{match_id}")

    async def redis_listener():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    await websocket.send_json(data)
                    if data.get("type") == "match_end":
                        manager.stop_match_timer(match_id)
        except Exception as e:
            logger.error(f"Redis listener error: {e}")
        finally:
            await pubsub.unsubscribe(f"match:{match_id}")
            await pubsub.close()

    redis_task = asyncio.create_task(redis_listener())

    try:
        # If match is already started, send current state immediately
        if match_is_already_started:
            async with async_session_factory() as db_session:
                await websocket.send_json(
                    await load_match_start_payload(db_session, match_id)
                )

        # Notify match about new connection
        await manager.send_to_match(match_id, {
            "type": "player_connected",
            "user_id": user_id,
            "connected_count": manager.get_connected_count(match_id),
        })

        # Auto-start logic
        if manager.get_connected_count(match_id) == 2 and not match_is_already_started:
            async with async_session_factory() as db:
                await MatchService.start_match(db, match_id)
                await db.commit()
                start_payload = await load_match_start_payload(db, match_id)
                await manager.send_to_match(match_id, start_payload)

                # Start timer
                if match_id not in manager.match_timers:
                    manager.match_timers[match_id] = asyncio.create_task(
                        run_match_timer(match_id, start_payload["problem"]["time_limit"])
                    )

        # Main message loop
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "submission_result":
                await manager.send_to_match(match_id, {
                    "type": "opponent_submission",
                    "user_id": user_id,
                    "status": data.get("status", "attempted"),
                })
            elif msg_type == "code_update":
                # Find opponent
                opponent_id = player2_id if user_id == player1_id else player1_id
                await manager.send_to_user(match_id, opponent_id, {
                    "type": "opponent_typing",
                    "user_id": user_id,
                })

    except WebSocketDisconnect:
        logger.info(f"WS disconnected: user={user_id}, match={match_id}")
    except Exception as e:
        logger.error(f"WS error: {e}")
    finally:
        redis_task.cancel()
        removed = manager.disconnect(match_id, user_id, websocket)
        if removed:
            await manager.send_to_match(match_id, {
                "type": "player_disconnected",
                "user_id": user_id,
            })


async def handle_lobby_websocket(websocket: WebSocket, token: str = None):
    """WebSocket handler for global updates (leaderboard/lobby) and user notifications."""
    user_id = None
    if token:
        try:
            from app.core.security import decode_token
            payload = decode_token(token)
            user_id = payload.get("sub")
        except Exception:
            logger.warning("Invalid token in lobby WS")

    await lobby_manager.connect(websocket)
    
    from app.core.redis import get_redis
    redis_client = await get_redis()
    pubsub = redis_client.pubsub()
    
    # Base channels
    channels = ["global:lobby"]
    if user_id:
        channels.append(f"user:{user_id}")
    
    await pubsub.subscribe(*channels)

    async def redis_listener():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    # Send directly to this specific client if it's a user notification
                    # or broadcast if it's global? 
                    # For simplicity, we just send all pubsub messages to this WS.
                    await websocket.send_json(data)
        except Exception as e:
            logger.error(f"Lobby Redis listener error: {e}")
        finally:
            await pubsub.unsubscribe(*channels)
            await pubsub.close()

    redis_task = asyncio.create_task(redis_listener())

    # Send current online count immediately
    await websocket.send_json({
        "type": "online_count",
        "count": len(lobby_manager.active_connections)
    })

    try:
        while True:
            # Keep alive and listen for heartbeat
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await lobby_manager.disconnect(websocket)
        redis_task.cancel()
