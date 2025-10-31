# Satellite Service Guide

## Overview
FastAPI backend service integrating Google Earth Engine for vegetation index calculation on Sentinel-2 satellite imagery.

## Architecture
```
satellite-indices-service/
├── app/
│   ├── api/                      # FastAPI route handlers
│   ├── services/                 # Business logic (GEE integration)
│   ├── models/                   # Pydantic models
│   └── core/                     # Configuration
└── research/                     # Jupyter notebooks for GEE research
```

## API Client
**Frontend Client**: `src/lib/satellite-api.ts` (singleton `satelliteApi` instance)

## Key Endpoints

### Available Dates
`POST /api/indices/available-dates`
Get available satellite dates for AOI (cloud-free images)

### Calculate Indices
`POST /api/indices/calculate`
Calculate vegetation indices (NDVI, NDRE, etc.)

### Heatmap Data
`POST /api/indices/heatmap`
Get heatmap data for ECharts visualization

### Export GeoTIFF
`POST /api/indices/export`
Export GeoTIFF files to Supabase Storage

### Parcel Statistics
`POST /api/analysis/parcel-statistics`
Comprehensive parcel analysis with statistics

### Cloud Coverage Check
`POST /api/analysis/cloud-coverage`
Check if cloud-free images exist for date range

### Batch Processing
`POST /api/analysis/batch`
Start batch processing job for multiple parcels (Celery + Redis)

## Vegetation Indices

**Supported**: NDVI, NDRE, NDMI, MNDWI, GCI, SAVI, OSAVI, MSAVI2, PRI, MSI, MCARI, TCARI

### Index Descriptions
- **NDVI** (Normalized Difference Vegetation Index) - Overall vegetation health and vigor
- **NDRE** (Normalized Difference Red Edge) - Chlorophyll content, nitrogen status
- **NDMI** (Normalized Difference Moisture Index) - Plant water stress
- **MNDWI** (Modified NDWI) - Water body detection, flood mapping
- **GCI** (Green Chlorophyll Index) - Chlorophyll concentration
- **SAVI** (Soil-Adjusted Vegetation Index) - Vegetation in low-cover areas
- **OSAVI** (Optimized SAVI) - Improved SAVI for varying soil brightness
- **MSAVI2** (Modified SAVI) - Further soil adjustment
- **PRI** (Photochemical Reflectance Index) - Light use efficiency
- **MSI** (Moisture Stress Index) - Water stress (higher = more stress)
- **MCARI** (Modified Chlorophyll Absorption Ratio Index) - Chlorophyll concentration
- **TCARI** (Transformed CARI) - Chlorophyll assessment

## Cloud Masking Strategy

### Default Configuration
- AOI-based cloud filtering: `use_aoi_cloud_filter: true`
- Cloud buffer: `cloud_buffer_meters: 300` (300m buffer around AOI)
- Pre-checks cloud coverage before expensive calculations

### Best Practices
1. Always check available dates first
2. Filter by cloud coverage threshold (e.g., < 20%)
3. Use cloud buffer to avoid edge effects
4. For critical analysis, manually verify images

## Data Flow

1. **Frontend Request**: User selects parcel and date range
2. **Available Dates**: Query `/api/indices/available-dates` for cloud-free images
3. **User Selection**: User picks date and desired indices
4. **Calculation**: Backend queries Google Earth Engine (Sentinel-2)
5. **Statistics**: Calculate min, max, mean, median, std per index
6. **Storage**: Save statistics to `satellite_data` table
7. **Optional Export**: Export GeoTIFF to Supabase Storage
8. **Visualization**: Frontend displays heatmaps, time series, reports

## Development

### Running Locally
```bash
# From /satellite-indices-service directory
python -m uvicorn app.main:app --reload --port 8001
```

### Docker
```bash
# From root directory
docker-compose up -d  # Starts frontend + satellite service
```

### Environment Variables
```bash
# .env in /satellite-indices-service
GEE_SERVICE_ACCOUNT=your_gee_service_account
GEE_PRIVATE_KEY=your_gee_private_key
GEE_PROJECT_ID=your_gee_project_id
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
```

## Adding a New Vegetation Index

1. **Update TypeScript Type**: Add to `VegetationIndex` in `src/lib/satellite-api.ts`
2. **Update Array**: Add to `VEGETATION_INDICES` array
3. **Add Description**: Add to `VEGETATION_INDEX_DESCRIPTIONS`
4. **Backend Implementation**: Implement calculation in `app/services/gee_service.py`
5. **Test**: Test with small AOI before deploying

Example:
```typescript
// satellite-api.ts
export type VegetationIndex = 'NDVI' | 'NDRE' | 'NEW_INDEX';

export const VEGETATION_INDICES: VegetationIndex[] = [
  'NDVI', 'NDRE', 'NEW_INDEX'
];

export const VEGETATION_INDEX_DESCRIPTIONS: Record<VegetationIndex, string> = {
  // ... existing
  NEW_INDEX: 'Description of new index',
};
```

```python
# gee_service.py
def calculate_new_index(image):
    # Band math implementation
    nir = image.select('B8')
    red = image.select('B4')
    return nir.subtract(red).divide(nir.add(red)).rename('NEW_INDEX')
```

## Performance Considerations

### Query Optimization
- Use TanStack Query to cache satellite API calls
- Set high `staleTime` (1+ hours) - satellite data doesn't change frequently
- Implement request deduplication for same parcel/date

### Batch Processing
- Use `/api/analysis/batch` for multiple parcels
- Leverage Celery + Redis for background jobs
- Queue overnight processing for large farms

### GeoTIFF Export
- Only export when needed (storage costs)
- Use cloud-optimized GeoTIFF format
- Set expiry on signed URLs (24-48 hours)

## Troubleshooting

**Satellite service timeout**:
- Check GEE credentials
- Reduce AOI size (smaller parcels)
- Increase cloud coverage threshold
- Try different date range

**No available dates**:
- Expand date range
- Increase cloud coverage threshold
- Check if region has Sentinel-2 coverage

**GEE quota exceeded**:
- Wait for quota reset (daily)
- Use batch processing to distribute load
- Cache results aggressively

**Incorrect statistics**:
- Verify AOI geometry (valid GeoJSON)
- Check cloud masking settings
- Manually inspect image in GEE Code Editor
