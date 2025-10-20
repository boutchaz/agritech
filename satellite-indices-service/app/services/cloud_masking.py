"""
Cloud masking and coverage calculation utilities for Earth Engine
Calculates cloud coverage specifically within AOI boundaries
"""

import ee
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class CloudMaskingService:
    """Service for cloud detection and masking within AOI boundaries"""

    @staticmethod
    def mask_clouds_s2(image: ee.Image) -> ee.Image:
        """
        Apply cloud masking to Sentinel-2 image using QA60 band

        Args:
            image: Sentinel-2 surface reflectance image

        Returns:
            Cloud-masked image
        """
        # Use QA60 band for cloud masking (10m resolution)
        qa = image.select('QA60')

        # Bit 10: Opaque clouds (1 = cloud)
        # Bit 11: Cirrus clouds (1 = cloud)
        cloud_bit_mask = 1 << 10
        cirrus_bit_mask = 1 << 11

        # Create cloud mask
        mask = (qa.bitwiseAnd(cloud_bit_mask).eq(0)
                .And(qa.bitwiseAnd(cirrus_bit_mask).eq(0)))

        # Also use Scene Classification Layer (SCL) if available
        if 'SCL' in image.bandNames().getInfo():
            scl = image.select('SCL')
            # SCL values: 0-no data, 1-saturated, 3-shadow, 8-cloud medium, 9-cloud high, 10-cirrus
            scl_mask = (scl.neq(0).And(scl.neq(1))
                       .And(scl.neq(3))
                       .And(scl.neq(8))
                       .And(scl.neq(9))
                       .And(scl.neq(10)))
            mask = mask.And(scl_mask)

        return image.updateMask(mask)

    @staticmethod
    def calculate_cloud_coverage_in_aoi(
        image: ee.Image,
        aoi: ee.Geometry,
        buffer_meters: Optional[float] = None
    ) -> float:
        """
        Calculate cloud coverage percentage specifically within AOI boundaries.

        Args:
            image: Sentinel-2 image
            aoi: Area of interest geometry
            buffer_meters: Optional buffer around AOI in meters (default: None)

        Returns:
            Cloud coverage percentage within AOI (0-100)
        """
        try:
            # Apply buffer if specified
            region = aoi.buffer(buffer_meters) if buffer_meters else aoi

            # Get QA60 band for cloud detection
            qa = image.select('QA60')

            # Bit masks for cloud detection
            cloud_bit_mask = 1 << 10  # Opaque clouds
            cirrus_bit_mask = 1 << 11  # Cirrus clouds

            # Create cloud mask (1 where clouds exist, 0 otherwise)
            cloud_mask = (qa.bitwiseAnd(cloud_bit_mask).gt(0)
                         .Or(qa.bitwiseAnd(cirrus_bit_mask).gt(0)))

            # Try to use SCL band for more accurate cloud detection (server-side check)
            # Using a try/except allows server-side execution without getInfo()
            def add_scl_mask(mask, img):
                try:
                    scl = img.select('SCL')
                    # SCL cloud classes: 8 (cloud medium), 9 (cloud high), 10 (cirrus)
                    scl_cloud_mask = scl.eq(8).Or(scl.eq(9)).Or(scl.eq(10))
                    # Also consider cloud shadows (class 3)
                    scl_shadow_mask = scl.eq(3)
                    # Combine masks
                    return mask.Or(scl_cloud_mask).Or(scl_shadow_mask)
                except:
                    # If SCL band doesn't exist, return original mask
                    return mask

            cloud_mask = add_scl_mask(cloud_mask, image)

            # Calculate statistics within AOI
            # Count cloudy pixels
            cloud_pixels = cloud_mask.reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=region,
                scale=10,  # Use 10m resolution for accurate calculation
                maxPixels=1e9
            )

            # Count total pixels
            total_pixels = cloud_mask.gt(-1).reduceRegion(
                reducer=ee.Reducer.count(),
                geometry=region,
                scale=10,
                maxPixels=1e9
            )

            # Get the values
            cloud_count = cloud_pixels.get('QA60')
            total_count = total_pixels.get('QA60')

            # Calculate percentage
            cloud_percentage = ee.Number(cloud_count).divide(ee.Number(total_count)).multiply(100)

            # Get the actual value
            result = cloud_percentage.getInfo()

            logger.info(f"Cloud coverage in AOI: {result:.2f}% (buffer: {buffer_meters}m)")
            return result

        except Exception as e:
            logger.error(f"Error calculating cloud coverage in AOI: {e}")
            # Fallback to image-wide cloud coverage if available
            try:
                return image.get('CLOUDY_PIXEL_PERCENTAGE').getInfo()
            except:
                return None

    @staticmethod
    def filter_collection_by_aoi_clouds(
        collection: ee.ImageCollection,
        aoi: ee.Geometry,
        max_cloud_coverage: float,
        buffer_meters: Optional[float] = 300
    ) -> ee.ImageCollection:
        """
        Filter image collection based on cloud coverage within AOI.

        Args:
            collection: Sentinel-2 image collection
            aoi: Area of interest
            max_cloud_coverage: Maximum acceptable cloud coverage percentage
            buffer_meters: Buffer around AOI for cloud calculation (default: 300m)

        Returns:
            Filtered image collection
        """
        def add_aoi_cloud_score(image):
            """Add cloud coverage percentage as property to image - Server-side computation"""
            # Apply buffer if specified
            region = aoi.buffer(buffer_meters) if buffer_meters else aoi

            # Get QA60 band for cloud detection
            qa = image.select('QA60')

            # Bit masks for cloud detection
            cloud_bit_mask = 1 << 10  # Opaque clouds
            cirrus_bit_mask = 1 << 11  # Cirrus clouds

            # Create cloud mask (1 where clouds exist, 0 otherwise)
            cloud_mask = (qa.bitwiseAnd(cloud_bit_mask).gt(0)
                         .Or(qa.bitwiseAnd(cirrus_bit_mask).gt(0)))

            # Try to add SCL band for more accurate cloud detection
            # This is done server-side, no getInfo() call
            try:
                scl = image.select('SCL')
                # SCL cloud classes: 8 (cloud medium), 9 (cloud high), 10 (cirrus), 3 (shadow)
                scl_cloud_mask = scl.eq(8).Or(scl.eq(9)).Or(scl.eq(10)).Or(scl.eq(3))
                cloud_mask = cloud_mask.Or(scl_cloud_mask)
            except:
                # If SCL band doesn't exist, continue with QA60 only
                pass

            # Calculate statistics within AOI - all server-side
            # Count cloudy pixels
            cloud_pixels = cloud_mask.reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=region,
                scale=10,  # Use 10m resolution
                maxPixels=1e9
            ).get('QA60')

            # Count total pixels
            total_pixels = cloud_mask.gt(-1).reduceRegion(
                reducer=ee.Reducer.count(),
                geometry=region,
                scale=10,
                maxPixels=1e9
            ).get('QA60')

            # Calculate percentage server-side
            cloud_percentage = ee.Number(cloud_pixels).divide(ee.Number(total_pixels)).multiply(100)

            return image.set('AOI_CLOUD_COVERAGE', cloud_percentage)

        # Map the function over collection to add AOI cloud coverage
        scored_collection = collection.map(add_aoi_cloud_score)

        # Filter based on AOI cloud coverage
        filtered = scored_collection.filter(
            ee.Filter.lte('AOI_CLOUD_COVERAGE', max_cloud_coverage)
        )

        return filtered

    @staticmethod
    def get_best_cloud_free_image(
        collection: ee.ImageCollection,
        aoi: ee.Geometry,
        buffer_meters: Optional[float] = 300
    ) -> Tuple[ee.Image, float]:
        """
        Get the image with lowest cloud coverage within AOI.

        Args:
            collection: Image collection
            aoi: Area of interest
            buffer_meters: Buffer for cloud calculation

        Returns:
            Tuple of (best image, cloud coverage percentage)
        """
        def add_aoi_cloud_score(image):
            cloud_coverage = CloudMaskingService.calculate_cloud_coverage_in_aoi(
                image, aoi, buffer_meters
            )
            return image.set('AOI_CLOUD_COVERAGE', cloud_coverage)

        # Score all images
        scored = collection.map(add_aoi_cloud_score)

        # Sort by AOI cloud coverage and get the best
        best = scored.sort('AOI_CLOUD_COVERAGE').first()

        # Get the cloud coverage value
        cloud_coverage = best.get('AOI_CLOUD_COVERAGE').getInfo()

        return best, cloud_coverage

    @staticmethod
    def create_cloud_probability_mask(
        image: ee.Image,
        threshold: float = 50
    ) -> ee.Image:
        """
        Create cloud mask using Sentinel-2 cloud probability data if available.

        Args:
            image: Sentinel-2 image
            threshold: Cloud probability threshold (0-100)

        Returns:
            Cloud mask (0 = cloud, 1 = clear)
        """
        # Try to use cloud probability band if available
        try:
            # For S2_CLOUD_PROBABILITY collection
            cloud_prob = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY') \
                .filterBounds(image.geometry()) \
                .filterDate(image.date(), image.date().advance(1, 'day')) \
                .first() \
                .select('probability')

            # Create mask where probability is below threshold
            mask = cloud_prob.lt(threshold)
            return mask

        except:
            # Fallback to QA-based masking
            logger.debug("Cloud probability data not available, using QA bands")
            return CloudMaskingService.mask_clouds_s2(image).select('B2').mask()