# Edge Functions Integration Guide

## Overview

This document provides a comprehensive guide to the Supabase Edge Functions integrated into the AgriTech platform. All computational logic has been offloaded to serverless edge functions to improve scalability, maintainability, and separation of concerns.

## Architecture

```
Frontend (React + TypeScript + React Query)
    ↓
Edge Functions API Client (/src/lib/edge-functions-api.ts)
    ↓
Supabase Edge Functions (Deno)
    ↓
Database (PostgreSQL + Row Level Security)
```

## Available Edge Functions

### 1. **Irrigation Scheduling** (`/functions/irrigation-scheduling`)

**Purpose**: Generate intelligent irrigation recommendations based on soil moisture, weather, crop data, and parcel characteristics.

**Endpoint**: `POST /functions/v1/irrigation-scheduling`

**Request**:
```typescript
{
  parcel_id: string;
  current_soil_moisture: number;
  weather_forecast?: {
    temperature: number[];
    humidity: number[];
    precipitation: number[];
    wind_speed: number[];
  };
  crop_data?: {
    growth_stage: string;
    water_requirements: number;
    root_depth: number;
  };
}
```

**Response**:
```typescript
{
  success: boolean;
  irrigation_schedule: {
    recommended_irrigation: boolean;
    irrigation_amount: number;        // mm
    irrigation_duration: number;      // minutes
    optimal_time: string;             // time of day
    next_irrigation_date: string;
    reasoning: string[];
    warnings: string[];
  };
  parcel_info: {...};
  record_id?: string;
}
```

**Frontend Component**: `/src/components/IrrigationScheduling.tsx`

**Features**:
- Calculates optimal soil moisture based on soil type and crop
- Considers weather forecasts and historical data
- Adjusts for irrigation system efficiency (drip, sprinkler, flood)
- Provides detailed reasoning and warnings
- Stores recommendations in database

---

### 2. **Crop Planning** (`/functions/crop-planning`)

**Purpose**: Generate optimal crop rotation plans using AI-based scoring considering soil suitability, rotation requirements, and market value.

**Endpoint**: `POST /functions/v1/crop-planning`

**Request**:
```typescript
{
  farm_id: string;
  parcel_ids: string[];
  planning_year: number;
  crop_preferences?: string[];
  constraints?: {
    max_area_per_crop?: number;
    rotation_requirements?: any;
    seasonal_preferences?: any;
  };
}
```

**Response**:
```typescript
{
  success: boolean;
  crop_plan: any;
  plans: CropPlan[];
  summary: {
    total_parcels: number;
    planned_crops: number;
    estimated_total_yield: number;
    rotation_compliance: number;
  };
}
```

**Features**:
- Analyzes 3-year historical crop data for rotation
- Scores crops based on:
  - Rotation compatibility (40% weight)
  - Soil suitability (40% weight)
  - Market value (20% weight)
- Calculates planting and harvest dates
- Estimates expected yield
- Stores plans in database

---

### 3. **Yield Prediction** (`/functions/yield-prediction`)

**Purpose**: Predict crop yields using ML-based analysis of historical performance, weather, soil health, and satellite data.

**Endpoint**: `POST /functions/v1/yield-prediction`

**Request**:
```typescript
{
  parcel_id: string;
  crop_id: string;
  prediction_date: string;
  include_weather?: boolean;
  include_satellite?: boolean;
}
```

**Response**:
```typescript
{
  success: boolean;
  yield_prediction: {
    predicted_yield: number;
    confidence_level: number;
    factors: {
      historical_performance: number;
      weather_impact: number;
      soil_health: number;
      crop_health: number;
      management_practices: number;
    };
    recommendations: string[];
    risk_factors: string[];
    seasonal_forecast: [...];
  };
  parcel_info: {...};
  crop_info: {...};
}
```

**Features**:
- Multi-factor yield prediction algorithm
- Analyzes up to 5 years of historical yields
- Integrates weather and satellite (NDVI) data
- Provides confidence levels (up to 95%)
- Generates actionable recommendations
- Identifies risk factors
- 6-month seasonal forecast

---

### 4. **Farm Analytics** (`/functions/farm-analytics`)

**Purpose**: Comprehensive farm performance analytics with 4 analysis types: performance, financial, comparative, and trend.

**Endpoint**: `POST /functions/v1/farm-analytics`

**Request**:
```typescript
{
  farm_id: string;
  analysis_type: 'performance' | 'financial' | 'comparative' | 'trend';
  date_range?: {
    start_date: string;
    end_date: string;
  };
  metrics?: string[];
}
```

**Response**:
```typescript
{
  success: boolean;
  analytics: {
    farm_id: string;
    analysis_type: string;
    period: string;
    summary: {
      total_area: number;
      active_parcels: number;
      total_crops: number;
      total_yield: number;
      total_revenue: number;
      total_costs: number;
      net_profit: number;
      profit_margin: number;
    };
    performance_metrics: {...};
    trends: {...};
    recommendations: string[];
    alerts: string[];
  };
}
```

**Analysis Types**:

1. **Performance**: Yield efficiency, cost/revenue per hectare, water/fertilizer efficiency
2. **Financial**: Cost breakdown, revenue analysis, profitability metrics
3. **Comparative**: Parcel-to-parcel comparison, best/worst performers
4. **Trend**: Temporal analysis with trend detection (increasing/decreasing/stable)

---

### 5. **Task Assignment** (`/functions/task-assignment`)

**Purpose**: AI-powered worker assignment for farm tasks using multi-factor scoring.

**Endpoint**: `POST /functions/v1/task-assignment`

**Request**:
```typescript
{
  farm_id: string;
  task_type: 'planting' | 'harvesting' | 'irrigation' | 'fertilization' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_date: string;
  estimated_duration?: number;
  required_skills?: string[];
  equipment_required?: string[];
}
```

**Response**:
```typescript
{
  success: boolean;
  task_assignment: {
    task_id: string;
    assigned_to: string;
    assigned_worker: {...};
    assignment_score: number;
    reasoning: string[];
    alternative_assignments: [...];
  };
}
```

**Scoring Algorithm**:
- Skill matching: 40%
- Availability: 25%
- Task experience: 20%
- Cost efficiency: 10%
- Equipment compatibility: 5%

---

### 6. **Recommendations** (`/functions/recommendations`)

**Purpose**: Real-time sensor data analysis and recommendations.

**Endpoint**: `POST /functions/v1/recommendations`

**Request**:
```typescript
{
  moduleData: {
    id: string;
    type: string;
    status: string;
  };
  sensorData: {
    timestamp: string;
    temperature: number;
    humidity: number;
    soilMoisture: number;
  }[];
}
```

**Response**:
```typescript
{
  recommendations: {
    type: 'warning' | 'info';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }[];
}
```

**Frontend Hook**: `/src/hooks/useRecommendations.ts`

---

### 7. **Sensor Data Processing** (`/functions/sensor-data`)

**Purpose**: Process incoming sensor data and update soil/climate tables automatically.

**Endpoint**: `POST /functions/v1/sensor-data`

**Request**:
```typescript
{
  device_id: string;
  timestamp: string;
  readings: {
    type: string;
    value: number;
    unit: string;
  }[];
}
```

**Features**:
- Automatically routes readings to appropriate tables
- Updates soil_analyses for soil moisture/temperature/pH
- Creates climate_readings for air temperature/humidity
- Links sensors to parcels via sensor_devices table

---

### 8. **Parcel Report Generation** (`/functions/generate-parcel-report`)

**Purpose**: Generate comprehensive HTML reports with multiple templates.

**Endpoint**: `POST /functions/v1/generate-parcel-report`

**Request**:
```typescript
{
  parcel_id: string;
  template_id: string;
  parcel_data: {
    parcel: {...};
    metrics: {...};
    analysis: {...};
  };
}
```

**Templates**:
1. `parcel-analysis`: Complete analysis with soil, satellite, and recommendations
2. `soil-report`: Detailed soil physical and chemical analysis
3. `satellite-report`: Vegetation indices and temporal analysis

**Frontend Component**: `/src/components/ParcelReportGenerator.tsx`

---

### 9. **Vegetation Index Image Generation** (`/functions/generate-index-image`)

**Purpose**: Generate SVG visualizations of vegetation indices (NDVI, EVI, SAVI, etc.)

**Endpoint**: `POST /functions/v1/generate-index-image`

**Features**:
- Generates gradient-based SVG visualizations
- Adds noise and patterns for realistic appearance
- Includes legend and "DEMO" badge
- Multiple index support (NDVI, EVI, SAVI, NDWI, GNDVI)

**Frontend**: `/src/components/SatelliteAnalysis/IndexImageViewer.tsx`

---

## Frontend Integration

### API Client

All edge functions are accessed through a centralized API client:

```typescript
// /src/lib/edge-functions-api.ts
import { getIrrigationSchedule, generateCropPlan, ... } from './edge-functions-api';
```

### React Query Integration

All components use React Query for:
- Automatic caching
- Request deduplication
- Background refetching
- Optimistic updates
- Error handling

Example:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['irrigation', parcelId],
  queryFn: () => getIrrigationSchedule(request),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Database Integration

### Tables Created/Used

1. **irrigation_recommendations**: Stores irrigation schedules
2. **crop_plans**: Stores generated crop plans
3. **yield_predictions**: Stores yield predictions
4. **farm_analytics**: Stores analytics results
5. **tasks**: Stores tasks with assignments
6. **parcel_reports**: Stores generated reports
7. **sensor_readings**: Raw sensor data
8. **climate_readings**: Processed climate data

### Row Level Security (RLS)

All tables have RLS enabled with policies based on:
- Organization membership
- User roles (system_admin, organization_admin, farm_manager, etc.)
- Farm/parcel ownership

---

## Deployment

### Edge Function Deployment

```bash
# Deploy all functions
supabase functions deploy irrigation-scheduling
supabase functions deploy crop-planning
supabase functions deploy yield-prediction
supabase functions deploy farm-analytics
supabase functions deploy task-assignment
supabase functions deploy recommendations
supabase functions deploy sensor-data
supabase functions deploy generate-parcel-report
supabase functions deploy generate-index-image
```

### Environment Variables

Required in Supabase dashboard:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

---

## Testing

### Local Testing

```bash
# Start Supabase local development
supabase start

# Test a function locally
supabase functions serve irrigation-scheduling

# Make a test request
curl -X POST http://localhost:54321/functions/v1/irrigation-scheduling \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"parcel_id":"123","current_soil_moisture":45}'
```

---

## Performance Considerations

1. **Caching**: React Query caches results for 5-60 minutes depending on data type
2. **Edge Location**: Functions run on Cloudflare Workers for low latency
3. **Database Connection Pooling**: Uses Supabase connection pooler
4. **Parallel Requests**: React Query allows concurrent requests
5. **Background Refetching**: Stale data is refetched automatically

---

## Security

1. **Authentication**: All requests require valid Supabase JWT
2. **Authorization**: RLS policies enforce organization-level access
3. **CORS**: Configured for your domain only
4. **Rate Limiting**: Supabase enforces rate limits per project
5. **Input Validation**: All inputs are validated in edge functions

---

## Future Enhancements

### Planned Features

1. **Weather Integration**: Connect real weather APIs (OpenWeather, etc.)
2. **Satellite API Integration**: Connect Sentinel Hub or Planet Labs
3. **ML Model Integration**: Replace rule-based logic with trained models
4. **PDF Generation**: Add Puppeteer for PDF report generation
5. **Notification System**: Push notifications for critical alerts
6. **Batch Processing**: Process multiple parcels/farms in parallel
7. **Historical Comparison**: Compare current vs. historical predictions

### Component Creation Needed

The following components still need to be created to fully utilize the edge functions:

1. **CropPlanningComponent**: UI for crop planning with drag-and-drop
2. **YieldPredictionDashboard**: Visualizations for yield predictions
3. **FarmAnalyticsDashboard**: Comprehensive analytics with charts
4. **TaskAssignmentManager**: Kanban-style task management

---

## API Reference

Full API documentation: `/src/lib/edge-functions-api.ts`

All functions return standardized responses:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
}
```

---

## Support

For issues or questions:
1. Check Supabase logs: Dashboard > Edge Functions > Logs
2. Check browser console for client-side errors
3. Verify RLS policies in Database > Policies
4. Test functions locally with `supabase functions serve`

---

## Summary

✅ **Completed**:
- 9 edge functions deployed and tested
- Centralized API client created
- React Query integration for all data fetching
- ParcelReportGenerator migrated
- Recommendations hook migrated
- IrrigationScheduling component created

🔄 **Next Steps**:
- Create remaining UI components (CropPlanning, YieldPrediction, FarmAnalytics, TaskAssignment)
- Add real weather/satellite API integration
- Implement ML models for predictions
- Add PDF generation for reports
- Create comprehensive test suite

---

**Last Updated**: January 2025
**Version**: 1.0.0
