# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive AgriTech platform consisting of three main components:
1. **React Frontend** (`/project`) - Farm management dashboard with Supabase integration
2. **Satellite Indices Service** (`/satellite-indices-service`) - FastAPI microservice for vegetation indices calculation
3. **Research Notebooks** (`/satellite-indices-service/research`) - Jupyter notebooks for satellite imagery analysis

## Project Structure

```
agritech/
├── project/                     # React frontend application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities (Supabase client)
│   │   └── types/              # TypeScript type definitions
│   └── package.json
├── satellite-indices-service/   # FastAPI backend service
│   ├── app/
│   │   ├── api/                # API endpoints
│   │   ├── core/               # Configuration
│   │   ├── models/             # Pydantic models
│   │   └── services/           # Business logic (Earth Engine)
│   └── research/               # Original Jupyter notebooks
└── supabase/                   # Supabase configuration
```

## Frontend (React Application)

### Development Commands
```bash
cd project
npm install         # Install dependencies
npm run dev        # Start development server (Vite)
npm run build      # Build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Key Technologies
- **React 18** with TypeScript
- **Vite** as build tool
- **Tailwind CSS** for styling
- **Supabase** for backend services
- **React Router** for navigation
- **Recharts** for data visualization
- **OpenLayers** (`ol`) for mapping
- **Lucide React** for icons

### Core Modules
The application manages various agricultural modules:
- **Agriculture**: Fruit Trees, Mushrooms, Greenhouses, Hydroponics, Market Gardening, Aquaculture, Beekeeping
- **Livestock**: Cattle, Camels, Goats, Laying Hens, Chicks, Broilers, Incubators

### Environment Variables
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Main Application Routes
- `/` or `/dashboard` - Main dashboard
- `/settings` - Module and dashboard settings
- `/soil-analysis` - Soil analysis page
- `/parcels` - Parcel management with maps
- `/stock` - Stock management
- `/infrastructure` - Infrastructure management
- `/employees` - Employee management
- `/day-laborers` - Day laborer management
- `/utilities` - Utilities management
- `/reports` - Report generation
- `/{module-id}` - Dynamic routes for active modules

## Backend (Satellite Indices Service)

### Development Commands
```bash
cd satellite-indices-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Docker Commands
```bash
docker-compose up --build    # Run with Docker Compose
docker build -t satellite-indices-service .
docker run -p 8000:8000 --env-file .env satellite-indices-service
```

### API Endpoints
- `GET /api/health` - Health check
- `POST /api/indices/calculate` - Calculate vegetation indices
- `POST /api/indices/timeseries` - Get time series data
- `POST /api/indices/export` - Export GeoTIFF
- `GET /api/indices/available` - List available indices
- `POST /api/analysis/statistics` - Calculate statistics
- `POST /api/analysis/compare` - Compare periods

### Vegetation Indices Available
NDVI, NDRE, NDMI, MNDWI, GCI, SAVI, OSAVI, MSAVI2, PRI, MSI, MCARI, TCARI

### Environment Configuration
- `GEE_SERVICE_ACCOUNT` - Google Earth Engine service account
- `GEE_PRIVATE_KEY` - GEE private key (JSON)
- `GEE_PROJECT_ID` - Google Cloud project ID
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service key

## Integration Architecture

The frontend React application communicates with:
1. **Supabase** for authentication, database, and real-time features
2. **Satellite Indices Service** for vegetation analysis via REST API

The satellite service processes Sentinel-2 imagery using Google Earth Engine to provide:
- Real-time vegetation index calculations
- Historical time series analysis
- Statistical comparisons between periods
- GeoTIFF exports for GIS integration

## Deployment

### Frontend Deployment
The React app can be deployed to any static hosting service (Vercel, Netlify, etc.) after building:
```bash
npm run build
# Deploy dist/ folder
```

### Backend Deployment (Dokploy)
The satellite service includes `dokploy.yml` for automated deployment with:
- Auto-scaling (1-5 replicas)
- Health checks
- SSL support
- Resource limits configuration

## Key Configuration Files

- `project/vite.config.ts` - Vite configuration
- `project/tailwind.config.js` - Tailwind CSS configuration
- `satellite-indices-service/dokploy.yml` - Dokploy deployment config
- `satellite-indices-service/docker-compose.yml` - Docker Compose configuration