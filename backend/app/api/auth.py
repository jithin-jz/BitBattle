import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.user import User
from app.schemas.auth import OTPRequest, OTPVerify, TokenResponse, UserResponse
from app.services.auth_service import AuthService

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Email OTP ───────────────────────────────────────────────────────

@router.post("/email/request-otp")
async def request_otp(body: OTPRequest, redis=Depends(get_redis)):
    service = AuthService(redis)
    result = await service.request_otp(body.email)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=result["error"])
    return result


@router.post("/email/verify-otp", response_model=TokenResponse)
async def verify_otp(
    body: OTPVerify,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    service = AuthService(redis)
    result = await service.verify_otp(body.email, body.code)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired or max attempts reached",
        )
    if result is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP",
        )

    # Find or create user
    stmt = select(User).where(User.email == body.email)
    db_result = await db.execute(stmt)
    user = db_result.scalar_one_or_none()

    if not user:
        user = User(
            email=body.email,
            username=body.email.split("@")[0],
            rating=settings.ELO_DEFAULT_RATING,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

    # Issue tokens
    token_data = {"sub": user.id, "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Set HTTP-only cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


# ─── GitHub OAuth ────────────────────────────────────────────────────

@router.get("/github/login")
async def github_login():
    """Redirect to GitHub OAuth authorization page."""
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&scope=user:email"
        f"&redirect_uri={settings.FRONTEND_URL}/auth/github/callback"
    )
    return {"url": github_auth_url}


@router.get("/github/callback")
async def github_callback(
    code: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Handle GitHub OAuth callback: exchange code for token, fetch profile, create/link account."""
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()

    github_access_token = token_data.get("access_token")
    if not github_access_token:
        raise HTTPException(status_code=400, detail="Failed to get GitHub access token")

    # Fetch user profile
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {github_access_token}"},
        )
        github_user = user_resp.json()

        # Fetch email if not public
        email = github_user.get("email")
        if not email:
            email_resp = await client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {github_access_token}"},
            )
            emails = email_resp.json()
            primary = next((e for e in emails if e.get("primary")), None)
            email = primary["email"] if primary else None

    github_id = str(github_user["id"])
    username = github_user.get("login")
    avatar_url = github_user.get("avatar_url")

    # Find or create user
    stmt = select(User).where(User.github_id == github_id)
    db_result = await db.execute(stmt)
    user = db_result.scalar_one_or_none()

    if not user:
        # Check if email exists (link accounts)
        if email:
            stmt = select(User).where(User.email == email)
            db_result = await db.execute(stmt)
            user = db_result.scalar_one_or_none()

        if user:
            # Link GitHub to existing account
            user.github_id = github_id
            user.avatar_url = avatar_url
            if not user.username:
                user.username = username
        else:
            # Create new user
            user = User(
                email=email,
                username=username,
                github_id=github_id,
                avatar_url=avatar_url,
                rating=settings.ELO_DEFAULT_RATING,
            )
            db.add(user)

        await db.flush()
        await db.refresh(user)

    # Issue tokens
    token_data = {"sub": user.id, "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


# ─── Token Management ───────────────────────────────────────────────

@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    """Refresh the access token using the refresh token."""
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    new_access = create_access_token({"sub": payload["sub"], "email": payload.get("email")})
    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )
    return {"access_token": new_access}


@router.get("/me", response_model=UserResponse)
async def get_me(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get current user profile."""
    from app.core.security import get_current_user_id
    user_id = await get_current_user_id(request)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookies."""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}
