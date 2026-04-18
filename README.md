# ⚔️ 1v1 Coding Arena

Real-time competitive coding battle platform. Two players compete head-to-head solving coding challenges — first correct submission wins.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI (async), Python 3.11 |
| **Database** | PostgreSQL 16 + SQLAlchemy (async ORM) |
| **Cache/PubSub** | Redis 7 |
| **Migrations** | Alembic |
| **Frontend** | SvelteKit + CodeMirror 6 |
| **Auth** | Email OTP + GitHub OAuth + JWT |
| **Infra** | Docker + Docker Compose |

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- (Optional) GitHub OAuth app for GitHub login

### 1. Clone & Configure

```bash
cd 1vs1
cp .env.example .env
# Edit .env with your GitHub OAuth credentials (optional)
```

### 2. Start Everything

```bash
docker compose up --build
```

This starts:
- **Backend** → http://localhost:8000
- **Frontend** → http://localhost:3000
- **PostgreSQL** → localhost:5432
- **Redis** → localhost:6379

### 3. Play!

1. Open http://localhost:3000
2. Enter your email → receive OTP (shown in backend logs during dev)
3. Go to Lobby → click "Find Opponent"
4. Open another browser/incognito window with a different email
5. Both players join the queue → matched and battle begins!

---

## 📋 API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/email/request-otp` | Request email OTP |
| POST | `/auth/email/verify-otp` | Verify OTP & get tokens |
| GET | `/auth/github/login` | Get GitHub OAuth URL |
| GET | `/auth/github/callback` | Handle GitHub callback |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user |
| POST | `/match/join` | Join matchmaking queue |
| POST | `/match/leave` | Leave matchmaking queue |
| GET | `/match/{id}` | Get match details |
| POST | `/submit` | Submit solution |
| GET | `/problems` | List all problems |
| GET | `/problems/{id}` | Get problem details |
| GET | `/leaderboard` | Get top players |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `ws://localhost:8000/ws/match/{match_id}?token=JWT` | Battle WebSocket |

**WebSocket Events:**
- `match_start` — Battle begins with problem data
- `timer_update` — Countdown tick every second
- `opponent_submission` — Opponent attempted/passed
- `match_end` — Match finished (winner or timeout)
- `player_connected/disconnected` — Connection status

---

## 🏟️ Project Structure

```
arena/
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py              # FastAPI app entry
│       ├── core/
│       │   ├── config.py        # Settings (env vars)
│       │   ├── database.py      # Async SQLAlchemy
│       │   ├── redis.py         # Redis client
│       │   └── security.py      # JWT utilities
│       ├── models/
│       │   ├── user.py
│       │   ├── problem.py
│       │   ├── test_case.py
│       │   ├── match.py
│       │   └── submission.py
│       ├── schemas/
│       │   ├── auth.py          # OTP, Token, User schemas
│       │   ├── problem.py       # Problem CRUD schemas
│       │   └── match.py         # Match, Submission schemas
│       ├── services/
│       │   ├── auth_service.py      # OTP logic (Redis)
│       │   ├── matchmaking_service.py  # Queue (Redis SortedSet)
│       │   └── match_service.py     # ELO + match state
│       ├── api/
│       │   ├── auth.py          # Auth routes
│       │   ├── problems.py      # Problem routes
│       │   └── match.py         # Match/Submit routes
│       └── websocket/
│           └── handler.py       # WebSocket battle engine
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── svelte.config.js
    ├── vite.config.js
    └── src/
        ├── app.html
        ├── app.css              # Design system
        ├── stores/
        │   ├── auth.js          # Auth state + API helper
        │   └── match.js         # Match state + WebSocket
        └── routes/
            ├── +layout.svelte   # Global navbar
            ├── +page.svelte     # Redirect
            ├── login/+page.svelte
            ├── lobby/+page.svelte
            ├── battle/[match_id]/+page.svelte
            ├── leaderboard/+page.svelte
            └── auth/github/callback/+page.svelte
```

---

## 🔐 Security

- **OTP**: Stored in Redis with TTL (5 min), max 5 attempts, rate limited (1 per 30s)
- **JWT**: HTTP-only cookies, 15min access / 7day refresh tokens
- **Match Validation**: Server-side checks for match ownership, active state, duplicate submissions
- **No client trust**: Backend validates all match actions
- **Secrets**: All via environment variables, never hardcoded

---

## 🎮 How It Works

1. **Login** → Email OTP or GitHub OAuth → JWT tokens
2. **Lobby** → Join matchmaking queue (Redis Sorted Set by ELO)
3. **Matched** → WebSocket connection established, problem assigned
4. **Battle** → Timer starts, code in CodeMirror, run tests locally
5. **Submit** → Backend validates, declares winner, updates ELO
6. **Leaderboard** → Players ranked by ELO rating

---

## 🛠️ Development

### Backend Only
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Only
```bash
cd frontend
npm install
npm run dev
```

### API Docs
FastAPI auto-generates Swagger docs at: http://localhost:8000/docs

---

## 📄 License

MIT
