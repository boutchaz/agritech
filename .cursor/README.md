# 🌾 AgriTech Platform Builder Skill

A comprehensive Claude Code skill for building agricultural technology platforms with multi-tenant architecture, satellite data analysis, and full accounting systems.

## Overview

This skill enables Claude to help you build sophisticated agricultural SaaS platforms with:

- **Multi-Tenant Farm Management** - Complete organization hierarchy
- **Satellite Vegetation Analysis** - Google Earth Engine integration with 12+ indices
- **Double-Entry Accounting** - Full financial management system
- **AI-Powered Task Assignment** - Intelligent worker management
- **Subscription Management** - Feature-based access control

## Tech Stack

- **Frontend**: React 19 + TypeScript, Vite, TanStack Router/Query
- **Backend**: FastAPI + Python, Google Earth Engine
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Payments**: Polar.sh integration
- **Storage**: Supabase Storage
- **Maps**: Leaflet, OpenLayers
- **Charts**: ECharts, Recharts

## Quick Start

### Prerequisites

```bash
- Node.js >= 18.0.0
- Python >= 3.9
- Supabase CLI
- Docker (for local development)
```

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/agritech.git
cd agritech

# Install frontend dependencies
cd project && npm install

# Install backend dependencies
cd ../satellite-indices-service && pip install -r requirements.txt

# Start local Supabase
cd ../project && supabase start
```

### Development

```bash
# Frontend (React)
cd project && npm run dev

# Backend (FastAPI)
cd satellite-indices-service && uvicorn app.main:app --reload

# With Docker
docker-compose up -d
```

## Key Features

### 1. Multi-Tenant Farm Management

Complete organization hierarchy with farms, parcels, and sub-parcels:

```typescript
Organizations → Farms → Parcels → Sub-parcels (AOI-based)
```

**Role-Based Access Control**:
- system_admin (full platform access)
- organization_admin (org management)
- farm_manager (farm operations)
- farm_worker (task execution)
- day_laborer (limited tasks)
- viewer (read-only)

### 2. Satellite Vegetation Analysis

Process Sentinel-2 imagery with Google Earth Engine:

**Available Indices**:
- NDVI (Normalized Difference Vegetation Index)
- NDRE (Normalized Difference Red Edge)
- NDMI (Normalized Difference Moisture Index)
- MNDWI (Modified Normalized Difference Water Index)
- GCI (Green Chlorophyll Index)
- SAVI, OSAVI, MSAVI2 (soil-adjusted indices)
- PRI, MSI, MCARI, TCARI

**Features**:
- Interactive heatmaps with ECharts
- Time series analysis
- Cloud coverage filtering
- Batch processing
- GeoTIFF export

### 3. Double-Entry Accounting System

Complete financial management:

**Modules**:
- Chart of Accounts (hierarchical)
- General Ledger with journal entries
- Sales & Purchase Invoices
- Payment allocation and matching
- Cost center tracking
- Financial reports (Balance Sheet, P&L, Trial Balance)
- Multi-currency support

### 4. Worker and Task Management

**Worker Types**:
- Permanent employees (fixed salary)
- Day laborers (daily rates)
- Metayage workers (share-based)

**AI-Powered Features**:
- Optimal task assignment based on skills, availability, and cost
- Work record tracking
- Advance payment management
- Automated payment calculations

### 5. Subscription Management

Integration with Polar.sh:

- Multiple subscription tiers
- Feature-based access control
- Usage limits enforcement
- Webhook-based updates

## Project Structure

```
agritech/
├── project/                          # React frontend
│   ├── src/
│   │   ├── components/               # UI components
│   │   ├── routes/                   # TanStack Router routes
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── lib/                      # API clients & utilities
│   │   ├── schemas/                  # Zod validation schemas
│   │   ├── types/                    # TypeScript types
│   │   └── locales/                  # i18n translations
│   └── supabase/
│       ├── migrations/               # Database migrations
│       └── functions/                # Edge functions
├── satellite-indices-service/        # FastAPI backend
│   ├── app/
│   │   ├── api/                      # API endpoints
│   │   ├── services/                 # Business logic
│   │   ├── models/                   # Pydantic models
│   │   └── core/                     # Configuration
│   └── research/                     # Jupyter notebooks
└── .cursor/
    ├── skill.json                    # Skill configuration
    ├── instructions.md               # Development guidelines
    └── skill-manifest.json           # GitHub submission manifest
```

## Edge Functions

Available Supabase Edge Functions:

- `allocate-payment` - Payment to invoice allocation with GL posting
- `create-invoice` - Invoice creation with automatic calculations
- `post-invoice` - Invoice GL posting workflow
- `generate-financial-report` - Financial report generation
- `task-assignment` - AI-powered optimal worker assignment
- `irrigation-scheduling` - Irrigation recommendations
- `yield-prediction` - Yield forecasting
- `crop-planning` - Optimal crop selection
- `farm-analytics` - Performance analytics
- `polar-webhook` - Subscription management webhooks

## Environment Variables

### Frontend (.env)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SATELLITE_SERVICE_URL=http://localhost:8001
VITE_POLAR_ACCESS_TOKEN=your_polar_token
```

### Backend (.env)
```bash
GEE_SERVICE_ACCOUNT=your_gee_service_account
GEE_PRIVATE_KEY=your_gee_private_key
GEE_PROJECT_ID=your_gee_project_id
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
```

## Common Commands

### Frontend
```bash
cd project

# Development
npm run dev              # Start dev server

# Build & Test
npm run build           # Production build
npm test                # Run tests
npm run lint            # Lint code
npm run type-check      # TypeScript checking

# Database
npm run db:migrate      # Run migrations
npm run db:generate-types  # Generate TypeScript types
npm run db:push         # Push to remote
```

### Backend
```bash
cd satellite-indices-service

# Development
uvicorn app.main:app --reload --port 8001

# Testing
pytest                  # Run tests
```

### Docker
```bash
docker-compose up -d    # Start services
docker-compose down     # Stop services
docker-compose logs -f  # View logs
```

## Architecture Patterns

### Data Fetching
Always use TanStack Query with custom hooks:

```typescript
export function useParcels(farmId: string) {
  return useQuery({
    queryKey: ['parcels', { farmId }],
    queryFn: () => supabase.from('parcels').select('*').eq('farm_id', farmId),
    staleTime: 5 * 60 * 1000,
  });
}
```

### Forms
Use React Hook Form with Zod:

```typescript
const schema = z.object({ name: z.string().min(1) });
const form = useForm({ resolver: zodResolver(schema) });
```

### Authorization
Use CASL permissions:

```typescript
<Can I="create" a="Farm">
  <CreateFarmButton />
</Can>
```

## Documentation

- [Complete Architecture Guide](CLAUDE.md)
- [Repository Guidelines](AGENTS.md)
- [Quick Start Guide](project/QUICK_START.md)
- [Deployment Guide](project/DEPLOYMENT_GUIDE.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

---

**Built with ❤️ for modern agriculture**

For more information, visit [our documentation](https://github.com/your-org/agritech/wiki) or [contact our team](mailto:team@agritech.com).

