---
sidebar_position: 2
---

# Satellite Analysis Service

The AgroGina Platform's satellite service provides multi-provider access to Sentinel-2 data through a unified interface, supporting both Google Earth Engine (GEE) and Copernicus Data Space Ecosystem (CDSE/openEO).

## Overview

### Why Multi-Provider?

| Aspect | GEE | CDSE (openEO) |
|--------|-----|---------------|
| **Commercial Use** | ❌ Requires paid license (~$8,000/year) | ✅ FREE (10,000 credits/month) |
| **Development** | ✅ Free for research/dev | ✅ Free tier available |
| **Data Source** | Sentinel-2 via GEE API | Sentinel-2 direct from ESA |
| **Cloud Masking** | QA60 + SCL bands | SCL band (more accurate) |
| **Authentication** | Service account key | OIDC (device/client credentials) |

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FastAPI Endpoints                               │
│              /api/satellite-indices, /api/heatmap, etc.             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   SatelliteServiceFactory                           │
│         get_provider(provider_type) → ISatelliteProvider            │
│                                                                     │
│    Provider Selection Logic:                                       │
│    1. Explicit parameter override                                  │
│    2. SATELLITE_PROVIDER env var                                   │
│    3. SATELLITE_COMMERCIAL_MODE → forces CDSE                      │
│    4. Default: GEE (development)                                   │
└─────────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
┌──────────────────────────────┐  ┌──────────────────────────────────┐
│   GEEProvider                │  │   CDSEProvider                   │
│   (Development/Fallback)     │  │   (Production/Commercial)        │
│                              │  │                                  │
│ • Wraps earth_engine.py      │  │ • Uses openEO Python client      │
│ • Wraps cloud_masking.py     │  │ • Direct Sentinel-2 access       │
│ • Non-commercial only        │  │ • Commercial use allowed         │
│ • Free for research/dev      │  │ • 10,000 credits/month free      │
└──────────────────────────────┘  └──────────────────────────────────┘
```

## Provider Interface

All satellite providers implement the `ISatelliteProvider` interface:

```python
class ISatelliteProvider(ABC):
    @abstractmethod
    def initialize(self) -> None:
        """Initialize and authenticate with the service"""

    @abstractmethod
    def check_cloud_coverage(geometry, start_date, end_date, max_cloud_coverage) -> CloudCoverageInfo:
        """Check cloud coverage for available images"""

    @abstractmethod
    def calculate_vegetation_indices(image, indices) -> Dict[str, Any]:
        """Calculate vegetation indices for an image"""

    @abstractmethod
    def get_time_series(geometry, start_date, end_date, index, interval) -> TimeSeries:
        """Get time series data for a vegetation index"""

    @abstractmethod
    async def export_heatmap_data(geometry, date, index, grid_size) -> HeatmapData:
        """Export heatmap data for visualization"""

    @abstractmethod
    async def export_interactive_data(geometry, date, index, scale, max_pixels) -> HeatmapData:
        """Export interactive pixel data for scatter plots"""

    @abstractmethod
    async def export_index_map(geometry, date, index, scale, org_id, interactive) -> Union[ExportResult, HeatmapData]:
        """Export vegetation index map as GeoTIFF or interactive data"""

    @abstractmethod
    def get_statistics(geometry, start_date, end_date, indices) -> Dict[str, StatisticsResult]:
        """Calculate statistics for multiple indices"""

    @abstractmethod
    def get_available_dates(geometry, start_date, end_date, max_cloud_coverage) -> Dict[str, Any]:
        """Get dates with available satellite imagery"""
```

## GEE Provider

**File**: `backend-service/app/services/satellite/providers/gee_provider.py`

The GEE provider wraps the existing EarthEngineService for development and fallback scenarios.

### Key Characteristics

- **Commercial Use**: Not allowed (requires paid license)
- **Cost**: Free for research and development
- **Authentication**: Service account key
- **Data Source**: Sentinel-2 SR Harmonized (COPERNICUS/S2_SR_HARMONIZED)
- **Cloud Masking**: QA60 bitwise flags + SCL band fallback

### Configuration

```bash
# backend-service/.env

# Google Earth Engine Credentials
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY='{"type": "service_account", ...}'
GEE_PROJECT_ID=your-gee-project-id
```

### Usage Example

```python
from app.services.satellite.factory import get_satellite_provider

# Get GEE provider explicitly
provider = get_satellite_provider("gee")

# Check cloud coverage
cloud_info = provider.check_cloud_coverage(
    geometry={"type": "Polygon", "coordinates": [[...]]},
    start_date="2024-01-01",
    end_date="2024-01-31",
    max_cloud_coverage=10.0
)

# Export heatmap
heatmap = await provider.export_heatmap_data(
    geometry=geometry,
    date="2024-01-15",
    index="NDVI",
    grid_size=1000
)
```

## CDSE Provider

**File**: `backend-service/app/services/satellite/providers/cdse_provider.py`

The CDSE provider uses openEO to access Copernicus Data Space Ecosystem for commercial use.

### Key Characteristics

- **Commercial Use**: Allowed (free tier up to 10,000 credits/month)
- **Cost**: Free tier + optional paid tiers
- **Authentication**: OIDC (device flow for dev, client credentials for prod)
- **Data Source**: Sentinel-2 L2A directly from ESA
- **Cloud Masking**: SCL (Scene Classification Layer) only - more accurate

### Configuration

```bash
# backend-service/.env

# Copernicus Data Space Ecosystem Credentials
# Register at: https://dataspace.copernicus.eu
CDSE_OPENEO_URL=https://openeo.dataspace.copernicus.eu
CDSE_CLIENT_ID=your-cdse-client-id
CDSE_CLIENT_SECRET=your-cdse-client-secret
```

### Authentication Modes

**Development (Device Flow)**:
```python
# Opens browser for interactive authentication
connection.authenticate_oidc(device_code=True)
```

**Production (Client Credentials)**:
```python
# Uses stored credentials for automated authentication
connection.authenticate_oidc(
    client_id=CDSE_CLIENT_ID,
    client_secret=CDSE_CLIENT_SECRET
)
```

### Usage Example

```python
from app.services.satellite.factory import get_satellite_provider

# Get CDSE provider (or auto-select)
provider = get_satellite_provider("cdse")

# Export heatmap using CDSE
heatmap = await provider.export_heatmap_data(
    geometry=geometry,
    date="2024-01-15",
    index="NDVI",
    grid_size=1000
)
```

## Provider Factory

**File**: `backend-service/app/services/satellite/factory.py`

The factory handles provider selection and caching.

### Provider Selection Logic

```python
def get_satellite_provider(provider_type=None) -> ISatelliteProvider:
    """
    Selection priority:
    1. Explicit provider_type parameter
    2. SATELLITE_PROVIDER env var ("gee", "cdse", or "auto")
    3. SATELLITE_COMMERCIAL_MODE=true → CDSE
    4. Default: GEE
    """
```

### Environment Variables

```bash
# Provider selection: "gee", "cdse", or "auto"
SATELLITE_PROVIDER=auto

# Commercial mode flag
# When true, forces CDSE provider (GEE not allowed for commercial)
SATELLITE_COMMERCIAL_MODE=false
```

### Provider Info

```python
from app.services.satellite.factory import get_provider_info

info = get_provider_info()
# Returns:
# {
#     "current_provider": "gee",
#     "commercial_mode": false,
#     "env_provider": "auto",
#     "providers": {
#         "gee": {"configured": true, "available": true},
#         "cdse": {"configured": false, "available": false}
#     }
# }
```

## Supported Vegetation Indices

Both providers support the following indices:

| Index | Formula | Bands | Use Case |
|-------|---------|-------|----------|
| **NDVI** | (NIR - Red) / (NIR + Red) | B04, B08 | General vegetation health |
| **NDRE** | (NIR - RedEdge) / (NIR + RedEdge) | B05, B08 | Nitrogen status, crop maturity |
| **NDMI** | (NIR - SWIR1) / (NIR + SWIR1) | B08, B11 | Plant water stress |
| **MNDWI** | (Green - SWIR1) / (Green + SWIR1) | B03, B11 | Water bodies |
| **GCI** | (NIR / Green) - 1 | B03, B08 | Chlorophyll content |
| **SAVI** | ((NIR - Red) × 1.5) / (NIR + Red + 0.5) | B04, B08 | Soil-adjusted vegetation |
| **OSAVI** | (NIR - Red) / (NIR + Red + 0.16) | B04, B08 | Optimized SAVI |
| **MSAVI2** | Complex formula | B04, B08 | Improved SAVI for bare soil |
| **PRI** | (RedEdge1 - RedEdge2) / (RedEdge1 + RedEdge2) | B05, B06 | Light use efficiency |
| **MSI** | SWIR1 / NIR | B08, B11 | Leaf water content |
| **MCARI** | Complex formula | B03, B04, B05 | Chlorophyll absorption |
| **TCARI** | Complex formula | B04, B05 | Chlorophyll absorption |

## Sentinel-2 Bands

```python
SENTINEL2_BANDS = {
    "blue": "B02",       # 490 nm
    "green": "B03",      # 560 nm
    "red": "B04",        # 665 nm
    "red_edge": "B05",   # 705 nm
    "red_edge_2": "B06", # 740 nm
    "red_edge_3": "B07", # 783 nm
    "nir": "B08",        # 842 nm
    "nir_narrow": "B8A", # 865 nm
    "swir1": "B11",      # 1610 nm
    "swir2": "B12",      # 2190 nm
    "scl": "SCL",        # Scene Classification Layer
}
```

## SCL (Scene Classification Layer) Values

The SCL band provides pixel-level classification:

| Value | Class | Cloud Mask |
|-------|-------|------------|
| 0 | No Data | ❌ Mask |
| 1 | Saturated | ❌ Mask |
| 2 | Dark area | ✅ Keep |
| 3 | Cloud shadow | ❌ Mask |
| 4 | Vegetation | ✅ Keep |
| 5 | Not vegetated | ✅ Keep |
| 6 | Water | ✅ Keep |
| 7 | Unclassified | ✅ Keep |
| 8 | Cloud (medium prob.) | ❌ Mask |
| 9 | Cloud (high prob.) | ❌ Mask |
| 10 | Cirrus | ❌ Mask |
| 11 | Snow/ice | ✅ Keep |

**CDSE Cloud Mask**:
```python
# SCL-based cloud mask (CDSE primary method)
clear_mask = (scl != 0) & (scl != 1) & (scl != 3) & (scl != 8) & (scl != 9) & (scl != 10)
masked_cube = cube.mask(clear_mask)
```

**GEE Cloud Mask**:
```python
# QA60 bitwise flags (GEE primary method)
qa60 = image.select('QA60')
cloud_bit = 1 << 10
cirrus_bit = 1 << 11
cloud_mask = qa60.bitwiseAnd(cloud_bit).gt(0).Or(qa60.bitwiseAnd(cirrus_bit).gt(0))
```

## API Endpoints

The satellite service is exposed through FastAPI endpoints:

### Check Cloud Coverage
```http
GET /api/satellite/cloud-coverage
```

### Get Available Dates
```http
GET /api/satellite/dates
```

### Export Heatmap Data
```http
POST /api/satellite/heatmap
```

### Get Time Series
```http
GET /api/satellite/time-series
```

### Export Index Map
```http
POST /api/satellite/export
```

### Get Statistics
```http
GET /api/satellite/statistics
```

## Frontend Integration

The satellite service integrates with the frontend through:

**Component**: `project/src/components/SatelliteIndices.tsx`
**Hook**: `project/src/hooks/useSatelliteIndices.ts`
**API**: `project/src/lib/satellite-api.ts`

### Usage in Components

```typescript
import { useSatelliteHeatmap } from '@/hooks/useSatelliteIndices';

function ParcelSatelliteView({ parcelId, date }) {
  const { data: heatmap, isLoading } = useSatelliteHeatmap({
    parcelId,
    date,
    index: 'NDVI',
  });

  return <HeatmapViewer data={heatmap} />;
}
```

## Commercial Use Setup

### 1. Register at CDSE

1. Go to https://dataspace.copernicus.eu
2. Click "Register" and create account
3. Verify email
4. Go to https://identity.dataspace.copernicus.eu
5. Create OAuth client for openEO access
6. Note down `client_id` and `client_secret`

### 2. Configure Environment

```bash
# backend-service/.env
SATELLITE_PROVIDER=cdse
SATELLITE_COMMERCIAL_MODE=true
CDSE_CLIENT_ID=your-client-id
CDSE_CLIENT_SECRET=your-client-secret
```

### 3. Verify Connection

```python
import openeo

conn = openeo.connect("https://openeo.dataspace.copernicus.eu")
conn.authenticate_oidc(client_id=CDSE_CLIENT_ID, client_secret=CDSE_CLIENT_SECRET)
print(conn.describe_account())  # Should show credits
```

## Cost Analysis

### GEE Commercial License

| Metric | Cost |
|--------|------|
| Annual License | ~$8,000 (~96,000 DH) |
| Suitable For | Large-scale commercial operations |

### CDSE (Recommended)

| Metric | Cost |
|--------|------|
| Free Tier | 10,000 credits/month |
| Compute | Your server (~20 DH/month) |
| Paid Tier | €25-100/month for more credits |

### Credit Usage Estimation

| Operation | Credits per Request | Monthly (10 clients × 10 parcels × 4) |
|-----------|-------------------|----------------------------------------|
| Load collection | ~5 | 2,000 |
| Calculate NDVI | ~20 | 8,000 |
| **Total** | | **~10,000 credits** |

## Fallback Strategy

The system automatically falls back from CDSE to GEE if:

1. CDSE initialization fails
2. CDSE credentials are invalid
3. CDSE service is unavailable

**Manual Fallback**:
```bash
# Force GEE provider
export SATELLITE_PROVIDER=gee
# Restart backend-service
```

## Troubleshooting

### GEE Authentication Failed

```bash
# Check service account key format
echo $GEE_PRIVATE_KEY | jq .

# Verify project ID
gcloud config set project $GEE_PROJECT_ID
```

### CDSE Connection Failed

```bash
# Test with interactive Python
python -c "
import openeo
conn = openeo.connect('https://openeo.dataspace.copernicus.eu')
conn.authenticate_oidc(device_code=True)
print(conn.describe_account())
"
```

### Credit Limit Reached

```bash
# Check remaining credits
curl -H "Authorization: Bearer $CDSE_TOKEN" \
  https://openeo.dataspace.copernicus.eu/me
```

## Migration

See [Satellite Migration Plan](https://github.com/agritech/platform/blob/main/docs/SATELLITE_MIGRATION_PLAN.md) for complete migration details.

## References

- [GEE Provider Code](https://github.com/agritech/platform/blob/main/backend-service/app/services/satellite/providers/gee_provider.py)
- [CDSE Provider Code](https://github.com/agritech/platform/blob/main/backend-service/app/services/satellite/providers/cdse_provider.py)
- [Provider Factory](https://github.com/agritech/platform/blob/main/backend-service/app/services/satellite/factory.py)
- [Interface Definition](https://github.com/agritech/platform/blob/main/backend-service/app/services/satellite/interfaces.py)
- [Copernicus Data Space](https://dataspace.copernicus.eu)
- [openEO Python](https://openeo.org/)
