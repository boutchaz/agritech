# AOI-Based Cloud Masking Fix

## Problem Statement

**Unavailable readings** on specific dates (e.g., 02/10/2025 and 12/10/2025) even though clouds were **NOT present within the farm's AOI** (Area of Interest).

### Example Issue
- Reading shows **30% cloud coverage** for the tile
- However, the **drawn farm area itself has NO clouds**
- The 30% clouds are elsewhere on the Sentinel-2 tile, not over the farm
- Result: Reading marked as unavailable despite clear skies over the actual farm

## Root Cause

The previous implementation used **tile-wide cloud coverage** (`CLOUDY_PIXEL_PERCENTAGE`) from Sentinel-2 metadata. This metadata represents cloud coverage across the entire ~100km × 100km tile, not specifically within the farm's AOI.

## Solution

Implemented **AOI-specific cloud coverage calculation** that:

1. **Calculates cloud coverage ONLY within the farm's AOI boundaries**
2. **Adds a configurable buffer** (default 300m) around the AOI
3. **Ignores clouds outside this buffered AOI region**
4. **Uses pixel-level cloud detection** (QA60 and SCL bands) within the AOI

## Changes Made

### Backend Changes

#### 1. New Cloud Masking Service (`app/services/cloud_masking.py`)
```python
class CloudMaskingService:
    @staticmethod
    def calculate_cloud_coverage_in_aoi(
        image: ee.Image,
        aoi: ee.Geometry,
        buffer_meters: Optional[float] = None
    ) -> float:
        """
        Calculate cloud coverage percentage specifically within AOI boundaries.
        Uses QA60 and SCL bands for accurate pixel-level cloud detection.
        """
```

**Key features:**
- Pixel-level cloud detection using QA60 (10m resolution)
- Enhanced detection with Scene Classification Layer (SCL)
- Counts cloudy pixels ONLY within AOI + buffer
- Returns actual cloud percentage over the farm area

#### 2. Updated Earth Engine Service (`app/services/earth_engine.py`)
```python
def get_sentinel2_collection(
    self,
    geometry: Dict,
    start_date: str,
    end_date: str,
    max_cloud_coverage: float = None,
    use_aoi_cloud_filter: bool = True,    # NEW: Default True
    cloud_buffer_meters: float = 300      # NEW: Default 300m
) -> ee.ImageCollection:
```

**Logic flow:**
```python
# First: Loose tile-based pre-filtering (2x max_cloud if AOI filtering enabled)
collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start_date, end_date)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud * 2))

# Second: Precise AOI-based filtering
if use_aoi_cloud_filter:
    collection = CloudMaskingService.filter_collection_by_aoi_clouds(
        collection, aoi, max_cloud, cloud_buffer_meters
    )
```

#### 3. Updated Schema (`app/models/schemas.py`)
```python
class IndexCalculationRequest(BaseModel):
    # ... existing fields ...
    use_aoi_cloud_filter: Optional[bool] = Field(
        True, 
        description="Calculate cloud coverage within AOI only"
    )
    cloud_buffer_meters: Optional[float] = Field(
        300, 
        ge=0, 
        le=5000, 
        description="Buffer around AOI for cloud calculation"
    )
```

#### 4. Updated API Endpoint (`app/api/indices.py`)
```python
collection = earth_engine_service.get_sentinel2_collection(
    request.aoi.geometry.model_dump(),
    request.date_range.start_date,
    request.date_range.end_date,
    request.cloud_coverage,
    use_aoi_cloud_filter=request.use_aoi_cloud_filter,  # NEW
    cloud_buffer_meters=request.cloud_buffer_meters     # NEW
)
```

### Frontend Changes

#### Updated API Client (`project/src/lib/satellite-api.ts`)
```typescript
export interface IndexCalculationRequest {
  aoi: AOIRequest;
  date_range: DateRange;
  indices: VegetationIndexType[];
  cloud_coverage?: number;
  scale?: number;
  use_aoi_cloud_filter?: boolean;  // NEW: Default true
  cloud_buffer_meters?: number;    // NEW: Default 300m
}

// Apply defaults before sending request
async calculateIndices(request: IndexCalculationRequest) {
  const requestWithDefaults = {
    use_aoi_cloud_filter: true,  // Enable by default
    cloud_buffer_meters: 300,    // 300m buffer by default
    ...request
  };
  // ...
}
```

## How It Works

### Before (Tile-Wide Filtering)
```
┌─────────────────────────────────────┐
│  Sentinel-2 Tile (~100km x 100km)  │
│                                     │
│  ☁☁☁  ☁☁  (clouds here)           │
│                                     │
│         ┌──────┐                   │
│         │ Farm │  (clear)          │
│         └──────┘                   │
│                                     │
│  Tile: 30% clouds → REJECTED ❌    │
└─────────────────────────────────────┘
```

### After (AOI-Based Filtering)
```
┌─────────────────────────────────────┐
│  Sentinel-2 Tile (~100km x 100km)  │
│                                     │
│  ☁☁☁  ☁☁  (clouds here - ignored) │
│                                     │
│         ┌──────┐                   │
│         │ Farm │  (clear)          │
│         └──────┘                   │
│          └─300m buffer─┘           │
│                                     │
│  AOI: 0% clouds → ACCEPTED ✅      │
└─────────────────────────────────────┘
```

## Configuration Options

### Default Behavior (Recommended)
```typescript
// Frontend automatically applies these defaults:
{
  use_aoi_cloud_filter: true,
  cloud_buffer_meters: 300
}
```

### Custom Configuration
```typescript
// Tighter constraint - only check farm boundary
{
  use_aoi_cloud_filter: true,
  cloud_buffer_meters: 0  // No buffer
}

// Looser constraint - include nearby area
{
  use_aoi_cloud_filter: true,
  cloud_buffer_meters: 1000  // 1km buffer
}

// Legacy behavior - tile-wide filtering
{
  use_aoi_cloud_filter: false  // Not recommended
}
```

## Expected Results

### For Problematic Dates (02/10/2025, 12/10/2025)

**Before:**
```
Date: 02/10/2025
Tile cloud coverage: 30%
Status: ❌ No data available
Reason: Tile exceeds 10% cloud threshold
```

**After:**
```
Date: 02/10/2025
Tile cloud coverage: 30%
AOI cloud coverage: 0%
Status: ✅ Data available
Indices: NDVI, NDRE, NDWI calculated successfully
```

## Benefits

1. **More Available Data**: Get readings when your farm is clear, even if the tile has clouds elsewhere
2. **Accurate Monitoring**: Only reject images when clouds actually affect your farm
3. **Flexible Buffer**: Adjust the buffer (0m - 5000m) based on your needs
4. **Smart Default**: 300m buffer catches nearby clouds that might cause artifacts
5. **Backward Compatible**: Can disable AOI filtering if needed (not recommended)

## Testing

### Validation Tests
Run the validation test to verify all changes:
```bash
cd satellite-indices-service
python test_changes_validation.py
```

**Expected output:**
```
✅ PASS - Cloud Masking Service
✅ PASS - Schema Changes
✅ PASS - Earth Engine Service
✅ PASS - API Endpoint
✅ PASS - Frontend API Client
✅ PASS - Git Staged Changes

Total: 6/6 validations passed
```

### Integration Tests
When the service is running with Earth Engine credentials:
```bash
cd satellite-indices-service
python test_cloud_masking.py
```

This will test:
- AOI-based vs tile-based filtering comparison
- Different buffer sizes (0m, 150m, 300m, 500m, 1000m)
- Problematic dates (02/10/2025, 12/10/2025)

## Technical Details

### Cloud Detection Methods

1. **QA60 Band** (10m resolution)
   - Bit 10: Opaque clouds
   - Bit 11: Cirrus clouds

2. **Scene Classification Layer (SCL)** (20m resolution)
   - Class 3: Cloud shadows
   - Class 8: Cloud medium probability
   - Class 9: Cloud high probability
   - Class 10: Thin cirrus

3. **Combined Approach**
   ```python
   cloud_mask = (QA60_clouds OR SCL_clouds OR SCL_shadows)
   cloud_percentage = (cloud_pixels / total_pixels) * 100
   ```

### Performance Considerations

- **10m resolution** for cloud calculation ensures accuracy
- **Pre-filtering** with 2× threshold reduces Earth Engine computation
- **Caching** of cloud scores on images for efficient collection filtering
- **Parallel processing** of multiple dates

## Migration Guide

### No Action Required
The fix is **enabled by default** with optimal settings:
- `use_aoi_cloud_filter: true`
- `cloud_buffer_meters: 300`

All existing API calls will automatically benefit from AOI-based filtering.

### For Advanced Users
To customize behavior, add parameters to API requests:

```typescript
// Example: No buffer (strict AOI-only)
await satelliteAPI.calculateIndices({
  aoi: farmGeometry,
  date_range: { start_date: "2025-02-01", end_date: "2025-02-28" },
  indices: ["NDVI"],
  cloud_buffer_meters: 0  // Override default
});

// Example: Large buffer for cautious filtering
await satelliteAPI.calculateIndices({
  aoi: farmGeometry,
  date_range: { start_date: "2025-02-01", end_date: "2025-02-28" },
  indices: ["NDVI"],
  cloud_buffer_meters: 1000  // 1km buffer
});
```

## Files Modified

### Backend
- ✅ `satellite-indices-service/app/services/cloud_masking.py` (NEW)
- ✅ `satellite-indices-service/app/services/earth_engine.py`
- ✅ `satellite-indices-service/app/models/schemas.py`
- ✅ `satellite-indices-service/app/api/indices.py`

### Frontend
- ✅ `project/src/lib/satellite-api.ts`

### Tests
- ✅ `satellite-indices-service/test_changes_validation.py` (NEW)
- ✅ `satellite-indices-service/test_cloud_masking.py` (NEW)
- ✅ `satellite-indices-service/test_cloud_masking_unit.py` (NEW)

## Deployment

All changes are **backward compatible**. Deploy as usual:

```bash
# Stage changes
git add satellite-indices-service/ project/src/lib/satellite-api.ts

# Commit
git commit -m "Fix AOI-based cloud masking for accurate readings"

# Deploy backend
cd satellite-indices-service
# Deploy according to your deployment process

# Deploy frontend
cd ../project
npm run build
# Deploy according to your deployment process
```

## Support

If you encounter issues:

1. **Verify the fix is active**: Check API request includes `use_aoi_cloud_filter: true`
2. **Adjust buffer**: Try different `cloud_buffer_meters` values (0, 300, 500, 1000)
3. **Check logs**: Backend logs show "Applying AOI-based cloud filtering with Xm buffer"
4. **Run tests**: Use `test_changes_validation.py` to verify implementation

---

**Author**: AI Assistant  
**Date**: October 18, 2025  
**Issue**: Unavailable readings when clouds outside AOI  
**Solution**: AOI-specific cloud coverage calculation with 300m buffer

