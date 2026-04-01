from fastapi import HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import asyncio
import httpx
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Reusable HTTP client for auth calls (avoids creating a new client per request)
_http_client: Optional[httpx.AsyncClient] = None
_http_client_lock = asyncio.Lock()


async def _get_http_client() -> httpx.AsyncClient:
    """Get or create a shared async HTTP client (thread-safe initialization)."""
    global _http_client
    if _http_client is not None and not _http_client.is_closed:
        return _http_client
    async with _http_client_lock:
        # Double-check after acquiring lock
        if _http_client is None or _http_client.is_closed:
            _http_client = httpx.AsyncClient(timeout=10.0)
    return _http_client


async def close_http_client() -> None:
    """Close the shared HTTP client. Call on app shutdown."""
    global _http_client
    if _http_client is not None and not _http_client.is_closed:
        await _http_client.aclose()
        _http_client = None


async def verify_token_with_supabase(token: str) -> dict:
    """
    Verify a JWT token by calling Supabase's auth.getUser endpoint.
    This is the ONLY reliable way to validate RS256 Supabase tokens
    without managing JWKS locally. Supabase verifies the signature
    server-side and returns the user if valid.
    """
    client = await _get_http_client()
    try:
        response = await client.get(
            f"{settings.SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}",
            },
        )
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        response.raise_for_status()
        return response.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Token verification failed")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """FastAPI dependency: extract and validate the Bearer token, return user dict."""
    token = credentials.credentials
    user = await verify_token_with_supabase(token)
    return {"user": user, "token": token}


async def get_optional_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Optional[dict]:
    """FastAPI dependency: optionally authenticate. Returns None if no token."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None
    try:
        user = await verify_token_with_supabase(token)
        return {"user": user, "token": token}
    except HTTPException:
        return None


async def require_organization_access(
    organization_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """FastAPI dependency: verify the authenticated user belongs to the given organization."""
    user_id = current_user["user"]["id"]

    client = await _get_http_client()
    try:
        response = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/organization_users",
            headers={
                "apikey": settings.SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
            },
            params={
                "user_id": f"eq.{user_id}",
                "organization_id": f"eq.{organization_id}",
                "is_active": "eq.true",
                "select": "role_id",
            },
        )
        response.raise_for_status()
        memberships = response.json()

        if not memberships:
            raise HTTPException(
                status_code=403, detail="Access denied to organization"
            )

        return {
            "user": current_user["user"],
            "organization_id": organization_id,
            "membership": memberships[0],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Organization access check failed: {e}")
        raise HTTPException(status_code=500, detail="Access verification failed")
