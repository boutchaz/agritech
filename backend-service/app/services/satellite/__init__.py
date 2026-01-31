"""
Satellite Service Module

Provides a unified interface for satellite data processing with support for
multiple providers (Google Earth Engine, Copernicus Data Space Ecosystem).

Usage:
    from app.services.satellite import get_satellite_provider

    # Get provider (automatically selected based on configuration)
    provider = get_satellite_provider()

    # Or specify provider explicitly
    provider = get_satellite_provider("cdse")

    # Use provider
    indices = provider.calculate_vegetation_indices(image, ["NDVI", "NDRE"])
"""

from .factory import get_satellite_provider
from .interfaces import ISatelliteProvider

__all__ = ['get_satellite_provider', 'ISatelliteProvider']
