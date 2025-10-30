# Satellite Analysis

## Overview

The Satellite Analysis module provides powerful vegetation monitoring capabilities using Google Earth Engine (GEE) and Sentinel-2 satellite imagery. It enables farmers and agronomists to track crop health, water stress, and vegetation patterns over time through advanced vegetation indices and interactive visualizations.

## Key Features

### Google Earth Engine Integration

- **Real-time Satellite Data** - Direct access to Sentinel-2 imagery through GEE
- **Cloud-free Image Selection** - Intelligent filtering for clear imagery
- **Multi-spectral Analysis** - Utilizes multiple satellite bands (RGB, NIR, Red Edge, SWIR)
- **Historical Archives** - Access to Sentinel-2 data from 2015 onwards
- **10-meter Resolution** - High-resolution imagery (10m-20m depending on band)
- **5-day Revisit Time** - Regular imagery updates from Sentinel-2 constellation

### Vegetation Indices

The platform supports 12 vegetation indices for comprehensive crop monitoring:

#### Primary Indices

1. **NDVI (Normalized Difference Vegetation Index)**
   - Range: -1 to +1
   - Use: General vegetation health and vigor
   - Formula: (NIR - Red) / (NIR + Red)
   - Interpretation: Values greater than 0.6 indicate healthy vegetation

2. **NDRE (Normalized Difference Red Edge)**
   - Range: -1 to +1
   - Use: Nitrogen content and crop stress
   - Formula: (NIR - Red Edge) / (NIR + Red Edge)
   - Interpretation: Sensitive to chlorophyll variations

3. **NDMI (Normalized Difference Moisture Index)**
   - Range: -1 to +1
   - Use: Plant water stress and irrigation monitoring
   - Formula: (NIR - SWIR) / (NIR + SWIR)
   - Interpretation: Values less than 0.2 indicate water stress

4. **MNDWI (Modified Normalized Difference Water Index)**
   - Range: -1 to +1
   - Use: Surface water detection and irrigation monitoring
   - Formula: (Green - SWIR) / (Green + SWIR)
   - Interpretation: Values greater than 0 indicate water presence

#### Chlorophyll Indices

5. **GCI (Green Chlorophyll Index)**
   - Use: Chlorophyll content estimation
   - Formula: (NIR / Green) - 1

6. **MCARI (Modified Chlorophyll Absorption Ratio Index)**
   - Use: Chlorophyll concentration with reduced soil brightness effects

7. **TCARI (Transformed Chlorophyll Absorption Reflectance Index)**
   - Use: Enhanced chlorophyll sensitivity

#### Soil-Adjusted Indices

8. **SAVI (Soil Adjusted Vegetation Index)**
   - Use: Vegetation monitoring with soil background correction
   - Formula: ((NIR - Red) / (NIR + Red + L)) * (1 + L), where L = 0.5

9. **OSAVI (Optimized Soil Adjusted Vegetation Index)**
   - Use: Enhanced SAVI with better soil correction

10. **MSAVI2 (Modified Soil Adjusted Vegetation Index - Version 2)**
    - Use: Self-adjusting soil correction

#### Specialized Indices

11. **PRI (Photochemical Reflectance Index)**
    - Use: Light use efficiency and plant stress

12. **MSI (Moisture Stress Index)**
    - Use: Plant water stress indicator
    - Formula: SWIR / NIR

### Cloud Masking Strategy

The platform employs a sophisticated cloud filtering approach:

- **AOI-based Cloud Detection** - Checks cloud coverage specifically within the parcel boundary
- **300m Buffer Zone** - Accounts for cloud shadows and edge effects
- **Configurable Thresholds** - Default 10% cloud coverage, adjustable up to 100%
- **Pre-analysis Validation** - Checks for cloud-free images before expensive calculations
- **Automatic Date Selection** - Recommends dates with clearest imagery
- **Quality Band Analysis** - Uses Sentinel-2 QA60 band for cloud/cirrus detection

### Interactive Visualizations

#### ECharts Heatmaps

- **Real Satellite Pixels** - Displays actual satellite data, not interpolated
- **Color-coded Values** - Gradient visualization of vegetation index values
- **Statistics Panel** - Min, max, mean, median, percentiles
- **Parcel Overlay** - Shows parcel boundary on heatmap
- **Interactive Tooltips** - Hover to see exact pixel values and coordinates
- **Export Capability** - Save visualizations as PNG/SVG

#### Leaflet Map Integration

- **Boundary Visualization** - Interactive parcel boundaries on OpenStreetMap
- **Multiple Layers** - Toggle between satellite imagery and index heatmaps
- **Zoom and Pan** - Navigate to specific areas of interest
- **Coordinate Display** - Shows latitude/longitude on hover
- **Scale Bar** - Distance measurement tool

#### Time Series Charts

- **Historical Trends** - Track vegetation indices over time
- **Date Range Selection** - Custom time periods (7 days to 5 years)
- **Multi-index Comparison** - Compare NDVI, NDRE, NDMI on same chart
- **Seasonal Patterns** - Identify growth cycles and trends
- **Anomaly Detection** - Spot unusual patterns indicating stress or issues

### GeoTIFF Export

Export high-quality geospatial data for use in GIS software:

- **Cloud-optimized GeoTIFF** - Efficient format for large raster data
- **Coordinate System Metadata** - WGS84 projection information included
- **Time-limited URLs** - Secure signed URLs valid for 7 days
- **Bulk Export** - Export multiple indices for same date
- **File Size Optimization** - Compression for faster downloads
- **Supabase Storage** - Stored in `satellite-exports` bucket

### Batch Processing

For large-scale operations:

- **Queue Multiple Parcels** - Process entire farms overnight
- **Celery + Redis** - Distributed task processing
- **Priority System** - 1-10 priority levels for urgent analyses
- **Progress Tracking** - Real-time status updates via job ID
- **Email Notifications** - Alerts when batch processing completes
- **Error Handling** - Automatic retry for failed analyses

## User Interface

### Satellite Analysis Page (`/satellite-analysis`)

The main satellite analysis interface provides:

1. **Parcel Selection Panel**
   - Dropdown to select organization, farm, and parcel
   - Recently analyzed parcels for quick access
   - Parcel details: crop type, area, planting date

2. **Date Selection**
   - Calendar interface for date range selection
   - Available dates highlighted (cloud-free imagery)
   - Cloud coverage percentage displayed for each date
   - "Last 30 days", "Last 90 days" quick filters

3. **Index Selection**
   - Checkboxes for 12 vegetation indices
   - "Select All" / "Select Common" shortcuts
   - Descriptions on hover explaining each index

4. **Analysis Controls**
   - "Run Analysis" button (checks cloud coverage first)
   - Advanced settings dropdown:
     - Cloud coverage threshold (0-100%)
     - Resolution/scale (10m, 20m, 30m)
     - Enable/disable TIFF export
     - AOI cloud filter settings

5. **Results Display**
   - Interactive heatmap viewer (ECharts)
   - Statistics table with all calculated metrics
   - Time series chart for historical comparison
   - Export options (GeoTIFF, CSV statistics, PNG image)

### Interactive Heatmap Viewer

The heatmap visualization includes:

- **Pixel-level Detail** - Each pixel represents actual satellite data
- **Dynamic Color Scale** - Adjusts to min/max values in dataset
- **Coordinate Grid** - Latitude/longitude grid overlay
- **Zoom Controls** - Magnify specific areas of interest
- **Statistics Sidebar**:
  - Mean: Average value across parcel
  - Median: Middle value (robust to outliers)
  - Min/Max: Range of values
  - Std Dev: Variation indicator
  - Percentiles: P10, P25, P75, P90
  - Pixel Count: Number of data points

### Reports View (`/reports`)

Generate and view satellite analysis reports:

- **Report Gallery** - Thumbnail previews of past reports
- **Date Filtering** - Find reports by date range
- **Comparison Mode** - Side-by-side comparison of two dates
- **PDF Export** - Professional reports with charts and statistics
- **Share Reports** - Email or download link generation

## Usage Guide

### Running a Basic Analysis

1. Navigate to `/satellite-analysis`
2. Select your organization, farm, and parcel
3. Click "Check Available Dates"
4. System shows dates with cloud-free imagery in selected range
5. Choose a date from the calendar (green = best quality)
6. Select vegetation indices (e.g., NDVI, NDRE, NDMI)
7. Click "Run Analysis"
8. Wait for processing (typically 30-60 seconds)
9. View results in interactive heatmap and statistics

### Checking Cloud Coverage

Before running an expensive analysis:

```typescript
// Pre-check for cloud-free images
const hasGoodImagery = await satelliteApi.hasCloudFreeImages(
  { geometry: parcelBoundary, name: parcelName },
  { start_date: '2024-10-01', end_date: '2024-10-31' },
  10 // Max 10% cloud coverage
);

if (!hasGoodImagery) {
  alert('No cloud-free imagery available for this period. Try a different date range.');
}
```

### Generating Time Series

To track vegetation health over time:

1. Select a parcel
2. Choose a single index (e.g., NDVI)
3. Set a longer date range (e.g., last 6 months)
4. Click "Generate Time Series"
5. View trend chart showing:
   - Mean NDVI over time
   - Min/max envelope
   - Seasonal patterns
   - Anomaly points (significant drops)

### Exporting GeoTIFF Files

To export data for use in QGIS, ArcGIS, or other GIS software:

1. Run an analysis with "Export TIFF" enabled
2. After analysis completes, click "Download GeoTIFF"
3. Select indices to export (can export multiple)
4. System generates cloud-optimized GeoTIFF files
5. Download link valid for 7 days
6. Import into your GIS software:
   - Layer will have correct WGS84 coordinates
   - Parcel boundary included as vector layer
   - Index values preserved with proper scale

### Batch Processing Multiple Parcels

For farms with many parcels:

1. Navigate to `/satellite-analysis`
2. Click "Batch Process"
3. Select farm or multiple parcels
4. Choose indices and date range
5. Set priority (1-10, higher = faster)
6. Click "Start Batch Job"
7. System returns job ID for tracking
8. Monitor progress in "Jobs" tab
9. Email notification when complete

## API Integration

### Satellite Service Client

The platform uses a dedicated FastAPI service for satellite processing:

**Base URL:** `http://localhost:8001` (development) or configured endpoint

**Key Endpoints:**

```typescript
// Check available dates
POST /api/indices/available-dates
Body: {
  aoi: { geometry: GeoJSON, name: string },
  start_date: "2024-10-01",
  end_date: "2024-10-31",
  cloud_coverage: 30
}

// Calculate vegetation indices
POST /api/indices/calculate
Body: {
  aoi: { geometry: GeoJSON },
  date_range: { start_date, end_date },
  indices: ["NDVI", "NDRE", "NDMI"],
  cloud_coverage: 10,
  scale: 10,
  use_aoi_cloud_filter: true,
  cloud_buffer_meters: 300
}

// Get comprehensive parcel statistics
POST /api/analysis/parcel-statistics
Body: {
  parcel_id: string,
  aoi: { geometry: GeoJSON },
  date_range: { start_date, end_date },
  indices: ["NDVI", "NDRE"],
  cloud_coverage: 10,
  save_tiff: true,
  use_aoi_cloud_filter: true
}

// Get heatmap data for visualization
POST /api/indices/heatmap
Body: {
  aoi: { geometry: GeoJSON },
  date: "2024-10-15",
  index: "NDVI",
  grid_size: 1000
}

// Export GeoTIFF
POST /api/indices/export
Body: {
  aoi: { geometry: GeoJSON },
  date: "2024-10-15",
  index: "NDVI",
  scale: 10,
  format: "tiff"
}

// Start batch processing
POST /api/analysis/batch
Body: {
  organization_id: string,
  farm_id: string,
  indices: ["NDVI", "NDRE"],
  date_range: { start_date, end_date },
  cloud_coverage: 10,
  priority: 5
}
```

### Database Schema

**Satellite Data Table:**
```sql
CREATE TABLE satellite_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  index_name TEXT NOT NULL,
  mean_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  std_value NUMERIC,
  median_value NUMERIC,
  percentile_25 NUMERIC,
  percentile_75 NUMERIC,
  percentile_90 NUMERIC,
  pixel_count INTEGER,
  cloud_coverage_percentage NUMERIC,
  geotiff_url TEXT, -- Signed URL to GeoTIFF in storage
  geotiff_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parcel_id, date, index_name)
);

CREATE INDEX idx_satellite_data_parcel_date
  ON satellite_data(parcel_id, date DESC);
CREATE INDEX idx_satellite_data_index
  ON satellite_data(parcel_id, index_name, date DESC);
```

## Code Examples

### Running an Analysis

```typescript
import { satelliteApi, VegetationIndexType } from '@/lib/satellite-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const SatelliteAnalysisForm = () => {
  const queryClient = useQueryClient();

  const analysisMutation = useMutation({
    mutationFn: async (data: {
      parcelId: string;
      boundary: number[][];
      dateRange: { start_date: string; end_date: string };
      indices: VegetationIndexType[];
    }) => {
      // Convert boundary to GeoJSON
      const aoi = {
        geometry: convertBoundaryToGeoJSON(data.boundary),
        name: data.parcelId
      };

      // Calculate statistics and save to database
      const result = await satelliteApi.calculateParcelStatistics({
        parcel_id: data.parcelId,
        aoi: aoi,
        date_range: data.dateRange,
        indices: data.indices,
        cloud_coverage: 10,
        save_tiff: true,
        scale: 10
      });

      return result;
    },
    onSuccess: (data) => {
      // Invalidate satellite data queries
      queryClient.invalidateQueries({
        queryKey: ['satellite-data', data.parcel_id]
      });

      // Show success notification
      toast.success(`Analysis complete! Mean NDVI: ${data.statistics.NDVI.mean.toFixed(3)}`);
    }
  });

  // Form implementation...
};
```

### Generating Interactive Heatmap

```typescript
import { satelliteApi } from '@/lib/satellite-api';
import { useQuery } from '@tanstack/react-query';
import EChartsReact from 'echarts-for-react';

const HeatmapViewer = ({ parcel, date, index }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['heatmap', parcel.id, date, index],
    queryFn: () => satelliteApi.getHeatmapData({
      aoi: {
        geometry: parcel.boundary,
        name: parcel.name
      },
      date: date,
      index: index,
      grid_size: 1000
    }),
    staleTime: 1000 * 60 * 60 // Cache for 1 hour
  });

  if (isLoading) return <Spinner />;

  const option = {
    title: {
      text: `${index} Heatmap - ${date}`,
      left: 'center'
    },
    tooltip: {
      position: 'top',
      formatter: (params) => {
        const [lon, lat, value] = params.data;
        return `Lat: ${lat.toFixed(6)}<br/>
                Lon: ${lon.toFixed(6)}<br/>
                ${index}: ${value.toFixed(3)}`;
      }
    },
    visualMap: {
      min: data.statistics.min,
      max: data.statistics.max,
      calculable: true,
      realtime: true,
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9',
                '#e0f3f8', '#ffffbf', '#fee090', '#fdae61',
                '#f46d43', '#d73027', '#a50026']
      }
    },
    series: [{
      name: index,
      type: 'scatter',
      coordinateSystem: 'geo',
      data: data.pixel_data.map(p => [p.lon, p.lat, p.value]),
      symbolSize: 3,
      itemStyle: {
        opacity: 0.8
      }
    }],
    geo: {
      map: 'world',
      roam: true,
      center: [
        (data.bounds.min_lon + data.bounds.max_lon) / 2,
        (data.bounds.min_lat + data.bounds.max_lat) / 2
      ],
      zoom: 15
    }
  };

  return <EChartsReact option={option} style={{ height: '600px' }} />;
};
```

### Time Series Analysis

```typescript
import { satelliteApi } from '@/lib/satellite-api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const TimeSeriesChart = ({ parcel, index, dateRange }) => {
  const { data } = useQuery({
    queryKey: ['timeseries', parcel.id, index, dateRange],
    queryFn: () => satelliteApi.getTimeSeries({
      aoi: {
        geometry: parcel.boundary,
        name: parcel.name
      },
      date_range: dateRange,
      index: index,
      interval: 'week',
      cloud_coverage: 20
    })
  });

  if (!data) return <Spinner />;

  return (
    <div>
      <h3>{index} Time Series - {parcel.name}</h3>
      <LineChart width={800} height={400} data={data.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[-1, 1]} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
      <div className="statistics">
        <p>Mean: {data.statistics.mean.toFixed(3)}</p>
        <p>Min: {data.statistics.min.toFixed(3)}</p>
        <p>Max: {data.statistics.max.toFixed(3)}</p>
        <p>Std Dev: {data.statistics.std.toFixed(3)}</p>
      </div>
    </div>
  );
};
```

### Checking Available Dates

```typescript
const AvailableDatesCalendar = ({ parcel, dateRange }) => {
  const { data } = useQuery({
    queryKey: ['available-dates', parcel.id, dateRange],
    queryFn: () => satelliteApi.getAvailableDates(
      { geometry: parcel.boundary, name: parcel.name },
      dateRange.start_date,
      dateRange.end_date,
      30 // 30% cloud coverage threshold
    )
  });

  const getDateColor = (date) => {
    const dateInfo = data?.available_dates.find(d => d.date === date);
    if (!dateInfo) return 'gray';
    if (dateInfo.cloud_coverage < 10) return 'green';
    if (dateInfo.cloud_coverage < 30) return 'yellow';
    return 'orange';
  };

  return (
    <Calendar
      tileClassName={({ date }) => getDateColor(date)}
      onClickDay={(date) => handleDateSelect(date)}
    />
  );
};
```

## Best Practices

### Analysis Frequency

- **Weekly monitoring** - For active growing season
- **Bi-weekly** - For slower growth periods
- **Daily** - For stress detection and irrigation management
- **Post-event** - After storms, frosts, or other weather events

### Index Selection

- **NDVI** - First choice for general health monitoring
- **NDRE** - Add for nitrogen/fertilizer management
- **NDMI** - Essential for irrigation scheduling
- **Multiple indices** - Compare for comprehensive assessment

### Cloud Coverage Thresholds

- **0-10%** - Ideal, use for critical decisions
- **10-30%** - Acceptable for most applications
- **30-50%** - Use with caution, verify results
- **Greater than 50%** - Avoid, likely unreliable results

### Performance Optimization

- **Cache results** - Use TanStack Query with 5-minute staleTime
- **Lazy load maps** - Don't render heatmaps until needed
- **Limit date ranges** - Start with 30-90 days, expand if needed
- **Batch at night** - Schedule large jobs during off-hours
- **Progressive loading** - Show statistics first, then visualizations

## Related Features

- [Farm Management](./farm-management.md) - Define parcels for analysis
- [Task Management](./task-management.md) - Create tasks based on satellite insights
- [Reports](./reports.md) - Generate professional analysis reports
- [Subscriptions](./subscriptions.md) - Usage limits for satellite analyses

## Troubleshooting

### No Available Dates

**Issue:** Calendar shows no green dates

**Solutions:**
- Increase cloud coverage threshold (try 30-50%)
- Expand date range (Sentinel-2 has 5-day revisit)
- Check parcel boundary is valid
- Verify date range is not in future

### Analysis Fails

**Issue:** "Analysis failed" error message

**Solutions:**
- Check parcel boundary is a valid closed polygon
- Ensure date range has available imagery
- Reduce number of indices (try 1-3 at a time)
- Verify satellite service is running (check logs)
- Check Google Earth Engine credentials

### Heatmap Not Displaying

**Issue:** Blank or incorrect heatmap

**Solutions:**
- Verify pixel_data is not empty in response
- Check bounds are correct (lon/lat not reversed)
- Ensure ECharts library is properly loaded
- Validate GeoJSON coordinates are WGS84
- Check browser console for JavaScript errors

### GeoTIFF Download Fails

**Issue:** Cannot download exported GeoTIFF

**Solutions:**
- Check URL hasn't expired (7-day limit)
- Verify Supabase Storage bucket permissions
- Ensure file was actually created (check storage)
- Try regenerating the export
- Check network connectivity and firewall

### Slow Performance

**Issue:** Analysis takes too long

**Solutions:**
- Reduce spatial resolution (use 20m or 30m scale)
- Decrease parcel size (subdivide large parcels)
- Limit number of indices calculated
- Use batch processing for multiple parcels
- Check satellite service has adequate resources
