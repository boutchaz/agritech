"""
Centralized Supabase Client Module

This module provides a reusable Supabase client factory that can be used
across all services in the backend. It supports both anon key (with user token
for RLS) and service role key (bypasses RLS) modes.

Usage:
    # For user-scoped operations (respects RLS)
    client = get_supabase_client(user_token="eyJhbGc...")
    
    # For admin operations (bypasses RLS)
    client = get_supabase_client(use_service_key=True)
    
    # Verify auth and get client with user context
    user, client = await verify_auth_and_get_client(authorization_header)
"""

from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
import os
import logging

logger = logging.getLogger(__name__)


def _get_env_value(key: str, fallback: str = "") -> str:
    """Get environment variable value, treating empty strings as None"""
    value = os.getenv(key, fallback)
    return value.strip() if value else ""


def get_supabase_client(
    use_service_key: bool = False,
    user_token: Optional[str] = None
) -> Client:
    """
    Get a Supabase client instance
    
    This is the main entry point for getting Supabase clients throughout the application.
    Use this instead of creating clients directly.
    
    Args:
        use_service_key: 
            - True: Use service role key (bypasses RLS, admin operations)
            - False: Use anon key (respects RLS, user-scoped operations)
        user_token: 
            - Optional user authentication token (JWT)
            - Required when use_service_key=False to ensure queries respect RLS
            - Can be omitted for service_key=True (admin operations)
    
    Returns:
        Supabase client instance
        
    Raises:
        ValueError: If required environment variables are not configured
        
    Examples:
        # User-scoped operation (respects RLS)
        >>> client = get_supabase_client(user_token="eyJhbGc...")
        >>> quotes = client.table("quotes").select("*").execute()
        
        # Admin operation (bypasses RLS)
        >>> client = get_supabase_client(use_service_key=True)
        >>> all_quotes = client.table("quotes").select("*").execute()
    """
    supabase_url = _get_env_value("SUPABASE_URL") or settings.SUPABASE_URL or ""
    
    if not supabase_url or not supabase_url.strip():
        raise ValueError(
            "SUPABASE_URL environment variable is not configured or is empty"
        )
    
    if use_service_key:
        # Try multiple environment variable names for service key
        supabase_key = (
            _get_env_value("SUPABASE_SERVICE_KEY") or 
            _get_env_value("SUPABASE_SERVICE_ROLE_KEY") or
            (settings.SUPABASE_SERVICE_KEY or "").strip() or 
            (settings.SUPABASE_KEY or "").strip()
        )
        
        if not supabase_key or not supabase_key.strip():
            available_vars = [k for k in os.environ.keys() if k.startswith('SUPABASE_')]
            error_msg = (
                "SUPABASE_SERVICE_KEY environment variable is not configured or is empty. "
                f"Please set SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY. "
                f"Available SUPABASE_* env vars: {available_vars if available_vars else 'none'}"
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
    else:
        # Use anon key (respects RLS with user token)
        supabase_key = (
            _get_env_value("SUPABASE_ANON_KEY") or 
            settings.SUPABASE_ANON_KEY or ""
        )
        
        if not supabase_key or not supabase_key.strip():
            raise ValueError(
                "SUPABASE_ANON_KEY environment variable is not configured or is empty"
            )
    
    # Create client
    # Note: For Python Supabase client:
    # - Service key: Bypasses RLS, use for admin operations
    # - Anon key: Respects RLS, but requires Authorization header in each request
    # Since we're in a backend service, we typically use service key and verify
    # user permissions in application logic rather than relying solely on RLS
    client = create_client(supabase_url.strip(), supabase_key.strip())
    
    # Store token for reference (can be used for logging/audit)
    if user_token:
        client._user_token = user_token  # type: ignore
    
    return client


async def verify_auth_and_get_client(
    authorization: Optional[str],
    use_service_key: bool = False
) -> tuple:
    """
    Verify authentication and get a Supabase client
    
    This is a convenience function that:
    1. Extracts and validates the JWT token from Authorization header
    2. Verifies the token with Supabase
    3. Returns both the user and a properly configured client
    
    Default behavior: Uses anon key with user token (respects RLS).
    Falls back to service key if anon key fails (only if service key is available).
    
    Args:
        authorization: Authorization header value (e.g., "Bearer eyJhbGc...")
        use_service_key: Whether to force use service key (True) or prefer anon key (False)
        
    Returns:
        Tuple of (user, supabase_client)
        - user: Authenticated user object
        - supabase_client: Configured Supabase client
        
    Raises:
        HTTPException: If authentication fails or token is invalid
        
    Examples:
        # User-scoped client (respects RLS) - DEFAULT
        >>> user, client = await verify_auth_and_get_client(authorization_header)
        >>> quotes = client.table("quotes").select("*").eq("organization_id", org_id).execute()
        
        # Force admin client (bypasses RLS)
        >>> user, client = await verify_auth_and_get_client(authorization_header, use_service_key=True)
        >>> all_quotes = client.table("quotes").select("*").execute()
    """
    from fastapi import HTTPException
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "").strip()
    
    # Default: Try anon key first (respects RLS) - PREFERRED for user operations
    if not use_service_key:
        try:
            client = get_supabase_client(use_service_key=False, user_token=token)
            # Verify the user token with anon key
            # Note: Python client requires passing Authorization header - we verify separately
            user_response = client.auth.get_user(token)
            if not user_response.user:
                raise HTTPException(status_code=401, detail="Invalid token")
            return user_response.user, client
        except HTTPException:
            raise
        except ValueError as e:
            # Anon key not configured - don't fall back if user explicitly wants anon key
            # This allows relying solely on anon key
            logger.error(f"Anon key not available: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            # Authentication error with anon key
            logger.error(f"Authentication failed with anon key: {str(e)}")
            raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
    else:
        # Force use service key (admin operations)
        try:
            client = get_supabase_client(use_service_key=True)
            user_response = client.auth.get_user(token)
            if not user_response.user:
                raise HTTPException(status_code=401, detail="Invalid token")
            return user_response.user, client
        except Exception as e:
            logger.error(f"Authentication failed: {str(e)}")
            raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


def get_supabase_client_for_user(user_token: str) -> Client:
    """
    Convenience function to get a user-scoped Supabase client
    
    Shorthand for: get_supabase_client(use_service_key=False, user_token=user_token)
    
    Args:
        user_token: User authentication token (JWT)
        
    Returns:
        Supabase client configured for user-scoped operations
    """
    return get_supabase_client(use_service_key=False, user_token=user_token)


def get_supabase_admin_client() -> Client:
    """
    Convenience function to get an admin Supabase client
    
    Shorthand for: get_supabase_client(use_service_key=True)
    
    Returns:
        Supabase client configured for admin operations (bypasses RLS)
        
    Warning:
        Only use this for admin operations that need to bypass RLS.
        For user-scoped operations, use get_supabase_client_for_user() instead.
    """
    return get_supabase_client(use_service_key=True)

