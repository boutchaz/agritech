# Satellite Indices Service

Production-ready microservice for calculating agricultural vegetation indices from Sentinel-2 satellite imagery.

## Features

- **Vegetation Indices**: Calculate 12+ indices (NDVI, NDRE, NDMI, MNDWI, GCI, SAVI, etc.)
- **Interactive Visualizations**: ECharts-powered heatmaps with hover data and statistics
- **Time Series Analysis**: Track index changes over time
- **Statistical Analysis**: Compare periods and calculate statistics
- **GeoTIFF Export**: Download processed imagery
- **Real-time Data**: Pixel-level values with coordinates and interactive exploration
- **RESTful API**: FastAPI-based service with automatic documentation
- **Scalable**: Docker containerized with Dokploy deployment support

## API Endpoints

### Health Check
- `GET /api/health` - Service health status
- `GET /api/health/ready` - Readiness probe

### Indices Calculation
- `POST /api/indices/calculate` - Calculate indices for AOI
- `POST /api/indices/timeseries` - Get time series data
- `POST /api/indices/export` - Export index map as GeoTIFF or interactive data
- `POST /api/indices/interactive` - Get interactive scatter plot data
- `POST /api/indices/heatmap` - Get heatmap data for ECharts visualization
- `GET /api/indices/available` - List available indices

### Analysis
- `POST /api/analysis/statistics` - Calculate statistics
- `POST /api/analysis/compare` - Compare two periods

## Quick Start

### Local Development

1. Clone and navigate to service:
```bash
cd satellite-indices-service
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

5. Run the service:
```bash
uvicorn app.main:app --reload --port 8000
```

6. Access API documentation:
```
http://localhost:8000/docs
```

### Docker Deployment

1. Build and run with Docker Compose:
```bash
docker-compose up --build
```

2. Or build manually:
```bash
docker build -t satellite-indices-service .
docker run -p 8000:8000 --env-file .env satellite-indices-service
```

## Dokploy Deployment

1. Push to your Git repository
2. In Dokploy dashboard:
   - Create new application
   - Select "Dockerfile" deployment
   - Configure environment variables
   - Deploy using `dokploy.yml` configuration

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEE_SERVICE_ACCOUNT` | Google Earth Engine service account email | Yes |
| `GEE_PRIVATE_KEY` | GEE service account private key (JSON) | Yes |
| `GEE_PROJECT_ID` | Google Cloud project ID | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service key | Yes |

## API Usage Examples

### Calculate NDVI for an Area

```bash
curl -X POST "http://localhost:8000/api/indices/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "aoi": {
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-8.514, 31.278], [-8.514, 31.280], [-8.510, 31.280], [-8.510, 31.278], [-8.514, 31.278]]]
      },
      "name": "Test Field"
    },
    "date_range": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31"
    },
    "indices": ["NDVI", "NDRE"],
    "cloud_coverage": 10
  }'
```

### Get Time Series Data

```bash
curl -X POST "http://localhost:8000/api/indices/timeseries" \
  -H "Content-Type: application/json" \
  -d '{
    "aoi": {
      "geometry": {
        "type": "Point",
        "coordinates": [-8.514, 31.279]
      }
    },
    "date_range": {
      "start_date": "2024-01-01",
      "end_date": "2024-12-31"
    },
    "index": "NDVI",
    "interval": "month"
  }'
```

## Integration with React/Supabase Frontend

```typescript
// Example React integration
const calculateIndices = async (aoi: GeoJSON, dateRange: DateRange) => {
  const response = await fetch(`${API_URL}/api/indices/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseToken}`
    },
    body: JSON.stringify({
      aoi,
      date_range: dateRange,
      indices: ['NDVI', 'NDRE', 'GCI']
    })
  });
  
  return response.json();
};
```

## Available Vegetation Indices

- **NDVI**: Normalized Difference Vegetation Index
- **NDRE**: Normalized Difference Red Edge
- **NDMI**: Normalized Difference Moisture Index
- **MNDWI**: Modified Normalized Difference Water Index
- **GCI**: Green Chlorophyll Index
- **SAVI**: Soil Adjusted Vegetation Index
- **OSAVI**: Optimized Soil Adjusted Vegetation Index
- **MSAVI2**: Modified Soil Adjusted Vegetation Index 2
- **PRI**: Photochemical Reflectance Index
- **MSI**: Moisture Stress Index
- **MCARI**: Modified Chlorophyll Absorption Index
- **TCARI**: Transformed Chlorophyll Absorption Index

## Architecture

```
satellite-indices-service/
├── app/
│   ├── api/           # API endpoints
│   ├── core/          # Core configuration
│   ├── models/        # Pydantic models
│   ├── services/      # Business logic
│   └── main.py        # FastAPI application
├── research/          # Original notebooks
├── tests/             # Test suite
├── Dockerfile         # Container definition
├── dokploy.yml        # Dokploy deployment config
└── requirements.txt   # Python dependencies
```

## Testing

```bash
# Run tests
pytest tests/

# With coverage
pytest --cov=app tests/
```

## Monitoring

The service includes Prometheus metrics at `/metrics` endpoint for monitoring:
- Request count and latency
- Earth Engine API calls
- Processing time per index
- Error rates

## License

MIT