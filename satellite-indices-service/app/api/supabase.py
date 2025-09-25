from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from app.models.schemas import (
    GetOrganizationFarmsRequest,
    GetFarmParcelsRequest,
    GetParcelSatelliteDataRequest,
    CreateAOIRequest,
    BatchProcessingRequest,
    BatchProcessingResponse,
    ProcessingJob,
    SatelliteIndicesData,
    ParcelStatistics,
    FarmStatistics,
    OrganizationStatisticsResponse,
    CloudCoverageCheckRequest,
    CloudCoverageCheckResponse
)
from app.services import supabase_service, earth_engine_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/organizations/{organization_id}/farms")
async def get_organization_farms(organization_id: str):
    """Get all farms for an organization"""
    try:
        farms = await supabase_service.get_organization_farms(organization_id)
        return {"farms": farms}
    except Exception as e:
        logger.error(f"Error fetching organization farms: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/farms/{farm_id}/parcels")
async def get_farm_parcels(farm_id: str):
    """Get all parcels for a farm"""
    try:
        parcels = await supabase_service.get_farm_parcels(farm_id)
        return {"parcels": parcels}
    except Exception as e:
        logger.error(f"Error fetching farm parcels: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/parcels/{parcel_id}/satellite-data")
async def get_parcel_satellite_data(
    parcel_id: str,
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    indices: Optional[str] = Query(None, description="Comma-separated list of indices")
):
    """Get satellite indices data for a parcel"""
    try:
        date_range = None
        if start_date and end_date:
            date_range = {"start_date": start_date, "end_date": end_date}
        
        indices_list = None
        if indices:
            indices_list = [idx.strip() for idx in indices.split(",")]
        
        data = await supabase_service.get_satellite_data(parcel_id, date_range)
        
        # Filter by indices if specified
        if indices_list:
            data = [d for d in data if d.get('index_name') in indices_list]
        
        return {"satellite_data": data}
    except Exception as e:
        logger.error(f"Error fetching parcel satellite data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cloud-coverage/check")
async def check_cloud_coverage(request: CloudCoverageCheckRequest):
    """Check cloud coverage availability for given parameters"""
    try:
        result = earth_engine_service.check_cloud_coverage(
            request.geometry.dict(),
            request.date_range.start_date,
            request.date_range.end_date,
            request.max_cloud_coverage
        )
        
        return CloudCoverageCheckResponse(**result)
    except Exception as e:
        logger.error(f"Error checking cloud coverage: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/processing/batch", response_model=BatchProcessingResponse)
async def create_batch_processing_job(
    request: BatchProcessingRequest,
    background_tasks: BackgroundTasks
):
    """Create a batch processing job for satellite indices calculation"""
    try:
        # Create processing job
        job_data = {
            "organization_id": request.organization_id,
            "farm_id": request.farm_id,
            "parcel_id": request.parcel_id,
            "job_type": "batch_processing",
            "indices": [idx.value for idx in request.indices],
            "date_range_start": request.date_range.start_date,
            "date_range_end": request.date_range.end_date,
            "cloud_coverage_threshold": request.cloud_coverage,
            "scale": request.scale,
            "status": "pending"
        }
        
        job_id = await supabase_service.save_processing_job(job_data)
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create processing job")
        
        # Get parcels to process
        parcels = []
        if request.parcel_id:
            # Process single parcel
            parcel = await supabase_service.get_parcel_details(request.parcel_id)
            if parcel:
                parcels = [parcel]
        elif request.farm_id:
            # Process all parcels in farm
            parcels = await supabase_service.get_farm_parcels(request.farm_id)
        else:
            # Process all parcels in organization
            farms = await supabase_service.get_organization_farms(request.organization_id)
            for farm in farms:
                farm_parcels = await supabase_service.get_farm_parcels(farm['farm_id'])
                parcels.extend(farm_parcels)
        
        # Filter parcels that have boundaries
        parcels_with_boundaries = [p for p in parcels if p.get('boundary')]
        
        # Start background processing
        background_tasks.add_task(
            process_batch_job,
            job_id,
            request,
            parcels_with_boundaries
        )
        
        return BatchProcessingResponse(
            job_id=job_id,
            total_tasks=len(parcels_with_boundaries),
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error creating batch processing job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/processing/jobs/{job_id}")
async def get_processing_job_status(job_id: str):
    """Get the status of a processing job"""
    try:
        # This would need to be implemented in supabase_service
        # For now, return a placeholder response
        return {
            "job_id": job_id,
            "status": "running",
            "progress_percentage": 50.0,
            "total_tasks": 10,
            "completed_tasks": 5,
            "failed_tasks": 0
        }
    except Exception as e:
        logger.error(f"Error fetching job status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/processing/jobs/{job_id}/cancel")
async def cancel_processing_job(job_id: str):
    """Cancel a processing job"""
    try:
        success = await supabase_service.update_processing_job(job_id, {
            "status": "cancelled",
            "updated_at": datetime.utcnow().isoformat()
        })
        
        if success:
            return {"message": "Job cancelled successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to cancel job")
    except Exception as e:
        logger.error(f"Error cancelling job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/organizations/{organization_id}/statistics")
async def get_organization_statistics(
    organization_id: str,
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    indices: Optional[str] = Query(None, description="Comma-separated list of indices")
):
    """Get satellite indices statistics for an organization"""
    try:
        # Get all farms for the organization
        farms = await supabase_service.get_organization_farms(organization_id)
        
        farm_statistics = []
        for farm in farms:
            farm_id = farm['farm_id']
            farm_name = farm['farm_name']
            
            # Get parcels for this farm
            parcels = await supabase_service.get_farm_parcels(farm_id)
            
            parcel_statistics = []
            for parcel in parcels:
                parcel_id = parcel['parcel_id']
                parcel_name = parcel['parcel_name']
                
                # Get satellite data for this parcel
                date_range = {"start_date": start_date, "end_date": end_date}
                satellite_data = await supabase_service.get_satellite_data(parcel_id, date_range)
                
                # Filter by indices if specified
                if indices:
                    indices_list = [idx.strip() for idx in indices.split(",")]
                    satellite_data = [d for d in satellite_data if d.get('index_name') in indices_list]
                
                # Calculate statistics
                indices_stats = {}
                geotiff_urls = {}
                
                for data_point in satellite_data:
                    index_name = data_point.get('index_name')
                    if index_name not in indices_stats:
                        indices_stats[index_name] = {
                            'mean': data_point.get('mean_value', 0),
                            'min': data_point.get('min_value', 0),
                            'max': data_point.get('max_value', 0),
                            'std': data_point.get('std_value', 0)
                        }
                        if data_point.get('geotiff_url'):
                            geotiff_urls[index_name] = data_point['geotiff_url']
                
                parcel_statistics.append(ParcelStatistics(
                    parcel_id=parcel_id,
                    parcel_name=parcel_name,
                    farm_id=farm_id,
                    farm_name=farm_name,
                    date_range={"start_date": start_date, "end_date": end_date},
                    indices=indices_stats,
                    geotiff_urls=geotiff_urls,
                    metadata={}
                ))
            
            farm_statistics.append(FarmStatistics(
                farm_id=farm_id,
                farm_name=farm_name,
                organization_id=organization_id,
                date_range={"start_date": start_date, "end_date": end_date},
                parcel_statistics=parcel_statistics,
                summary_statistics={},
                generated_at=datetime.utcnow()
            ))
        
        return OrganizationStatisticsResponse(
            organization_id=organization_id,
            organization_name=farms[0]['organization_name'] if farms else "Unknown",
            date_range={"start_date": start_date, "end_date": end_date},
            farm_statistics=farm_statistics,
            summary_statistics={},
            generated_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error fetching organization statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_batch_job(job_id: str, request: BatchProcessingRequest, parcels: List[Dict[str, Any]]):
    """Background task to process a batch job"""
    try:
        # Update job status to running
        await supabase_service.update_processing_job(job_id, {
            "status": "running",
            "started_at": datetime.utcnow().isoformat(),
            "total_tasks": len(parcels)
        })
        
        completed_tasks = 0
        failed_tasks = 0
        
        for parcel in parcels:
            try:
                # Convert boundary to GeoJSON
                boundary = parcel.get('boundary')
                if not boundary:
                    continue
                
                geometry = await supabase_service.convert_boundary_to_geojson(boundary)
                
                # Check cloud coverage if requested
                if request.check_cloud_coverage:
                    cloud_check = earth_engine_service.check_cloud_coverage(
                        geometry,
                        request.date_range.start_date,
                        request.date_range.end_date,
                        request.cloud_coverage
                    )
                    
                    if not cloud_check.get('has_suitable_images'):
                        logger.info(f"No suitable images for parcel {parcel['parcel_id']}")
                        failed_tasks += 1
                        continue
                
                # Calculate indices for this parcel
                for index in request.indices:
                    # This would call the actual index calculation
                    # For now, we'll create a placeholder result
                    result_data = {
                        "organization_id": request.organization_id,
                        "farm_id": parcel.get('farm_id'),
                        "parcel_id": parcel['parcel_id'],
                        "processing_job_id": job_id,
                        "date": request.date_range.start_date,
                        "index_name": index.value,
                        "mean_value": 0.5,  # Placeholder
                        "min_value": 0.1,   # Placeholder
                        "max_value": 0.9,   # Placeholder
                        "std_value": 0.1,   # Placeholder
                        "cloud_coverage_percentage": 5.0,
                        "metadata": {}
                    }
                    
                    await supabase_service.save_satellite_data(result_data)
                
                completed_tasks += 1
                
                # Update progress
                progress = (completed_tasks / len(parcels)) * 100
                await supabase_service.update_processing_job(job_id, {
                    "completed_tasks": completed_tasks,
                    "failed_tasks": failed_tasks,
                    "progress_percentage": progress
                })
                
            except Exception as e:
                logger.error(f"Error processing parcel {parcel.get('parcel_id', 'unknown')}: {e}")
                failed_tasks += 1
        
        # Update job status to completed
        await supabase_service.update_processing_job(job_id, {
            "status": "completed" if failed_tasks == 0 else "failed",
            "completed_at": datetime.utcnow().isoformat(),
            "failed_tasks": failed_tasks,
            "progress_percentage": 100.0
        })
        
    except Exception as e:
        logger.error(f"Error in batch processing job {job_id}: {e}")
        await supabase_service.update_processing_job(job_id, {
            "status": "failed",
            "error_message": str(e),
            "completed_at": datetime.utcnow().isoformat()
        })
