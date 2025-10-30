# Satellite Integration Guide

This guide explains how to integrate with the satellite-indices-service to add vegetation analysis, heatmaps, and satellite imagery features to your AgriTech Platform components.

## Overview

The AgriTech Platform uses a separate **FastAPI satellite service** that interfaces with **Google Earth Engine (GEE)** for Sentinel-2 satellite imagery analysis. The service provides:

- Vegetation indices (NDVI, NDRE, NDMI, etc.)
- Time-series analysis
- Interactive heatmaps
- Cloud-filtered imagery
- GeoTIFF exports

## Architecture

```
Frontend (React)
    ↓ HTTP requests
Satellite Service (FastAPI)
    ↓ Python Earth Engine API
Google Earth Engine
    ↓ Sentinel-2 imagery
Results → Storage (GeoTIFF) / Database (statistics)
```

## Available Vegetation Indices

| Index | Description | Use Case |
|-------|-------------|----------|
| NDVI | Normalized Difference Vegetation Index | Overall vegetation health |
| NDRE | Normalized Difference Red Edge | Crop health, nitrogen status |
| NDMI | Normalized Difference Moisture Index | Plant water stress |
| MNDWI | Modified NDWI | Water bodies, irrigation |
| GCI | Green Chlorophyll Index | Chlorophyll content |
| SAVI | Soil Adjusted Vegetation Index | Low vegetation cover areas |
| OSAVI | Optimized SAVI | Better than SAVI for sparse vegetation |
| MSAVI2 | Modified SAVI | Further improved for sparse vegetation |
| PRI | Photochemical Reflectance Index | Light use efficiency |
| MSI | Moisture Stress Index | Plant water stress |
| MCARI | Modified Chlorophyll Absorption Ratio Index | Chlorophyll concentration |
| TCARI | Transformed CARI | Chlorophyll content with reduced soil effects |

## API Client

The platform provides a pre-configured API client at `/project/src/lib/satellite-api.ts`:

```typescript
import { satelliteApi } from '@/lib/satellite-api';

// Check available dates for a parcel
const dates = await satelliteApi.getAvailableDates({
  aoi: { geometry: parcel.boundary },
  date_range: { start_date: '2024-01-01', end_date: '2024-12-31' },
  cloud_coverage: 10,
});

// Calculate indices
const result = await satelliteApi.calculateIndices({
  aoi: { geometry: parcel.boundary, name: parcel.name },
  date_range: { start_date: '2024-06-01', end_date: '2024-06-01' },
  indices: ['NDVI', 'NDRE', 'NDMI'],
  use_aoi_cloud_filter: true,
  cloud_buffer_meters: 300,
});

// Get heatmap data for visualization
const heatmap = await satelliteApi.getHeatmap({
  aoi: { geometry: parcel.boundary },
  date_range: { start_date: '2024-06-01', end_date: '2024-06-01' },
  index: 'NDVI',
});
```

## Step-by-Step Integration

### Step 1: Create Custom Hook

**File:** `/project/src/hooks/useSatelliteAnalysis.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { satelliteApi, VegetationIndexType } from '@/lib/satellite-api';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

export interface AOI {
  type: 'Polygon';
  coordinates: number[][][];
}

export const useAvailableDates = (
  parcel: { id: string; boundary: AOI } | null,
  dateRange: { start: string; end: string }
) => {
  return useQuery({
    queryKey: ['satellite-dates', parcel?.id, dateRange],
    queryFn: async () => {
      if (!parcel) throw new Error('No parcel selected');

      const result = await satelliteApi.getAvailableDates({
        aoi: { geometry: parcel.boundary },
        date_range: {
          start_date: dateRange.start,
          end_date: dateRange.end,
        },
        cloud_coverage: 10,
      });

      return result.dates;
    },
    enabled: !!parcel,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (dates don't change frequently)
  });
};

export const useCalculateIndices = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({
      parcel,
      date,
      indices,
    }: {
      parcel: { id: string; name: string; boundary: AOI };
      date: string;
      indices: VegetationIndexType[];
    }) => {
      // Calculate indices via satellite service
      const result = await satelliteApi.calculateIndices({
        aoi: {
          geometry: parcel.boundary,
          name: parcel.name,
        },
        date_range: {
          start_date: date,
          end_date: date,
        },
        indices,
        use_aoi_cloud_filter: true,
        cloud_buffer_meters: 300,
        scale: 10,
      });

      // Save to database
      const { data: savedData, error } = await supabase
        .from('satellite_data')
        .insert({
          parcel_id: parcel.id,
          organization_id: currentOrganization!.id,
          date: date,
          indices: result.indices.reduce((acc, idx) => ({
            ...acc,
            [idx.index]: idx.value,
          }), {}),
          statistics: result.statistics,
          cloud_coverage: result.cloud_coverage,
          image_source: result.image_source,
        })
        .select()
        .single();

      if (error) throw error;

      return savedData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['satellite-data', variables.parcel.id],
      });
    },
  });
};

export const useHeatmapData = (
  parcel: { id: string; boundary: AOI } | null,
  date: string | null,
  index: VegetationIndexType
) => {
  return useQuery({
    queryKey: ['satellite-heatmap', parcel?.id, date, index],
    queryFn: async () => {
      if (!parcel || !date) throw new Error('Missing parcel or date');

      const result = await satelliteApi.getHeatmap({
        aoi: { geometry: parcel.boundary },
        date_range: {
          start_date: date,
          end_date: date,
        },
        index,
        use_aoi_cloud_filter: true,
        cloud_buffer_meters: 300,
      });

      return result;
    },
    enabled: !!parcel && !!date,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
};

export const useTimeSeries = (
  parcel: { id: string; boundary: AOI } | null,
  dateRange: { start: string; end: string },
  index: VegetationIndexType
) => {
  return useQuery({
    queryKey: ['satellite-timeseries', parcel?.id, dateRange, index],
    queryFn: async () => {
      if (!parcel) throw new Error('No parcel selected');

      const result = await satelliteApi.getTimeSeries({
        aoi: { geometry: parcel.boundary },
        date_range: {
          start_date: dateRange.start,
          end_date: dateRange.end,
        },
        index,
        interval: 'week',
      });

      return result;
    },
    enabled: !!parcel,
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });
};

export const useExportGeoTIFF = () => {
  return useMutation({
    mutationFn: async ({
      parcel,
      date,
      index,
    }: {
      parcel: { id: string; name: string; boundary: AOI };
      date: string;
      index: VegetationIndexType;
    }) => {
      const result = await satelliteApi.exportGeoTIFF({
        aoi: {
          geometry: parcel.boundary,
          name: parcel.name,
        },
        date_range: {
          start_date: date,
          end_date: date,
        },
        index,
      });

      return result;
    },
  });
};
```

### Step 2: Create Heatmap Visualization Component

**File:** `/project/src/components/SatelliteAnalysis/HeatmapViewer.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Loader2 } from 'lucide-react';

export interface HeatmapViewerProps {
  data: {
    latitude: number[];
    longitude: number[];
    values: number[][];
  } | null;
  index: string;
  isLoading?: boolean;
  className?: string;
}

export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({
  data,
  index,
  isLoading,
  className = '',
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    // Initialize chart
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;

    // Prepare heatmap data
    const heatmapData = [];
    for (let i = 0; i < data.latitude.length; i++) {
      for (let j = 0; j < data.longitude.length; j++) {
        heatmapData.push([j, i, data.values[i][j]]);
      }
    }

    // Configure chart
    const option = {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          return `${index}: ${params.value[2].toFixed(3)}`;
        },
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '10%',
        top: '5%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.longitude.map((lon) => lon.toFixed(4)),
        splitArea: { show: true },
        axisLabel: { fontSize: 10, rotate: 45 },
      },
      yAxis: {
        type: 'category',
        data: data.latitude.map((lat) => lat.toFixed(4)),
        splitArea: { show: true },
        axisLabel: { fontSize: 10 },
      },
      visualMap: {
        min: Math.min(...data.values.flat()),
        max: Math.max(...data.values.flat()),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'],
        },
      },
      series: [
        {
          name: index,
          type: 'heatmap',
          data: heatmapData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };

    chart.setOption(option);

    // Cleanup
    return () => {
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [data, index]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <p className="text-gray-500">No heatmap data available</p>
      </div>
    );
  }

  return <div ref={chartRef} className={`h-96 ${className}`} />;
};
```

### Step 3: Create Time Series Chart

**File:** `/project/src/components/SatelliteAnalysis/TimeSeriesChart.tsx`

```typescript
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

export interface TimeSeriesChartProps {
  data: Array<{ date: string; value: number }>;
  index: string;
  className?: string;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  index,
  className = '',
}) => {
  const chartData = data.map((point) => ({
    date: format(parseISO(point.date), 'MMM dd'),
    value: point.value,
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[-1, 1]} />
          <Tooltip
            formatter={(value: number) => value.toFixed(3)}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={2}
            name={index}
            dot={{ fill: '#10b981' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### Step 4: Create Analysis Page

**File:** `/project/src/components/SatelliteAnalysis/AnalysisView.tsx`

```typescript
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/Select';
import { HeatmapViewer } from './HeatmapViewer';
import { TimeSeriesChart } from './TimeSeriesChart';
import { useAvailableDates, useHeatmapData, useTimeSeries, useCalculateIndices } from '@/hooks/useSatelliteAnalysis';
import { VegetationIndexType } from '@/lib/satellite-api';
import { toast } from 'sonner';

const VEGETATION_INDICES: VegetationIndexType[] = [
  'NDVI', 'NDRE', 'NDMI', 'MNDWI', 'GCI', 'SAVI', 'OSAVI', 'MSAVI2', 'PRI', 'MSI', 'MCARI', 'TCARI'
];

export interface AnalysisViewProps {
  parcel: {
    id: string;
    name: string;
    boundary: { type: 'Polygon'; coordinates: number[][][] };
  };
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ parcel }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<VegetationIndexType>('NDVI');
  const [dateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    end: new Date().toISOString().split('T')[0], // today
  });

  const { data: availableDates = [], isLoading: datesLoading } = useAvailableDates(parcel, dateRange);
  const { data: heatmapData, isLoading: heatmapLoading } = useHeatmapData(parcel, selectedDate, selectedIndex);
  const { data: timeSeriesData } = useTimeSeries(parcel, dateRange, selectedIndex);
  const calculateMutation = useCalculateIndices();

  const handleCalculate = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      await calculateMutation.mutateAsync({
        parcel,
        date: selectedDate,
        indices: [selectedIndex],
      });
      toast.success('Analysis completed successfully');
    } catch (error) {
      toast.error('Failed to calculate indices');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vegetation Index</label>
              <Select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(e.target.value as VegetationIndexType)}
              >
                {VEGETATION_INDICES.map((index) => (
                  <option key={index} value={index}>
                    {index}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <Select
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={datesLoading}
              >
                <option value="">Select date</option>
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleCalculate}
                disabled={!selectedDate || calculateMutation.isPending}
                className="w-full"
              >
                {calculateMutation.isPending ? 'Calculating...' : 'Calculate Indices'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Heatmap - {selectedIndex}</CardTitle>
        </CardHeader>
        <CardContent>
          <HeatmapViewer
            data={heatmapData}
            index={selectedIndex}
            isLoading={heatmapLoading}
          />
        </CardContent>
      </Card>

      {/* Time Series */}
      {timeSeriesData && (
        <Card>
          <CardHeader>
            <CardTitle>Time Series - {selectedIndex}</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={timeSeriesData.data}
              index={selectedIndex}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

## Cloud Masking Strategy

The satellite service uses advanced cloud masking:

```typescript
// Default: AOI-based cloud filtering
const result = await satelliteApi.calculateIndices({
  aoi: { geometry: parcel.boundary },
  use_aoi_cloud_filter: true,  // Calculate cloud coverage within AOI only
  cloud_buffer_meters: 300,     // 300m buffer around AOI
  cloud_coverage: 10,           // Max 10% cloud coverage
});
```

**How it works:**
1. Service checks for cloud-free images within the AOI
2. Adds a 300m buffer to account for edge effects
3. Rejects images with > 10% cloud coverage in the buffered AOI
4. Returns the clearest available image

## Best Practices

### 1. Pre-check Cloud Coverage

Before expensive calculations, check if cloud-free images exist:

```typescript
const cloudCheck = await satelliteApi.checkCloudCoverage({
  aoi: { geometry: parcel.boundary },
  date_range: { start_date, end_date },
  cloud_coverage: 10,
});

if (!cloudCheck.has_clear_images) {
  toast.warning('No cloud-free images available for this date range');
  return;
}
```

### 2. Cache Results Aggressively

Satellite data doesn't change, so cache it:

```typescript
const { data } = useQuery({
  queryKey: ['satellite-data', parcelId, date],
  queryFn: fetchSatelliteData,
  staleTime: Infinity, // Never goes stale
  cacheTime: 1000 * 60 * 60 * 24, // 24 hours
});
```

### 3. Use Batch Processing

For multiple parcels, use batch processing:

```typescript
const batchResult = await satelliteApi.batchProcess({
  parcels: parcels.map(p => ({
    aoi: { geometry: p.boundary, name: p.name },
  })),
  date_range: { start_date, end_date },
  indices: ['NDVI', 'NDRE'],
});

// Poll for results
const jobStatus = await satelliteApi.getBatchStatus(batchResult.job_id);
```

### 4. Handle Errors Gracefully

```typescript
try {
  const result = await satelliteApi.calculateIndices(params);
} catch (error) {
  if (error.message.includes('No images found')) {
    toast.warning('No satellite images available for this date');
  } else if (error.message.includes('cloud coverage')) {
    toast.warning('Only cloudy images available');
  } else {
    toast.error('Failed to calculate indices');
  }
}
```

## Troubleshooting

### Issue 1: "No images found"

**Cause:** No Sentinel-2 imagery available for date/AOI

**Solution:**
- Check available dates first using `getAvailableDates`
- Expand date range
- Verify AOI geometry is valid

### Issue 2: High cloud coverage

**Cause:** All images have clouds

**Solution:**
```typescript
// Increase cloud tolerance temporarily
cloud_coverage: 20, // Allow up to 20% clouds

// Or use different date
```

### Issue 3: Timeout errors

**Cause:** Large AOI or complex calculations

**Solution:**
```typescript
// Reduce AOI size or use lower resolution
scale: 20, // 20m instead of 10m

// Or split into sub-parcels
```

## Checklist

- [ ] Satellite service running and accessible
- [ ] Custom hooks created for data fetching
- [ ] Heatmap visualization component implemented
- [ ] Time series chart component implemented
- [ ] Cloud masking strategy configured
- [ ] Error handling implemented
- [ ] Loading states shown to user
- [ ] Results cached appropriately
- [ ] Available dates pre-checked
- [ ] GeoTIFF export functionality (optional)

## Next Steps

- [Testing Guide](./testing.md) - Test satellite integrations
- [Deployment](./deployment.md) - Deploy satellite service

## Reference

- **Satellite API Client:** `/project/src/lib/satellite-api.ts`
- **Satellite Service:** `/satellite-indices-service/`
- **Google Earth Engine Docs:** https://developers.google.com/earth-engine
- **Sentinel-2 Info:** https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2
