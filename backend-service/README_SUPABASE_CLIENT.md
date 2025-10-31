# Supabase Client - Centralized Usage Guide

## Overview

The Supabase client is centralized in `app/core/supabase_client.py` to ensure consistent usage across all services in the backend.

## Quick Start

```python
from app.core.supabase_client import (
    get_supabase_client,
    get_supabase_client_for_user,
    get_supabase_admin_client,
    verify_auth_and_get_client
)

# Option 1: Verify auth and get client (most common)
user, client = await verify_auth_and_get_client(authorization_header)

# Option 2: Get admin client (bypasses RLS)
admin_client = get_supabase_admin_client()

# Option 3: Get user-scoped client (respects RLS)
user_client = get_supabase_client_for_user(user_token)
```

## When to Use Which Key

### Service Role Key (Default for Backend)
- **Use when**: Backend operations that need admin access
- **Bypasses**: Row Level Security (RLS)
- **Example**: PDF generation, batch processing, admin operations
- **Code**: `get_supabase_admin_client()` or `verify_auth_and_get_client(auth, use_service_key=True)`

### Anon Key with User Token
- **Use when**: Operations that should respect RLS based on user permissions
- **Respects**: Row Level Security policies
- **Example**: User data queries where you want RLS enforcement
- **Code**: `get_supabase_client_for_user(user_token)` or `verify_auth_and_get_client(auth, use_service_key=False)`

## Usage Examples

### In API Endpoints

```python
from app.core.supabase_client import verify_auth_and_get_client
from fastapi import Header

@router.get("/quotes/{quote_id}/pdf")
async def generate_quote_pdf(
    quote_id: str,
    authorization: Optional[str] = Header(None, alias="Authorization")
):
    # Verify auth and get client (uses service key by default)
    user, supabase = await verify_auth_and_get_client(authorization)
    
    # Fetch data (RLS bypassed, but user is still authenticated)
    quote = supabase.table("quotes").select("*").eq("id", quote_id).execute()
    
    # User is still verified - we know WHO is making the request
    # But service key bypasses RLS for data access
    return quote.data
```

### For User-Scoped Operations

```python
from app.core.supabase_client import get_supabase_client_for_user

# Get client that respects RLS
client = get_supabase_client_for_user(user_token)

# Queries will respect RLS policies
quotes = client.table("quotes").select("*").execute()
```

### For Admin Operations

```python
from app.core.supabase_client import get_supabase_admin_client

# Get admin client (bypasses RLS)
admin_client = get_supabase_admin_client()

# Can access all data regardless of RLS
all_quotes = admin_client.table("quotes").select("*").execute()
```

## Environment Variables

Required environment variables:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional (needed for admin operations)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Migration Guide

If you have existing code using Supabase clients directly:

### Before:
```python
from supabase import create_client

def get_client():
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY")
    )
```

### After:
```python
from app.core.supabase_client import get_supabase_admin_client

def get_client():
    return get_supabase_admin_client()
```

## Best Practices

1. **Always use the centralized client** - Don't create clients directly with `create_client()`
2. **Default to service key** - For backend operations, service key is standard
3. **Still verify user auth** - Even with service key, verify the user token
4. **Use anon key for user-scoped operations** - When you want RLS enforcement
5. **Never expose service key** - Only use in backend services

## Notes

- The centralized client handles environment variable validation
- It provides helpful error messages if keys are missing
- It supports multiple environment variable names for flexibility
- All clients are created on-demand (no singleton pattern needed)

