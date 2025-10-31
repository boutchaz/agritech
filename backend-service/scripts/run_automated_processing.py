#!/usr/bin/env python3
"""
Automated Processing Script for Satellite Indices Service

This script can be run as a cron job to automatically process satellite indices
for all parcels in the system with cloud coverage checking.

Usage:
    python scripts/run_automated_processing.py [options]

Options:
    --organization-id ORG_ID    Process only specific organization
    --farm-id FARM_ID          Process only specific farm
    --parcel-id PARCEL_ID      Process only specific parcel
    --indices NDVI,NDRE,GCI    Comma-separated list of indices to calculate
    --days-back 7              Number of days back to process (default: 7)
    --dry-run                  Show what would be processed without actually processing
    --help                     Show this help message

Examples:
    # Process all parcels for all organizations (last 7 days)
    python scripts/run_automated_processing.py

    # Process specific organization
    python scripts/run_automated_processing.py --organization-id org-123

    # Process specific farm with custom indices
    python scripts/run_automated_processing.py --farm-id farm-456 --indices NDVI,NDRE

    # Dry run to see what would be processed
    python scripts/run_automated_processing.py --dry-run
"""

import asyncio
import argparse
import logging
import sys
import os
from datetime import datetime, timedelta

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services import supabase_service, automated_processing_service
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('automated_processing.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

async def main():
    parser = argparse.ArgumentParser(description='Automated Satellite Indices Processing')
    parser.add_argument('--organization-id', help='Process only specific organization')
    parser.add_argument('--farm-id', help='Process only specific farm')
    parser.add_argument('--parcel-id', help='Process only specific parcel')
    parser.add_argument('--indices', help='Comma-separated list of indices (default: NDVI,NDRE,GCI,SAVI)')
    parser.add_argument('--days-back', type=int, default=7, help='Number of days back to process (default: 7)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be processed without actually processing')
    parser.add_argument('--create-job', action='store_true', help='Create a batch processing job instead of immediate processing')
    
    args = parser.parse_args()
    
    try:
        logger.info("Starting automated satellite indices processing")
        logger.info(f"Arguments: {args}")
        
        # Parse indices
        indices = ['NDVI', 'NDRE', 'GCI', 'SAVI']
        if args.indices:
            indices = [idx.strip().upper() for idx in args.indices.split(',')]
        
        if args.dry_run:
            await dry_run_processing(args, indices)
        elif args.create_job:
            await create_batch_job(args, indices)
        else:
            await immediate_processing(args, indices)
        
        logger.info("Automated processing completed successfully")
        
    except Exception as e:
        logger.error(f"Error in automated processing: {e}")
        sys.exit(1)

async def dry_run_processing(args, indices):
    """Show what would be processed without actually processing"""
    logger.info("DRY RUN MODE - No actual processing will be performed")
    
    if args.parcel_id:
        # Process single parcel
        parcel = await supabase_service.get_parcel_details(args.parcel_id)
        if parcel:
            logger.info(f"Would process parcel: {parcel['name']} ({args.parcel_id})")
            await check_parcel_cloud_coverage(parcel, args.days_back)
        else:
            logger.warning(f"Parcel {args.parcel_id} not found")
    
    elif args.farm_id:
        # Process all parcels in farm
        farm = await supabase_service.get_farm_details(args.farm_id)
        if farm:
            logger.info(f"Would process farm: {farm['name']} ({args.farm_id})")
            parcels = await supabase_service.get_farm_parcels(args.farm_id)
            logger.info(f"Found {len(parcels)} parcels in farm")
            
            for parcel in parcels:
                logger.info(f"  - Would process parcel: {parcel['parcel_name']} ({parcel['parcel_id']})")
                await check_parcel_cloud_coverage(parcel, args.days_back)
        else:
            logger.warning(f"Farm {args.farm_id} not found")
    
    else:
        # Process all organizations or specific organization
        if args.organization_id:
            logger.info(f"Would process organization: {args.organization_id}")
            farms = await supabase_service.get_organization_farms(args.organization_id)
        else:
            logger.info("Would process all organizations")
            # This would need to be implemented to get all organizations
            farms = []
        
        logger.info(f"Found {len(farms)} farms")
        
        for farm in farms:
            logger.info(f"  - Would process farm: {farm['farm_name']} ({farm['farm_id']})")
            parcels = await supabase_service.get_farm_parcels(farm['farm_id'])
            logger.info(f"    Found {len(parcels)} parcels")
            
            for parcel in parcels:
                logger.info(f"      - Would process parcel: {parcel['parcel_name']} ({parcel['parcel_id']})")

async def check_parcel_cloud_coverage(parcel, days_back):
    """Check cloud coverage for a parcel and log the result"""
    try:
        boundary = parcel.get('boundary')
        if not boundary:
            logger.warning(f"Parcel {parcel.get('name', 'unknown')} has no boundary")
            return
        
        # Convert boundary to GeoJSON
        geometry = await supabase_service.convert_boundary_to_geojson(boundary)
        
        # Define date range
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days_back)
        
        # Check cloud coverage
        from app.services.earth_engine_service import earth_engine_service
        cloud_check = earth_engine_service.check_cloud_coverage(
            geometry,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            max_cloud_coverage=10.0
        )
        
        if cloud_check.get('has_suitable_images'):
            logger.info(f"    ✓ Suitable images available (min cloud: {cloud_check.get('min_cloud_coverage', 'N/A')}%)")
        else:
            logger.info(f"    ✗ No suitable images available")
    
    except Exception as e:
        logger.error(f"    Error checking cloud coverage: {e}")

async def create_batch_job(args, indices):
    """Create a batch processing job"""
    try:
        job_id = await automated_processing_service.create_batch_processing_job(
            organization_id=args.organization_id or "default-org",
            farm_id=args.farm_id,
            parcel_id=args.parcel_id,
            indices=indices,
            days_back=args.days_back
        )
        
        logger.info(f"Created batch processing job: {job_id}")
        logger.info(f"You can check the job status at: /api/supabase/processing/jobs/{job_id}")
        
    except Exception as e:
        logger.error(f"Error creating batch job: {e}")
        raise

async def immediate_processing(args, indices):
    """Perform immediate processing"""
    try:
        if args.parcel_id:
            # Process single parcel
            parcel = await supabase_service.get_parcel_details(args.parcel_id)
            if parcel:
                farm_id = parcel.get('farm_id')
                org_id = await get_organization_for_farm(farm_id)
                await automated_processing_service.process_single_parcel(
                    org_id, farm_id, parcel
                )
            else:
                logger.warning(f"Parcel {args.parcel_id} not found")
        
        elif args.farm_id:
            # Process all parcels in farm
            farm = await supabase_service.get_farm_details(args.farm_id)
            if farm:
                org_id = farm.get('organization_id')
                await automated_processing_service.process_farm_parcels(org_id, args.farm_id)
            else:
                logger.warning(f"Farm {args.farm_id} not found")
        
        else:
            # Process organization or all organizations
            if args.organization_id:
                await automated_processing_service.process_organization_parcels(args.organization_id)
            else:
                await automated_processing_service.process_daily_tasks()
    
    except Exception as e:
        logger.error(f"Error in immediate processing: {e}")
        raise

async def get_organization_for_farm(farm_id):
    """Get organization ID for a farm"""
    try:
        farm = await supabase_service.get_farm_details(farm_id)
        return farm.get('organization_id') if farm else None
    except Exception as e:
        logger.error(f"Error getting organization for farm {farm_id}: {e}")
        return None

if __name__ == "__main__":
    asyncio.run(main())
