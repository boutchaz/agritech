"""
Satellite Service Provider Factory

Provides factory functions for creating and managing satellite data providers.
Handles provider selection logic based on configuration and fallback behavior.
"""

import logging
from typing import Optional, Dict, Any
from app.services.satellite.interfaces import ISatelliteProvider, ProviderType
from app.services.satellite.providers import GEEProvider, CDSEProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


# Provider instance cache for singleton behavior
_provider_cache: Dict[str, ISatelliteProvider] = {}


def get_satellite_provider(
    provider_type: Optional[str] = None,
    force_refresh: bool = False,
) -> ISatelliteProvider:
    """
    Get a satellite data provider instance.

    Provider selection logic (in order of priority):
    1. Explicit provider_type parameter
    2. SATELLITE_PROVIDER environment variable
    3. SATELLITE_COMMERCIAL_MODE=true → CDSE
    4. Default: GEE (for development)

    Args:
        provider_type: Explicit provider type ("gee", "cdse", or "auto")
        force_refresh: Force re-initialization even if cached

    Returns:
        ISatelliteProvider instance

    Raises:
        ValueError: If provider type is invalid
        RuntimeError: If provider initialization fails

    Examples:
        # Auto-select based on configuration
        provider = get_satellite_provider()

        # Explicit CDSE provider
        provider = get_satellite_provider("cdse")

        # Force GEE for development
        provider = get_satellite_provider("gee")
    """
    global _provider_cache

    # Determine provider type
    if provider_type is None or provider_type == "auto":
        provider_type = _determine_provider_type()

    # Validate provider type
    try:
        provider_enum = ProviderType(provider_type.lower())
    except ValueError:
        raise ValueError(
            f"Invalid provider type: '{provider_type}'. "
            f"Must be one of: {', '.join([p.value for p in ProviderType])}"
        )

    # For "auto", select based on availability
    if provider_enum == ProviderType.AUTO:
        provider_enum = _select_available_provider()

    final_provider_type = provider_enum.value

    # Check cache
    if not force_refresh and final_provider_type in _provider_cache:
        logger.debug(f"Using cached {final_provider_type} provider")
        return _provider_cache[final_provider_type]

    # Create new provider instance
    logger.info(f"Initializing {final_provider_type} satellite provider")
    provider = _create_provider(final_provider_type)

    # Initialize the provider
    try:
        provider.initialize()
        _provider_cache[final_provider_type] = provider
        logger.info(f"Successfully initialized {final_provider_type} provider")
    except Exception as e:
        logger.error(f"Failed to initialize {final_provider_type} provider: {e}")
        # Attempt fallback if not GEE
        if final_provider_type != ProviderType.GEE.value:
            logger.warning(f"Attempting fallback to {ProviderType.GEE.value} provider")
            return get_satellite_provider(ProviderType.GEE.value, force_refresh)
        raise RuntimeError(f"Failed to initialize satellite provider: {e}")

    return provider


def _determine_provider_type() -> str:
    """
    Determine provider type from configuration.

    Returns:
        Provider type string ("gee", "cdse", or "auto")
    """
    # Check explicit environment variable
    env_provider = getattr(settings, 'SATELLITE_PROVIDER', 'auto').lower()
    if env_provider in [ProviderType.GEE.value, ProviderType.CDSE.value]:
        return env_provider

    # Check commercial mode flag
    commercial_mode = getattr(settings, 'SATELLITE_COMMERCIAL_MODE', False)
    if commercial_mode:
        logger.info("Commercial mode enabled, selecting CDSE provider")
        return ProviderType.CDSE.value

    # Default to auto-selection
    return ProviderType.AUTO.value


def _select_available_provider() -> ProviderType:
    """
    Select the best available provider based on configuration.

    Priority order:
    1. CDSE (if credentials available)
    2. GEE (if credentials available)
    3. GEE as default (for development)

    Returns:
        ProviderType enum value
    """
    # Check if CDSE credentials are available
    cdse_client_id = getattr(settings, 'CDSE_CLIENT_ID', None)
    cdse_client_secret = getattr(settings, 'CDSE_CLIENT_SECRET', None)

    if cdse_client_id and cdse_client_secret:
        logger.info("CDSE credentials found, selecting CDSE provider")
        return ProviderType.CDSE

    # Check if GEE credentials are available
    gee_service_account = getattr(settings, 'GEE_SERVICE_ACCOUNT', None)
    gee_private_key = getattr(settings, 'GEE_PRIVATE_KEY', None)

    if gee_service_account and gee_private_key:
        logger.info("GEE credentials found, selecting GEE provider")
        return ProviderType.GEE

    # Default to GEE for development (may use default auth)
    logger.info("No provider credentials explicitly configured, using GEE with default auth")
    return ProviderType.GEE


def _create_provider(provider_type: str) -> ISatelliteProvider:
    """
    Create a provider instance.

    Args:
        provider_type: Provider type string

    Returns:
        ISatelliteProvider instance

    Raises:
        ValueError: If provider type is invalid
    """
    if provider_type == ProviderType.GEE.value:
        return GEEProvider()
    elif provider_type == ProviderType.CDSE.value:
        return CDSEProvider()
    else:
        raise ValueError(f"Unknown provider type: {provider_type}")


def clear_provider_cache(provider_type: Optional[str] = None) -> None:
    """
    Clear cached provider instances.

    Args:
        provider_type: Specific provider type to clear, or None to clear all

    Examples:
        # Clear all cached providers
        clear_provider_cache()

        # Clear only CDSE cache
        clear_provider_cache("cdse")
    """
    global _provider_cache

    if provider_type is None:
        _provider_cache.clear()
        logger.debug("Cleared all provider caches")
    elif provider_type in _provider_cache:
        del _provider_cache[provider_type]
        logger.debug(f"Cleared {provider_type} provider cache")
    else:
        logger.debug(f"No cached {provider_type} provider to clear")


def get_provider_info() -> Dict[str, Any]:
    """
    Get information about available and configured providers.

    Returns:
        Dictionary with provider status information
    """
    gee_configured = bool(
        getattr(settings, 'GEE_SERVICE_ACCOUNT', None) and
        getattr(settings, 'GEE_PRIVATE_KEY', None)
    )
    cdse_configured = bool(
        getattr(settings, 'CDSE_CLIENT_ID', None) and
        getattr(settings, 'CDSE_CLIENT_SECRET', None)
    )
    commercial_mode = getattr(settings, 'SATELLITE_COMMERCIAL_MODE', False)
    env_provider = getattr(settings, 'SATELLITE_PROVIDER', 'auto').lower()

    current_provider = _determine_provider_type()
    if current_provider == ProviderType.AUTO.value:
        selected_provider = _select_available_provider().value
    else:
        selected_provider = current_provider

    return {
        "current_provider": selected_provider,
        "commercial_mode": commercial_mode,
        "env_provider": env_provider,
        "providers": {
            "gee": {
                "configured": gee_configured,
                "available": True,  # GEE is always available with default auth
                "description": "Google Earth Engine (Development/Fallback)",
            },
            "cdse": {
                "configured": cdse_configured,
                "available": cdse_configured,
                "description": "Copernicus Data Space Ecosystem (Commercial)",
            },
        },
        "cached_providers": list(_provider_cache.keys()),
    }
