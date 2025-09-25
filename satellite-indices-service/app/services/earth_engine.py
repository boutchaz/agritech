import ee
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class EarthEngineService:
    def __init__(self):
        self.initialized = False
        
    def initialize(self):
        """Initialize Earth Engine with service account credentials"""
        if self.initialized:
            return
            
        try:
            if settings.GEE_SERVICE_ACCOUNT and settings.GEE_PRIVATE_KEY:
                credentials = ee.ServiceAccountCredentials(
                    settings.GEE_SERVICE_ACCOUNT,
                    key_data=settings.GEE_PRIVATE_KEY
                )
                ee.Initialize(credentials, project=settings.GEE_PROJECT_ID)
            else:
                # Fallback to default authentication for development
                ee.Initialize(project=settings.GEE_PROJECT_ID)
            
            self.initialized = True
            logger.info("Earth Engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Earth Engine: {e}")
            raise
    
    def get_sentinel2_collection(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        max_cloud_coverage: float = None
    ) -> ee.ImageCollection:
        """Get Sentinel-2 image collection for given parameters"""
        self.initialize()

        # Validate date range
        try:
            start_dt = datetime.fromisoformat(start_date)
            end_dt = datetime.fromisoformat(end_date)

            if start_dt >= end_dt:
                raise ValueError("Start date must be before end date")

            # Allow future dates for testing/demo purposes
            # if start_dt >= datetime.now():
            #     raise ValueError("Start date cannot be in the future")

            # if end_dt >= datetime.now():
            #     raise ValueError("End date cannot be in the future")

            # Sentinel-2 data is available from 2015-06-23
            sentinel2_start = datetime(2015, 6, 23)
            if start_dt < sentinel2_start:
                raise ValueError(f"Start date cannot be before {sentinel2_start.strftime('%Y-%m-%d')} (Sentinel-2 launch date)")

        except ValueError as ve:
            raise ValueError(f"Invalid date range: {ve}")
        except Exception as e:
            raise ValueError(f"Invalid date format. Use YYYY-MM-DD format: {e}")

        aoi = ee.Geometry(geometry)
        max_cloud = max_cloud_coverage or settings.MAX_CLOUD_COVERAGE
        
        collection = (
            ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(aoi)
            .filterDate(start_date, end_date)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud))
        )

        # Check if collection has any images
        try:
            collection_size = collection.size().getInfo()
            if collection_size == 0:
                logger.info(f"No Sentinel-2 images found for the specified area and date range ({start_date} to {end_date}) with cloud coverage < {max_cloud}%")
                # Don't raise an error here, let the calling code handle empty collections
        except Exception as e:
            logger.warning(f"Could not check collection size: {e}")

        return collection
    
    def calculate_vegetation_indices(
        self,
        image: ee.Image,
        indices: List[str]
    ) -> Dict[str, ee.Image]:
        """Calculate requested vegetation indices"""
        
        # Select bands
        bands = {
            'blue': image.select('B2'),
            'green': image.select('B3'),
            'red': image.select('B4'),
            'red_edge': image.select('B5'),
            'red_edge_2': image.select('B6'),
            'red_edge_3': image.select('B7'),
            'nir': image.select('B8'),
            'nir_narrow': image.select('B8A'),
            'swir1': image.select('B11'),
            'swir2': image.select('B12')
        }
        
        results = {}
        
        # NDVI
        if 'NDVI' in indices:
            results['NDVI'] = bands['nir'].subtract(bands['red']).divide(
                bands['nir'].add(bands['red'])
            ).rename('NDVI')
        
        # NDRE
        if 'NDRE' in indices:
            results['NDRE'] = bands['nir'].subtract(bands['red_edge']).divide(
                bands['nir'].add(bands['red_edge'])
            ).rename('NDRE')
        
        # NDMI
        if 'NDMI' in indices:
            results['NDMI'] = bands['nir'].subtract(bands['swir1']).divide(
                bands['nir'].add(bands['swir1'])
            ).rename('NDMI')
        
        # MNDWI
        if 'MNDWI' in indices:
            results['MNDWI'] = bands['green'].subtract(bands['swir1']).divide(
                bands['green'].add(bands['swir1'])
            ).rename('MNDWI')
        
        # GCI
        if 'GCI' in indices:
            results['GCI'] = bands['nir'].divide(bands['green']).subtract(1).rename('GCI')
        
        # SAVI
        if 'SAVI' in indices:
            L = 0.5
            results['SAVI'] = bands['nir'].subtract(bands['red']).multiply(1 + L).divide(
                bands['nir'].add(bands['red']).add(L)
            ).rename('SAVI')
        
        # OSAVI
        if 'OSAVI' in indices:
            results['OSAVI'] = bands['nir'].subtract(bands['red']).divide(
                bands['nir'].add(bands['red']).add(0.16)
            ).rename('OSAVI')
        
        # MSAVI2
        if 'MSAVI2' in indices:
            results['MSAVI2'] = (
                bands['nir'].multiply(2).add(1).subtract(
                    bands['nir'].multiply(2).add(1).pow(2).subtract(
                        bands['nir'].subtract(bands['red']).multiply(8)
                    ).sqrt()
                ).divide(2)
            ).rename('MSAVI2')
        
        # PRI
        if 'PRI' in indices:
            results['PRI'] = bands['red_edge'].subtract(bands['red_edge_2']).divide(
                bands['red_edge'].add(bands['red_edge_2'])
            ).rename('PRI')
        
        # MSI
        if 'MSI' in indices:
            results['MSI'] = bands['swir1'].divide(bands['nir']).rename('MSI')
        
        # MCARI
        if 'MCARI' in indices:
            results['MCARI'] = (
                bands['red_edge'].subtract(bands['red']).subtract(
                    bands['red_edge'].subtract(bands['green']).multiply(0.2)
                ).multiply(bands['red_edge'].divide(bands['green']))
            ).rename('MCARI')
        
        # TCARI
        if 'TCARI' in indices:
            results['TCARI'] = ee.Image(3).multiply(
                bands['red_edge'].subtract(bands['red']).subtract(
                    bands['red_edge'].subtract(bands['green']).multiply(0.2).multiply(
                        bands['red_edge'].divide(bands['red'])
                    )
                )
            ).rename('TCARI')
        
        return results
    
    def get_time_series(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        index: str,
        interval: str = 'month'
    ) -> List[Dict]:
        """Get time series data for a specific index"""
        self.initialize()
        
        collection = self.get_sentinel2_collection(geometry, start_date, end_date)
        aoi = ee.Geometry(geometry)
        
        # Calculate index for each image
        def calculate_index(image):
            indices = self.calculate_vegetation_indices(image, [index])
            return image.set({
                'date': image.date().format('YYYY-MM-dd'),
                'mean_value': indices[index].reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=aoi,
                    scale=settings.DEFAULT_SCALE,
                    maxPixels=settings.MAX_PIXELS
                ).get(index)
            })
        
        # Map over collection
        processed = collection.map(calculate_index)
        
        # Extract time series
        features = processed.reduceColumns(
            ee.Reducer.toList(2),
            ['date', 'mean_value']
        ).get('list')
        
        # Convert to Python list
        time_series = features.getInfo()
        
        return [
            {'date': item[0], 'value': item[1]} 
            for item in time_series if item[1] is not None
        ]
    
    def export_index_map(
        self,
        geometry: Dict,
        date: str,
        index: str,
        scale: int = None
    ) -> str:
        """Export index map as GeoTIFF URL"""
        self.initialize()
        
        # Get the image for the specific date
        collection = self.get_sentinel2_collection(
            geometry,
            date,
            (datetime.strptime(date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')
        )
        
        try:
            collection_size = collection.size().getInfo()
            if collection_size == 0:
                raise ValueError(f"No images found for date {date}")
            
            image = ee.Image(collection.first())
        except Exception as e:
            if "Empty date ranges not supported" in str(e):
                raise ValueError(f"No images found for date {date}")
            else:
                raise e
        indices = self.calculate_vegetation_indices(image, [index])
        index_image = indices[index]
        
        # Clip to AOI
        aoi = ee.Geometry(geometry)
        clipped = index_image.clip(aoi)
        
        # Get download URL
        url = clipped.getDownloadUrl({
            'scale': scale or settings.DEFAULT_SCALE,
            'crs': 'EPSG:4326',
            'fileFormat': 'GeoTIFF',
            'region': aoi
        })
        
        return url
    
    def get_statistics(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        indices: List[str]
    ) -> Dict:
        """Calculate statistics for multiple indices over a date range"""
        self.initialize()
        
        collection = self.get_sentinel2_collection(geometry, start_date, end_date)
        aoi = ee.Geometry(geometry)
        
        # Get the median composite
        composite = collection.median()
        
        # Calculate all indices
        index_images = self.calculate_vegetation_indices(composite, indices)
        
        statistics = {}
        for index_name, index_image in index_images.items():
            stats = index_image.reduceRegion(
                reducer=ee.Reducer.percentile([2, 25, 50, 75, 98]).combine(
                    ee.Reducer.mean(), '', True
                ).combine(
                    ee.Reducer.stdDev(), '', True
                ),
                geometry=aoi,
                scale=settings.DEFAULT_SCALE,
                maxPixels=settings.MAX_PIXELS
            )
            
            statistics[index_name] = stats.getInfo()
        
        return statistics
    
    def check_cloud_coverage(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        max_cloud_coverage: float = 10.0
    ) -> Dict:
        """Check cloud coverage availability for given parameters"""
        self.initialize()
        
        try:
            aoi = ee.Geometry(geometry)
            
            # Get all available images (without cloud filter)
            collection = (
                ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                .filterBounds(aoi)
                .filterDate(start_date, end_date)
            )
            
            # Check if collection has any images at all
            collection_size = collection.size().getInfo()
            logger.info(f"Found {collection_size} images in collection for date range {start_date} to {end_date}")
            
            if collection_size == 0:
                return {
                    'has_suitable_images': False,
                    'available_images_count': 0,
                    'suitable_images_count': 0,
                    'min_cloud_coverage': None,
                    'max_cloud_coverage': None,
                    'avg_cloud_coverage': None,
                    'recommended_date': None,
                    'metadata': {
                        'max_cloud_threshold': max_cloud_coverage,
                        'date_range': {'start': start_date, 'end': end_date},
                        'all_cloud_percentages': [],
                        'error': 'No images found in date range'
                    }
                }
            
            # Get cloud coverage info for each image
            def get_cloud_info(image):
                cloud_percentage = image.get('CLOUDY_PIXEL_PERCENTAGE')
                date = image.date().format('YYYY-MM-dd')
                return ee.Feature(None, {
                    'date': date,
                    'cloud_percentage': cloud_percentage,
                    'suitable': ee.Number(cloud_percentage).lt(ee.Number(max_cloud_coverage))
                })
            
            # Map over collection to get cloud info
            cloud_info = collection.map(get_cloud_info)
            
            # Get all cloud percentages - handle empty collection
            try:
                cloud_percentages = cloud_info.aggregate_array('cloud_percentage').getInfo()
                suitable_images = cloud_info.filter(ee.Filter.eq('suitable', True))
            except Exception as e:
                if "Empty date ranges not supported" in str(e):
                    logger.info("No images found in collection, returning empty result")
                    return {
                        'has_suitable_images': False,
                        'available_images_count': 0,
                        'suitable_images_count': 0,
                        'min_cloud_coverage': None,
                        'max_cloud_coverage': None,
                        'avg_cloud_coverage': None,
                        'recommended_date': None,
                        'metadata': {
                            'max_cloud_threshold': max_cloud_coverage,
                            'date_range': {'start': start_date, 'end': end_date},
                            'all_cloud_percentages': [],
                            'error': 'No images found in date range'
                        }
                    }
                else:
                    raise e
            
            # Calculate statistics
            available_count = len(cloud_percentages)
            suitable_count = suitable_images.size().getInfo()
            
            if available_count > 0:
                min_cloud = min(cloud_percentages)
                max_cloud = max(cloud_percentages)
                avg_cloud = sum(cloud_percentages) / available_count
            else:
                min_cloud = max_cloud = avg_cloud = None
            
            # Get best date (lowest cloud coverage)
            best_date = None
            if suitable_count > 0:
                best_image = suitable_images.sort('cloud_percentage').first()
                best_date = best_image.get('date').getInfo()
            elif available_count > 0:
                # If no suitable images, use the image with lowest cloud coverage
                best_image = collection.sort('CLOUDY_PIXEL_PERCENTAGE').first()
                best_date = best_image.date().format('YYYY-MM-dd').getInfo()
            
            logger.info(f"Cloud coverage check: {available_count} available, {suitable_count} suitable, best date: {best_date}")
            
            return {
                'has_suitable_images': suitable_count > 0,
                'available_images_count': available_count,
                'suitable_images_count': suitable_count,
                'min_cloud_coverage': min_cloud,
                'max_cloud_coverage': max_cloud,
                'avg_cloud_coverage': avg_cloud,
                'recommended_date': best_date,
                'metadata': {
                    'max_cloud_threshold': max_cloud_coverage,
                    'date_range': {'start': start_date, 'end': end_date},
                    'all_cloud_percentages': cloud_percentages
                }
            }
            
        except Exception as e:
            logger.error(f"Error in cloud coverage check: {e}")
            return {
                'has_suitable_images': False,
                'available_images_count': 0,
                'suitable_images_count': 0,
                'min_cloud_coverage': None,
                'max_cloud_coverage': None,
                'avg_cloud_coverage': None,
                'recommended_date': None,
                'metadata': {
                    'max_cloud_threshold': max_cloud_coverage,
                    'date_range': {'start': start_date, 'end': end_date},
                    'all_cloud_percentages': [],
                    'error': str(e)
                }
            }

# Singleton instance
earth_engine_service = EarthEngineService()