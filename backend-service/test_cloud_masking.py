#!/usr/bin/env python3
"""
Test script for AOI-based cloud masking functionality
Tests the fix for unavailable readings when clouds are outside the farm AOI
"""
import asyncio
import httpx
import json
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"  # Adjust if your service runs on different port

# Test AOI - A small farm area for testing
# This is a sample polygon; replace with your actual problematic farm coordinates
TEST_AOI = {
    "type": "Polygon",
    "coordinates": [[
        [-7.5, 33.5],
        [-7.5, 33.51],
        [-7.49, 33.51],
        [-7.49, 33.5],
        [-7.5, 33.5]
    ]]
}

# Dates that previously showed unavailable readings due to clouds outside AOI
PROBLEMATIC_DATES = [
    ("2025-02-10", "2025-02-11"),  # 02/10/2025
    ("2025-12-10", "2025-12-11"),  # 12/10/2025
]

async def test_aoi_cloud_filtering():
    """Test that AOI-based cloud filtering works correctly"""
    print("\n" + "="*80)
    print("Testing AOI-based Cloud Filtering")
    print("="*80 + "\n")
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        for start_date, end_date in PROBLEMATIC_DATES:
            print(f"\n{'─'*80}")
            print(f"Testing date range: {start_date} to {end_date}")
            print(f"{'─'*80}\n")
            
            # Test 1: With AOI-based cloud filtering (new behavior)
            print("Test 1: AOI-based cloud filtering (use_aoi_cloud_filter=true)")
            await test_with_aoi_filtering(client, start_date, end_date, enabled=True)
            
            print("\n")
            
            # Test 2: Without AOI-based filtering (old behavior for comparison)
            print("Test 2: Tile-based cloud filtering (use_aoi_cloud_filter=false)")
            await test_with_aoi_filtering(client, start_date, end_date, enabled=False)
            
            print("\n" + "─"*80)

async def test_with_aoi_filtering(
    client: httpx.AsyncClient,
    start_date: str,
    end_date: str,
    enabled: bool
):
    """Test with or without AOI-based cloud filtering"""
    
    request_body = {
        "aoi": {
            "geometry": TEST_AOI
        },
        "date_range": {
            "start_date": start_date,
            "end_date": end_date
        },
        "indices": ["NDVI", "NDRE", "NDWI"],
        "cloud_coverage": 10,  # Max 10% cloud coverage
        "scale": 10,
        "use_aoi_cloud_filter": enabled,
        "cloud_buffer_meters": 300  # 300m buffer as requested
    }
    
    try:
        response = await client.post(
            f"{BASE_URL}/indices/calculate",
            json=request_body
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if we got valid results
            if data.get("results"):
                print(f"✅ SUCCESS - Got {len(data['results'])} index results")
                
                # Show cloud coverage info if available
                if data.get("cloud_coverage") is not None:
                    print(f"   Cloud coverage: {data['cloud_coverage']:.2f}%")
                
                # Show available indices
                available_indices = [r["index"] for r in data["results"]]
                print(f"   Available indices: {', '.join(available_indices)}")
                
                # Show some sample values
                for result in data["results"][:2]:  # Show first 2 indices
                    index_name = result["index"]
                    if result.get("statistics"):
                        stats = result["statistics"]
                        print(f"   {index_name}: mean={stats.get('mean', 'N/A'):.4f}, "
                              f"min={stats.get('min', 'N/A'):.4f}, "
                              f"max={stats.get('max', 'N/A'):.4f}")
                
            else:
                print(f"⚠️  NO DATA - No results returned (possibly no cloud-free images)")
                
        elif response.status_code == 404:
            print(f"❌ NO IMAGES - No suitable images found in date range")
            error = response.json()
            if error.get("detail"):
                print(f"   Reason: {error['detail']}")
                
        else:
            print(f"❌ ERROR - Status code: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            
    except httpx.TimeoutException:
        print(f"⏱️  TIMEOUT - Request took too long (Earth Engine might be slow)")
    except Exception as e:
        print(f"❌ EXCEPTION - {type(e).__name__}: {str(e)}")

async def test_cloud_buffer_variations():
    """Test different buffer sizes to see their effect"""
    print("\n" + "="*80)
    print("Testing Different Cloud Buffer Sizes")
    print("="*80 + "\n")
    
    # Use first problematic date
    start_date, end_date = PROBLEMATIC_DATES[0]
    
    buffers = [0, 150, 300, 500, 1000]  # Different buffer sizes in meters
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        for buffer in buffers:
            print(f"\nTesting with {buffer}m buffer...")
            
            request_body = {
                "aoi": {
                    "geometry": TEST_AOI
                },
                "date_range": {
                    "start_date": start_date,
                    "end_date": end_date
                },
                "indices": ["NDVI"],
                "cloud_coverage": 10,
                "use_aoi_cloud_filter": True,
                "cloud_buffer_meters": buffer
            }
            
            try:
                response = await client.post(
                    f"{BASE_URL}/indices/calculate",
                    json=request_body
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("results"):
                        cloud_cov = data.get("cloud_coverage", "N/A")
                        print(f"  ✅ Buffer {buffer}m: SUCCESS (cloud coverage: {cloud_cov}%)")
                    else:
                        print(f"  ⚠️  Buffer {buffer}m: No data")
                else:
                    print(f"  ❌ Buffer {buffer}m: No images found")
                    
            except Exception as e:
                print(f"  ❌ Buffer {buffer}m: Error - {str(e)[:50]}")

async def test_health_check():
    """Test that the service is running"""
    print("\n" + "="*80)
    print("Service Health Check")
    print("="*80 + "\n")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BASE_URL}/health")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Service is running")
                print(f"   Status: {data.get('status')}")
                print(f"   Earth Engine: {data.get('earth_engine_initialized')}")
            else:
                print(f"❌ Service health check failed: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Could not connect to service: {e}")
        print(f"\n⚠️  Make sure the service is running on {BASE_URL}")
        print(f"   Start it with: cd satellite-indices-service && uvicorn app.main:app --reload")
        return False
    
    return True

async def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("AOI-BASED CLOUD MASKING TEST SUITE")
    print("="*80)
    print("\nThis test verifies the fix for:")
    print("- Unavailable readings on 02/10/2025 and 12/10/2025")
    print("- Cloud coverage calculated only within AOI + 300m buffer")
    print("- Ignoring clouds outside the farm area")
    print("="*80)
    
    # First check if service is running
    if not await test_health_check():
        return
    
    # Run main tests
    await test_aoi_cloud_filtering()
    
    # Test different buffer sizes
    await test_cloud_buffer_variations()
    
    print("\n" + "="*80)
    print("TEST SUITE COMPLETE")
    print("="*80)
    print("\nExpected Results:")
    print("✅ AOI-based filtering should find MORE images than tile-based filtering")
    print("✅ Dates with clouds outside AOI should now return data")
    print("✅ Smaller buffers should be more permissive, larger buffers more strict")
    print("="*80 + "\n")

if __name__ == "__main__":
    asyncio.run(main())

