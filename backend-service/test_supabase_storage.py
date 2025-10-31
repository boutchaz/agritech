#!/usr/bin/env python3
"""
Test script for Supabase Storage integration
"""
import asyncio
import httpx
import json
from app.services.supabase_service import supabase_service

async def test_supabase_storage():
    """Test Supabase Storage functionality"""
    print("Testing Supabase Storage integration...")
    
    # Test data
    test_data = b"This is a test GeoTIFF file content"
    filename = "test_ndvi_2025-09-22.tif"
    organization_id = "test-org-123"
    index = "NDVI"
    date = "2025-09-22"
    
    try:
        # Test upload
        print(f"Uploading test file: {filename}")
        public_url = await supabase_service.upload_satellite_file(
            file_data=test_data,
            filename=filename,
            organization_id=organization_id,
            index=index,
            date=date
        )
        
        if public_url:
            print(f"✅ Upload successful: {public_url}")
            
            # Test file listing
            print("Testing file listing...")
            files = await supabase_service.get_satellite_files(
                organization_id=organization_id,
                index=index
            )
            
            if files:
                print(f"✅ Found {len(files)} files")
                for file_info in files:
                    print(f"  - {file_info['filename']} ({file_info['file_size']} bytes)")
            else:
                print("❌ No files found")
                
        else:
            print("❌ Upload failed")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_supabase_storage())
