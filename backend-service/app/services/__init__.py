"""
Services module initialization

Exports satellite service provider factory and legacy services.
"""

# Legacy exports - kept for backward compatibility
try:
    from .earth_engine import earth_engine_service
except ModuleNotFoundError:
    earth_engine_service = None

# New satellite provider interface
try:
    from .satellite import get_satellite_provider, ISatelliteProvider
except ModuleNotFoundError:
    get_satellite_provider = None
    ISatelliteProvider = None

__all__ = [
    # Legacy
    "earth_engine_service",
    # New satellite provider interface
    "get_satellite_provider",
    "ISatelliteProvider",
]
