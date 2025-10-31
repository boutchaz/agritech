#!/usr/bin/env python3
"""
Unit tests for cloud masking service
Tests the logic without requiring Earth Engine connection
"""
import pytest
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

def test_imports():
    """Test that all required modules can be imported"""
    try:
        from app.services.cloud_masking import CloudMaskingService
        print("✅ Successfully imported CloudMaskingService")
        return True
    except ImportError as e:
        print(f"❌ Failed to import CloudMaskingService: {e}")
        return False

def test_service_methods_exist():
    """Test that CloudMaskingService has all required methods"""
    from app.services.cloud_masking import CloudMaskingService
    
    required_methods = [
        'mask_clouds_s2',
        'calculate_cloud_coverage_in_aoi',
        'filter_collection_by_aoi_clouds',
        'get_best_cloud_free_image',
        'create_cloud_probability_mask'
    ]
    
    missing_methods = []
    for method in required_methods:
        if not hasattr(CloudMaskingService, method):
            missing_methods.append(method)
    
    if missing_methods:
        print(f"❌ Missing methods: {', '.join(missing_methods)}")
        return False
    else:
        print(f"✅ All {len(required_methods)} required methods exist")
        return True

def test_schema_has_new_fields():
    """Test that the schema has the new AOI cloud filtering fields"""
    from app.models.schemas import IndexCalculationRequest
    from pydantic import Field
    
    # Create a test instance
    test_data = {
        "aoi": {
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [0, 0], [0, 1], [1, 1], [1, 0], [0, 0]
                ]]
            }
        },
        "date_range": {
            "start_date": "2025-01-01",
            "end_date": "2025-01-31"
        },
        "indices": ["NDVI"]
    }
    
    try:
        # Test with new fields
        request = IndexCalculationRequest(**test_data)
        
        # Check defaults
        if hasattr(request, 'use_aoi_cloud_filter'):
            print(f"✅ use_aoi_cloud_filter field exists (default: {request.use_aoi_cloud_filter})")
            assert request.use_aoi_cloud_filter == True, "Default should be True"
        else:
            print("❌ use_aoi_cloud_filter field missing")
            return False
            
        if hasattr(request, 'cloud_buffer_meters'):
            print(f"✅ cloud_buffer_meters field exists (default: {request.cloud_buffer_meters})")
            assert request.cloud_buffer_meters == 300, "Default should be 300"
        else:
            print("❌ cloud_buffer_meters field missing")
            return False
        
        # Test with custom values
        test_data['use_aoi_cloud_filter'] = False
        test_data['cloud_buffer_meters'] = 500
        request2 = IndexCalculationRequest(**test_data)
        
        assert request2.use_aoi_cloud_filter == False
        assert request2.cloud_buffer_meters == 500
        print("✅ Custom values work correctly")
        
        return True
        
    except Exception as e:
        print(f"❌ Schema validation failed: {e}")
        return False

def test_earth_engine_service_signature():
    """Test that EarthEngineService.get_sentinel2_collection has correct signature"""
    from app.services.earth_engine import EarthEngineService
    import inspect
    
    # Get method signature
    sig = inspect.signature(EarthEngineService.get_sentinel2_collection)
    params = sig.parameters
    
    # Check for new parameters
    if 'use_aoi_cloud_filter' in params:
        default = params['use_aoi_cloud_filter'].default
        print(f"✅ use_aoi_cloud_filter parameter exists (default: {default})")
        if default != True:
            print(f"⚠️  Warning: default is {default}, expected True")
    else:
        print("❌ use_aoi_cloud_filter parameter missing")
        return False
    
    if 'cloud_buffer_meters' in params:
        default = params['cloud_buffer_meters'].default
        print(f"✅ cloud_buffer_meters parameter exists (default: {default})")
        if default != 300:
            print(f"⚠️  Warning: default is {default}, expected 300")
    else:
        print("❌ cloud_buffer_meters parameter missing")
        return False
    
    return True

def test_api_endpoint_integration():
    """Test that the API endpoint passes parameters correctly"""
    import inspect
    from app.api.indices import calculate_indices
    
    # Read the source code to check if parameters are passed
    source = inspect.getsource(calculate_indices)
    
    if 'use_aoi_cloud_filter' in source and 'cloud_buffer_meters' in source:
        print("✅ API endpoint passes AOI cloud filtering parameters")
        return True
    else:
        print("❌ API endpoint may not be passing parameters correctly")
        return False

def run_all_tests():
    """Run all unit tests"""
    print("\n" + "="*80)
    print("CLOUD MASKING UNIT TESTS")
    print("="*80 + "\n")
    
    tests = [
        ("Import Test", test_imports),
        ("Service Methods Test", test_service_methods_exist),
        ("Schema Fields Test", test_schema_has_new_fields),
        ("Earth Engine Service Signature", test_earth_engine_service_signature),
        ("API Endpoint Integration", test_api_endpoint_integration),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{test_name}")
        print("-" * 80)
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    print("="*80 + "\n")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

