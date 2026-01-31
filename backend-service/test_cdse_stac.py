#!/usr/bin/env python3
"""
Test script to verify CDSE STAC API access for available dates.
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

CDSE_CLIENT_ID = os.getenv("CDSE_CLIENT_ID")
CDSE_CLIENT_SECRET = os.getenv("CDSE_CLIENT_SECRET")

print(f"CDSE_CLIENT_ID: {CDSE_CLIENT_ID[:20] if CDSE_CLIENT_ID else 'NOT SET'}...")
print(f"CDSE_CLIENT_SECRET: {'SET' if CDSE_CLIENT_SECRET else 'NOT SET'}")

# Test 1: Basic pystac_client access (no auth)
print("\n=== Test 1: Basic STAC Catalog Access (No Auth) ===")
try:
    import pystac_client

    catalog = pystac_client.Client.open("https://stac.dataspace.copernicus.eu")
    print(f"Connected to catalog: {catalog.title}")

    # Test search for a known location (Paris area)
    from datetime import datetime, timedelta

    end_date = datetime.now()
    start_date = end_date - timedelta(days=180)

    bbox = [2.0, 48.5, 2.5, 49.0]  # Paris area

    print(f"Searching for Sentinel-2 L2A images...")
    print(f"  BBOX: {bbox}")
    print(f"  Date range: {start_date.date()} to {end_date.date()}")

    search = catalog.search(
        collections=["sentinel-2-l2a"],
        bbox=bbox,
        datetime=[start_date.isoformat(), end_date.isoformat()],
        max_items=10,
        query={"eo:cloud_cover": {"lt": 30}},
    )

    items = list(search.items())
    print(f"Found {len(items)} items")

    if items:
        for item in items[:3]:
            print(f"  - {item.properties['datetime'][:10]}: cloud_cover={item.properties.get('eo:cloud_cover', 'N/A')}")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

# Test 2: With authentication via requests
print("\n=== Test 2: CDSE Token Authentication ===")
try:
    import requests

    token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

    if CDSE_CLIENT_ID and CDSE_CLIENT_SECRET:
        token_response = requests.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CDSE_CLIENT_ID,
                "client_secret": CDSE_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )

        if token_response.status_code == 200:
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            print(f"Got access token: {access_token[:50]}...")

            # Now try STAC search with auth token
            headers = {"Authorization": f"Bearer {access_token}"}

            stac_search_url = "https://stac.dataspace.copernicus.eu/search"
            params = {
                "collections": "sentinel-2-l2a",
                "bbox": "2.0,48.5,2.5,49.0",
                "datetime": f"{(end_date - timedelta(days=180)).isoformat()[:10]}/{end_date.isoformat()[:10]}",
                "limit": 5,
                "query": '{"eo:cloud_cover": {"lt": 30}}',
            }

            response = requests.get(stac_search_url, headers=headers, params=params)
            print(f"STAC search response status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"Found {data.get('context', {}).get('returned', 0)} items with auth")
            else:
                print(f"STAC search error: {response.text[:200]}")
        else:
            print(f"Token request failed: {token_response.status_code} - {token_response.text[:200]}")
    else:
        print("Skipping auth test - no credentials configured")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Check if the CDSE STAC API requires auth for search
print("\n=== Test 3: Check STAC API Requirements ===")
try:
    import requests

    # Try without auth first
    stac_search_url = "https://stac.dataspace.copernicus.eu/search"
    params = {
        "collections": "sentinel-2-l2a",
        "bbox": "2.0,48.5,2.5,49.0",
        "datetime": "2024-01-01/2024-01-31",
        "limit": 1,
    }

    response = requests.get(stac_search_url, params=params)
    print(f"Unauthenticated search status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"Unauthenticated search works! Found: {data.get('context', {}).get('matched', 0)} items")
    elif response.status_code == 401:
        print("Authentication required for STAC search")
    else:
        print(f"Unexpected status: {response.text[:200]}")

except Exception as e:
    print(f"ERROR: {e}")

print("\n=== Test Complete ===")
