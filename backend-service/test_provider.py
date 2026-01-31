import os
os.environ['SATELLITE_PROVIDER'] = 'cdse'
os.environ['CDSE_CLIENT_ID'] = 'sh-d0d326a1-bf76-42b5-8ab7-fbcc4f3abf75'
os.environ['CDSE_CLIENT_SECRET'] = 'BaFw0ySSORrz6Gec4aoV7yrL3P4IE7IZ'

from app.services.satellite import get_satellite_provider

try:
    provider = get_satellite_provider()
    print(f"✅ Provider: {provider.provider_name}")
    print(f"✅ Initialized: {provider._initialized if hasattr(provider, '_initialized') else 'N/A'}")
except Exception as e:
    print(f"❌ Error: {e}")
