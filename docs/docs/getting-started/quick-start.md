---
sidebar_position: 2
---

# Quick Start

Get the AgroGina Platform running locally in about 10 minutes.

## 1. Clone and Install

```bash
git clone https://github.com/agritech/platform.git agritech
cd agritech
pnpm install
```

## 2. Configure Environment

```bash
# Copy environment templates
cp agritech-api/.env.example agritech-api/.env
cp project/.env.example project/.env
```

Edit the `.env` files with your values:

```bash
# agritech-api/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agritech
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-secret-here
```

## 3. Start Services

```bash
# Start database and services
docker-compose up -d

# Run migrations
cd agritech-api
pnpm migration:run
```

## 4. Run Development Servers

```bash
# Terminal 1: Backend
cd agritech-api
pnpm start:dev

# Terminal 2: Frontend
cd project
pnpm dev
```

## 5. Access the Platform

| Service | URL |
|---------|-----|
| Frontend App | http://localhost:5173 |
| API Documentation | http://localhost:3001/api |
| GraphQL Playground | http://localhost:3001/graphql |

## 6. Create Your Account

1. Open http://localhost:5173
2. Click "Sign Up"
3. Enter your email and password
4. Complete onboarding to select your modules

## 7. Create Your First Farm

```bash
# Or use the API directly
curl -X POST http://localhost:3001/organizations/:orgId/farms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Farm",
    "area_hectares": 50,
    "location_lat": 40.7128,
    "location_lng": -74.0060
  }'
```

## Module System Quick Reference

The platform uses **subscription-based modules**:

### Available Modules

| Module | Slug | Plan Tier |
|--------|------|-----------|
| Fruit Trees | `fruit-trees` | Essential |
| Cereals | `cereals` | Essential |
| Vegetables | `vegetables` | Essential |
| Mushrooms | `mushrooms` | Professional |
| Livestock | `livestock` | Professional |
| Satellite Analysis | `satellite` | Professional |

### Module-Based Routing

Access features using module filters on generic routes:

```
/crops?module=fruit-trees     # Fruit tree crops
/crops?module=cereals         # Cereal crops
/planting?module=vegetables   # Vegetable planting
```

## Common Development Tasks

### Add a New Farm

```typescript
// Using the API client
import { farmsService } from '@/services/farmsService';

const farm = await farmsService.create(organizationId, {
  name: 'Green Valley Farm',
  area_hectares: 100,
});
```

### Query Parcels with Module Filter

```typescript
// Using React Query
import { useParcels } from '@/hooks/useParcels';

function ParcelList() {
  const { data: parcels } = useParcels(organizationId, { module: 'fruit-trees' });
  return parcels.map(p => <div key={p.id}>{p.name}</div>);
}
```

### Check Module Access

```typescript
import { useSubscription } from '@/hooks/useSubscription';
import { FeatureGate } from '@/components/FeatureGate';

function SatelliteAnalysis() {
  return (
    <FeatureGate module="satellite" fallback={<UpgradePrompt />}>
      <SatelliteView />
    </FeatureGate>
  );
}
```

## Next Steps

1. **Explore the features**: Create farms, parcels, and crops
2. **Try the API**: Visit http://localhost:3001/api for Swagger docs
3. **Set up Supabase**: Configure authentication and storage
4. **Read the docs**: Explore architecture and feature documentation

## Useful Commands

```bash
# Backend
cd agritech-api
pnpm start:dev          # Start development server
pnpm test               # Run tests
pnpm migration:run      # Run migrations
pnpm seed               # Seed sample data

# Frontend
cd project
pnpm dev                # Start dev server
pnpm build              # Build for production
pnpm test               # Run tests
pnpm lint               # Run ESLint

# Database
docker-compose up -d    # Start services
docker-compose down     # Stop services
docker-compose logs -f  # View logs

# All packages
pnpm install            # Install dependencies
pnpm lint               # Lint all packages
pnpm format             # Format all files
```

## Troubleshooting

### Database Connection Failed

```bash
# Check database is running
docker-compose ps

# Restart database
docker-compose restart postgres
```

### Port Already in Use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 pnpm start:dev
```

### Module Not Showing

1. Check your subscription tier in the database
2. Verify the module is enabled for your organization
3. Clear browser cache and React Query cache

## Getting Help

- [Troubleshooting](/troubleshooting) - Common issues and solutions
- [GitHub Issues](https://github.com/agritech/platform/issues) - Report bugs
- [Contributing](/contributing) - Contribution guidelines

## References

- [Installation](/getting-started/installation) - Detailed setup guide
- [Environment Setup](/getting-started/environment-setup) - Configuration details
- [Architecture Overview](/architecture/overview) - System design
