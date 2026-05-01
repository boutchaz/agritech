import ee
import json
import os
import uuid
import httpx
import math
import tempfile
import platform
import concurrent.futures
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from app.core.config import settings
from app.services.cloud_masking import CloudMaskingService
import logging
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import io
import base64

GEE_INIT_TIMEOUT = 30  # seconds

logger = logging.getLogger(__name__)


def _normalize_service_account_key_data(raw_key_data: Any) -> dict[str, Any] | str:
    """Normalize service-account key data loaded from env/config.

    Supports already-parsed dicts plus JSON strings with or without wrapping quotes.
    """
    if isinstance(raw_key_data, dict):
        return raw_key_data

    if not isinstance(raw_key_data, str):
        raise ValueError(
            f"GEE_PRIVATE_KEY has unexpected type: {type(raw_key_data)}"
        )

    normalized = raw_key_data.strip()
    if (
        len(normalized) >= 2
        and normalized[0] == normalized[-1]
        and normalized[0] in {"'", '"'}
    ):
        normalized = normalized[1:-1].strip()

    if normalized.startswith("{"):
        try:
            parsed = json.loads(normalized)
        except json.JSONDecodeError:
            return normalized
        if isinstance(parsed, dict):
            return parsed

    return normalized


def _resolve_service_account_email(
    configured_email: str,
    private_key_data: dict[str, Any] | str,
) -> str:
    """Prefer explicit config, then fall back to the key payload's client_email."""
    service_account_email = configured_email.strip()
    if service_account_email:
        return service_account_email

    if isinstance(private_key_data, dict):
        client_email = str(private_key_data.get("client_email", "")).strip()
        if client_email:
            return client_email

    raise ValueError(
        "GEE service-account email is missing; set GEE_SERVICE_ACCOUNT or include client_email in GEE_PRIVATE_KEY"
    )


def _serialize_ts_dict_for_api(obs: Dict[str, Any]) -> Dict[str, Any]:
    """Map internal per-observation stats to API / Pydantic TimeSeriesPoint fields.

    GEE chunk observations use ``cloud`` (tile-level %); API expects ``cloud_coverage``.
    """
    out: Dict[str, Any] = {
        "date": obs["date"],
        "value": obs["value"],
    }
    for key in (
        "min_value",
        "max_value",
        "std_value",
        "median_value",
        "percentile_10",
        "percentile_25",
        "percentile_75",
        "percentile_90",
    ):
        raw = obs.get(key)
        if raw is not None:
            try:
                out[key] = float(raw)
            except (TypeError, ValueError):
                pass
    pc = obs.get("pixel_count")
    if pc is not None:
        try:
            out["pixel_count"] = int(pc)
        except (TypeError, ValueError):
            pass
    cloud = obs.get("cloud_coverage")
    if cloud is None:
        cloud = obs.get("cloud")
    if cloud is not None:
        try:
            out["cloud_coverage"] = float(cloud)
        except (TypeError, ValueError):
            pass
    return out


_TS_OPTIONAL_OBS_KEYS = (
    "min_value",
    "max_value",
    "std_value",
    "median_value",
    "percentile_10",
    "percentile_25",
    "percentile_75",
    "percentile_90",
    "pixel_count",
)


def _log_per_observation_chunk_debug(
    index_name: str,
    chunk_start: str,
    chunk_end: str,
    results: Dict[str, Any],
    observations: List[Dict[str, Any]],
) -> None:
    """Log raw GEE feature property keys vs parsed observations (debug null stats)."""
    raw_features = results.get("features") or []
    logger.info(
        "[gee_ts] chunk raw_features=%s observations_kept=%s index=%s range=%s→%s",
        len(raw_features),
        len(observations),
        index_name,
        chunk_start,
        chunk_end,
    )
    if not raw_features:
        return

    sample_props: Dict[str, Any] = {}
    for feat in raw_features[:20]:
        props = feat.get("properties") or {}
        if props.get("value") is not None:
            sample_props = dict(props)
            break
    if sample_props:
        keys_sorted = sorted(sample_props.keys())
        logger.info("[gee_ts] sample_feature_property_keys=%s", keys_sorted)
        try:
            logger.debug(
                "[gee_ts] sample_feature_properties_json=%s",
                json.dumps(sample_props, default=str)[:4000],
            )
        except (TypeError, ValueError):
            logger.debug("[gee_ts] sample_feature_properties=%s", sample_props)

    if observations:
        filled = {
            k: sum(1 for o in observations if o.get(k) is not None)
            for k in _TS_OPTIONAL_OBS_KEYS
        }
        logger.info(
            "[gee_ts] chunk optional_fields_nonnull_counts (of %s)=%s",
            len(observations),
            filled,
        )


def _log_serialized_time_series_debug(
    index: str, serialized: List[Dict[str, Any]]
) -> None:
    """Log API-shaped points after _serialize_ts_dict_for_api."""
    if not serialized:
        logger.info("[gee_ts] serialized_series index=%s points=0", index)
        return
    optional = (
        "min_value",
        "std_value",
        "median_value",
        "percentile_25",
        "percentile_75",
        "percentile_90",
        "pixel_count",
        "cloud_coverage",
    )
    counts = {k: sum(1 for p in serialized if p.get(k) is not None) for k in optional}
    logger.info(
        "[gee_ts] serialized_series index=%s points=%s date_range=%s→%s optional_nonnull=%s",
        index,
        len(serialized),
        serialized[0].get("date"),
        serialized[-1].get("date"),
        counts,
    )
    try:
        logger.debug(
            "[gee_ts] serialized_first_point=%s",
            json.dumps(serialized[0], default=str),
        )
        if len(serialized) > 1:
            logger.debug(
                "[gee_ts] serialized_last_point=%s",
                json.dumps(serialized[-1], default=str),
            )
    except (TypeError, ValueError):
        logger.debug("[gee_ts] serialized_first_point=%s", serialized[0])


def _find_system_font() -> str:
    _FONT_PATHS = {
        "Darwin": [
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/Arial.ttf",
        ],
        "Linux": [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ],
        "Windows": [
            "C:\\Windows\\Fonts\\arial.ttf",
            "C:\\Windows\\Fonts\\segoeui.ttf",
        ],
    }
    for path in _FONT_PATHS.get(platform.system(), []):
        if os.path.isfile(path):
            return path
    raise OSError("No system font found")


class EarthEngineService:
    def __init__(self):
        self.initialized = False

    def initialize(self):
        """Initialize Earth Engine with service account credentials"""
        if self.initialized:
            return

        try:
            if settings.GEE_PRIVATE_KEY:
                private_key_data = _normalize_service_account_key_data(
                    settings.GEE_PRIVATE_KEY
                )
                service_account_email = _resolve_service_account_email(
                    settings.GEE_SERVICE_ACCOUNT,
                    private_key_data,
                )
                temp_path = None

                # Diagnostic logging (without exposing sensitive data)
                data_type = type(private_key_data).__name__
                if isinstance(private_key_data, str):
                    logger.info(
                        f"GEE_PRIVATE_KEY type: {data_type}, length: {len(private_key_data)}"
                    )
                else:
                    logger.info(
                        f"GEE_PRIVATE_KEY type: {data_type}, keys: {list(private_key_data.keys()) if isinstance(private_key_data, dict) else 'N/A'}"
                    )

                try:
                    # Handle case where GEE_PRIVATE_KEY was parsed as a dict (e.g., by Dokploy)
                    if isinstance(private_key_data, dict):
                        # It's already a parsed dict - write to temp file
                        logger.info(
                            "GEE_PRIVATE_KEY is a dict (parsed by environment loader), writing to temp file"
                        )
                        with tempfile.NamedTemporaryFile(
                            mode="w", suffix=".json", delete=False
                        ) as f:
                            json.dump(private_key_data, f)
                            temp_path = f.name
                        credentials = ee.ServiceAccountCredentials(
                            service_account_email, temp_path
                        )
                    elif isinstance(private_key_data, str):
                        # It's a string - try original approach first (key_data parameter)
                        # This is the original working approach for JSON strings
                        try:
                            logger.info(
                                "GEE_PRIVATE_KEY is a string, using key_data parameter (original approach)"
                            )
                            credentials = ee.ServiceAccountCredentials(
                                service_account_email, key_data=private_key_data
                            )
                            # Don't initialize here - let it initialize below with the rest
                        except Exception as key_data_error:
                            # If key_data fails, fall back to temp file approach
                            logger.warning(
                                f"key_data approach failed: {key_data_error}, trying temp file approach"
                            )
                            if private_key_data.strip().startswith("{"):
                                # It's a JSON string - write to temp file
                                logger.info(
                                    "Writing JSON string to temp file as fallback"
                                )
                                with tempfile.NamedTemporaryFile(
                                    mode="w", suffix=".json", delete=False
                                ) as f:
                                    f.write(private_key_data)
                                    temp_path = f.name
                                credentials = ee.ServiceAccountCredentials(
                                    service_account_email, temp_path
                                )
                            else:
                                # Re-raise the original error if it's not JSON
                                raise key_data_error

                    with concurrent.futures.ThreadPoolExecutor(
                        max_workers=1
                    ) as executor:
                        future = executor.submit(
                            ee.Initialize, credentials, project=settings.GEE_PROJECT_ID
                        )
                        future.result(timeout=GEE_INIT_TIMEOUT)

                    # Clean up temp file if created
                    if temp_path and os.path.exists(temp_path):
                        try:
                            os.unlink(temp_path)
                        except Exception:
                            pass  # Ignore cleanup errors

                except Exception as init_error:
                    logger.error(
                        f"Error during credential initialization: {init_error}"
                    )
                    # Clean up temp file on error
                    if temp_path and os.path.exists(temp_path):
                        try:
                            os.unlink(temp_path)
                        except Exception:
                            pass
                    raise
            else:
                # Fallback to default authentication for development
                logger.info(
                    "No service account credentials provided, using default authentication"
                )
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(
                        ee.Initialize, project=settings.GEE_PROJECT_ID
                    )
                    future.result(timeout=GEE_INIT_TIMEOUT)

            self.initialized = True
            logger.info("Earth Engine initialized successfully")
        except concurrent.futures.TimeoutError:
            logger.error(
                f"Earth Engine initialization timed out after {GEE_INIT_TIMEOUT}s"
            )
            raise RuntimeError(
                f"Earth Engine initialization timed out after {GEE_INIT_TIMEOUT}s"
            )
        except Exception as e:
            logger.error(f"Failed to initialize Earth Engine: {e}")
            raise

    def get_sentinel2_collection(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        max_cloud_coverage: float = None,
        use_aoi_cloud_filter: bool = False,
    ) -> ee.ImageCollection:
        """
        Get Sentinel-2 image collection for given parameters

        Args:
            geometry: AOI geometry
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            max_cloud_coverage: Maximum cloud coverage percentage
            use_aoi_cloud_filter: If True, use SCL-based AOI cloud filter at 20m
                (filter_by_scl_coverage). No tile-level pre-filter applied.
                Default is False (tile-level CLOUDY_PIXEL_PERCENTAGE).
        """
        self.initialize()

        # Validate date range
        try:
            start_dt = datetime.fromisoformat(start_date)
            end_dt = datetime.fromisoformat(end_date)

            if start_dt > end_dt:
                raise ValueError("Start date must be before end date")

            # Allow future dates for testing/demo purposes
            # if start_dt >= datetime.now():
            #     raise ValueError("Start date cannot be in the future")

            # if end_dt >= datetime.now():
            #     raise ValueError("End date cannot be in the future")

            # Sentinel-2 data is available from 2015-06-23
            sentinel2_start = datetime(2015, 6, 23)
            if start_dt < sentinel2_start:
                raise ValueError(
                    f"Start date cannot be before {sentinel2_start.strftime('%Y-%m-%d')} (Sentinel-2 launch date)"
                )

        except ValueError as ve:
            raise ValueError(f"Invalid date range: {ve}")
        except Exception as e:
            raise ValueError(f"Invalid date format. Use YYYY-MM-DD format: {e}")

        aoi = ee.Geometry(geometry)
        max_cloud = max_cloud_coverage or settings.MAX_CLOUD_COVERAGE

        # Earth Engine's filterDate(start, end) is EXCLUSIVE on the end date
        # (includes dates >= start and < end). Add 1 day to end_date to make it inclusive.
        end_dt_inclusive = (
            datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        ).strftime("%Y-%m-%d")

        if use_aoi_cloud_filter:
            # Two-gate cloud filter:
            # 1) Tile-level pre-filter at 25% to reject obviously cloudy tiles
            #    (SCL alone is unreliable for small AOIs — misclassifies cloud pixels)
            # 2) SCL AOI-level filter at max_cloud for fine-grained check
            collection = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(aoi)
                .filterDate(start_date, end_dt_inclusive)
                .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", 25))
            )
            logger.info("Applying tile pre-filter (25%%) + SCL AOI cloud filtering at 20m")
            collection = CloudMaskingService.filter_by_scl_coverage(
                collection, aoi, max_cloud
            )
        else:
            # Tile-level: CLOUDY_PIXEL_PERCENTAGE metadata filter
            collection = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(aoi)
                .filterDate(start_date, end_dt_inclusive)
                .filter(
                    ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", max_cloud)
                )
            )

        # Check if collection has any images
        try:
            collection_size = collection.size().getInfo()
            if collection_size == 0:
                logger.info(
                    f"No Sentinel-2 images found for the specified area and date range ({start_date} to {end_date}) with cloud coverage <= {max_cloud}%"
                )
                # Don't raise an error here, let the calling code handle empty collections
        except Exception as e:
            logger.warning(f"Could not check collection size: {e}")

        return collection

    def calculate_vegetation_indices(
        self, image: ee.Image, indices: List[str]
    ) -> Dict[str, ee.Image]:
        """Calculate requested vegetation indices.

        S2_SR_HARMONIZED stores reflectance as integers in [0, 10000].
        Normalized-difference indices (NDVI, NDRE, …) are scale-invariant,
        but indices with additive soil-correction constants (SAVI, OSAVI,
        MSAVI2) require reflectance in [0, 1].  We therefore rescale the
        bands once upfront.
        """

        # Rescale reflectance bands from [0, 10000] to [0, 1]
        scale_factor = 0.0001
        bands = {
            "blue": image.select("B2").multiply(scale_factor),
            "green": image.select("B3").multiply(scale_factor),
            "red": image.select("B4").multiply(scale_factor),
            "red_edge": image.select("B5").multiply(scale_factor),
            "red_edge_2": image.select("B6").multiply(scale_factor),
            "red_edge_3": image.select("B7").multiply(scale_factor),
            "nir": image.select("B8").multiply(scale_factor),
            "nir_narrow": image.select("B8A").multiply(scale_factor),
            "swir1": image.select("B11").multiply(scale_factor),
            "swir2": image.select("B12").multiply(scale_factor),
        }

        results = {}

        # NDVI — scale-invariant, unaffected by rescaling
        if "NDVI" in indices:
            results["NDVI"] = (
                bands["nir"]
                .subtract(bands["red"])
                .divide(bands["nir"].add(bands["red"]).max(ee.Image(1e-10)))
                .rename("NDVI")
            )

        # NDRE
        if "NDRE" in indices:
            results["NDRE"] = (
                bands["nir"]
                .subtract(bands["red_edge"])
                .divide(bands["nir"].add(bands["red_edge"]).max(ee.Image(1e-10)))
                .rename("NDRE")
            )

        # NDMI
        if "NDMI" in indices:
            results["NDMI"] = (
                bands["nir"]
                .subtract(bands["swir1"])
                .divide(bands["nir"].add(bands["swir1"]).max(ee.Image(1e-10)))
                .rename("NDMI")
            )

        # MNDWI
        if "MNDWI" in indices:
            results["MNDWI"] = (
                bands["green"]
                .subtract(bands["swir1"])
                .divide(bands["green"].add(bands["swir1"]).max(ee.Image(1e-10)))
                .rename("MNDWI")
            )

        # GCI
        if "GCI" in indices:
            results["GCI"] = (
                bands["nir"]
                .divide(bands["green"].max(ee.Image(1e-10)))
                .subtract(1)
                .rename("GCI")
            )

        # SAVI  — L=0.5 now works correctly with [0,1] reflectance
        if "SAVI" in indices:
            L = 0.5
            results["SAVI"] = (
                bands["nir"]
                .subtract(bands["red"])
                .multiply(1 + L)
                .divide(bands["nir"].add(bands["red"]).add(L).max(ee.Image(1e-10)))
                .rename("SAVI")
            )

        # OSAVI — 0.16 adjustment now meaningful with [0,1] reflectance
        if "OSAVI" in indices:
            results["OSAVI"] = (
                bands["nir"]
                .subtract(bands["red"])
                .divide(bands["nir"].add(bands["red"]).add(0.16).max(ee.Image(1e-10)))
                .rename("OSAVI")
            )

        # MSAVI2 — requires [0,1] reflectance for sqrt discriminant
        if "MSAVI2" in indices:
            results["MSAVI2"] = (
                bands["nir"]
                .multiply(2)
                .add(1)
                .subtract(
                    bands["nir"]
                    .multiply(2)
                    .add(1)
                    .pow(2)
                    .subtract(bands["nir"].subtract(bands["red"]).multiply(8))
                    .max(ee.Image(0))  # clamp discriminant >= 0
                    .sqrt()
                )
                .divide(2)
            ).rename("MSAVI2")

        # NIRv — Near-Infrared Reflectance of vegetation
        # NIRv = NDVI * NIR
        # Uses the same NDVI base with NIR reflectance scaling.
        if "NIRv" in indices:
            ndvi_for_nirv = results.get("NDVI")
            if ndvi_for_nirv is None:
                ndvi_for_nirv = (
                    bands["nir"]
                    .subtract(bands["red"])
                    .divide(bands["nir"].add(bands["red"]).max(ee.Image(1e-10)))
                )
            results["NIRv"] = ndvi_for_nirv.multiply(bands["nir"]).rename("NIRv")

        # EVI — Enhanced Vegetation Index
        # EVI = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)
        if "EVI" in indices:
            evi_denominator = (
                bands["nir"]
                .add(bands["red"].multiply(6))
                .subtract(bands["blue"].multiply(7.5))
                .add(1)
            )
            results["EVI"] = (
                bands["nir"]
                .subtract(bands["red"])
                .multiply(2.5)
                .divide(evi_denominator.where(evi_denominator.eq(0), ee.Image(1e-10)))
                .rename("EVI")
            )

        # EBI — Enhanced Bloom Index (Chen et al. 2019, almond bloom detection)
        # EBI = (R+G+B) / ((G/B) * (R - B + ε))
        # ε=1 assumes Sentinel-2 reflectance at native [0,10000] scale per the paper.
        # NOTE: drone imagery uses a different reflectance scale — ε must be
        # recalibrated when drone support lands (likely ε ≈ 1e-4 for [0,1] floats).
        if "EBI" in indices:
            epsilon = 1.0
            brightness = bands["red"].add(bands["green"]).add(bands["blue"])
            soil_signature = bands["red"].subtract(bands["blue"]).add(epsilon)
            greenness = bands["green"].divide(bands["blue"].max(ee.Image(1e-10)))
            ebi_denominator = greenness.multiply(soil_signature)
            results["EBI"] = (
                brightness
                .divide(ebi_denominator.where(ebi_denominator.eq(0), ee.Image(1e-10)))
                .rename("EBI")
            )

        # MSI
        if "MSI" in indices:
            results["MSI"] = bands["swir1"].divide(bands["nir"]).rename("MSI")

        # MCARI
        if "MCARI" in indices:
            results["MCARI"] = (
                bands["red_edge"]
                .subtract(bands["red"])
                .subtract(bands["red_edge"].subtract(bands["green"]).multiply(0.2))
                .multiply(bands["red_edge"].divide(bands["green"]))
            ).rename("MCARI")

        # TCARI
        if "TCARI" in indices or "TCARI_OSAVI" in indices:
            tcari = ee.Image(3).multiply(
                bands["red_edge"]
                .subtract(bands["red"])
                .subtract(
                    bands["red_edge"]
                    .subtract(bands["green"])
                    .multiply(0.2)
                    .multiply(bands["red_edge"].divide(bands["red"]))
                )
            )
            if "TCARI" in indices:
                results["TCARI"] = tcari.rename("TCARI")

        # TCARI/OSAVI ratio — chlorophyll indicator resistant to LAI variation
        if "TCARI_OSAVI" in indices:
            osavi_for_ratio = results.get("OSAVI")
            if osavi_for_ratio is None:
                osavi_for_ratio = (
                    bands["nir"]
                    .subtract(bands["red"])
                    .divide(
                        bands["nir"].add(bands["red"]).add(0.16).max(ee.Image(1e-10))
                    )
                )
            results["TCARI_OSAVI"] = tcari.divide(
                osavi_for_ratio.max(ee.Image(1e-10))
            ).rename("TCARI_OSAVI")

        return results

    def extract_ndvi_raster(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        scale: int = 10,
    ) -> Dict[str, Any]:
        self.initialize()

        collection = self.get_sentinel2_collection(geometry, start_date, end_date)

        try:
            collection_size = collection.size().getInfo()
            if collection_size == 0:
                raise ValueError(
                    "No Sentinel-2 images found for the provided geometry and date range"
                )
        except Exception as exc:
            if "Empty date ranges not supported" in str(exc):
                raise ValueError(
                    "No Sentinel-2 images found for the provided geometry and date range"
                ) from exc
            raise

        composite = collection.median()
        ndvi_image = self.calculate_vegetation_indices(composite, ["NDVI"])["NDVI"]

        aoi = ee.Geometry(geometry)
        clipped = ndvi_image.clip(aoi)

        bounds = aoi.bounds().getInfo()["coordinates"][0]
        min_lon = min([coord[0] for coord in bounds])
        max_lon = max([coord[0] for coord in bounds])
        min_lat = min([coord[1] for coord in bounds])
        max_lat = max([coord[1] for coord in bounds])

        sampled_pixels = clipped.sample(
            region=aoi, scale=scale, numPixels=5000, geometries=True
        )
        sampled_data = sampled_pixels.getInfo()

        pixel_data: list[dict[str, float]] = []
        values: list[float] = []

        for feature in sampled_data.get("features", []):
            value = feature.get("properties", {}).get("NDVI")
            coords = feature.get("geometry", {}).get("coordinates", [])

            if value is None or len(coords) < 2:
                continue

            lon = float(coords[0])
            lat = float(coords[1])
            ndvi_value = float(value)

            pixel_data.append({"lon": lon, "lat": lat, "value": ndvi_value})
            values.append(ndvi_value)

        if values:
            values_array = np.array(values, dtype=np.float64)
            stats = {
                "min": float(np.min(values_array)),
                "max": float(np.max(values_array)),
                "mean": float(np.mean(values_array)),
                "median": float(np.median(values_array)),
                "std": float(np.std(values_array)),
            }
        else:
            stats = {
                "min": 0.0,
                "max": 0.0,
                "mean": 0.0,
                "median": 0.0,
                "std": 0.0,
            }

        return {
            "pixels": pixel_data,
            "bounds": {
                "min_lon": float(min_lon),
                "max_lon": float(max_lon),
                "min_lat": float(min_lat),
                "max_lat": float(max_lat),
            },
            "scale": int(scale),
            "count": len(pixel_data),
            "stats": stats,
        }

    def get_time_series(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        index: str,
        interval: str = "month",
        max_cloud_coverage: float = None,
        use_aoi_cloud_filter: bool = False,
    ) -> List[Dict]:
        """Get time series using real per-observation values (no composites).

        Each data point corresponds to an actual Sentinel-2 acquisition date.
        Falls back to the legacy composite approach only on failure.
        """
        self.initialize()

        aoi = ee.Geometry(geometry)
        max_cloud = max_cloud_coverage or settings.MAX_CLOUD_COVERAGE

        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        total_days = (end_dt - start_dt).days
        scale = 30 if total_days > 365 else settings.DEFAULT_SCALE

        try:
            logger.info(
                "[gee_ts] get_time_series path=per_observation index=%s scale=%s "
                "max_cloud=%s days=%s",
                index,
                scale,
                max_cloud,
                total_days,
            )
            return self._get_time_series_per_observation(
                geometry,
                aoi,
                start_date,
                end_date,
                index,
                scale,
                max_cloud,
                use_aoi_cloud_filter=use_aoi_cloud_filter,
            )
        except Exception as e:
            logger.warning(
                "[gee_ts] per_observation failed (%s), falling back to composite",
                e,
                exc_info=logger.isEnabledFor(logging.DEBUG),
            )
            interval_days = {"day": 1, "week": 7, "month": 30, "year": 365}
            step = interval_days.get(interval, 30)
            logger.info(
                "[gee_ts] get_time_series path=batched_composite index=%s step_days=%s "
                "(mean-only points, no per-pixel percentiles)",
                index,
                step,
            )
            try:
                return self._get_time_series_batched(
                    geometry,
                    aoi,
                    start_date,
                    end_date,
                    index,
                    step,
                    scale,
                    start_dt,
                    end_dt,
                    max_cloud=max_cloud,
                    use_aoi_cloud_filter=use_aoi_cloud_filter,
                )
            except Exception as e2:
                logger.warning(
                    "[gee_ts] batched_composite failed (%s), falling back to sequential",
                    e2,
                    exc_info=logger.isEnabledFor(logging.DEBUG),
                )
                logger.info(
                    "[gee_ts] get_time_series path=sequential_composite index=%s step_days=%s",
                    index,
                    step,
                )
                return self._get_time_series_sequential(
                    geometry,
                    aoi,
                    index,
                    step,
                    scale,
                    start_dt,
                    end_dt,
                    max_cloud=max_cloud,
                    use_aoi_cloud_filter=use_aoi_cloud_filter,
                )

    def _get_time_series_per_observation(
        self,
        geometry: Dict,
        aoi: ee.Geometry,
        start_date: str,
        end_date: str,
        index: str,
        scale: int,
        max_cloud: float,
        use_aoi_cloud_filter: bool = False,
    ) -> List[Dict]:
        """Compute mean index value per real Sentinel-2 image (no composites).

        Batches into 6-month chunks to avoid GEE timeouts on multi-year ranges.
        Uses tile-level cloud filtering by default. AOI-level filtering can be enabled explicitly.
        """
        CHUNK_DAYS = 180

        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")

        all_observations: Dict[str, Dict] = {}
        chunk_start = start_dt

        while chunk_start < end_dt:
            chunk_end = min(chunk_start + timedelta(days=CHUNK_DAYS), end_dt)
            c_start = chunk_start.strftime("%Y-%m-%d")
            c_end = chunk_end.strftime("%Y-%m-%d")

            try:
                chunk_results = self._per_observation_chunk(
                    geometry,
                    aoi,
                    c_start,
                    c_end,
                    index,
                    scale,
                    max_cloud,
                    use_aoi_cloud_filter=use_aoi_cloud_filter,
                )
                for obs in chunk_results:
                    d = obs["date"]
                    if (
                        d not in all_observations
                        or all_observations[d]["cloud"] > obs["cloud"]
                    ):
                        all_observations[d] = obs
            except Exception as e:
                logger.warning(f"Per-observation chunk {c_start}→{c_end} failed: {e}")

            chunk_start = chunk_end

        time_series = sorted(all_observations.values(), key=lambda x: x["date"])
        logger.info(
            f"Per-observation time series: {len(time_series)} real observations "
            f"for {index} ({start_date}→{end_date})"
        )
        serialized = [_serialize_ts_dict_for_api(p) for p in time_series]
        _log_serialized_time_series_debug(index, serialized)
        return serialized

    def _per_observation_chunk(
        self,
        geometry: Dict,
        aoi: ee.Geometry,
        start_date: str,
        end_date: str,
        index: str,
        scale: int,
        max_cloud: float,
        use_aoi_cloud_filter: bool = False,
    ) -> List[Dict]:
        """Process a single time chunk: get collection, map index, return observations."""
        collection = self.get_sentinel2_collection(
            geometry,
            start_date,
            end_date,
            max_cloud,
            use_aoi_cloud_filter=use_aoi_cloud_filter,
        )

        index_name = index

        def extract_observation(image):
            idx_images = self.calculate_vegetation_indices(image, [index_name])
            idx_image = idx_images.get(index_name)
            if idx_image is None:
                return ee.Feature(None, {"date": None, "value": None, "cloud": None})

            # Combined reducer: same order as automated_processing.py so reduceRegion keys are
            # {index_name}_p2, _p25, …, _mean, _stdDev, _count (percentile-first chain).
            combined_reducer = (
                ee.Reducer.percentile(
                    [2, 25, 50, 75, 90, 98],
                    ["p2", "p25", "p50", "p75", "p90", "p98"],
                )
                .combine(ee.Reducer.mean(), "", True)
                .combine(ee.Reducer.stdDev(), "", True)
                .combine(ee.Reducer.count(), "", True)
            )

            # Use CRS parameter to handle AOI crossing UTM zone boundaries
            stats = idx_image.reduceRegion(
                reducer=combined_reducer,
                geometry=aoi,
                scale=scale,
                crs="EPSG:4326",  # Use WGS84 to handle AOI crossing UTM zone boundaries
                maxPixels=settings.MAX_PIXELS,
                bestEffort=True,
                tileScale=4,
            )

            return ee.Feature(
                None,
                {
                    "date": ee.Date(image.get("system:time_start")).format(
                        "YYYY-MM-dd"
                    ),
                    "value": stats.get(f"{index_name}_mean"),
                    "min_value": stats.get(f"{index_name}_p2"),
                    "max_value": stats.get(f"{index_name}_p98"),
                    "std_value": stats.get(f"{index_name}_stdDev"),
                    "median_value": stats.get(f"{index_name}_p50"),
                    "percentile_25": stats.get(f"{index_name}_p25"),
                    "percentile_75": stats.get(f"{index_name}_p75"),
                    "percentile_90": stats.get(f"{index_name}_p90"),
                    "pixel_count": stats.get(f"{index_name}_count"),
                    "cloud": image.get("CLOUDY_PIXEL_PERCENTAGE"),
                },
            )

        features = collection.map(extract_observation)
        results = features.getInfo()

        observations = []
        for feat in results.get("features", []):
            props = feat.get("properties", {})
            date_str = props.get("date")
            value = props.get("value")
            cloud = props.get("cloud", 100)
            if date_str is not None and value is not None:
                obs = {"date": date_str, "value": value, "cloud": cloud}
                for key in (
                    "min_value",
                    "max_value",
                    "std_value",
                    "median_value",
                    "percentile_25",
                    "percentile_75",
                    "percentile_90",
                    "pixel_count",
                ):
                    if props.get(key) is not None:
                        obs[key] = props[key]
                observations.append(obs)

        logger.info(f"Chunk {start_date}→{end_date}: {len(observations)} observations")
        _log_per_observation_chunk_debug(
            index_name, start_date, end_date, results, observations
        )
        return observations

    def _get_time_series_batched(
        self,
        geometry: Dict,
        aoi: ee.Geometry,
        start_date: str,
        end_date: str,
        index: str,
        step: int,
        scale: int,
        start_dt: datetime,
        end_dt: datetime,
        max_cloud: float = None,
        use_aoi_cloud_filter: bool = False,
    ) -> List[Dict]:
        """Batch all windows into a single GEE server-side computation.

        Uses tile-level cloud filtering by default. AOI-level cloud
        filtering can be enabled explicitly."""
        max_cloud = max_cloud or settings.MAX_CLOUD_COVERAGE

        # Use get_sentinel2_collection for consistent AOI-level cloud filtering
        base_collection = self.get_sentinel2_collection(
            geometry,
            start_date,
            end_date,
            max_cloud,
            use_aoi_cloud_filter=use_aoi_cloud_filter,
        )

        windows = []
        current = start_dt
        while current < end_dt:
            window_end = min(current + timedelta(days=step), end_dt)
            windows.append((current, window_end))
            current = window_end

        count_features = ee.FeatureCollection(
            [
                ee.Feature(
                    None,
                    {
                        "idx": i,
                        "date": w_start.strftime("%Y-%m-%d"),
                        # Add 1 day to window end for inclusive filterDate
                        "count": base_collection.filterDate(
                            w_start.strftime("%Y-%m-%d"),
                            (w_end + timedelta(days=1)).strftime("%Y-%m-%d"),
                        ).size(),
                    },
                )
                for i, (w_start, w_end) in enumerate(windows)
            ]
        )
        count_results = count_features.getInfo()

        non_empty_indices = set()
        for feat in count_results.get("features", []):
            props = feat.get("properties", {})
            if props.get("count", 0) > 0:
                non_empty_indices.add(props["idx"])

        non_empty_windows = [w for i, w in enumerate(windows) if i in non_empty_indices]
        if not non_empty_windows:
            return []

        logger.info(
            f"Time series: {len(non_empty_windows)}/{len(windows)} windows have imagery"
        )

        def make_window_feature(window_tuple):
            w_start, w_end = window_tuple
            w_start_str = w_start.strftime("%Y-%m-%d")
            # Add 1 day to end date for inclusive filterDate
            w_end_str = (w_end + timedelta(days=1)).strftime("%Y-%m-%d")

            sub = base_collection.filterDate(w_start_str, w_end_str)
            composite = sub.median()
            img_count = sub.size()

            index_image = self.calculate_vegetation_indices(composite, [index]).get(
                index
            )
            if index_image is None:
                return ee.Feature(
                    None, {"date": w_start_str, "value": None, "count": 0}
                )

            # Use CRS parameter to handle AOI crossing UTM zone boundaries
            mean_val = index_image.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=aoi,
                scale=scale,
                crs="EPSG:4326",  # Use WGS84 to handle AOI crossing UTM zone boundaries
                maxPixels=settings.MAX_PIXELS,
                bestEffort=True,
                tileScale=4,
            ).get(index)

            return ee.Feature(
                None,
                {
                    "date": w_start_str,
                    "value": mean_val,
                    "count": img_count,
                },
            )

        features = ee.FeatureCollection(
            [make_window_feature(w) for w in non_empty_windows]
        )

        results = features.getInfo()

        time_series = []
        for feat in results.get("features", []):
            props = feat.get("properties", {})
            value = props.get("value")
            count = props.get("count", 0)
            if value is not None and count and count > 0:
                time_series.append({"date": props["date"], "value": value})

        return time_series

    def _get_time_series_sequential(
        self,
        geometry: Dict,
        aoi: ee.Geometry,
        index: str,
        step: int,
        scale: int,
        start_dt: datetime,
        end_dt: datetime,
        max_cloud: float = None,
        use_aoi_cloud_filter: bool = False,
    ) -> List[Dict]:
        """Fallback: per-window sequential getInfo() calls.

        Uses tile-level cloud filtering by default. AOI-level cloud
        filtering can be enabled explicitly."""
        max_cloud = max_cloud or settings.MAX_CLOUD_COVERAGE
        time_series: List[Dict] = []
        current = start_dt
        while current < end_dt:
            window_end = min(current + timedelta(days=step), end_dt)
            try:
                sub_collection = self.get_sentinel2_collection(
                    geometry,
                    current.strftime("%Y-%m-%d"),
                    window_end.strftime("%Y-%m-%d"),
                    max_cloud,
                    use_aoi_cloud_filter=use_aoi_cloud_filter,
                )

                count = sub_collection.size().getInfo()
                if count == 0:
                    current = window_end
                    continue

                composite = sub_collection.median()
                index_image = self.calculate_vegetation_indices(composite, [index]).get(
                    index
                )
                if index_image is None:
                    current = window_end
                    continue

                # Use CRS parameter to handle AOI crossing UTM zone boundaries
                stats = index_image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=aoi,
                    scale=scale,
                    crs="EPSG:4326",  # Use WGS84 to handle AOI crossing UTM zone boundaries
                    maxPixels=settings.MAX_PIXELS,
                    bestEffort=True,
                    tileScale=4,
                ).get(index)
                value = stats.getInfo()
                if value is not None:
                    time_series.append(
                        {"date": current.strftime("%Y-%m-%d"), "value": value}
                    )
            except Exception as e:
                logger.warning(
                    f"Time series window {current.strftime('%Y-%m-%d')} - "
                    f"{window_end.strftime('%Y-%m-%d')} failed for {index}: {e}"
                )

            current = window_end

        return time_series

    async def check_existing_file(
        self, organization_id: str, index: str, date: str, geometry: Dict = None
    ) -> Optional[str]:
        """Check if a satellite file already exists in storage"""
        try:
            from app.services.supabase_service import supabase_service

            # Get existing files for this organization, index, and date
            existing_files = await supabase_service.get_satellite_files(
                organization_id=organization_id,
                index=index,
                date_range={"start_date": date, "end_date": date},
            )

            # If we have existing files for this exact date, return the first one
            if existing_files:
                for file_data in existing_files:
                    if (
                        file_data.get("date") == date
                        and file_data.get("index") == index
                    ):
                        logger.info(f"Found existing file: {file_data['filename']}")
                        return file_data["public_url"]

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
        vis_params: Dict[str, Any],
    ) -> str:
        """Create enhanced visualization with date, scale bar, and statistics"""
        try:
            # Get the base image as bytes
            base_url = image.getThumbUrl(
                {
                    "min": vis_params["min"],
                    "max": vis_params["max"],
                    "palette": vis_params["palette"],
                    "dimensions": 512,
                    "region": aoi,
                    "format": "png",
                }
            )

            # Download the base image
            import requests

            response = requests.get(base_url)
            base_image = Image.open(io.BytesIO(response.content))

            # Calculate statistics
            # Use CRS parameter to handle AOI crossing UTM zone boundaries
            stats = image.reduceRegion(
                reducer=ee.Reducer.percentile([10, 90])
                .combine(ee.Reducer.mean(), "", True)
                .combine(ee.Reducer.median(), "", True)
                .combine(ee.Reducer.stdDev(), "", True),
                geometry=aoi,
                scale=settings.DEFAULT_SCALE,
                crs="EPSG:4326",  # Use WGS84 to handle AOI crossing UTM zone boundaries
                maxPixels=settings.MAX_PIXELS,
            ).getInfo()

            # Create enhanced image
            enhanced_image = self._add_overlays(
                base_image, index, date, stats, vis_params
            )

            # Convert to base64 data URL
            buffer = io.BytesIO()
            enhanced_image.save(buffer, format="PNG")
            buffer.seek(0)

            # Return as data URL
            img_data = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/png;base64,{img_data}"

        except Exception as e:
            logger.warning(
                f"Failed to create enhanced visualization: {e}, falling back to basic"
            )
            # Fallback to basic visualization
            return image.getThumbUrl(
                {
                    "min": vis_params["min"],
                    "max": vis_params["max"],
                    "palette": vis_params["palette"],
                    "dimensions": 512,
                    "region": aoi,
                    "format": "png",
                }
            )

    def _add_overlays(
        self,
        base_image: Image.Image,
        index: str,
        date: str,
        stats: Dict,
        vis_params: Dict[str, Any],
    ) -> Image.Image:
        """Add date label, scale bar, and statistics to the image"""
        # Create a larger canvas to accommodate overlays
        width, height = base_image.size
        new_width = width + 150  # Extra space for scale bar
        new_height = height + 100  # Extra space for title and stats

        # Create new image with white background
        enhanced = Image.new("RGB", (new_width, new_height), "white")

        # Paste the base image
        enhanced.paste(base_image, (0, 60))  # Leave space for title

        draw = ImageDraw.Draw(enhanced)

        try:
            title_font = ImageFont.truetype(_find_system_font(), 24)
            label_font = ImageFont.truetype(_find_system_font(), 14)
            stats_font = ImageFont.truetype(_find_system_font(), 12)
        except Exception:
            title_font = ImageFont.load_default()
            label_font = ImageFont.load_default()
            stats_font = ImageFont.load_default()

        # Add title
        title = f"{index} - évolution temporelle"
        draw.text((10, 10), title, fill="black", font=title_font)

        # Add date
        draw.text((width // 2 - 50, 40), date, fill="black", font=label_font)

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
        font,
    ):
        """Draw color scale bar on the right side"""
        scale_height = 200
        scale_width = 20

        # Get color palette
        colors = vis_params.get("palette", ["red", "yellow", "green"])
        min_val = vis_params.get("min", -1)
        max_val = vis_params.get("max", 1)

        def hex_to_rgb(hex_color):
            """Convert hex color to RGB tuple"""
            if hex_color.startswith("#"):
                hex_color = hex_color[1:]
            return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))

        # Convert color names and hex colors to RGB
        def get_rgb_color(color):
            color_map = {
                "red": (255, 0, 0),
                "yellow": (255, 255, 0),
                "green": (0, 255, 0),
                "blue": (0, 0, 255),
                "white": (255, 255, 255),
            }
            if color.startswith("#"):
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
            draw.rectangle(
                [
                    x,
                    y + (scale_height - i),
                    x + scale_width,
                    y + (scale_height - i) + 1,
                ],
                fill=color,
            )

        # Add scale labels
        for i, val in enumerate([max_val, (max_val + min_val) / 2, min_val]):
            label_y = y + i * (scale_height // 2)
            draw.text(
                (x + scale_width + 5, label_y), f"{val:.1f}", fill="black", font=font
            )

    def _draw_stats_box(
        self, draw: ImageDraw.ImageDraw, stats: Dict, index: str, x: int, y: int, font
    ):
        """Draw statistics box"""
        # Extract statistics
        mean = stats.get(f"{index}_mean", 0)
        median = stats.get(f"{index}_median", 0)
        p10 = stats.get(f"{index}_p10", 0)
        p90 = stats.get(f"{index}_p90", 0)
        std = stats.get(f"{index}_stdDev", 0)

        # Draw background box
        box_width = 120
        box_height = 80
        draw.rectangle(
            [x, y, x + box_width, y + box_height], fill="gray", outline="black"
        )

        # Draw statistics text
        stats_text = [
            f"Mean: {mean:.3f}",
            f"Median: {median:.3f}",
            f"P10: {p10:.3f}",
            f"P90: {p90:.3f}",
            f"Std: {std:.3f}",
        ]

        for i, text in enumerate(stats_text):
            draw.text((x + 5, y + 5 + i * 15), text, fill="white", font=font)

    def _get_visualization_params(self, index: str) -> Dict[str, Any]:
        """Get visualization parameters for different vegetation indices"""
        # Updated polygon-based AOI filtering for shape-accurate heatmap visualization
        params = {
            "NDVI": {
                "min": 0.1,
                "max": 0.5,
                "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
            },
            "NDRE": {
                "min": -0.2,
                "max": 0.4,
                "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
            },
            "NDMI": {
                "min": -0.5,
                "max": 0.5,
                "palette": ["#8B4513", "#FF4500", "#FFD700", "#00BFFF", "#0000FF"],
            },
            "MNDWI": {
                "min": -1,
                "max": 1,
                "palette": ["#FFFFFF", "#87CEEB", "#4682B4", "#000080"],
            },
            "GCI": {
                "min": 0,
                "max": 3,
                "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
            },
            "SAVI": {
                "min": -0.1,
                "max": 0.6,
                "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
            },
            "OSAVI": {
                "min": -0.1,
                "max": 0.6,
                "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
            },
            "MSAVI2": {
                "min": -0.1,
                "max": 0.6,
                "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
            },
            "EVI": {
                "min": -0.2,
                "max": 0.8,
                "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
            },
            "NIRv": {
                "min": 0.0,
                "max": 0.4,
                "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
            },
            "MSI": {
                "min": 0,
                "max": 3,
                "palette": ["#00FF00", "#FFD700", "#FF4500", "#8B0000"],
            },
            "TCARI_OSAVI": {
                "min": 0,
                "max": 0.8,
                "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
            },
            "EBI": {
                "min": 0,
                "max": 5,
                "palette": ["#1a472a", "#7cba6e", "#fde68a", "#f9a8d4", "#ec4899"],
            },
        }

        return params.get(
            index,
            {
                "min": 0.1,
                "max": 0.5,
                "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
            },
        )

    async def export_interactive_data(
        self,
        geometry: Dict,
        date: str,
        index: str,
        scale: int = None,
        max_pixels: int = 10000,
    ) -> Dict[str, Any]:
        """Export interactive pixel data for ECharts visualization"""
        self.initialize()

        # Get the image for the specific date.
        # Interactive/scatter uses B2,B3,B4,B8 at 10m - tile-level cloud filter only (no SCL).
        collection = self.get_sentinel2_collection(
            geometry,
            date,
            (datetime.strptime(date, "%Y-%m-%d") + timedelta(days=1)).strftime(
                "%Y-%m-%d"
            ),
            max_cloud_coverage=settings.MAX_CLOUD_COVERAGE,
            use_aoi_cloud_filter=False,
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

        # Get the bounds of the geometry
        bounds = aoi.bounds().getInfo()["coordinates"][0]
        min_lon = min([coord[0] for coord in bounds])
        max_lon = max([coord[0] for coord in bounds])
        min_lat = min([coord[1] for coord in bounds])
        max_lat = max([coord[1] for coord in bounds])

        # Sample the image to get pixel values with coordinates
        scale = scale or settings.DEFAULT_SCALE

        # Create a grid of points for sampling
        sample_points = clipped.sample(
            region=aoi, scale=scale, numPixels=max_pixels, geometries=True
        )

        # Get the sampled data
        sampled_data = sample_points.getInfo()

        # Process data for ECharts
        pixel_data = []
        values = []

        for feature in sampled_data["features"]:
            if feature["properties"][index] is not None:
                coords = feature["geometry"]["coordinates"]
                value = feature["properties"][index]

                pixel_data.append({"lon": coords[0], "lat": coords[1], "value": value})
                values.append(value)

        # Calculate statistics
        if values:
            stats = {
                "min": min(values),
                "max": max(values),
                "mean": sum(values) / len(values),
                "count": len(values),
            }

            # Calculate percentiles
            sorted_values = sorted(values)
            n = len(sorted_values)
            stats["median"] = sorted_values[n // 2] if n > 0 else 0
            stats["p10"] = sorted_values[int(n * 0.1)] if n > 0 else 0
            stats["p90"] = sorted_values[int(n * 0.9)] if n > 0 else 0
            stats["std"] = (
                sum([(x - stats["mean"]) ** 2 for x in values]) / len(values)
            ) ** 0.5
        else:
            stats = {
                "min": 0,
                "max": 0,
                "mean": 0,
                "median": 0,
                "p10": 0,
                "p90": 0,
                "std": 0,
                "count": 0,
            }

        # Get visualization parameters
        vis_params = self._get_visualization_params(index)

        return {
            "date": date,
            "index": index,
            "bounds": {
                "min_lon": min_lon,
                "max_lon": max_lon,
                "min_lat": min_lat,
                "max_lat": max_lat,
            },
            "pixel_data": pixel_data,
            "statistics": stats,
            "visualization": vis_params,
            "metadata": {
                "scale": scale,
                "total_pixels": len(pixel_data),
                "image_date": date,
            },
        }

    async def export_heatmap_data(
        self, geometry: Dict, date: str, index: str, sample_points: int = 1000
    ) -> Dict[str, Any]:
        """Export real Earth Engine pixel data for heatmap visualization within AOI.

        Fetches the exact requested date using the same SCL-based AOI cloud filter
        as available-dates and timeseries. No fallback — the date picker guarantees
        only available dates are shown.
        """
        self.initialize()

        # Fetch exact date — same filter as available-dates
        collection = self.get_sentinel2_collection(
            geometry,
            date,
            date,
            max_cloud_coverage=settings.MAX_CLOUD_COVERAGE,
            use_aoi_cloud_filter=True,
        )
        collection_size = collection.size().getInfo()
        if collection_size == 0:
            raise ValueError(f"No Sentinel-2 images found for {date}")

        image = ee.Image(collection.sort("CLOUDY_PIXEL_PERCENTAGE").first())

        indices = self.calculate_vegetation_indices(image, [index])
        index_image = indices[index]

        # Clip to AOI
        aoi = ee.Geometry(geometry)
        clipped = index_image.clip(aoi)

        # Get bounds
        bounds = aoi.bounds().getInfo()["coordinates"][0]
        min_lon = min([coord[0] for coord in bounds])
        max_lon = max([coord[0] for coord in bounds])
        min_lat = min([coord[1] for coord in bounds])
        max_lat = max([coord[1] for coord in bounds])

        # Get FULL raster grid approach - like research notebook
        # Use 10m scale for detailed visualization
        sample_scale = 10

        # Calculate grid dimensions based on AOI size
        area_deg_lat = max_lat - min_lat
        area_deg_lon = max_lon - min_lon

        # Estimate number of pixels at 10m resolution
        # 1 degree ≈ 111km, so 10m = 0.00009 degrees approximately
        pixel_size_deg = sample_scale / 111000.0
        estimated_pixels = int(
            (area_deg_lat / pixel_size_deg) * (area_deg_lon / pixel_size_deg)
        )

        # For visualization, we want dense coverage like the reference image
        # Limit to reasonable size but ensure good coverage
        max_pixels = min(
            estimated_pixels, 50000
        )  # Up to 50k pixels for very detailed grid
        max_pixels = max(max_pixels, sample_points)  # But at least what user requested

        logger.info(
            f"Estimated {estimated_pixels} pixels for AOI, using {max_pixels} for sampling"
        )

        # Improved sampling to ensure high-density pixel count like research notebook
        logger.info(f"Attempting high-density sampling with {max_pixels} target pixels")

        try:
            # Strategy 1: Use systematic gridding approach similar to research notebook
            # Request significantly more pixels to ensure we capture target density
            num_sample_pixels = min(max_pixels * 4, 100000)
            effective_scale = sample_scale

            logger.info(
                f"Requesting {num_sample_pixels} pixels at {effective_scale}m scale"
            )

            sampled_pixels = clipped.sample(
                region=aoi,
                scale=effective_scale,
                numPixels=num_sample_pixels,
                seed=42,
                geometries=True,
                tileScale=8,  # Higher tile scale for processing power
            )

            logger.info(
                f"Successfully initialized sampling with {num_sample_pixels} pixel request"
            )
        except Exception as sample_error:
            logger.warning(
                f"High-density sampling failed: {sample_error}, trying alternative approach"
            )
            # Strategy 2: Try grid-based systematic sampling
            try:
                logger.info("Trying alternate grid-based sampling approach...")
                sample_region = aoi.bounds()
                sampled_pixels = clipped.sample(
                    region=sample_region,
                    scale=effective_scale - 2 if effective_scale > 5 else 5,
                    numPixels=max_pixels * 2,
                    seed=42,
                    geometries=True,
                    tileScale=4,
                )
            except Exception as fallback_error:
                logger.warning(
                    f"Grid-based fallback also failed: {fallback_error}, using basic sampling"
                )
                # Strategy 3: Basic fallback
                sampled_pixels = clipped.sample(
                    region=aoi,
                    scale=sample_scale,
                    numPixels=max_pixels,
                    seed=42,
                    geometries=True,
                    tileScale=2,
                )

        # Get the grid data
        try:
            logger.info(
                f"Starting to sample up to {max_pixels} pixels at {sample_scale}m resolution"
            )
            sampled_data = sampled_pixels.getInfo()
            num_features = len(sampled_data.get("features", [])) if sampled_data else 0
            logger.info(
                f"Successfully retrieved {num_features} pixels from Earth Engine (target was {max_pixels})"
            )

            # Log success or warning if pixel count is too low
            if num_features < max_pixels // 2:  # If less than half our target
                logger.warning(
                    f"Retrieved {num_features} pixels - may be less than target due to AOI size or data availability"
                )
            else:
                logger.info(
                    f"Excellent: Retrieved {num_features} of {max_pixels} requested pixels"
                )
        except Exception as e:
            logger.error(f"Error sampling Earth Engine grid data: {e}")
            logger.error(
                f"AOI bounds: lat={min_lat}-{max_lat}, lon={min_lon}-{max_lon}"
            )
            logger.error(f"Requested pixels: {max_pixels}, scale: {sample_scale}m")
            raise ValueError(f"Failed to sample satellite grid data: {str(e)}")

        # Process grid data from Earth Engine sampling
        pixel_data = []
        all_values = []

        if sampled_data and "features" in sampled_data:
            for feature in sampled_data["features"]:
                # Get coordinates from geometry
                geometry = feature.get("geometry")
                props = feature.get("properties", {})

                if (
                    geometry
                    and geometry.get("coordinates")
                    and props.get(index) is not None
                ):
                    coords = geometry["coordinates"]
                    lon, lat = coords[0], coords[1]
                    value = props[index]

                    pixel_data.append({"lon": lon, "lat": lat, "value": value})
                    all_values.append(value)

        # Calculate real statistics from actual satellite data
        if all_values:
            sorted_values = sorted(all_values)
            n = len(sorted_values)

            stats = {
                "min": min(all_values),
                "max": max(all_values),
                "mean": sum(all_values) / len(all_values),
                "median": sorted_values[n // 2] if n > 0 else 0,
                "p10": sorted_values[int(n * 0.1)] if n > 0 else 0,
                "p90": sorted_values[int(n * 0.9)] if n > 0 else 0,
                "std": (
                    sum(
                        [
                            (x - sum(all_values) / len(all_values)) ** 2
                            for x in all_values
                        ]
                    )
                    / len(all_values)
                )
                ** 0.5,
                "count": len(all_values),
            }
        else:
            stats = {
                "min": 0,
                "max": 0,
                "mean": 0,
                "median": 0,
                "p10": 0,
                "p90": 0,
                "std": 0,
                "count": 0,
            }

        vis_params = self._get_visualization_params(index)

        # Get AOI polygon coordinates for boundary visualization
        aoi_coordinates = []
        if geometry.get("type") == "Polygon" and geometry.get("coordinates"):
            aoi_coordinates = geometry["coordinates"][0]

        return {
            "date": date,
            "index": index,
            "bounds": {
                "min_lon": min_lon,
                "max_lon": max_lon,
                "min_lat": min_lat,
                "max_lat": max_lat,
            },
            "pixel_data": pixel_data,
            "aoi_boundary": aoi_coordinates,
            "statistics": stats,
            "visualization": vis_params,
            "metadata": {
                "sample_scale": sample_scale,
                "total_pixels": len(pixel_data),
                "data_source": "Sentinel-2 Earth Engine",
                "sampling_method": "High-density grid sampling",
                "max_requested_pixels": max_pixels,
                "estimated_total_pixels": estimated_pixels,
                "aoi_area_deg2": area_deg_lat * area_deg_lon,
            },
        }

    async def export_index_map(
        self,
        geometry: Dict,
        date: str,
        index: str,
        scale: int = None,
        organization_id: str = None,
        interactive: bool = False,
    ) -> Any:
        """Export index map as static image URL or interactive data"""

        # Return interactive data for ECharts if requested
        if interactive:
            return await self.export_heatmap_data(geometry, date, index)

        # First check if file already exists in bucket if organization_id is provided
        if organization_id:
            existing_url = await self.check_existing_file(
                organization_id, index, date, geometry
            )
            if existing_url:
                logger.info(f"Using existing file from bucket: {existing_url}")
                return {"type": "static", "url": existing_url}

        self.initialize()

        # Get the image for the specific date.
        # Export uses B2,B3,B4,B8 at 10m - tile-level cloud filter only (no SCL).
        collection = self.get_sentinel2_collection(
            geometry,
            date,
            (datetime.strptime(date, "%Y-%m-%d") + timedelta(days=1)).strftime(
                "%Y-%m-%d"
            ),
            max_cloud_coverage=settings.MAX_CLOUD_COVERAGE,
            use_aoi_cloud_filter=False,
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
            url = await self._export_to_supabase_storage(
                clipped, aoi, index, date, organization_id, scale
            )
            return {"type": "static", "url": url}
        else:
            # For web display, create enhanced visualization with overlays
            vis_params = self._get_visualization_params(index)

            # Create enhanced visualization with date, scale bar, and statistics
            enhanced_url = self._create_enhanced_visualization(
                clipped, index, date, aoi, vis_params
            )
            return {"type": "static", "url": enhanced_url}

    async def _export_to_supabase_storage(
        self,
        image: ee.Image,
        geometry: ee.Geometry,
        index: str,
        date: str,
        organization_id: str,
        scale: int = None,
    ) -> str:
        """Export GeoTIFF to Supabase Storage"""
        try:
            # Generate unique filename
            file_id = str(uuid.uuid4())[:8]
            filename = f"{index}_{date}_{file_id}.tif"

            # Get download URL from Earth Engine
            download_url = image.getDownloadUrl(
                {
                    "scale": scale or settings.DEFAULT_SCALE,
                    "crs": "EPSG:4326",
                    "fileFormat": "GeoTIFF",
                    "region": geometry,
                }
            )

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
                date=date,
            )

            if public_url:
                logger.info(f"Uploaded satellite file to Supabase: {filename}")
                return public_url
            else:
                # Fallback to direct download URL
                logger.warning(
                    "Failed to upload to Supabase, returning direct download URL"
                )
                return download_url

        except Exception as e:
            logger.error(f"Failed to export to Supabase Storage: {e}")
            # Fallback to direct download URL
            url = image.getDownloadUrl(
                {
                    "scale": scale or settings.DEFAULT_SCALE,
                    "crs": "EPSG:4326",
                    "fileFormat": "GeoTIFF",
                    "region": geometry,
                }
            )
        return url

    def get_statistics(
        self, geometry: Dict, start_date: str, end_date: str, indices: List[str]
    ) -> Dict:
        """Calculate statistics for multiple indices over a date range"""
        self.initialize()

        # Statistics use B2,B3,B4,B8 at 10m - tile-level cloud filter only (no SCL).
        collection = self.get_sentinel2_collection(
            geometry,
            start_date,
            end_date,
            max_cloud_coverage=settings.MAX_CLOUD_COVERAGE,
            use_aoi_cloud_filter=False,
        )
        aoi = ee.Geometry(geometry)

        # Get the median composite
        composite = collection.median()

        # Calculate all indices
        index_images = self.calculate_vegetation_indices(composite, indices)

        statistics = {}
        for index_name, index_image in index_images.items():
            # Use CRS parameter to handle AOI crossing UTM zone boundaries
            stats = index_image.reduceRegion(
                reducer=ee.Reducer.percentile([2, 25, 50, 75, 98])
                .combine(ee.Reducer.mean(), "", True)
                .combine(ee.Reducer.stdDev(), "", True),
                geometry=aoi,
                scale=settings.DEFAULT_SCALE,
                crs="EPSG:4326",  # Use WGS84 to handle AOI crossing UTM zone boundaries
                maxPixels=settings.MAX_PIXELS,
            )

            statistics[index_name] = stats.getInfo()

        return statistics

    def check_cloud_coverage(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        max_cloud_coverage: float = 10.0,
    ) -> Dict:
        """Check cloud coverage availability for given parameters"""
        self.initialize()

        try:
            aoi = ee.Geometry(geometry)

            # Get all available images (without cloud filter)
            # Earth Engine's filterDate is exclusive on end date, add 1 day to make inclusive
            end_date_inclusive = (
                datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            ).strftime("%Y-%m-%d")

            collection = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(aoi)
                .filterDate(start_date, end_date_inclusive)
            )

            # Check if collection has any images at all
            collection_size = collection.size().getInfo()
            logger.info(
                f"Found {collection_size} images in collection for date range {start_date} to {end_date}"
            )

            if collection_size == 0:
                return {
                    "has_suitable_images": False,
                    "available_images_count": 0,
                    "suitable_images_count": 0,
                    "min_cloud_coverage": None,
                    "max_cloud_coverage": None,
                    "avg_cloud_coverage": None,
                    "recommended_date": None,
                    "metadata": {
                        "max_cloud_threshold": max_cloud_coverage,
                        "date_range": {"start": start_date, "end": end_date},
                        "all_cloud_percentages": [],
                        "error": "No images found in date range",
                    },
                }

            def get_cloud_info(image):
                cloud_percentage = image.get("CLOUDY_PIXEL_PERCENTAGE")
                date = image.date().format("YYYY-MM-dd")
                return ee.Feature(
                    None,
                    {
                        "date": date,
                        "cloud_percentage": cloud_percentage,
                        "suitable": ee.Number(cloud_percentage).lte(
                            ee.Number(max_cloud_coverage)
                        ),
                    },
                )

            # Map over collection to get cloud info
            cloud_info = collection.map(get_cloud_info)

            # Get all cloud percentages - handle empty collection
            try:
                cloud_percentages = cloud_info.aggregate_array(
                    "cloud_percentage"
                ).getInfo()
                suitable_images = cloud_info.filter(ee.Filter.eq("suitable", True))
                # Debug logging for better understanding
                logger.info(
                    f"Cloud percentages retrieved: {len(cloud_percentages) if cloud_percentages else 0}"
                )
                logger.info(f"Cloud threshold used: {max_cloud_coverage}%")
            except Exception as e:
                if "Empty date ranges not supported" in str(e):
                    logger.info("No images found in collection, returning empty result")
                    return {
                        "has_suitable_images": False,
                        "available_images_count": 0,
                        "suitable_images_count": 0,
                        "min_cloud_coverage": None,
                        "max_cloud_coverage": None,
                        "avg_cloud_coverage": None,
                        "recommended_date": None,
                        "metadata": {
                            "max_cloud_threshold": max_cloud_coverage,
                            "date_range": {"start": start_date, "end": end_date},
                            "all_cloud_percentages": [],
                            "error": "No images found in date range",
                        },
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
                best_image = suitable_images.sort("cloud_percentage").first()
                best_date = best_image.get("date").getInfo()
            elif available_count > 0:
                # If no suitable images, use the image with lowest cloud coverage
                best_image = collection.sort("CLOUDY_PIXEL_PERCENTAGE").first()
                best_date = best_image.date().format("YYYY-MM-dd").getInfo()

            logger.info(
                f"Cloud coverage check: {available_count} available, {suitable_count} suitable, best date: {best_date}"
            )

            # Determine if we have usable images: either suitable ones OR a recommended best date
            has_usable_images = suitable_count > 0 or (
                best_date is not None and available_count > 0
            )

            logger.info(
                f"Images usable: {has_usable_images} (suitable: {suitable_count}, recommended: {best_date})"
            )

            return {
                "has_suitable_images": has_usable_images,
                "available_images_count": available_count,
                "suitable_images_count": suitable_count,
                "min_cloud_coverage": min_cloud,
                "max_cloud_coverage": max_cloud,
                "avg_cloud_coverage": avg_cloud,
                "recommended_date": best_date,
                "metadata": {
                    "max_cloud_threshold": max_cloud_coverage,
                    "date_range": {"start": start_date, "end": end_date},
                    "all_cloud_percentages": cloud_percentages,
                },
            }
        except Exception as e:
            logger.error(f"Error in cloud coverage check: {e}")
            return {
                "has_suitable_images": False,
                "available_images_count": 0,
                "suitable_images_count": 0,
                "min_cloud_coverage": None,
                "max_cloud_coverage": None,
                "avg_cloud_coverage": None,
                "recommended_date": None,
                "metadata": {
                    "max_cloud_threshold": max_cloud_coverage,
                    "date_range": {"start": start_date, "end": end_date},
                    "all_cloud_percentages": [],
                    "error": str(e),
                },
            }


# Singleton instance
earth_engine_service = EarthEngineService()
