"""
Services module initialization

Exports satellite service provider factory and legacy services.
"""

# Legacy exports - kept for backward compatibility
try:
    from .earth_engine import earth_engine_service
except ModuleNotFoundError:
    earth_engine_service = None

# Singleton (import instance, not the supabase_service module name collision)
try:
    from .supabase_service import supabase_service
except ModuleNotFoundError:
    supabase_service = None

# New satellite provider interface
try:
    from .satellite import get_satellite_provider, ISatelliteProvider
except ModuleNotFoundError:
    get_satellite_provider = None
    ISatelliteProvider = None

__all__ = [
    # Legacy
    "earth_engine_service",
    "supabase_service",
    # New satellite provider interface
    "get_satellite_provider",
    "ISatelliteProvider",
]
