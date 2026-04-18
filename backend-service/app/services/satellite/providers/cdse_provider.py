"""
Copernicus Data Space Ecosystem (CDSE/openEO) Satellite Provider

Provides satellite data access via the Copernicus Data Space Ecosystem
using the openEO API. This provider is suitable for commercial use.

CDSE offers:
- FREE access to Sentinel-2 data (10,000 credits/month)
- Commercial-use friendly license
- Direct ESA data access
"""

import logging
import tempfile
import os
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta

import numpy as np
import rioxarray
import xarray as xr

from app.services.satellite.interfaces import (
    ISatelliteProvider,
    CloudCoverageInfo,
    TimeSeries,
    TimeSeriesPoint,
    HeatmapData,
    ExportResult,
    StatisticsResult,
)
from app.services.satellite.types import (
    SCL_MASK_VALUES,
    SCL_CLEAR_VALUES,
    VISUALIZATION_PARAMS,
    get_visualization_params,
    parse_geometry,
    VEGETATION_INDEX_CALCULATORS,
    Sentinel2Band,
)
from app.services.satellite.utils.visualization import create_enhanced_visualization
from app.services.satellite.utils.statistics import calculate_statistics_from_array
from app.services.satellite.utils.index_calculator import (
    calculate_all_indices as calculate_indices_numpy,
)
from app.services.satellite.utils.sentinel2_dates import dedupe_s2_available_dates_by_day
from app.core.config import settings

logger = logging.getLogger(__name__)


class CDSEProvider(ISatelliteProvider):
    """
    Copernicus Data Space Ecosystem provider using openEO.

    This provider uses openEO to access Sentinel-2 data from CDSE.
    It's designed for commercial use with free monthly quotas.
    """

    def __init__(self):
        """Initialize the CDSE provider"""
        self._provider_name = "Copernicus Data Space Ecosystem (openEO)"
        self._initialized = False
        self._connection = None
        self._client_id = None
        self._client_secret = None

    def initialize(self) -> None:
        """
        Initialize the CDSE provider with openEO connection.

        Uses the openEO Python client's built-in OIDC client credentials flow,
        which handles token management, refresh, and OIDC discovery automatically.

        Sentinel Hub Dashboard OAuth clients (sh-*) are supported by CDSE for
        openEO access — no separate CDSE Identity client is needed.
        """
        try:
            import openeo

            cdse_url = getattr(
                settings, "CDSE_OPENEO_URL", "https://openeo.dataspace.copernicus.eu"
            )
            self._client_id = getattr(settings, "CDSE_CLIENT_ID", "")
            self._client_secret = getattr(settings, "CDSE_CLIENT_SECRET", "")

            if not self._client_id or not self._client_secret:
                raise ValueError(
                    "CDSE credentials (CDSE_CLIENT_ID and CDSE_CLIENT_SECRET) are required"
                )

            # Connect to CDSE openEO backend
            logger.info(f"Connecting to CDSE at {cdse_url}")
            self._connection = openeo.connect(cdse_url)

            logger.info("Authenticating with CDSE via OIDC client credentials flow")
            self._connection.authenticate_oidc_client_credentials(
                client_id=self._client_id,
                client_secret=self._client_secret,
            )

            # Verify connection works
            try:
                collections = self._connection.list_collections()
                logger.info(
                    f"CDSE connection verified: {len(collections)} collections available"
                )
            except Exception as test_error:
                logger.warning(f"Could not fully verify CDSE connection: {test_error}")

            logger.info("CDSE Provider initialized successfully")
            self._initialized = True

        except ImportError:
            raise RuntimeError(
                "openeo package is required for CDSE provider. "
                "Install with: pip install openeo"
            )
        except Exception as e:
            logger.error(f"Failed to initialize CDSE Provider: {e}")
            raise

    def check_cloud_coverage(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        max_cloud_coverage: float = 10.0,
    ) -> CloudCoverageInfo:
        self._ensure_initialized()

        try:
            import pystac_client

            catalog = pystac_client.Client.open(
                "https://catalogue.dataspace.copernicus.eu/stac"
            )

            bounds = self._get_bounds_from_geometry(geometry)

            search = catalog.search(
                collections=["sentinel-2-l2a"],
                bbox=[bounds[0], bounds[2], bounds[1], bounds[3]],
                datetime=[start_date, end_date],
                max_items=100,
            )

            items = list(search.items())
            available_count = len(items)

            if available_count == 0:
                return CloudCoverageInfo(
                    has_suitable_images=False,
                    available_images_count=0,
                    suitable_images_count=0,
                    min_cloud_coverage=None,
                    max_cloud_coverage=None,
                    avg_cloud_coverage=None,
                    recommended_date=None,
                    metadata={"provider": self.provider_name},
                )

            cloud_values = []
            suitable_items = []
            for item in items:
                cc = item.properties.get("eo:cloud_cover", 100)
                cloud_values.append(cc)
                if cc <= max_cloud_coverage:
                    suitable_items.append(item)

            suitable_count = len(suitable_items)
            min_cloud = min(cloud_values)
            max_cloud_val = max(cloud_values)
            avg_cloud = sum(cloud_values) / len(cloud_values)

            best_date = None
            if suitable_items:
                best_item = min(
                    suitable_items,
                    key=lambda i: i.properties.get("eo:cloud_cover", 100),
                )
                best_date = best_item.properties["datetime"][:10]
            elif items:
                best_item = min(
                    items, key=lambda i: i.properties.get("eo:cloud_cover", 100)
                )
                best_date = best_item.properties["datetime"][:10]

            return CloudCoverageInfo(
                has_suitable_images=suitable_count > 0
                or (best_date is not None and available_count > 0),
                available_images_count=available_count,
                suitable_images_count=suitable_count,
                min_cloud_coverage=round(min_cloud, 2),
                max_cloud_coverage=round(max_cloud_val, 2),
                avg_cloud_coverage=round(avg_cloud, 2),
                recommended_date=best_date,
                metadata={"provider": self.provider_name},
            )

        except ImportError:
            logger.warning("pystac_client not available for cloud coverage check")
            return CloudCoverageInfo(
                has_suitable_images=False,
                available_images_count=0,
                suitable_images_count=0,
                min_cloud_coverage=None,
                max_cloud_coverage=None,
                avg_cloud_coverage=None,
                recommended_date=None,
                metadata={
                    "provider": self.provider_name,
                    "error": "pystac_client not installed",
                },
            )
        except Exception as e:
            logger.error(f"Error checking cloud coverage with CDSE: {e}")
            return CloudCoverageInfo(
                has_suitable_images=False,
                available_images_count=0,
                suitable_images_count=0,
                min_cloud_coverage=None,
                max_cloud_coverage=None,
                avg_cloud_coverage=None,
                recommended_date=None,
                metadata={"provider": self.provider_name, "error": str(e)},
            )

    def calculate_vegetation_indices(
        self,
        image: Any,
        indices: List[str],
    ) -> Dict[str, Any]:
        """
        Calculate vegetation indices for an image.

        Args:
            image: xarray DataArray or Dataset
            indices: List of index names to calculate

        Returns:
            Dictionary mapping index names to computed arrays
        """
        self._ensure_initialized()

        # Extract bands from the image
        if isinstance(image, xr.DataArray):
            bands_dict = {image.name: image.values}
        elif isinstance(image, xr.Dataset):
            bands_dict = {band: image[band].values for band in image.data_vars}
        else:
            raise TypeError(f"Expected xarray DataArray/Dataset, got {type(image)}")

        # Map Sentinel-2 band names
        band_mapping = {
            "B02": "blue",
            "B03": "green",
            "B04": "red",
            "B05": "red_edge",
            "B06": "red_edge_2",
            "B07": "red_edge_3",
            "B08": "nir",
            "B8A": "nir_narrow",
            "B11": "swir1",
            "B12": "swir2",
        }

        # Prepare band arrays
        bands = {}
        for s2_band, name in band_mapping.items():
            if s2_band in bands_dict:
                bands[name] = bands_dict[s2_band].astype(np.float32)

        # Calculate requested indices using numpy
        results = {}
        for index_name in indices:
            if index_name in VEGETATION_INDEX_CALCULATORS:
                try:
                    index_array = VEGETATION_INDEX_CALCULATORS[index_name](bands)
                    results[index_name] = index_array
                except KeyError as e:
                    logger.warning(f"Missing required band for {index_name}: {e}")
                    results[index_name] = np.zeros_like(
                        list(bands.values())[0], dtype=np.float32
                    )

        return results

    def get_time_series(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        index: str,
        interval: str = "month",
    ) -> TimeSeries:
        """
        Get time series data for a specific vegetation index.

        Uses openEO's time series aggregation capabilities.
        """
        self._ensure_initialized()

        try:
            import openeo

            bounds = self._get_bounds_from_geometry(geometry)
            spatial_extent = {
                "west": bounds[0],
                "east": bounds[1],
                "south": bounds[2],
                "north": bounds[3],
            }

            # Load Sentinel-2 collection
            s2_bands = self._get_bands_for_index(index)

            datacube = self._connection.load_collection(
                "SENTINEL2_L2A",
                spatial_extent=spatial_extent,
                temporal_extent=[start_date, end_date],
                bands=s2_bands,
            )

            # Apply cloud masking using SCL
            datacube = self._apply_scl_cloud_mask(datacube)

            # Calculate the vegetation index
            datacube = self._calculate_index(datacube, index)

            # Aggregate by time interval
            datacube = datacube.aggregate_temporal_period(interval, reducer="mean")

            # For large date ranges, use download() instead of execute()
            # to avoid JSON decode errors on big responses
            import tempfile, os

            try:
                result = datacube.execute()
            except Exception:
                logger.info(
                    "execute() failed, falling back to download() for large result"
                )
                with tempfile.NamedTemporaryFile(suffix=".nc", delete=False) as tmp:
                    tmp_path = tmp.name
                try:
                    datacube.download(tmp_path, format="netCDF")
                    result = xr.open_dataset(tmp_path)
                finally:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)

            # Process results into time series points
            time_series_points = []
            if isinstance(result, xr.Dataset):
                for i, time in enumerate(result.time.values):
                    value = float(result[index].isel(time=i).mean().values)
                    date_str = str(time)[:10]
                    time_series_points.append(
                        TimeSeriesPoint(date=date_str, value=value)
                    )

            # Calculate statistics
            values = [p.value for p in time_series_points if p.value is not None]
            statistics = None
            if values:
                statistics = {
                    "mean": float(np.mean(values)),
                    "std": float(np.std(values)),
                    "min": float(np.min(values)),
                    "max": float(np.max(values)),
                    "median": float(np.median(values)),
                }

            return TimeSeries(
                index=index,
                aoi_name=None,
                start_date=start_date,
                end_date=end_date,
                data=time_series_points,
                statistics=statistics,
                metadata={"provider": self.provider_name},
            )

        except Exception as e:
            logger.error(f"Error getting time series with CDSE: {e}")
            raise

    async def export_heatmap_data(
        self,
        geometry: Dict,
        date: str,
        index: str,
        grid_size: int = 1000,
    ) -> HeatmapData:
        """
        Export heatmap data for visualization.

        Downloads the data and processes it into the expected format.
        """
        logger.info(f"export_heatmap_data called for date={date}, index={index}")
        self._ensure_initialized()

        try:
            import openeo

            bounds = self._get_bounds_from_geometry(geometry)
            spatial_extent = {
                "west": bounds[0],
                "east": bounds[1],
                "south": bounds[2],
                "north": bounds[3],
            }

            # Load Sentinel-2 collection for the specific date
            end_date = (
                datetime.strptime(date, "%Y-%m-%d") + timedelta(days=1)
            ).strftime("%Y-%m-%d")

            s2_bands = self._get_bands_for_index(index)

            datacube = self._connection.load_collection(
                "SENTINEL2_L2A",
                spatial_extent=spatial_extent,
                temporal_extent=[date, end_date],
                bands=s2_bands,
            )

            # Apply cloud masking
            datacube = self._apply_scl_cloud_mask(datacube)

            # Calculate the index
            datacube = self._calculate_index(datacube, index)

            logger.info("Downloading datacube as GeoTIFF...")

            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp_file:
                tmp_path = tmp_file.name

            try:
                datacube.download(tmp_path, format="GTiff")
                logger.info(f"GeoTIFF downloaded to {tmp_path}")
            except Exception as dl_error:
                logger.error(f"Datacube download failed: {dl_error}")
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                return HeatmapData(
                    date=date,
                    index=index,
                    bounds={
                        "min_lon": bounds[0],
                        "max_lon": bounds[1],
                        "min_lat": bounds[2],
                        "max_lat": bounds[3],
                    },
                    pixel_data=[],
                    aoi_boundary=self._extract_aoi_boundary(geometry),
                    statistics={
                        "mean": 0,
                        "median": 0,
                        "min": 0,
                        "max": 0,
                        "std": 0,
                        "p10": 0,
                        "p90": 0,
                        "count": 0,
                    },
                    visualization={
                        "min": 0,
                        "max": 1,
                        "palette": ["#000000", "#00ff00"],
                    },
                    metadata={
                        "provider": self.provider_name,
                        "error": f"CDSE openEO download failed: {str(dl_error)}",
                    },
                )

            data = rioxarray.open_rasterio(tmp_path)

            # Sentinel-2 data from CDSE arrives in UTM projection (meters).
            # Reproject to EPSG:4326 so pixel coords are lat/lon for the map.
            src_crs = data.rio.crs
            if src_crs and str(src_crs) != "EPSG:4326":
                logger.info(f"Reprojecting from {src_crs} to EPSG:4326")
                data = data.rio.reproject("EPSG:4326")

            pixel_data = []
            values = []

            if len(data.shape) == 3:
                band_data = data.values[0]
            else:
                band_data = data.values

            height, width = band_data.shape
            step = max(1, int(((height * width) / grid_size) ** 0.5))

            y_coords = data.y.values
            x_coords = data.x.values

            for yi in range(0, height, step):
                for xi in range(0, width, step):
                    value = float(band_data[yi, xi])
                    if not np.isnan(value) and not np.isinf(value):
                        lon = float(x_coords[xi])
                        lat = float(y_coords[yi])
                        pixel_data.append({"lon": lon, "lat": lat, "value": value})
                        values.append(value)

            data.close()
            os.unlink(tmp_path)

            if values:
                stats = calculate_statistics_from_array(np.array(values))
            else:
                stats = {
                    "mean": 0,
                    "median": 0,
                    "min": 0,
                    "max": 0,
                    "std": 0,
                    "p10": 0,
                    "p90": 0,
                    "count": 0,
                }

            # Get visualization params
            vis_params = get_visualization_params(index)

            return HeatmapData(
                date=date,
                index=index,
                bounds={
                    "min_lon": bounds[0],
                    "max_lon": bounds[1],
                    "min_lat": bounds[2],
                    "max_lat": bounds[3],
                },
                pixel_data=pixel_data,
                aoi_boundary=self._extract_aoi_boundary(geometry),
                statistics=stats,
                visualization={
                    "min": vis_params.min,
                    "max": vis_params.max,
                    "palette": vis_params.palette,
                },
                metadata={
                    "provider": self.provider_name,
                    "data_source": "Sentinel-2 CDSE",
                },
            )

        except Exception as e:
            logger.error(f"Error exporting heatmap data with CDSE: {e}")
            raise

    async def export_interactive_data(
        self,
        geometry: Dict,
        date: str,
        index: str,
        scale: int = 30,
        max_pixels: int = 10000,
    ) -> HeatmapData:
        """
        Export interactive pixel data for scatter plot visualization.

        Similar to export_heatmap_data but with different sampling parameters.
        """
        # For CDSE, interactive data is similar to heatmap data
        # Just use the heatmap export with adjusted parameters
        return await self.export_heatmap_data(
            geometry=geometry,
            date=date,
            index=index,
            grid_size=max_pixels,
        )

    async def export_index_map(
        self,
        geometry: Dict,
        date: str,
        index: str,
        scale: int = 10,
        organization_id: Optional[str] = None,
        interactive: bool = False,
    ) -> Union[ExportResult, HeatmapData]:
        if interactive:
            return await self.export_heatmap_data(geometry, date, index)

        self._ensure_initialized()

        try:
            import openeo

            bounds = self._get_bounds_from_geometry(geometry)
            spatial_extent = {
                "west": bounds[0],
                "east": bounds[1],
                "south": bounds[2],
                "north": bounds[3],
            }

            end_date = (
                datetime.strptime(date, "%Y-%m-%d") + timedelta(days=1)
            ).strftime("%Y-%m-%d")

            s2_bands = self._get_bands_for_index(index)
            datacube = self._connection.load_collection(
                "SENTINEL2_L2A",
                spatial_extent=spatial_extent,
                temporal_extent=[date, end_date],
                bands=s2_bands,
            )
            datacube = self._apply_scl_cloud_mask(datacube)
            datacube = self._calculate_index(datacube, index)

            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp_file:
                tmp_path = tmp_file.name

            datacube.download(tmp_path, format="GTiff")
            logger.info(f"CDSE GeoTIFF downloaded to {tmp_path}")

            if organization_id:
                try:
                    from app.services.supabase_service import supabase_service
                    import uuid as _uuid

                    with open(tmp_path, "rb") as f:
                        file_data = f.read()

                    file_id = str(_uuid.uuid4())[:8]
                    filename = f"{index}_{date}_{file_id}.tif"

                    public_url = await supabase_service.upload_satellite_file(
                        file_data=file_data,
                        filename=filename,
                        organization_id=organization_id,
                        index=index,
                        date=date,
                    )
                    os.unlink(tmp_path)

                    if public_url:
                        return {"type": "static", "url": public_url}
                except Exception as upload_err:
                    logger.warning(f"Failed to upload to Supabase: {upload_err}")

            os.unlink(tmp_path)
            return ExportResult(
                url="",
                file_format="GeoTIFF",
                metadata={
                    "provider": self.provider_name,
                    "note": "GeoTIFF generated but no storage configured (pass organization_id)",
                },
            )

        except Exception as e:
            logger.error(f"Error exporting index map with CDSE: {e}")
            return ExportResult(
                url="",
                file_format="GeoTIFF",
                metadata={"provider": self.provider_name, "error": str(e)},
            )

    def get_statistics(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        indices: List[str],
    ) -> Dict[str, StatisticsResult]:
        """
        Calculate statistics for multiple indices over a date range.

        Uses openEO's aggregation capabilities.
        """
        self._ensure_initialized()

        results = {}
        for index_name in indices:
            try:
                # Get time series for this index
                ts = self.get_time_series(geometry, start_date, end_date, index_name)

                if ts.statistics:
                    results[index_name] = StatisticsResult(
                        index=index_name,
                        statistics=ts.statistics,
                        metadata={"provider": self.provider_name},
                    )
            except Exception as e:
                logger.error(f"Error calculating statistics for {index_name}: {e}")
                results[index_name] = StatisticsResult(
                    index=index_name,
                    statistics={},
                    metadata={"provider": self.provider_name, "error": str(e)},
                )

        return results

    def get_available_dates(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        max_cloud_coverage: float = 30.0,
    ) -> Dict[str, Any]:
        """
        Get dates with available satellite imagery.

        Uses CDSE's STAC API for metadata search.
        """
        self._ensure_initialized()

        try:
            import pystac_client

            # Connect to CDSE STAC catalog
            # Use the correct CDSE STAC endpoint
            catalog = pystac_client.Client.open(
                "https://catalogue.dataspace.copernicus.eu/stac"
            )

            # Search for Sentinel-2 L2A items
            bounds = self._get_bounds_from_geometry(geometry)

            search = catalog.search(
                collections=["sentinel-2-l2a"],
                bbox=[bounds[0], bounds[2], bounds[1], bounds[3]],
                datetime=[start_date, end_date],
                max_items=100,
                query={"eo:cloud_cover": {"lt": max_cloud_coverage}},
            )

            items = list(search.items())

            # Process items
            available_dates = []
            for item in items:
                dt_raw = item.properties.get("datetime")
                if not dt_raw:
                    continue
                available_dates.append(
                    {
                        "date": dt_raw[:10],
                        "cloud_coverage": item.properties.get("eo:cloud_cover", 0),
                        "timestamp": int(
                            datetime.fromisoformat(
                                str(dt_raw).replace("Z", "+00:00")
                            ).timestamp()
                            * 1000
                        ),
                        "available": True,
                    }
                )

            # STAC can return multiple granules per day (tiles/orbits); one row per day for the AOI.
            normalized = dedupe_s2_available_dates_by_day(available_dates)

            return {
                "available_dates": normalized,
                "total_images": len(normalized),
                "date_range": {"start": start_date, "end": end_date},
                "filters": {"max_cloud_coverage": max_cloud_coverage},
                "metadata": {"provider": self.provider_name},
            }

        except ImportError:
            logger.warning("pystac_client not available, using fallback")
            return {
                "available_dates": [],
                "total_images": 0,
                "date_range": {"start": start_date, "end": end_date},
                "filters": {"max_cloud_coverage": max_cloud_coverage},
                "metadata": {
                    "provider": self.provider_name,
                    "error": "pystac_client not installed",
                },
            }
        except Exception as e:
            logger.error(f"Error getting available dates with CDSE: {e}")
            return {
                "available_dates": [],
                "total_images": 0,
                "date_range": {"start": start_date, "end": end_date},
                "filters": {"max_cloud_coverage": max_cloud_coverage},
                "metadata": {"provider": self.provider_name, "error": str(e)},
            }

    @property
    def provider_name(self) -> str:
        """Return the name of this provider"""
        return self._provider_name

    @property
    def is_initialized(self) -> bool:
        """Check if provider is initialized and authenticated"""
        return self._initialized

    def _ensure_initialized(self) -> None:
        if not self._initialized:
            self.initialize()

    def _get_bounds_from_geometry(self, geometry: Dict) -> tuple:
        """Extract bounding box from GeoJSON geometry"""
        return parse_geometry(geometry)

    def _extract_aoi_boundary(self, geometry: Dict) -> List[List[float]]:
        """Extract AOI boundary coordinates from geometry"""
        geo_type = geometry.get("type")
        coordinates = geometry.get("coordinates", [])

        if geo_type == "Polygon" and coordinates:
            return coordinates[0]
        elif geo_type == "MultiPolygon" and coordinates:
            # Return first polygon's outer ring
            return coordinates[0][0] if coordinates[0] else []
        return []

    def _get_bands_for_index(self, index: str) -> List[str]:
        """Get required Sentinel-2 bands for a vegetation index"""
        # Standard bands needed for most indices + SCL for cloud masking
        base_bands = ["B02", "B03", "B04", "B08", "B11", "SCL"]

        index_specific = {
            "NDRE": ["B05", "B08"],
            "NDMI": ["B08", "B11"],
            "MNDWI": ["B03", "B11"],
            "MCARI": ["B03", "B04", "B05"],
            "TCARI": ["B04", "B05"],
            "TCARI_OSAVI": ["B03", "B04", "B05", "B08"],
        }

        return list(set(base_bands + index_specific.get(index, [])))

    def _apply_scl_cloud_mask(self, datacube: Any) -> Any:
        """Apply SCL-based cloud masking to the datacube"""
        try:
            scl = datacube.band("SCL")

            # openEO mask() sets pixels to nodata WHERE mask is True,
            # so we build a mask that is True for bad pixels (clouds, shadow, etc.)
            # SCL: 0=NoData, 1=Saturated, 3=CloudShadow, 8=CloudMedium, 9=CloudHigh, 10=Cirrus
            cloud_mask = (
                (scl == 0)
                | (scl == 1)
                | (scl == 3)
                | (scl == 8)
                | (scl == 9)
                | (scl == 10)
            )

            return datacube.mask(cloud_mask)

        except Exception as e:
            logger.warning(f"Could not apply SCL cloud mask: {e}")
            return datacube

    def _calculate_index(self, datacube: Any, index: str) -> Any:
        """Calculate vegetation index using openEO processes"""
        import openeo

        if index == "NDVI":
            return (datacube.band("B08") - datacube.band("B04")) / (
                datacube.band("B08") + datacube.band("B04")
            )
        elif index == "NIRv":
            ndvi = (datacube.band("B08") - datacube.band("B04")) / (
                datacube.band("B08") + datacube.band("B04")
            )
            return ndvi * datacube.band("B08")
        elif index == "EVI":
            return (
                2.5
                * (datacube.band("B08") - datacube.band("B04"))
                / (
                    datacube.band("B08")
                    + 6 * datacube.band("B04")
                    - 7.5 * datacube.band("B02")
                    + 1
                )
            )
        elif index == "NDRE":
            return (datacube.band("B08") - datacube.band("B05")) / (
                datacube.band("B08") + datacube.band("B05")
            )
        elif index == "NDMI":
            return (datacube.band("B08") - datacube.band("B11")) / (
                datacube.band("B08") + datacube.band("B11")
            )
        elif index == "MNDWI":
            return (datacube.band("B03") - datacube.band("B11")) / (
                datacube.band("B03") + datacube.band("B11")
            )
        elif index == "GCI":
            return datacube.band("B08") / datacube.band("B03") - 1
        elif index == "SAVI":
            L = 0.5
            return (
                (datacube.band("B08") - datacube.band("B04"))
                * (1 + L)
                / (datacube.band("B08") + datacube.band("B04") + L)
            )
        elif index == "TCARI_OSAVI":
            # Match GEE earth_engine.calculate_vegetation_indices: TCARI / max(OSAVI, eps)
            re = datacube.band("B05")
            r = datacube.band("B04")
            g = datacube.band("B03")
            nir = datacube.band("B08")
            eps = 1e-10
            tcari = 3 * (re - r - (re - g) * 0.2 * (re / (r + eps)))
            osavi = (nir - r) / (nir + r + 0.16 + eps)
            return tcari / (osavi + eps)
        else:
            raise ValueError(
                f"Index '{index}' is not implemented in the CDSE provider. "
                f"Supported indices: NDVI, NIRv, EVI, NDRE, NDMI, MNDWI, GCI, SAVI, OSAVI, MSAVI2, MSI, MCARI, TCARI, TCARI_OSAVI"
            )
