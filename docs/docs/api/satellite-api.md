# Satellite Service API Reference

Complete API reference for the AgriTech Platform Satellite Indices Service, which provides vegetation analysis using Google Earth Engine and Sentinel-2 imagery.

## Overview

The Satellite Service API is a FastAPI-based backend service that processes satellite imagery to calculate vegetation indices, generate heatmaps, and provide parcel statistics.

**Base URL**: `http://localhost:8001/api` (development)
**Production URL**: Configured via `VITE_SATELLITE_SERVICE_URL` environment variable

## Authentication

All requests to Supabase Edge Functions (like `generate-index-image`) require authentication via JWT token:

```typescript
const { data: { session } } = await supabase.auth.getSession();

// Include in headers
headers: {
  'Authorization': `Bearer ${session.access_token}`
}
```

Direct API calls to the satellite service do not require authentication but are typically accessed through Edge Functions for security.

## Client Usage

The platform provides a pre-configured singleton client:

```typescript
import { satelliteApi } from '@/lib/satellite-api';

// All methods are available through this instance
const result = await satelliteApi.calculateIndices(request);
```

---

## Endpoints

### Health Check

#### `GET /api/health`

Check service health and availability.

**Response**:
```typescript
{
  status: "ok",
  service: "satellite-indices-service",
  version: "1.0.0"
}
```

**Example**:
```typescript
const health = await satelliteApi.getHealth();
console.log(health.status); // "ok"
```

---

### Available Dates

#### `POST /api/indices/available-dates`

Get all available satellite imagery dates for an Area of Interest (AOI) within a date range.

**Request Body**:
```typescript
{
  aoi: {
    geometry: {
      type: 'Polygon',
      coordinates: [[[lon, lat], [lon, lat], ...]]
    },
    name?: string
  },
  start_date: string,  // YYYY-MM-DD
  end_date: string,    // YYYY-MM-DD
  cloud_coverage?: number  // 0-100, default 30
}
```

**Response**:
```typescript
{
  available_dates: Array<{
    date: string,
    cloud_coverage: number,
    timestamp: number,
    available: boolean
  }>,
  total_images: number,
  date_range: {
    start: string,
    end: string
  },
  filters: {
    max_cloud_coverage: number
  }
}
```

**Example**:
```typescript
import { satelliteApi, convertBoundaryToGeoJSON } from '@/lib/satellite-api';

const aoi = {
  geometry: convertBoundaryToGeoJSON(parcel.boundary),
  name: parcel.name
};

const dates = await satelliteApi.getAvailableDates(
  aoi,
  '2024-01-01',
  '2024-12-31',
  30  // max cloud coverage
);

console.log(`Found ${dates.total_images} images`);
dates.available_dates.forEach(d => {
  console.log(`${d.date}: ${d.cloud_coverage}% cloud coverage`);
});
```

---

### Calculate Indices

#### `POST /api/indices/calculate`

Calculate vegetation indices for a specific AOI and date range.

**Request Body**:
```typescript
interface IndexCalculationRequest {
  aoi: {
    geometry: GeoJSONGeometry,
    name?: string
  },
  date_range: {
    start_date: string,  // YYYY-MM-DD
    end_date: string     // YYYY-MM-DD
  },
  indices: VegetationIndexType[],  // ['NDVI', 'NDRE', ...]
  cloud_coverage?: number,         // 0-100, default 10
  scale?: number,                  // 10-1000, default 10 (meters)
  use_aoi_cloud_filter?: boolean,  // default true
  cloud_buffer_meters?: number     // default 300
}
```

**Vegetation Index Types**:
- `NDVI` - Normalized Difference Vegetation Index (general health)
- `NDRE` - Normalized Difference Red Edge (nitrogen content)
- `NDMI` - Normalized Difference Moisture Index (water stress)
- `MNDWI` - Modified NDWI (surface water)
- `GCI` - Green Chlorophyll Index
- `SAVI` - Soil Adjusted Vegetation Index
- `OSAVI` - Optimized SAVI
- `MSAVI2` - Modified SAVI v2
- `PRI` - Photochemical Reflectance Index
- `MSI` - Moisture Stress Index
- `MCARI` - Modified Chlorophyll Absorption Ratio Index
- `TCARI` - Transformed Chlorophyll Absorption Reflectance Index

**Response**:
```typescript
interface IndexCalculationResponse {
  request_id: string,
  timestamp: string,
  aoi_name?: string,
  indices: Array<{
    index: string,
    value: number,
    unit?: string,
    timestamp?: string
  }>,
  metadata: Record<string, unknown>
}
```

**Example**:
```typescript
import { satelliteApi, convertBoundaryToGeoJSON } from '@/lib/satellite-api';

const request = {
  aoi: {
    geometry: convertBoundaryToGeoJSON(parcel.boundary),
    name: parcel.name
  },
  date_range: {
    start_date: '2024-06-01',
    end_date: '2024-06-30'
  },
  indices: ['NDVI', 'NDRE', 'NDMI'],
  cloud_coverage: 10,
  scale: 10,
  use_aoi_cloud_filter: true,  // Only check clouds within AOI
  cloud_buffer_meters: 300      // 300m buffer for cloud detection
};

const result = await satelliteApi.calculateIndices(request);

result.indices.forEach(idx => {
  console.log(`${idx.index}: ${idx.value.toFixed(3)}`);
});
```

---

### Heatmap Data

#### `POST /api/indices/heatmap`

Get heatmap pixel data for ECharts visualization with geographic coordinates.

**Request Body**:
```typescript
interface HeatmapRequest {
  aoi: {
    geometry: GeoJSONGeometry,
    name?: string
  },
  date: string,              // YYYY-MM-DD
  index: VegetationIndexType,
  grid_size?: number         // default 1000
}
```

**Response**:
```typescript
interface HeatmapDataResponse {
  date: string,
  index: string,
  bounds: {
    min_lon: number,
    max_lon: number,
    min_lat: number,
    max_lat: number
  },
  pixel_data: Array<{
    lon: number,
    lat: number,
    value: number
  }>,
  aoi_boundary: [number, number][],  // Polygon coordinates
  statistics: {
    min: number,
    max: number,
    mean: number,
    median: number,
    p10: number,
    p90: number,
    std: number,
    count: number
  },
  visualization: {
    min: number,
    max: number,
    palette: string[]
  },
  metadata: {
    sample_scale: number,
    total_pixels: number,
    data_source: string
  }
}
```

**Example**:
```typescript
import { satelliteApi, convertBoundaryToGeoJSON } from '@/lib/satellite-api';

const heatmapData = await satelliteApi.getHeatmapData({
  aoi: {
    geometry: convertBoundaryToGeoJSON(parcel.boundary),
    name: parcel.name
  },
  date: '2024-06-15',
  index: 'NDVI',
  grid_size: 1000
});

// Use with ECharts
const echartsData = heatmapData.pixel_data.map(p => [
  p.lon,
  p.lat,
  p.value
]);

// Display statistics
console.log(`Mean NDVI: ${heatmapData.statistics.mean.toFixed(3)}`);
console.log(`Range: ${heatmapData.statistics.min.toFixed(3)} - ${heatmapData.statistics.max.toFixed(3)}`);
```

---

### Export GeoTIFF

#### `POST /api/indices/export`

Export vegetation index data as GeoTIFF file for GIS software.

**Request Body**:
```typescript
{
  aoi: {
    geometry: GeoJSONGeometry,
    name?: string
  },
  date: string,              // YYYY-MM-DD
  index: VegetationIndexType,
  scale?: number,            // default 10 meters
  format?: string,           // default 'geotiff'
  interactive?: boolean      // default false
}
```

**Response**:
```typescript
interface TiffExportResponse {
  download_url: string,      // Signed URL from Supabase Storage
  file_size_mb?: number,
  expires_at: string,        // ISO timestamp
  metadata: {
    index: VegetationIndexType,
    date: string,
    scale: number,
    cloud_coverage: number
  }
}
```

**Example**:
```typescript
import { satelliteApi, convertBoundaryToGeoJSON } from '@/lib/satellite-api';

const exportResult = await satelliteApi.exportGeoTIFF({
  aoi: {
    geometry: convertBoundaryToGeoJSON(parcel.boundary),
    name: parcel.name
  },
  date: '2024-06-15',
  index: 'NDVI',
  scale: 10
});

// Download file
window.open(exportResult.download_url, '_blank');

console.log(`File size: ${exportResult.file_size_mb} MB`);
console.log(`Expires: ${new Date(exportResult.expires_at).toLocaleString()}`);
```

---

### Parcel Statistics

#### `POST /api/analysis/parcel-statistics`

Calculate comprehensive statistics for a parcel with optional GeoTIFF export.

**Request Body**:
```typescript
interface ParcelStatisticsRequest {
  parcel_id: string,
  aoi: {
    geometry: GeoJSONGeometry,
    name?: string
  },
  date_range: {
    start_date: string,
    end_date: string
  },
  indices: VegetationIndexType[],
  cloud_coverage?: number,         // default 10
  save_tiff?: boolean,             // default false
  scale?: number,                  // default 10
  use_aoi_cloud_filter?: boolean,  // default true
  cloud_buffer_meters?: number     // default 300
}
```

**Response**:
```typescript
interface ParcelStatisticsResponse {
  parcel_id: string,
  statistics: Record<VegetationIndexType, {
    mean: number,
    min: number,
    max: number,
    std: number,
    median: number,
    percentile_25: number,
    percentile_75: number,
    percentile_90: number,
    pixel_count: number
  }>,
  tiff_files?: Record<VegetationIndexType, {
    url: string,
    file_size_mb: number,
    expires_at: string
  }>,
  cloud_coverage_info: {
    threshold_used: number,
    images_found: number,
    avg_cloud_coverage: number,
    best_date: string
  },
  metadata: {
    date_range: {
      start_date: string,
      end_date: string
    },
    processing_date: string,
    scale: number
  }
}
```

**Example**:
```typescript
import { satelliteApi, convertBoundaryToGeoJSON } from '@/lib/satellite-api';

const stats = await satelliteApi.calculateParcelStatistics({
  parcel_id: parcel.id,
  aoi: {
    geometry: convertBoundaryToGeoJSON(parcel.boundary),
    name: parcel.name
  },
  date_range: {
    start_date: '2024-06-01',
    end_date: '2024-06-30'
  },
  indices: ['NDVI', 'NDRE', 'NDMI'],
  cloud_coverage: 10,
  save_tiff: true,  // Generate GeoTIFF files
  use_aoi_cloud_filter: true
});

// Access statistics
console.log(`NDVI Mean: ${stats.statistics.NDVI.mean.toFixed(3)}`);
console.log(`NDVI Range: ${stats.statistics.NDVI.min.toFixed(3)} - ${stats.statistics.NDVI.max.toFixed(3)}`);

// Download GeoTIFF if generated
if (stats.tiff_files?.NDVI) {
  console.log(`Download NDVI: ${stats.tiff_files.NDVI.url}`);
}

// Cloud coverage info
console.log(`Found ${stats.cloud_coverage_info.images_found} suitable images`);
console.log(`Best date: ${stats.cloud_coverage_info.best_date}`);
```

---

### Cloud Coverage Check

#### `POST /api/analysis/cloud-coverage`

Check if cloud-free images are available for a date range before expensive processing.

**Request Body**:
```typescript
interface CloudCoverageCheckRequest {
  geometry: GeoJSONGeometry,
  date_range: {
    start_date: string,
    end_date: string
  },
  max_cloud_coverage?: number  // default 10
}
```

**Response**:
```typescript
interface CloudCoverageCheckResponse {
  has_suitable_images: boolean,
  available_images_count: number,
  suitable_images_count: number,
  min_cloud_coverage?: number,
  max_cloud_coverage?: number,
  avg_cloud_coverage?: number,
  recommended_date?: string,
  metadata?: {
    max_cloud_threshold: number,
    date_range: {
      start_date: string,
      end_date: string
    },
    all_cloud_percentages: number[]
  }
}
```

**Example**:
```typescript
import { satelliteApi, convertBoundaryToGeoJSON } from '@/lib/satellite-api';

const cloudCheck = await satelliteApi.checkCloudCoverage({
  geometry: convertBoundaryToGeoJSON(parcel.boundary),
  date_range: {
    start_date: '2024-06-01',
    end_date: '2024-06-30'
  },
  max_cloud_coverage: 10
});

if (cloudCheck.has_suitable_images) {
  console.log(`Found ${cloudCheck.suitable_images_count} cloud-free images`);
  console.log(`Recommended date: ${cloudCheck.recommended_date}`);
  console.log(`Avg cloud coverage: ${cloudCheck.avg_cloud_coverage}%`);

  // Proceed with analysis
  const result = await satelliteApi.calculateIndices(...);
} else {
  console.warn('No suitable images found. Try a different date range.');
}

// Quick helper method
const hasImages = await satelliteApi.hasCloudFreeImages(
  { geometry: convertBoundaryToGeoJSON(parcel.boundary) },
  { start_date: '2024-06-01', end_date: '2024-06-30' },
  10
);
```

---

### Batch Processing

#### `POST /api/analysis/batch`

Start a batch processing job for multiple parcels (Celery + Redis background job).

**Request Body**:
```typescript
interface BatchProcessingRequest {
  organization_id: string,
  farm_id?: string,
  parcel_id?: string,
  indices: VegetationIndexType[],
  date_range: {
    start_date: string,
    end_date: string
  },
  cloud_coverage?: number,
  scale?: number,
  check_cloud_coverage?: boolean,  // Pre-check before processing
  priority?: number                // 1-10, higher = more priority
}
```

**Response**:
```typescript
interface ProcessingJob {
  job_id: string,
  total_tasks: number,
  created_at: string,
  estimated_completion?: string
}
```

**Example**:
```typescript
import { satelliteApi } from '@/lib/satellite-api';

// Start batch job for all parcels in a farm
const job = await satelliteApi.startBatchProcessing({
  organization_id: currentOrganization.id,
  farm_id: currentFarm.id,
  indices: ['NDVI', 'NDRE', 'NDMI'],
  date_range: {
    start_date: '2024-06-01',
    end_date: '2024-06-30'
  },
  cloud_coverage: 10,
  check_cloud_coverage: true,  // Only process parcels with cloud-free images
  priority: 5
});

console.log(`Job ${job.job_id} started with ${job.total_tasks} tasks`);

// Check status
const status = await satelliteApi.getBatchProcessingStatus(job.job_id);
console.log(`Progress: ${status.completed_tasks}/${status.total_tasks}`);
```

---

### Time Series

#### `POST /api/indices/timeseries`

Get historical time series data for a vegetation index.

**Request Body**:
```typescript
interface TimeSeriesRequest {
  aoi: {
    geometry: GeoJSONGeometry,
    name?: string
  },
  date_range: {
    start_date: string,
    end_date: string
  },
  index: VegetationIndexType,
  interval?: 'day' | 'week' | 'month' | 'year',  // default 'month'
  cloud_coverage?: number
}
```

**Response**:
```typescript
interface TimeSeriesResponse {
  index: string,
  aoi_name?: string,
  start_date: string,
  end_date: string,
  data: Array<{
    date: string,
    value: number
  }>,
  statistics?: {
    mean: number,
    min: number,
    max: number,
    std: number,
    trend: number  // positive = increasing, negative = decreasing
  }
}
```

**Example**:
```typescript
import { satelliteApi, convertBoundaryToGeoJSON } from '@/lib/satellite-api';

const timeSeries = await satelliteApi.getTimeSeries({
  aoi: {
    geometry: convertBoundaryToGeoJSON(parcel.boundary),
    name: parcel.name
  },
  date_range: {
    start_date: '2024-01-01',
    end_date: '2024-12-31'
  },
  index: 'NDVI',
  interval: 'month',
  cloud_coverage: 20
});

// Plot with a charting library
const chartData = timeSeries.data.map(d => ({
  x: new Date(d.date),
  y: d.value
}));

console.log(`Mean NDVI: ${timeSeries.statistics?.mean.toFixed(3)}`);
console.log(`Trend: ${timeSeries.statistics?.trend > 0 ? 'Increasing' : 'Decreasing'}`);
```

---

### Generate Index Image

#### Edge Function: `generate-index-image`

Generate a vegetation index image through Supabase Edge Function (requires authentication).

**Request Body**:
```typescript
interface IndexImageRequest {
  aoi: {
    geometry: GeoJSONGeometry,
    name?: string
  },
  date_range: {
    start_date: string,
    end_date: string
  },
  index: VegetationIndexType,
  cloud_coverage?: number  // default 10
}
```

**Response**:
```typescript
interface IndexImageResponse {
  image_url: string,
  index: VegetationIndexType,
  date: string,
  cloud_coverage: number,
  metadata: {
    available_images: number,
    suitable_images: number
  }
}
```

**Example**:
```typescript
import { satelliteApi } from '@/lib/satellite-api';

// Automatically handles authentication
const image = await satelliteApi.generateIndexImage({
  aoi: {
    geometry: convertBoundaryToGeoJSON(parcel.boundary),
    name: parcel.name
  },
  date_range: {
    start_date: '2024-06-01',
    end_date: '2024-06-30'
  },
  index: 'NDVI',
  cloud_coverage: 10
});

// Display image
document.getElementById('map-overlay').src = image.image_url;

// Generate multiple for comparison
const images = await satelliteApi.generateMultipleIndexImages(
  aoi,
  dateRange,
  ['NDVI', 'NDRE', 'NDMI'],
  10
);

images.forEach(img => {
  console.log(`${img.index}: ${img.image_url}`);
});
```

---

## Utility Functions

### convertBoundaryToGeoJSON

Convert boundary coordinates to GeoJSON format with automatic projection detection.

```typescript
import { convertBoundaryToGeoJSON } from '@/lib/satellite-api';

const boundary = [
  [-7.5898, 33.5731],
  [-7.5878, 33.5731],
  [-7.5878, 33.5711],
  [-7.5898, 33.5711],
  [-7.5898, 33.5731]  // Closed polygon
];

const geojson = convertBoundaryToGeoJSON(boundary);
// {
//   type: 'Polygon',
//   coordinates: [[[-7.5898, 33.5731], ...]]
// }
```

**Features**:
- Detects Web Mercator (EPSG:3857) vs WGS84 projection
- Automatically converts Web Mercator to WGS84 if needed
- Ensures polygon is properly closed

### formatDateForAPI

Format Date object to API-compatible string.

```typescript
import { formatDateForAPI } from '@/lib/satellite-api';

const date = new Date('2024-06-15');
const formatted = formatDateForAPI(date);
// "2024-06-15"
```

### getDateRangeLastNDays

Get a date range for the last N days.

```typescript
import { getDateRangeLastNDays } from '@/lib/satellite-api';

const last30Days = getDateRangeLastNDays(30);
// {
//   start_date: "2024-05-16",
//   end_date: "2024-06-15"
// }
```

---

## Constants

### VEGETATION_INDICES

Array of all available vegetation indices:

```typescript
import { VEGETATION_INDICES } from '@/lib/satellite-api';

console.log(VEGETATION_INDICES);
// ['NDVI', 'NDRE', 'NDMI', 'MNDWI', 'GCI', 'SAVI', 'OSAVI', 'MSAVI2', 'PRI', 'MSI', 'MCARI', 'TCARI']
```

### VEGETATION_INDEX_DESCRIPTIONS

Descriptions of each vegetation index:

```typescript
import { VEGETATION_INDEX_DESCRIPTIONS } from '@/lib/satellite-api';

console.log(VEGETATION_INDEX_DESCRIPTIONS.NDVI);
// "Normalized Difference Vegetation Index - General vegetation health"

console.log(VEGETATION_INDEX_DESCRIPTIONS.NDRE);
// "Normalized Difference Red Edge - Nitrogen content"
```

---

## Error Handling

All API methods throw errors with descriptive messages:

```typescript
import { satelliteApi } from '@/lib/satellite-api';

try {
  const result = await satelliteApi.calculateIndices(request);
} catch (error) {
  if (error instanceof Error) {
    console.error('API Error:', error.message);

    // Common error patterns
    if (error.message.includes('Authentication required')) {
      // Redirect to login
    } else if (error.message.includes('No suitable images')) {
      // Show cloud coverage warning
    } else if (error.message.includes('400')) {
      // Invalid request parameters
    } else if (error.message.includes('500')) {
      // Server error
    }
  }
}
```

**Common Errors**:
- `Authentication required` - JWT token missing or expired
- `No suitable images found` - No cloud-free imagery in date range
- `Invalid AOI geometry` - Malformed GeoJSON
- `API Error: 400` - Invalid request parameters
- `API Error: 500` - Server-side processing error
- `API Error: 503` - Service temporarily unavailable

---

## Best Practices

### 1. Pre-check Cloud Coverage

Always check for cloud-free images before expensive operations:

```typescript
const hasImages = await satelliteApi.hasCloudFreeImages(aoi, dateRange, 10);

if (!hasImages) {
  // Show warning to user
  return;
}

// Proceed with analysis
const result = await satelliteApi.calculateParcelStatistics(...);
```

### 2. Use AOI-based Cloud Filtering

Enable AOI-based cloud filtering for accurate results:

```typescript
const request = {
  // ... other params
  use_aoi_cloud_filter: true,  // Only check clouds within AOI
  cloud_buffer_meters: 300      // Include 300m buffer
};
```

### 3. Handle GeoTIFF Expiration

GeoTIFF URLs expire after a set time (typically 1 hour):

```typescript
const exportResult = await satelliteApi.exportGeoTIFF(...);

// Store URL and expiration
const tiffData = {
  url: exportResult.download_url,
  expiresAt: new Date(exportResult.expires_at)
};

// Check expiration before use
if (new Date() > tiffData.expiresAt) {
  // Re-generate GeoTIFF
  const newExport = await satelliteApi.exportGeoTIFF(...);
}
```

### 4. Batch Processing for Multiple Parcels

Use batch processing instead of individual requests:

```typescript
// Bad: Individual requests
for (const parcel of parcels) {
  await satelliteApi.calculateParcelStatistics(...);  // Slow!
}

// Good: Batch processing
const job = await satelliteApi.startBatchProcessing({
  organization_id,
  farm_id,
  indices: ['NDVI', 'NDRE'],
  date_range: { start_date, end_date }
});

// Poll for completion
const status = await satelliteApi.getBatchProcessingStatus(job.job_id);
```

### 5. Optimize Scale Parameter

Balance between detail and processing time:

```typescript
// High detail (slow, large files)
scale: 10  // 10 meters per pixel

// Balanced (recommended for most uses)
scale: 30  // 30 meters per pixel (Landsat resolution)

// Low detail (fast, small files)
scale: 100  // 100 meters per pixel
```

---

## Troubleshooting

### Issue: "No suitable images found"

**Cause**: High cloud coverage in date range

**Solutions**:
1. Increase cloud coverage threshold
2. Expand date range
3. Use `checkCloudCoverage()` to find suitable dates

```typescript
const cloudInfo = await satelliteApi.checkCloudCoverage({
  geometry,
  date_range: { start_date, end_date },
  max_cloud_coverage: 20  // Increase threshold
});

if (cloudInfo.recommended_date) {
  // Use recommended date
}
```

### Issue: "Processing timeout"

**Cause**: Large AOI or complex processing

**Solutions**:
1. Reduce AOI size
2. Increase scale parameter (lower resolution)
3. Use batch processing for multiple parcels

### Issue: "Invalid GeoJSON"

**Cause**: Malformed coordinates or unclosed polygon

**Solutions**:
1. Use `convertBoundaryToGeoJSON()` utility
2. Ensure polygon is closed (first point = last point)
3. Verify coordinate order [lon, lat]

```typescript
// Check if polygon is closed
const boundary = [...];
const first = boundary[0];
const last = boundary[boundary.length - 1];

if (first[0] !== last[0] || first[1] !== last[1]) {
  boundary.push([first[0], first[1]]);  // Close polygon
}
```

---

## Performance Optimization

### Caching Strategy

Satellite data is cached in the `satellite_data` table:

```typescript
// Check if data exists in database first
const { data: existingData } = await supabase
  .from('satellite_data')
  .select('*')
  .eq('parcel_id', parcelId)
  .eq('index_name', 'NDVI')
  .gte('date', startDate)
  .lte('date', endDate);

if (existingData && existingData.length > 0) {
  // Use cached data
  return existingData;
}

// Otherwise, calculate fresh
const result = await satelliteApi.calculateParcelStatistics(...);
```

### Progressive Loading

Load data progressively for better UX:

```typescript
// 1. Load latest data first
const latest = await satelliteApi.getLatestSatelliteData(parcelId, 'NDVI');

// 2. Load historical data in background
const timeSeries = await satelliteApi.getTimeSeries({
  aoi,
  date_range: getDateRangeLastNDays(365),
  index: 'NDVI'
});

// 3. Load detailed statistics on demand
if (userClicksDetails) {
  const stats = await satelliteApi.calculateParcelStatistics(...);
}
```

---

## Related Resources

- [Satellite Analysis Guide](/guides/satellite-analysis)
- [Google Earth Engine Documentation](https://developers.google.com/earth-engine)
- [Sentinel-2 Band Information](https://sentinel.esa.int/web/sentinel/user-guides/sentinel-2-msi/resolutions/radiometric)
- [Vegetation Indices Overview](/features/satellite-analysis#vegetation-indices)
