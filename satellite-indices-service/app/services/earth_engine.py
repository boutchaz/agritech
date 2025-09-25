import ee
import json
import os
import uuid
import httpx
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from app.core.config import settings
import logging
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import io
import base64

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

    async def check_existing_file(
        self,
        organization_id: str,
        index: str,
        date: str,
        geometry: Dict = None
    ) -> Optional[str]:
        """Check if a satellite file already exists in storage"""
        try:
            from app.services.supabase_service import supabase_service

            # Get existing files for this organization, index, and date
            existing_files = await supabase_service.get_satellite_files(
                organization_id=organization_id,
                index=index,
                date_range={'start_date': date, 'end_date': date}
            )

            # If we have existing files for this exact date, return the first one
            if existing_files:
                for file_data in existing_files:
                    if file_data.get('date') == date and file_data.get('index') == index:
                        logger.info(f"Found existing file: {file_data['filename']}")
                        return file_data['public_url']

            return None

        except Exception as e:
            logger.error(f"Error checking existing files: {e}")
            return None

    def _create_enhanced_visualization(
        self,
        image: ee.Image,
        index: str,
        date: str,
        aoi: ee.Geometry,
        vis_params: Dict[str, Any]
    ) -> str:
        """Create enhanced visualization with date, scale bar, and statistics"""
        try:
            # Get the base image as bytes
            base_url = image.getThumbUrl({
                'min': vis_params['min'],
                'max': vis_params['max'],
                'palette': vis_params['palette'],
                'dimensions': 512,
                'region': aoi,
                'format': 'png'
            })

            # Download the base image
            import requests
            response = requests.get(base_url)
            base_image = Image.open(io.BytesIO(response.content))

            # Calculate statistics
            stats = image.reduceRegion(
                reducer=ee.Reducer.percentile([10, 90]).combine(
                    ee.Reducer.mean(), '', True
                ).combine(
                    ee.Reducer.median(), '', True
                ).combine(
                    ee.Reducer.stdDev(), '', True
                ),
                geometry=aoi,
                scale=settings.DEFAULT_SCALE,
                maxPixels=settings.MAX_PIXELS
            ).getInfo()

            # Create enhanced image
            enhanced_image = self._add_overlays(base_image, index, date, stats, vis_params)

            # Convert to base64 data URL
            buffer = io.BytesIO()
            enhanced_image.save(buffer, format='PNG')
            buffer.seek(0)

            # Return as data URL
            img_data = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{img_data}"

        except Exception as e:
            logger.warning(f"Failed to create enhanced visualization: {e}, falling back to basic")
            # Fallback to basic visualization
            return image.getThumbUrl({
                'min': vis_params['min'],
                'max': vis_params['max'],
                'palette': vis_params['palette'],
                'dimensions': 512,
                'region': aoi,
                'format': 'png'
            })

    def _add_overlays(
        self,
        base_image: Image.Image,
        index: str,
        date: str,
        stats: Dict,
        vis_params: Dict[str, Any]
    ) -> Image.Image:
        """Add date label, scale bar, and statistics to the image"""
        # Create a larger canvas to accommodate overlays
        width, height = base_image.size
        new_width = width + 150  # Extra space for scale bar
        new_height = height + 100  # Extra space for title and stats

        # Create new image with white background
        enhanced = Image.new('RGB', (new_width, new_height), 'white')

        # Paste the base image
        enhanced.paste(base_image, (0, 60))  # Leave space for title

        draw = ImageDraw.Draw(enhanced)

        try:
            # Try to use a system font, fallback to default if not available
            title_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
            label_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 14)
            stats_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 12)
        except:
            # Fallback to default font
            title_font = ImageFont.load_default()
            label_font = ImageFont.load_default()
            stats_font = ImageFont.load_default()

        # Add title
        title = f"{index} - évolution temporelle"
        draw.text((10, 10), title, fill='black', font=title_font)

        # Add date
        draw.text((width//2 - 50, 40), date, fill='black', font=label_font)

        # Add color scale bar
        self._draw_color_scale(draw, width + 20, 80, vis_params, label_font)

        # Add statistics box
        self._draw_stats_box(draw, stats, index, 10, height + 70, stats_font)

        return enhanced

    def _draw_color_scale(
        self,
        draw: ImageDraw.ImageDraw,
        x: int,
        y: int,
        vis_params: Dict[str, Any],
        font
    ):
        """Draw color scale bar on the right side"""
        scale_height = 200
        scale_width = 20

        # Get color palette
        colors = vis_params.get('palette', ['red', 'yellow', 'green'])
        min_val = vis_params.get('min', -1)
        max_val = vis_params.get('max', 1)

        def hex_to_rgb(hex_color):
            """Convert hex color to RGB tuple"""
            if hex_color.startswith('#'):
                hex_color = hex_color[1:]
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

        # Convert color names and hex colors to RGB
        def get_rgb_color(color):
            color_map = {
                'red': (255, 0, 0),
                'yellow': (255, 255, 0),
                'green': (0, 255, 0),
                'blue': (0, 0, 255),
                'white': (255, 255, 255)
            }
            if color.startswith('#'):
                return hex_to_rgb(color)
            return color_map.get(color, (0, 255, 0))

        # Draw color gradient
        for i in range(scale_height):
            # Calculate color position (0-1)
            pos = i / scale_height

            # Interpolate between colors
            if len(colors) > 1:
                # Calculate which segment we're in
                segment_size = 1.0 / (len(colors) - 1)
                segment_idx = int(pos / segment_size)

                # Clamp to valid range
                segment_idx = min(segment_idx, len(colors) - 2)

                # Calculate position within the segment
                local_pos = (pos - segment_idx * segment_size) / segment_size

                # Get colors for interpolation
                color1 = get_rgb_color(colors[segment_idx])
                color2 = get_rgb_color(colors[segment_idx + 1])

                # Linear interpolation
                r = int(color1[0] + (color2[0] - color1[0]) * local_pos)
                g = int(color1[1] + (color2[1] - color1[1]) * local_pos)
                b = int(color1[2] + (color2[2] - color1[2]) * local_pos)
                color = (r, g, b)
            else:
                color = get_rgb_color(colors[0])

            # Draw horizontal line
            draw.rectangle([x, y + (scale_height - i), x + scale_width, y + (scale_height - i) + 1], fill=color)

        # Add scale labels
        for i, val in enumerate([max_val, (max_val + min_val) / 2, min_val]):
            label_y = y + i * (scale_height // 2)
            draw.text((x + scale_width + 5, label_y), f"{val:.1f}", fill='black', font=font)

    def _draw_stats_box(
        self,
        draw: ImageDraw.ImageDraw,
        stats: Dict,
        index: str,
        x: int,
        y: int,
        font
    ):
        """Draw statistics box"""
        # Extract statistics
        mean = stats.get(f'{index}_mean', 0)
        median = stats.get(f'{index}_median', 0)
        p10 = stats.get(f'{index}_p10', 0)
        p90 = stats.get(f'{index}_p90', 0)
        std = stats.get(f'{index}_stdDev', 0)

        # Draw background box
        box_width = 120
        box_height = 80
        draw.rectangle([x, y, x + box_width, y + box_height], fill='gray', outline='black')

        # Draw statistics text
        stats_text = [
            f"Mean: {mean:.3f}",
            f"Median: {median:.3f}",
            f"P10: {p10:.3f}",
            f"P90: {p90:.3f}",
            f"Std: {std:.3f}"
        ]

        for i, text in enumerate(stats_text):
            draw.text((x + 5, y + 5 + i * 15), text, fill='white', font=font)

    def _get_visualization_params(self, index: str) -> Dict[str, Any]:
        """Get visualization parameters for different vegetation indices"""
        params = {
            'NDVI': {
                'min': 0.1,
                'max': 0.5,
                'palette': ['#8B0000', '#FF4500', '#FFD700', '#ADFF2F', '#00FF00']
            },
            'NDRE': {
                'min': -0.2,
                'max': 0.4,
                'palette': ['#8B0000', '#FF4500', '#FFD700', '#ADFF2F', '#00FF00']
            },
            'NDMI': {
                'min': -0.5,
                'max': 0.5,
                'palette': ['#8B4513', '#FF4500', '#FFD700', '#00BFFF', '#0000FF']
            },
            'MNDWI': {
                'min': -1,
                'max': 1,
                'palette': ['#FFFFFF', '#87CEEB', '#4682B4', '#000080']
            },
            'GCI': {
                'min': 0,
                'max': 3,
                'palette': ['#8B0000', '#FF4500', '#FFD700', '#ADFF2F', '#00FF00']
            },
            'SAVI': {
                'min': -0.1,
                'max': 0.6,
                'palette': ['#8B0000', '#FF4500', '#FFD700', '#ADFF2F', '#00FF00']
            },
            'OSAVI': {
                'min': -0.1,
                'max': 0.6,
                'palette': ['#8B0000', '#FF4500', '#FFD700', '#ADFF2F', '#00FF00']
            },
            'MSAVI2': {
                'min': -0.1,
                'max': 0.6,
                'palette': ['#8B0000', '#FF4500', '#FFD700', '#ADFF2F', '#00FF00']
            },
            'EVI': {
                'min': -0.2,
                'max': 0.8,
                'palette': ['#8B0000', '#FF4500', '#FFD700', '#ADFF2F', '#00FF00']
            },
            'PRI': {
                'min': -0.2,
                'max': 0.2,
                'palette': ['#8B0000', '#FF4500', '#FFD700', '#ADFF2F', '#00FF00']
            },
            'MSI': {
                'min': 0,
                'max': 3,
                'palette': ['#00FF00', '#FFD700', '#FF4500', '#8B0000']
            }
        }

        return params.get(index, {
            'min': 0.1,
            'max': 0.5,
            'palette': ['#8B0000', '#FF4500', '#FFD700', '#ADFF2F', '#00FF00']
        })

    async def export_index_map(
        self,
        geometry: Dict,
        date: str,
        index: str,
        scale: int = None,
        organization_id: str = None
    ) -> str:
        """Export index map as GeoTIFF URL or upload to bucket"""
        # First check if file already exists in bucket if organization_id is provided
        if organization_id:
            existing_url = await self.check_existing_file(organization_id, index, date, geometry)
            if existing_url:
                logger.info(f"Using existing file from bucket: {existing_url}")
                return existing_url

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
        
        # If organization_id is provided, export to Supabase Storage
        if organization_id:
            return await self._export_to_supabase_storage(clipped, aoi, index, date, organization_id, scale)
        else:
            # For web display, create enhanced visualization with overlays
            vis_params = self._get_visualization_params(index)

            # Create enhanced visualization with date, scale bar, and statistics
            return self._create_enhanced_visualization(
                clipped, index, date, aoi, vis_params
            )
    
    async def _export_to_supabase_storage(
        self,
        image: ee.Image,
        geometry: ee.Geometry,
        index: str,
        date: str,
        organization_id: str,
        scale: int = None
    ) -> str:
        """Export GeoTIFF to Supabase Storage"""
        try:
            # Generate unique filename
            file_id = str(uuid.uuid4())[:8]
            filename = f"{index}_{date}_{file_id}.tif"
            
            # Get download URL from Earth Engine
            download_url = image.getDownloadUrl({
                'scale': scale or settings.DEFAULT_SCALE,
                'crs': 'EPSG:4326',
                'fileFormat': 'GeoTIFF',
                'region': geometry
            })
            
            # Download the file from Earth Engine
            async with httpx.AsyncClient() as client:
                response = await client.get(download_url)
                response.raise_for_status()
                file_data = response.content
            
            # Upload to Supabase Storage
            from app.services.supabase_service import supabase_service
            public_url = await supabase_service.upload_satellite_file(
                file_data=file_data,
                filename=filename,
                organization_id=organization_id,
                index=index,
                date=date
            )
            
            if public_url:
                logger.info(f"Uploaded satellite file to Supabase: {filename}")
                return public_url
            else:
                # Fallback to direct download URL
                logger.warning("Failed to upload to Supabase, returning direct download URL")
                return download_url
            
        except Exception as e:
            logger.error(f"Failed to export to Supabase Storage: {e}")
            # Fallback to direct download URL
            url = image.getDownloadUrl({
                'scale': scale or settings.DEFAULT_SCALE,
                'crs': 'EPSG:4326',
                'fileFormat': 'GeoTIFF',
                'region': geometry
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