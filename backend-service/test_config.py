import os
os.environ['SATELLITE_PROVIDER'] = 'cdse'
os.environ['CDSE_CLIENT_ID'] = 'sh-d0d326a1-bf76-42b5-8ab7-fbcc4f3abf75'
os.environ['CDSE_CLIENT_SECRET'] = 'BaFw0ySSORrz6Gec4aoV7yrL3P4IE7IZ'

from app.core.config import settings
print(f"SATELLITE_PROVIDER: {settings.SATELLITE_PROVIDER}")
print(f"CDSE_CLIENT_ID: {settings.CDSE_CLIENT_ID[:20]}...")
print(f"CDSE_CLIENT_SECRET: {settings.CDSE_CLIENT_SECRET[:20]}...")
print(f"CDSE_OPENEO_URL: {settings.CDSE_OPENEO_URL}")

from app.services.satellite import get_satellite_provider
try:
    provider = get_satellite_provider()
    print(f"Provider initialized: {provider.provider_name}")
except Exception as e:
    print(f"Error: {e}")
