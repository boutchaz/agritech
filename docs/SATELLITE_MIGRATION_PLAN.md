# Satellite Service Migration Plan: GEE + CDSE/openEO Dual Provider Support

> **Document Version**: 1.0  
> **Created**: January 30, 2026  
> **Status**: Planning  
> **Author**: AI Assistant  

---

## Executive Summary

This document outlines the migration plan to support both Google Earth Engine (GEE) and Copernicus Data Space Ecosystem (CDSE/openEO) as satellite data providers. The goal is to enable **commercial use** of the AgriTech platform while maintaining development flexibility.

### Why This Migration?

| Aspect | GEE (Current) | CDSE (Target) |
|--------|--------------|---------------|
| **Commercial Use** | ❌ Requires $10,000+/year license | ✅ FREE (10,000 credits/month) |
| **Data Source** | Sentinel-2 via GEE API | Sentinel-2 direct from ESA |
| **Indices** | All supported | All supported |
| **Cloud Masking** | QA60 + SCL | SCL (more accurate) |

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Directory Structure](#2-directory-structure)
3. [Abstract Interface Design](#3-abstract-interface-design)
4. [Provider Implementations](#4-provider-implementations)
5. [Configuration](#5-configuration)
6. [Migration Tasks](#6-migration-tasks)
7. [Testing Strategy](#7-testing-strategy)
8. [Cost Analysis](#8-cost-analysis)
9. [Rollback Plan](#9-rollback-plan)

---

## 1. Architecture Overview

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FastAPI Endpoints                            │
│              /api/satellite-indices, /api/heatmap, etc.             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    earth_engine_service (Singleton)                 │
│                    backend-service/app/services/earth_engine.py     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Google Earth Engine API                          │
│                    COPERNICUS/S2_SR_HARMONIZED                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Target Architecture (Dual Provider)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FastAPI Endpoints                            │
│              /api/satellite-indices, /api/heatmap, etc.             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SatelliteServiceFactory                          │
│         get_provider(provider_type) → ISatelliteProvider            │
│                                                                     │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ Provider Selection Logic:                                   │  │
│    │ 1. Explicit parameter override                              │  │
│    │ 2. SATELLITE_PROVIDER env var                               │  │
│    │ 3. SATELLITE_COMMERCIAL_MODE → forces CDSE                  │  │
│    │ 4. Default: GEE (development)                               │  │
│    └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
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
                    │                           │
                    └─────────────┬─────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Common Output Format                           │
│  SatelliteResult, VegetationIndices, HeatmapData, TimeSeries        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

### Proposed File Structure

```
backend-service/
├── app/
│   ├── services/
│   │   ├── satellite/                    # NEW: Provider abstraction layer
│   │   │   ├── __init__.py               # Export public interface
│   │   │   ├── interfaces.py             # Abstract base interface (ISatelliteProvider)
│   │   │   ├── factory.py                # Provider factory with auto-selection
│   │   │   ├── types.py                  # Shared types, models, constants
│   │   │   │
│   │   │   ├── providers/                # Provider implementations
│   │   │   │   ├── __init__.py
│   │   │   │   ├── gee_provider.py       # GEE implementation (wraps existing)
│   │   │   │   ├── cdse_provider.py      # NEW: CDSE/openEO implementation
│   │   │   │   │
│   │   │   │   └── cloud_masking/        # Cloud masking strategies
│   │   │   │       ├── __init__.py
│   │   │   │       ├── gee_cloud_masking.py    # Existing QA60 + SCL logic
│   │   │   │       └── cdse_cloud_masking.py   # NEW: Pure SCL-based masking
│   │   │   │
│   │   │   └── utils/                    # Shared utilities
│   │   │       ├── __init__.py
│   │   │       ├── visualization.py      # Image generation, color scales
│   │   │       ├── statistics.py         # Stats calculations (numpy-based)
│   │   │       └── index_calculator.py   # Vegetation index formulas
│   │   │
│   │   ├── earth_engine.py               # KEEP: Legacy, wrapped by gee_provider
│   │   ├── cloud_masking.py              # KEEP: Legacy, wrapped by gee_provider
│   │   └── supabase_service.py           # Unchanged
│   │
│   └── core/
│       └── config.py                     # ADD: CDSE configuration options
│
├── tests/
│   └── services/
│       └── satellite/                    # NEW: Provider tests
│           ├── test_gee_provider.py
│           ├── test_cdse_provider.py
│           └── test_provider_parity.py   # Ensure both give similar results
│
├── requirements.txt                      # ADD: openeo, pystac, rioxarray
└── .env.example                          # ADD: CDSE credentials
```

---

## 3. Abstract Interface Design

### 3.1 Core Interface (`interfaces.py`)

The `ISatelliteProvider` interface defines the contract that both providers must implement:

```python
class ISatelliteProvider(ABC):
    """Abstract interface for satellite data providers"""
    
    # Properties
    provider_name: str              # "Google Earth Engine" or "Copernicus Data Space"
    supports_commercial_use: bool   # False for GEE, True for CDSE
    
    # Methods
    async def initialize() -> None
    async def check_cloud_coverage(geometry, start_date, end_date, max_cloud) -> CloudCoverageInfo
    async def calculate_vegetation_indices(geometry, date, indices) -> Dict[str, Any]
    async def get_time_series(geometry, start_date, end_date, index, interval) -> List[TimeSeriesPoint]
    async def export_heatmap_data(geometry, date, index, sample_points) -> HeatmapResult
    async def export_index_map(geometry, date, index, scale, org_id, interactive) -> IndexMapResult
    async def get_statistics(geometry, start_date, end_date, indices) -> Dict[str, Statistics]
```

### 3.2 Supported Vegetation Indices

Both providers must support these indices (from current `earth_engine.py`):

| Index | Formula | Bands Required |
|-------|---------|----------------|
| **NDVI** | (NIR - Red) / (NIR + Red) | B04, B08 |
| **NDRE** | (NIR - RedEdge) / (NIR + RedEdge) | B05, B08 |
| **NDMI** | (NIR - SWIR1) / (NIR + SWIR1) | B08, B11 |
| **MNDWI** | (Green - SWIR1) / (Green + SWIR1) | B03, B11 |
| **GCI** | (NIR / Green) - 1 | B03, B08 |
| **SAVI** | ((NIR - Red) × 1.5) / (NIR + Red + 0.5) | B04, B08 |
| **OSAVI** | (NIR - Red) / (NIR + Red + 0.16) | B04, B08 |
| **MSAVI2** | (2×NIR + 1 - sqrt((2×NIR+1)² - 8×(NIR-Red))) / 2 | B04, B08 |
| **PRI** | (RedEdge1 - RedEdge2) / (RedEdge1 + RedEdge2) | B05, B06 |
| **MSI** | SWIR1 / NIR | B08, B11 |
| **MCARI** | (RedEdge - Red - 0.2×(RedEdge - Green)) × (RedEdge/Green) | B03, B04, B05 |
| **TCARI** | 3 × (RedEdge - Red - 0.2×(RedEdge - Green) × (RedEdge/Red)) | B03, B04, B05 |

### 3.3 Data Models (`types.py`)

```python
# Sentinel-2 Band Mapping (same for both providers)
SENTINEL2_BANDS = {
    "blue": "B02",
    "green": "B03",
    "red": "B04",
    "red_edge": "B05",
    "red_edge_2": "B06",
    "red_edge_3": "B07",
    "nir": "B08",
    "nir_narrow": "B8A",
    "swir1": "B11",
    "swir2": "B12",
    "scl": "SCL",
}

# SCL (Scene Classification Layer) Cloud Values
CLOUD_SCL_VALUES = [0, 1, 3, 8, 9, 10]  # no_data, saturated, shadow, clouds, cirrus

# Visualization Parameters (shared between providers)
VISUALIZATION_PARAMS = {
    "NDVI": {"min": 0.1, "max": 0.5, "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"]},
    "NDRE": {"min": -0.2, "max": 0.4, "palette": ["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"]},
    # ... (all current visualization params)
}
```

---

## 4. Provider Implementations

### 4.1 GEE Provider (`gee_provider.py`)

**Purpose**: Wraps existing `earth_engine.py` to implement the new interface.

**Implementation Strategy**:
- Import existing `earth_engine_service` singleton
- Delegate all method calls to existing implementation
- Convert outputs to common data models
- No changes to existing GEE logic

**Key Code Structure**:
```python
class GEEProvider(ISatelliteProvider):
    def __init__(self):
        self._ee_service = earth_engine_service  # Use existing singleton
    
    @property
    def supports_commercial_use(self) -> bool:
        return False  # GEE requires paid license for commercial
    
    async def export_heatmap_data(...) -> HeatmapResult:
        # Call existing implementation
        result = await self._ee_service.export_heatmap_data(...)
        # Convert to common format
        return HeatmapResult(**result)
```

### 4.2 CDSE Provider (`cdse_provider.py`)

**Purpose**: New implementation using openEO for CDSE access.

**Implementation Strategy**:
- Use `openeo` Python package for CDSE connection
- Authenticate via OIDC (device flow or client credentials)
- Implement all index calculations using openEO datacube operations
- Use SCL band for cloud masking (more accurate than QA60)
- Download results as GeoTIFF, process with rasterio/numpy

**Key Dependencies**:
```
openeo>=0.28.0
pystac-client>=0.7.0
rioxarray>=0.15.0
rasterio>=1.3.0
```

**Authentication Options**:
1. **Development**: Interactive device flow (`authenticate_oidc()`)
2. **Production**: Client credentials (`authenticate_oidc(client_id, client_secret)`)

**Data Flow**:
```
1. Connect to openeo.dataspace.copernicus.eu
2. Load SENTINEL2_L2A collection with spatial/temporal filters
3. Apply SCL-based cloud mask
4. Calculate vegetation index using band math
5. Execute batch job (async processing)
6. Download result as GeoTIFF
7. Process with rasterio to extract pixel data
8. Return in common format
```

### 4.3 Cloud Masking Comparison

| Aspect | GEE (Current) | CDSE (New) |
|--------|--------------|------------|
| **Primary Method** | QA60 bitwise flags | SCL band values |
| **Secondary Method** | SCL if available | N/A (SCL is primary) |
| **Cloud Values** | Bits 10, 11 | SCL 8, 9, 10 |
| **Shadow Detection** | SCL class 3 | SCL class 3 |
| **Accuracy** | Good | Better (native L2A) |

**SCL-based Cloud Mask (CDSE)**:
```python
# Mask pixels where SCL indicates clouds or shadows
scl = cube.band("SCL")
cloud_mask = (scl != 0) & (scl != 1) & (scl != 3) & (scl != 8) & (scl != 9) & (scl != 10)
masked_cube = cube.mask(cloud_mask)
```

---

## 5. Configuration

### 5.1 Environment Variables

Add to `.env.example`:

```bash
# ===========================================
# SATELLITE PROVIDER CONFIGURATION
# ===========================================

# Provider selection: "gee", "cdse", or "auto"
# - "gee": Always use Google Earth Engine
# - "cdse": Always use Copernicus Data Space
# - "auto": Use CDSE for commercial mode, GEE for development
SATELLITE_PROVIDER=auto

# Commercial mode flag
# When true, forces CDSE provider (GEE not allowed for commercial)
SATELLITE_COMMERCIAL_MODE=false

# ----- CDSE (Copernicus Data Space) Credentials -----
# Register at: https://dataspace.copernicus.eu
# Get credentials: https://identity.dataspace.copernicus.eu
CDSE_CLIENT_ID=your-cdse-client-id
CDSE_CLIENT_SECRET=your-cdse-client-secret

# ----- GEE (Google Earth Engine) Credentials -----
# For development/non-commercial use only
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY='{"type": "service_account", ...}'
GEE_PROJECT_ID=your-gee-project-id
```

### 5.2 Configuration in `config.py`

Add to `Settings` class:

```python
# Satellite Provider Configuration
SATELLITE_PROVIDER: str = os.getenv("SATELLITE_PROVIDER", "auto")
SATELLITE_COMMERCIAL_MODE: bool = os.getenv("SATELLITE_COMMERCIAL_MODE", "false").lower() == "true"

# CDSE Configuration
CDSE_CLIENT_ID: str = os.getenv("CDSE_CLIENT_ID", "")
CDSE_CLIENT_SECRET: str = os.getenv("CDSE_CLIENT_SECRET", "")
```

### 5.3 Provider Factory Logic

```python
def get_satellite_provider(provider_type=None) -> ISatelliteProvider:
    """
    Provider selection priority:
    1. Explicit provider_type parameter
    2. SATELLITE_PROVIDER env var ("gee" or "cdse")
    3. If SATELLITE_COMMERCIAL_MODE=true → force CDSE
    4. Default: GEE (for development)
    """
```

---

## 6. Migration Tasks

### Phase 1: Setup (Week 1) - 12 hours

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|--------------|
| 1.1 | Create `satellite/` directory structure | High | 2h | None |
| 1.2 | Implement `interfaces.py` with all types | High | 4h | 1.1 |
| 1.3 | Implement `types.py` with shared constants | High | 2h | 1.1 |
| 1.4 | Create `factory.py` with provider selection | High | 2h | 1.2 |
| 1.5 | Register at dataspace.copernicus.eu | High | 1h | None |
| 1.6 | Update `requirements.txt` with new deps | High | 1h | None |

**Deliverables**:
- Complete directory structure
- Working interface definitions
- CDSE account with credentials

### Phase 2: GEE Provider Wrapper (Week 1) - 14 hours

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|--------------|
| 2.1 | Implement `gee_provider.py` wrapper | High | 6h | 1.2 |
| 2.2 | Move cloud masking to `cloud_masking/` | Medium | 2h | 2.1 |
| 2.3 | Verify all existing tests pass | High | 4h | 2.1, 2.2 |
| 2.4 | Update API endpoints to use factory | High | 2h | 2.1 |

**Deliverables**:
- GEE provider passes all existing tests
- API endpoints work through factory
- Zero regression in functionality

### Phase 3: CDSE Provider Implementation (Week 2) - 30 hours

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|--------------|
| 3.1 | Implement `cdse_provider.py` skeleton | High | 4h | 1.2 |
| 3.2 | Implement `initialize()` with OIDC auth | High | 4h | 3.1 |
| 3.3 | Implement `check_cloud_coverage()` | Medium | 4h | 3.2 |
| 3.4 | Implement `calculate_vegetation_indices()` | High | 6h | 3.2 |
| 3.5 | Implement `export_heatmap_data()` | High | 6h | 3.4 |
| 3.6 | Implement `get_time_series()` | Medium | 4h | 3.4 |
| 3.7 | Implement `get_statistics()` | Medium | 2h | 3.5 |

**Deliverables**:
- Fully functional CDSE provider
- All vegetation indices calculated correctly
- Heatmap export working

### Phase 4: Image Generation & Visualization (Week 2) - 16 hours

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|--------------|
| 4.1 | Create `visualization.py` utilities | High | 4h | 3.5 |
| 4.2 | Implement PNG generation from pixel data | High | 4h | 4.1 |
| 4.3 | Port enhanced overlays (date, scale bar, stats) | Medium | 4h | 4.2 |
| 4.4 | Test image output parity with GEE | High | 4h | 4.3 |

**Deliverables**:
- CDSE produces images matching GEE quality
- All visualization features ported

### Phase 5: Integration & Testing (Week 3) - 20 hours

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|--------------|
| 5.1 | Update all API endpoints for dual provider | High | 4h | 4.4 |
| 5.2 | Add provider parameter to API routes | High | 2h | 5.1 |
| 5.3 | Write unit tests for both providers | High | 6h | 5.1 |
| 5.4 | Write provider parity tests | High | 4h | 5.3 |
| 5.5 | Performance comparison benchmarks | Medium | 2h | 5.3 |
| 5.6 | Update API documentation | Medium | 2h | 5.2 |

**Deliverables**:
- Complete test coverage
- Both providers produce similar results
- Performance metrics documented

### Phase 6: Production Deployment (Week 3) - 8 hours

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|--------------|
| 6.1 | Configure CDSE credentials in production | High | 2h | 5.4 |
| 6.2 | Set `SATELLITE_COMMERCIAL_MODE=true` | High | 1h | 6.1 |
| 6.3 | Deploy to staging and test | High | 2h | 6.2 |
| 6.4 | Set up CDSE credit monitoring | Medium | 1h | 6.3 |
| 6.5 | Implement fallback logic (CDSE → GEE) | Medium | 2h | 6.3 |

**Deliverables**:
- Production running on CDSE
- Monitoring in place
- Fallback mechanism working

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Test files to create**:
- `tests/services/satellite/test_gee_provider.py`
- `tests/services/satellite/test_cdse_provider.py`
- `tests/services/satellite/test_factory.py`
- `tests/services/satellite/test_provider_parity.py`

**Test Cases**:

| Test | Description | Priority |
|------|-------------|----------|
| `test_gee_ndvi_calculation` | NDVI returns valid values (-1 to 1) | High |
| `test_cdse_ndvi_calculation` | NDVI returns valid values (-1 to 1) | High |
| `test_all_indices_gee` | All 12 indices calculate without error | High |
| `test_all_indices_cdse` | All 12 indices calculate without error | High |
| `test_heatmap_pixel_count` | Heatmap returns expected pixel count | High |
| `test_time_series_dates` | Time series has correct date range | Medium |
| `test_cloud_coverage_check` | Cloud check returns valid metadata | Medium |
| `test_factory_auto_selection` | Factory selects correct provider | High |
| `test_commercial_mode_forces_cdse` | Commercial mode never uses GEE | Critical |

### 7.2 Provider Parity Tests

Ensure both providers return similar results for the same inputs:

```python
def test_ndvi_parity():
    """Both providers should return NDVI within ±0.1 of each other"""
    gee_result = gee_provider.export_heatmap_data(TEST_GEOMETRY, date, "NDVI")
    cdse_result = cdse_provider.export_heatmap_data(TEST_GEOMETRY, date, "NDVI")
    
    assert abs(gee_result.statistics.mean - cdse_result.statistics.mean) < 0.1
    assert abs(gee_result.statistics.std - cdse_result.statistics.std) < 0.05
```

### 7.3 Integration Tests

- Test full API flow with both providers
- Test provider switching via environment variable
- Test fallback behavior when provider fails

---

## 8. Cost Analysis

### 8.1 Current Costs (Non-Commercial with GEE)

| Service | Monthly Cost | Annual Cost |
|---------|-------------|-------------|
| GEE | FREE | FREE |
| **Total Satellite** | **0 DH** | **0 DH** |

### 8.2 Commercial Costs - Option A: GEE Commercial

| Service | Monthly Cost | Annual Cost |
|---------|-------------|-------------|
| GEE Commercial License | ~8,000 DH | ~96,000 DH |
| **Total Satellite** | **~8,000 DH** | **~96,000 DH** |

### 8.3 Commercial Costs - Option B: CDSE (Recommended)

| Service | Monthly Cost | Annual Cost |
|---------|-------------|-------------|
| CDSE Free Tier | 0 DH | 0 DH |
| Compute (your server) | ~20 DH | ~240 DH |
| **Total Satellite** | **~20 DH** | **~240 DH** |

### 8.4 CDSE Credit Usage Estimation

| Operation | Credits | Monthly Usage (10 clients × 10 parcels × 4 weeks) |
|-----------|---------|---------------------------------------------------|
| Load collection | ~5 | 2,000 |
| Calculate NDVI | ~20 | 8,000 |
| **Total** | | **~10,000 credits** (at free tier limit) |

**Recommendation**: For 10+ active clients, consider CDSE paid tier (~€25-100/month) for buffer.

---

## 9. Rollback Plan

### 9.1 Rollback Triggers

- CDSE service unavailable for >1 hour
- CDSE results significantly different from expected
- Credit limit reached mid-month

### 9.2 Rollback Procedure

1. **Immediate**: Set `SATELLITE_PROVIDER=gee` in environment
2. **Restart**: Restart backend-service container
3. **Verify**: Check satellite endpoints return data
4. **Notify**: Log incident for investigation

### 9.3 Keeping GEE Ready

- Maintain GEE credentials in production (but dormant)
- Run weekly health check against GEE
- Keep `gee_provider.py` up to date with interface changes

---

## Appendix A: CDSE Registration Steps

1. Go to https://dataspace.copernicus.eu
2. Click "Register" and create account
3. Verify email
4. Go to https://identity.dataspace.copernicus.eu
5. Create OAuth client for openEO access
6. Note down `client_id` and `client_secret`
7. Test with interactive Python session:
   ```python
   import openeo
   conn = openeo.connect("https://openeo.dataspace.copernicus.eu")
   conn.authenticate_oidc()  # Opens browser for login
   print(conn.describe_account())  # Should show credits
   ```

---

## Appendix B: Dependencies to Add

Add to `backend-service/requirements.txt`:

```
# Satellite Provider - CDSE/openEO
openeo>=0.28.0
pystac-client>=0.7.0
rioxarray>=0.15.0
rasterio>=1.3.0
xarray>=2024.1.0
```

---

## Appendix C: API Endpoint Changes

### Current Endpoint (unchanged externally)

```
GET /api/satellite-indices/{parcel_id}
```

### Internal Change

```python
# Before
result = earth_engine_service.export_heatmap_data(...)

# After
provider = get_satellite_provider()  # Auto-selects based on config
result = await provider.export_heatmap_data(...)
```

### New Optional Parameter

```
GET /api/satellite-indices/{parcel_id}?provider=cdse
```

Allows forcing a specific provider for testing.

---

## Summary Checklist

```
□ Phase 1: Setup
  □ Create satellite/ directory structure
  □ Implement interfaces.py
  □ Implement types.py
  □ Create factory.py
  □ Register at dataspace.copernicus.eu
  □ Add dependencies to requirements.txt

□ Phase 2: GEE Provider
  □ Implement gee_provider.py wrapper
  □ Verify existing tests pass
  □ Update API endpoints

□ Phase 3: CDSE Provider
  □ Implement cdse_provider.py
  □ Implement all interface methods
  □ Implement SCL cloud masking

□ Phase 4: Image Generation
  □ Create shared visualization utilities
  □ Test image output matches GEE quality

□ Phase 5: Testing
  □ Unit tests for both providers
  □ Provider parity tests
  □ Performance benchmarks

□ Phase 6: Production
  □ Configure CDSE credentials
  □ Enable commercial mode
  □ Set up monitoring
  □ Implement fallback
```

---

**Document End**
