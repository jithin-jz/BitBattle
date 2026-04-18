import json
import random
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

import redis.asyncio as redis

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class AuthService:
    """Handles OTP generation, storage (Redis), rate limiting, and verification."""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def _otp_key(self, email: str) -> str:
        return f"otp:{email}"

    def _rate_key(self, email: str) -> str:
        return f"otp_rate:{email}"

    def _send_otp_email(self, to_email: str, code: str) -> bool:
        """Send OTP via SMTP. Returns True on success, False on failure."""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"🔐 Your Arena Login Code: {code}"
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email

            # Plain text version
            text = f"Your verification code is: {code}\n\nThis code expires in 5 minutes.\nDo not share this code with anyone."

            # HTML version
            html = f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #e8e8f0; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 48px;">⚔️</span>
                    <h1 style="margin: 8px 0 0; font-size: 22px; color: #a855f7;">1v1 Coding Arena</h1>
                </div>
                <div style="background: #16161f; border: 1px solid rgba(108,92,231,0.2); border-radius: 12px; padding: 24px; text-align: center;">
                    <p style="color: #9898b0; margin: 0 0 16px; font-size: 14px;">Your verification code is</p>
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #6c5ce7; font-family: monospace; padding: 12px; background: rgba(108,92,231,0.1); border-radius: 8px;">
                        {code}
                    </div>
                    <p style="color: #5a5a7a; margin: 16px 0 0; font-size: 12px;">
                        ⏱️ Expires in 5 minutes &bull; Do not share this code
                    </p>
                </div>
                <p style="color: #5a5a7a; font-size: 11px; text-align: center; margin-top: 24px;">
                    If you didn't request this code, you can safely ignore this email.
                </p>
            </div>
            """

            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())

            logger.info(f"✅ OTP email sent to {to_email}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {e}")
            return False

    async def request_otp(self, email: str) -> dict:
        """Generate and store a 6-digit OTP in Redis with TTL."""
        # Check rate limit
        rate_key = self._rate_key(email)
        if await self.redis.exists(rate_key):
            ttl = await self.redis.ttl(rate_key)
            return {"error": f"Rate limited. Try again in {ttl} seconds."}

        # Generate 6-digit OTP
        code = str(random.randint(100000, 999999))

        # Store in Redis with TTL
        otp_data = json.dumps({"code": code, "attempts": 0})
        await self.redis.setex(
            self._otp_key(email),
            settings.OTP_TTL_SECONDS,
            otp_data,
        )

        # Set rate limit
        await self.redis.setex(rate_key, settings.OTP_RATE_LIMIT_SECONDS, "1")

        # Send email: real SMTP if configured, else mock
        if settings.SMTP_HOST and settings.SMTP_USER:
            import anyio
            sent = await anyio.to_thread.run_sync(self._send_otp_email, email, code)
            if not sent:
                # Fall back to mock if send fails
                logger.warning(f"SMTP failed, falling back to mock for {email}")
                print(f"\n{'='*50}\n📧 MOCK EMAIL: OTP for {email} is {code}\n{'='*50}\n")
            return {
                "message": "OTP sent to your email",
                "otp_debug": code if settings.ENVIRONMENT == "development" else None,
            }

        else:
            # Mock mode — no SMTP configured
            logger.info(f"[MOCK EMAIL] OTP for {email}: {code}")
            print(f"\n{'='*50}\n📧 MOCK EMAIL: OTP for {email} is {code}\n{'='*50}\n")
            return {
                "message": "OTP sent successfully",
                "otp_debug": code if settings.ENVIRONMENT == "development" else None,
            }

    async def verify_otp(self, email: str, code: str) -> Optional[bool]:
        """Verify OTP. Returns True on success, False on failure, None if expired."""
        otp_key = self._otp_key(email)
        raw = await self.redis.get(otp_key)

        if not raw:
            return None  # OTP expired or never requested

        data = json.loads(raw)
        attempts = data.get("attempts", 0)

        # Check max attempts
        if attempts >= settings.OTP_MAX_ATTEMPTS:
            await self.redis.delete(otp_key)
            return None

        # Increment attempt counter
        data["attempts"] = attempts + 1
        ttl = await self.redis.ttl(otp_key)
        await self.redis.setex(otp_key, max(ttl, 1), json.dumps(data))

        if data["code"] == code:
            await self.redis.delete(otp_key)  # Invalidate after successful verification
            return True

        return False
