"""
Services module initialization

Exports satellite service provider factory and legacy services.
"""

# Legacy exports - kept for backward compatibility
from .earth_engine import earth_engine_service

# New satellite provider interface
from .satellite import get_satellite_provider, ISatelliteProvider

__all__ = [
    # Legacy
    'earth_engine_service',

    # New satellite provider interface
    'get_satellite_provider',
    'ISatelliteProvider',
]
