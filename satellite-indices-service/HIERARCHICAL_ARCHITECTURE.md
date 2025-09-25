# Hierarchical Architecture Support for Satellite Indices Service

This document describes the enhanced satellite-indices-service that now supports the hierarchical farm management architecture from the main project, integrating with the existing Supabase database.

## Architecture Overview

The service now supports the following hierarchy:
```
Organization
├── Farm A (Main Farm)
│   ├── Parcel A1
│   │   └── AOI (Area of Interest) A1
│   ├── Parcel A2
│   │   └── AOI A2
│   └── Parcel A3
│       └── AOI A3
│           ├── SubParcel A3_a
│           │   └── AOI A3_a
│           └── SubParcel A3_b
│               └── AOI A3_b
├── Farm B (Sub Farm)
│   ├── Parcel B1
│   ├── Parcel B2
│   └── Parcel B3
└── Farm C
    ├── Parcel C1
    ├── Parcel C2
    └── Parcel C3
```

## Database Integration

The service integrates with the existing Supabase database schema and adds new tables for satellite processing:

### New Tables Added

1. **satellite_processing_jobs** - Tracks batch processing jobs
2. **satellite_indices_data** - Stores calculated vegetation indices
3. **satellite_aois** - Area of Interest definitions
4. **cloud_coverage_checks** - Cloud coverage validation results
5. **satellite_processing_tasks** - Individual processing tasks

### Existing Tables Used

- **organizations** - Organization hierarchy
- **farms** - Farm hierarchy with parent-child relationships
- **parcels** - Individual parcels with boundaries
- **organization_users** - User permissions and roles

## New API Endpoints

### Supabase Integration Endpoints

#### Get Organization Farms
```
GET /api/supabase/organizations/{organization_id}/farms
```
Returns all farms for an organization with hierarchy information.

#### Get Farm Parcels
```
GET /api/supabase/farms/{farm_id}/parcels
```
Returns all parcels for a specific farm.

#### Get Parcel Satellite Data
```
GET /api/supabase/parcels/{parcel_id}/satellite-data?start_date=2024-01-01&end_date=2024-01-31&indices=NDVI,NDRE
```
Retrieves satellite indices data for a specific parcel.

#### Cloud Coverage Check
```
POST /api/supabase/cloud-coverage/check
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lon1, lat1], [lon2, lat2], ...]]
  },
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  },
  "max_cloud_coverage": 10.0
}
```
Checks cloud coverage availability before processing.

#### Batch Processing
```
POST /api/supabase/processing/batch
{
  "organization_id": "org-123",
  "farm_id": "farm-456",  // Optional - processes all farms if not specified
  "parcel_id": "parcel-789",  // Optional - processes all parcels if not specified
  "indices": ["NDVI", "NDRE", "GCI"],
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  },
  "cloud_coverage": 10.0,
  "scale": 10,
  "check_cloud_coverage": true,
  "priority": 5
}
```
Creates a batch processing job for multiple parcels.

#### Job Status
```
GET /api/supabase/processing/jobs/{job_id}
```
Get the status of a processing job.

#### Cancel Job
```
POST /api/supabase/processing/jobs/{job_id}/cancel
```
Cancel a running processing job.

#### Organization Statistics
```
GET /api/supabase/organizations/{organization_id}/statistics?start_date=2024-01-01&end_date=2024-01-31&indices=NDVI,NDRE
```
Get satellite indices statistics for an entire organization.

## Automated Processing

### Cron Job Support

The service includes automated processing capabilities that can be run as cron jobs:

```bash
# Process all parcels for all organizations (last 7 days)
python scripts/run_automated_processing.py

# Process specific organization
python scripts/run_automated_processing.py --organization-id org-123

# Process specific farm with custom indices
python scripts/run_automated_processing.py --farm-id farm-456 --indices NDVI,NDRE

# Dry run to see what would be processed
python scripts/run_automated_processing.py --dry-run

# Create a batch processing job instead of immediate processing
python scripts/run_automated_processing.py --create-job
```

### Cloud Coverage Pre-check

The automated processing includes intelligent cloud coverage checking:

1. **Pre-flight Check**: Before processing any parcel, the system checks if suitable satellite images are available
2. **Skip Logic**: If no suitable images are found, the parcel is skipped to avoid unnecessary processing
3. **Best Date Selection**: The system automatically selects the best available date with lowest cloud coverage
4. **Fallback Handling**: If no images meet the threshold, the system logs the issue and continues with other parcels

### Processing Logic

```python
# Example processing flow
def process_parcel(parcel, subparcel=None):
    aoi = parcel['geometry'] if not subparcel else subparcel['geometry']
    name = parcel['name'] if not subparcel else f"{parcel['name']}_{subparcel['name']}"
    start_date = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
    end_date = datetime.utcnow().strftime('%Y-%m-%d')
    max_cloud_coverage = 10  # configurable

    if has_cloud_free_image(aoi, start_date, end_date, max_cloud_coverage):
        # Proceed with index calculation and export
        calculate_and_export_indices(aoi, start_date, end_date, indices, ...)
        print(f"Processing {name}: cloud-free image found, running calculation.")
    else:
        # Log, notify, or skip
        print(f"Skipping {name}: no cloud-free images available for {start_date} to {end_date}.")
```

## Database Setup

### 1. Apply Satellite Tables Migration

Run the database migration to add the new satellite indices tables:

```sql
-- Apply the migration file
\i database/satellite_indices_tables.sql
```

### 2. Environment Configuration

Update your environment variables to include Supabase configuration:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Google Earth Engine Configuration
GEE_SERVICE_ACCOUNT=your-service-account@your-project.iam.gserviceaccount.com
GEE_PRIVATE_KEY={"type": "service_account", "project_id": "..."}
GEE_PROJECT_ID=your-gcp-project-id
```

### 3. Service Configuration

The service automatically detects the existing Supabase schema and integrates with it. No additional configuration is needed for the hierarchical structure.

## Usage Examples

### Frontend Integration

```typescript
// Get organization farms
const farms = await fetch('/api/supabase/organizations/org-123/farms');

// Get farm parcels
const parcels = await fetch('/api/supabase/farms/farm-456/parcels');

// Get satellite data for a parcel
const satelliteData = await fetch(
  '/api/supabase/parcels/parcel-789/satellite-data?start_date=2024-01-01&end_date=2024-01-31&indices=NDVI,NDRE'
);

// Create batch processing job
const job = await fetch('/api/supabase/processing/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organization_id: 'org-123',
    indices: ['NDVI', 'NDRE', 'GCI'],
    date_range: {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    },
    cloud_coverage: 10.0
  })
});
```

### Backend Processing

```python
# Process all parcels for an organization
from app.services.automated_processing_service import automated_processing_service

await automated_processing_service.process_organization_parcels('org-123')

# Create a batch job
job_id = await automated_processing_service.create_batch_processing_job(
    organization_id='org-123',
    farm_id='farm-456',
    indices=['NDVI', 'NDRE'],
    days_back=7
)
```

## Monitoring and Logging

The service provides comprehensive logging for monitoring:

- **Processing Jobs**: Track job status, progress, and completion
- **Cloud Coverage**: Log cloud coverage checks and decisions
- **Error Handling**: Detailed error logging for troubleshooting
- **Performance Metrics**: Processing time and resource usage

### Log Files

- `automated_processing.log` - Automated processing activities
- Application logs - API requests and responses
- Error logs - Processing failures and exceptions

## Security and Permissions

The service respects the existing Supabase Row Level Security (RLS) policies:

- **Organization-based Access**: Users can only access data from their organizations
- **Role-based Permissions**: Respects admin, manager, and member roles
- **Service Account Access**: Uses service keys for automated processing
- **Data Isolation**: Each organization's data is completely isolated

## Performance Considerations

### Batch Processing

- **Parallel Processing**: Multiple parcels can be processed simultaneously
- **Queue Management**: Processing tasks are queued and managed efficiently
- **Resource Limits**: Configurable limits to prevent resource exhaustion
- **Progress Tracking**: Real-time progress updates for long-running jobs

### Cloud Coverage Optimization

- **Pre-filtering**: Only process parcels with suitable images
- **Caching**: Cache cloud coverage results to avoid repeated checks
- **Smart Scheduling**: Process parcels with better image availability first
- **Fallback Strategies**: Handle cases where no suitable images are available

## Troubleshooting

### Common Issues

1. **No Suitable Images**: Check cloud coverage thresholds and date ranges
2. **Processing Failures**: Review error logs and parcel boundary data
3. **Slow Processing**: Adjust batch sizes and parallel processing limits
4. **Database Errors**: Verify Supabase connection and RLS policies

### Debug Commands

```bash
# Check cloud coverage for a specific parcel
python scripts/run_automated_processing.py --parcel-id parcel-123 --dry-run

# Test processing for a specific farm
python scripts/run_automated_processing.py --farm-id farm-456 --indices NDVI

# Check service health
curl http://localhost:8000/api/health
```

## Future Enhancements

- **Real-time Processing**: WebSocket support for real-time updates
- **Advanced Analytics**: Trend analysis and anomaly detection
- **Custom Indices**: Support for user-defined vegetation indices
- **Export Formats**: Additional export formats beyond GeoTIFF
- **Notification System**: Email/SMS alerts for processing completion
- **Dashboard Integration**: Real-time processing dashboard
