from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import httpx
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

class AuthMiddleware:
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_anon_key = settings.SUPABASE_ANON_KEY
    
    async def verify_jwt_token(self, token: str) -> dict:
        """Verify JWT token with Supabase"""
        try:
            # Get JWT secret from Supabase
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/auth/v1/settings",
                    headers={'apikey': self.supabase_anon_key}
                )
                response.raise_for_status()
                settings_data = response.json()
                
                # Verify token
                payload = jwt.decode(
                    token,
                    settings_data.get('jwt_secret'),
                    algorithms=['HS256'],
                    audience='authenticated'
                )
                return payload
        except Exception as e:
            logger.error(f"JWT verification failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
    
    async def get_current_user(self, token: str) -> dict:
        """Get current user from Supabase"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/auth/v1/user",
                    headers={
                        'apikey': self.supabase_anon_key,
                        'Authorization': f'Bearer {token}'
                    }
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to get user: {e}")
            raise HTTPException(status_code=401, detail="Failed to get user")

auth_middleware = AuthMiddleware()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    
    # Verify JWT token
    payload = await auth_middleware.verify_jwt_token(token)
    
    # Get user details
    user = await auth_middleware.get_current_user(token)
    
    return {
        'user': user,
        'payload': payload
    }

async def require_organization_access(
    organization_id: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Verify user has access to organization"""
    user_id = current_user['user']['id']
    
    try:
        async with httpx.AsyncClient() as client:
            # Check if user is member of organization
            response = await client.get(
                f"{self.supabase_url}/rest/v1/organization_users",
                headers={
                    'apikey': settings.SUPABASE_SERVICE_KEY,
                    'Authorization': f'Bearer {settings.SUPABASE_SERVICE_KEY}'
                },
                params={
                    'user_id': f'eq.{user_id}',
                    'organization_id': f'eq.{organization_id}',
                    'is_active': 'eq.true',
                    'select': '*'
                }
            )
            response.raise_for_status()
            memberships = response.json()
            
            if not memberships:
                raise HTTPException(
                    status_code=403, 
                    detail="Access denied to organization"
                )
            
            return {
                'user': current_user['user'],
                'organization_id': organization_id,
                'role': memberships[0]['role']
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Organization access check failed: {e}")
        raise HTTPException(status_code=500, detail="Access verification failed")
