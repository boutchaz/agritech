import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from app.services import supabase_service
from app.services.satellite import get_satellite_provider
from app.models.schemas import BatchProcessingRequest, VegetationIndex

logger = logging.getLogger(__name__)


class AutomatedProcessingService:
    def __init__(self):
        self.running = False
        self.processing_interval = 3600  # 1 hour in seconds

    async def start_scheduler(self):
        """Start the automated processing scheduler"""
        if self.running:
            logger.warning("Automated processing scheduler is already running")
            return

        self.running = True
        logger.info("Starting automated processing scheduler")

        while self.running:
            try:
                await self.process_daily_tasks()
                await asyncio.sleep(self.processing_interval)
            except Exception as e:
                logger.error(f"Error in automated processing scheduler: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes before retrying

    def stop_scheduler(self):
        """Stop the automated processing scheduler"""
        self.running = False
        logger.info("Stopping automated processing scheduler")

    async def process_daily_tasks(self):
        """Process daily satellite indices calculation tasks"""
        try:
            logger.info("Starting daily satellite processing tasks")

            # Get all organizations that need processing
            # This would typically be configured or retrieved from a database
            organizations = await self.get_active_organizations()

            for org in organizations:
                await self.process_organization_parcels(org["id"])

            logger.info("Completed daily satellite processing tasks")

        except Exception as e:
            logger.error(f"Error in daily processing tasks: {e}")

    async def get_active_organizations(self) -> List[Dict[str, Any]]:
        """Get list of active organizations that have active subscriptions"""
        try:
            result = (
                await supabase_service.get_organizations_with_active_subscriptions()
            )
            if not result:
                logger.info("No active organizations found for processing")
                return []
            return result
        except Exception as e:
            logger.error(f"Error getting active organizations: {e}")
            return []

    async def process_organization_parcels(self, organization_id: str):
        """Process all parcels for an organization"""
        try:
            logger.info(f"Processing parcels for organization {organization_id}")

            # Get all farms for the organization
            farms = await supabase_service.get_organization_farms(organization_id)

            for farm in farms:
                farm_id = farm["farm_id"]
                farm_name = farm["farm_name"]

                logger.info(f"Processing farm: {farm_name} ({farm_id})")
                await self.process_farm_parcels(organization_id, farm_id)

        except Exception as e:
            logger.error(f"Error processing organization {organization_id}: {e}")

    async def process_farm_parcels(self, organization_id: str, farm_id: str):
        """Process all parcels for a farm"""
        try:
            # Get all parcels for the farm
            parcels = await supabase_service.get_farm_parcels(farm_id)

            for parcel in parcels:
                parcel_id = parcel["parcel_id"]
                parcel_name = parcel["parcel_name"]

                logger.info(f"Processing parcel: {parcel_name} ({parcel_id})")
                await self.process_single_parcel(organization_id, farm_id, parcel)

        except Exception as e:
            logger.error(f"Error processing farm {farm_id}: {e}")

    async def process_single_parcel(
        self, organization_id: str, farm_id: str, parcel: Dict[str, Any]
    ):
        """Process a single parcel with cloud coverage check and index calculation"""
        try:
            parcel_id = parcel["parcel_id"]
            parcel_name = parcel["parcel_name"]
            boundary = parcel.get("boundary")

            if not boundary:
                logger.warning(f"Parcel {parcel_name} has no boundary, skipping")
                return

            # Convert boundary to GeoJSON
            geometry = await supabase_service.convert_boundary_to_geojson(boundary)

            # Define date range (last 7 days)
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=7)

            satellite_provider = get_satellite_provider()
            cloud_check_obj = satellite_provider.check_cloud_coverage(
                geometry=geometry,
                start_date=start_date.strftime("%Y-%m-%d"),
                end_date=end_date.strftime("%Y-%m-%d"),
                max_cloud_coverage=10.0,
            )
            cloud_check = {
                "has_suitable_images": cloud_check_obj.has_suitable_images,
                "available_images_count": cloud_check_obj.available_images_count,
                "min_cloud_coverage": cloud_check_obj.min_cloud_coverage,
                "recommended_date": cloud_check_obj.recommended_date,
                "metadata": cloud_check_obj.metadata,
            }

            if not cloud_check.get("has_suitable_images"):
                logger.info(
                    f"No suitable images for parcel {parcel_name} in date range"
                )
                return

            # Get recommended date or use the best available date
            recommended_date = cloud_check.get("recommended_date")
            if not recommended_date:
                recommended_date = end_date.strftime("%Y-%m-%d")

            logger.info(f"Processing parcel {parcel_name} for date {recommended_date}")

            # Calculate vegetation indices
            await self.calculate_parcel_indices(
                organization_id,
                farm_id,
                parcel_id,
                geometry,
                recommended_date,
                cloud_check,
            )

        except Exception as e:
            logger.error(
                f"Error processing parcel {parcel.get('parcel_name', 'unknown')}: {e}"
            )

    async def calculate_parcel_indices(
        self,
        organization_id: str,
        farm_id: str,
        parcel_id: str,
        geometry: Dict[str, Any],
        date: str,
        cloud_check: Dict[str, Any],
    ):
        try:
            indices_to_calculate = ["NDVI", "NDRE", "GCI", "SAVI"]
            satellite_provider = get_satellite_provider()

            if satellite_provider.provider_name == "Google Earth Engine":
                from app.services import earth_engine_service
                import ee

                collection = earth_engine_service.get_sentinel2_collection(
                    geometry,
                    date,
                    (datetime.strptime(date, "%Y-%m-%d") + timedelta(days=1)).strftime(
                        "%Y-%m-%d"
                    ),
                    max_cloud_coverage=10.0,
                )

                if collection.size().getInfo() == 0:
                    logger.warning(
                        f"No images found for parcel {parcel_id} on date {date}"
                    )
                    return

                image = collection.sort("CLOUDY_PIXEL_PERCENTAGE").first()
                index_results = earth_engine_service.calculate_vegetation_indices(
                    image, indices_to_calculate
                )

                aoi = ee.Geometry(geometry)

                for index_name, index_image in index_results.items():
                    try:
                        stats = index_image.reduceRegion(
                            reducer=ee.Reducer.percentile([2, 25, 50, 75, 98])
                            .combine(ee.Reducer.mean(), "", True)
                            .combine(ee.Reducer.stdDev(), "", True)
                            .combine(ee.Reducer.count(), "", True),
                            geometry=aoi,
                            scale=10,
                            maxPixels=1e13,
                        )

                        stats_result = stats.getInfo()

                        satellite_data = {
                            "organization_id": organization_id,
                            "farm_id": farm_id,
                            "parcel_id": parcel_id,
                            "date": date,
                            "index_name": index_name,
                            "mean_value": stats_result.get(f"{index_name}_mean"),
                            "min_value": stats_result.get(f"{index_name}_p2"),
                            "max_value": stats_result.get(f"{index_name}_p98"),
                            "std_value": stats_result.get(f"{index_name}_stdDev"),
                            "median_value": stats_result.get(f"{index_name}_p50"),
                            "percentile_25": stats_result.get(f"{index_name}_p25"),
                            "percentile_75": stats_result.get(f"{index_name}_p75"),
                            "percentile_90": stats_result.get(f"{index_name}_p90"),
                            "pixel_count": stats_result.get(f"{index_name}_count"),
                            "cloud_coverage_percentage": cloud_check.get(
                                "min_cloud_coverage", 0
                            ),
                            "image_source": "Sentinel-2",
                            "metadata": {
                                "processing_date": datetime.utcnow().isoformat(),
                                "cloud_check_result": cloud_check,
                                "image_date": date,
                                "provider": satellite_provider.provider_name,
                            },
                        }

                        await supabase_service.save_satellite_data(satellite_data)
                        logger.info(f"Saved {index_name} data for parcel {parcel_id}")

                    except Exception as e:
                        logger.error(
                            f"Error calculating {index_name} for parcel {parcel_id}: {e}"
                        )
                        continue
            else:
                end_date_str = (
                    datetime.strptime(date, "%Y-%m-%d") + timedelta(days=1)
                ).strftime("%Y-%m-%d")
                stats_results = satellite_provider.get_statistics(
                    geometry=geometry,
                    start_date=date,
                    end_date=end_date_str,
                    indices=indices_to_calculate,
                )

                for index_name, stat_result in stats_results.items():
                    try:
                        s = stat_result.statistics
                        satellite_data = {
                            "organization_id": organization_id,
                            "farm_id": farm_id,
                            "parcel_id": parcel_id,
                            "date": date,
                            "index_name": index_name,
                            "mean_value": s.get("mean"),
                            "min_value": s.get("min"),
                            "max_value": s.get("max"),
                            "std_value": s.get("std"),
                            "median_value": s.get("median"),
                            "cloud_coverage_percentage": cloud_check.get(
                                "min_cloud_coverage", 0
                            ),
                            "image_source": "Sentinel-2 CDSE",
                            "metadata": {
                                "processing_date": datetime.utcnow().isoformat(),
                                "cloud_check_result": cloud_check,
                                "image_date": date,
                                "provider": satellite_provider.provider_name,
                            },
                        }

                        await supabase_service.save_satellite_data(satellite_data)
                        logger.info(f"Saved {index_name} data for parcel {parcel_id}")

                    except Exception as e:
                        logger.error(
                            f"Error calculating {index_name} for parcel {parcel_id}: {e}"
                        )
                        continue

        except Exception as e:
            logger.error(f"Error calculating indices for parcel {parcel_id}: {e}")

    async def create_batch_processing_job(
        self,
        organization_id: str,
        farm_id: Optional[str] = None,
        parcel_id: Optional[str] = None,
        indices: List[str] = None,
        days_back: int = 7,
    ) -> str:
        """Create a batch processing job for specific parameters"""
        try:
            if indices is None:
                indices = ["NDVI", "NDRE", "GCI", "SAVI"]

            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days_back)

            # Create processing job
            job_data = {
                "organization_id": organization_id,
                "farm_id": farm_id,
                "parcel_id": parcel_id,
                "job_type": "batch_processing",
                "indices": indices,
                "date_range_start": start_date.strftime("%Y-%m-%d"),
                "date_range_end": end_date.strftime("%Y-%m-%d"),
                "cloud_coverage_threshold": 10.0,
                "scale": 10,
                "status": "pending",
            }

            job_id = await supabase_service.save_processing_job(job_data)
            if job_id:
                logger.info(f"Created batch processing job {job_id}")
                return job_id
            else:
                raise Exception("Failed to create processing job")

        except Exception as e:
            logger.error(f"Error creating batch processing job: {e}")
            raise


# Singleton instance
automated_processing_service = AutomatedProcessingService()
