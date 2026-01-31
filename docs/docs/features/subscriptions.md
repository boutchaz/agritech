---
sidebar_position: 13
---

# Subscriptions & Module System

The AgriTech Platform uses a **subscription-based module system** that enables features based on the organization's plan tier. This document covers the implementation of subscriptions, module configuration, and access control.

## Overview

### Architecture Principles

1. **Database-Driven Configuration**: Module availability configured in the `modules` table with Supabase RPC functions
2. **Guard-Based Access Control**: API routes protected by `SubscriptionGuard`
3. **Trial Subscription System**: 14-day trial for new organizations
4. **Module-Based Routing**: Specialized routes (e.g., `/trees`, `/orchards`) coexist with generic routes

### Plan Tiers

| Plan | Trial Duration | Features | Limits |
|------|---------------|----------|--------|
| **Starter** | 14 days | Core farming modules | Configurable limits |
| **Professional** | 14 days | Starter + advanced features | Higher limits |
| **Enterprise** | Custom | All modules + API access | Unlimited |

### Module Categories

| Category | Modules |
|----------|---------|
| **Production** | Farm Management, Orchards, Trees, Crop Cycles, Harvests, Pruning |
| **Inventory** | Stock, Warehouses, Items, Reception Batches |
| **Accounting** | Accounts, Journal Entries, Invoices, Quotes, Sales Orders |
| **Workforce** | Workers, Tasks, Piece Work |
| **Analytics** | Satellite Analysis, Quality Control, Production Intelligence |
| **Marketplace** | B2B Marketplace integration |
| **Compliance** | Certifications, Document Management |

## Database Schema

### modules Table

```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(100),
  color VARCHAR(20),
  category VARCHAR(50),
  display_order INT,
  price_monthly DECIMAL(10,2) DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  is_recommended BOOLEAN DEFAULT false,
  is_addon_eligible BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  required_plan VARCHAR(50),
  dashboard_widgets TEXT[],
  navigation_items TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Module translations (i18n)
CREATE TABLE module_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  features TEXT[],
  UNIQUE(module_id, locale)
);
```

### subscriptions Table

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id VARCHAR(100),
  plan_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  max_farms INT DEFAULT 2,
  max_parcels INT DEFAULT 25,
  max_users INT DEFAULT 5,
  max_satellite_reports INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### organization_modules Table

```sql
CREATE TABLE organization_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, module_id)
);
```

## Backend Implementation

### Subscription Service

**File**: `agritech-api/src/modules/subscriptions/subscriptions.service.ts`

Core methods:

```typescript
class SubscriptionsService {
  // Create trial subscription (14 days)
  async createTrialSubscription(userId: string, dto: CreateTrialSubscriptionDto)

  // Check if organization has valid subscription
  async hasValidSubscription(organizationId: string): Promise<boolean>

  // Get subscription details for organization
  async getSubscription(userId: string, organizationId: string): Promise<Subscription | null>

  // Check subscription with usage stats
  async checkSubscription(userId: string, dto: CheckSubscriptionDto)

  // Get usage counts for limits
  async getUsageCounts(userId: string, organizationId: string)
}
```

**Subscription Status Check**:
- Returns `true` for status: `active`, `trialing`
- Returns `false` for: `canceled`, `past_due`, `expired`, or no subscription

### Module Config Service

**File**: `agritech-api/src/modules/module-config/module-config.service.ts`

Uses Supabase RPC functions for module configuration:

```typescript
class ModuleConfigService {
  // Get all modules with translations
  async getModuleConfig(locale: string = 'en'): Promise<ModuleConfigResponseDto>

  // Calculate subscription price based on selected modules
  async calculatePrice(moduleSlugs: string[]): Promise<CalculatePriceResponseDto>

  // Clear in-memory cache
  async clearCache(): Promise<void>
}
```

**Supabase RPC Functions**:
- `get_module_config(p_locale)` - Returns modules with translations
- `get_subscription_pricing()` - Returns pricing configuration
- `get_widget_to_module_map()` - Maps dashboard widgets to modules
- `calculate_module_subscription_price(p_module_slugs)` - Calculates price
- `clear_module_config_cache()` - Clears cache

### Subscription Guard

**File**: `agritech-api/src/common/guards/subscription.guard.ts`

```typescript
@Injectable()
export class SubscriptionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) return true;

    const organizationId = request.organizationId;
    const hasValidSubscription =
      await this.subscriptionsService.hasValidSubscription(organizationId);

    if (!hasValidSubscription) {
      throw new ForbiddenException(
        'An active subscription is required to access this resource'
      );
    }

    return true;
  }
}
```

**Usage**:

```typescript
@Controller('farms')
@UseGuards(JwtAuthGuard, OrganizationGuard, SubscriptionGuard)
export class FarmsController {
  @Get()
  async findAll() { /* ... */ }

  @Get('usage')
  @PublicSubscription() // Bypass subscription check
  async getUsage() { /* ... */ }
}
```

## Frontend Implementation

### Module Config Hook

The module configuration is fetched from the API using Supabase:

```typescript
// Uses api-client to fetch module config
const { data: moduleConfig } = useQuery({
  queryKey: ['module-config', locale],
  queryFn: () => apiClient.get('/module-config', { params: { locale } }),
});
```

### Subscription Types

**File**: `agritech-api/src/modules/subscriptions/dto/create-trial-subscription.dto.ts`

```typescript
export enum PlanType {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}
```

### Frontend Routes

**Production Routes** (`project/src/routes/_authenticated/(production)/`):

| Route | Purpose |
|-------|---------|
| `/parcels` | Parcel list and management |
| `/parcels/:parcelId` | Parcel detail view |
| `/parcels/:parcelId/analyse` | Parcel analysis |
| `/parcels/:parcelId/production` | Production data |
| `/parcels/:parcelId/satellite` | Satellite imagery |
| `/parcels/:parcelId/weather` | Weather data |
| `/parcels/:parcelId/reports` | Parcel reports |
| `/parcels/:parcelId/profitability` | Profitability analysis |
| `/orchards` | Orchard management |
| `/trees` | Tree management |
| `/pruning` | Pruning records |
| `/harvests` | Harvest management |
| `/crop-cycles` | Crop cycle tracking |
| `/campaigns` | Campaign management |
| `/quality-control` | Quality control |
| `/farm-hierarchy` | Farm hierarchy management |

**Note**: The application uses both specialized routes (`/trees`, `/orchards`) and generic routes (`/parcels`), rather than a pure filter-based approach.

### Frontend Services

Key services use the API client factory pattern:

```typescript
// project/src/services/farmsService.ts
export const farmsService = {
  list: (orgId: string) => apiClient.get(`/organizations/${orgId}/farms`),
  create: (orgId: string, data: CreateFarmDto) =>
    apiClient.post(`/organizations/${orgId}/farms`, data),
};
```

## Subscription Lifecycle

### 1. Trial Creation

```typescript
// During onboarding, create trial subscription
await subscriptionsService.createTrialSubscription(userId, {
  organization_id: orgId,
  plan_type: PlanType.STARTER,
});
```

### 2. Subscription Check

```typescript
// API routes automatically check subscription via guard
@UseGuards(SubscriptionGuard)
@Get()
async findAll() {
  // Only accessible with valid subscription
}
```

### 3. Usage Limits

The system enforces limits via database functions:
- `can_create_farm(org_id)` - Check if farm can be created
- `can_create_parcel(org_id)` - Check if parcel can be created
- `can_add_user(org_id)` - Check if user can be added

### 4. Feature Access

Feature access is determined by:
1. Valid subscription status
2. Organization's enabled modules
3. Module availability based on plan tier

## Supabase Integration

### RPC Functions

**Get Module Config**:
```sql
CREATE OR REPLACE FUNCTION get_module_config(p_locale TEXT DEFAULT 'en')
RETURNS TABLE (
  id UUID,
  slug VARCHAR,
  icon VARCHAR,
  color VARCHAR,
  category VARCHAR,
  display_order INT,
  price_monthly DECIMAL,
  is_required BOOLEAN,
  is_recommended BOOLEAN,
  is_addon_eligible BOOLEAN,
  is_available BOOLEAN,
  required_plan VARCHAR,
  dashboard_widgets TEXT[],
  navigation_items TEXT[],
  name VARCHAR,
  description TEXT,
  features TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.slug,
    m.icon,
    m.color,
    m.category,
    m.display_order,
    m.price_monthly,
    m.is_required,
    m.is_recommended,
    m.is_addon_eligible,
    m.is_available,
    m.required_plan,
    m.dashboard_widgets,
    m.navigation_items,
    COALESCE(mt.name, m.name) as name,
    COALESCE(mt.description, m.description) as description,
    COALESCE(mt.features, m.features) as features
  FROM modules m
  LEFT JOIN module_translations mt ON mt.module_id = m.id AND mt.locale = p_locale
  WHERE m.is_available = true
  ORDER BY m.display_order, m.name;
END;
$$ LANGUAGE plpgsql;
```

## Adding a New Module

### 1. Database Entry

```sql
-- Insert module with default English values
INSERT INTO modules (slug, icon, category, display_order, price_monthly, is_required, is_available)
VALUES (
  'greenhouses',
  'greenhouse',
  'production',
  100,
  0,
  false,
  true
)
RETURNING id;

-- Add translations
INSERT INTO module_translations (module_id, locale, name, description, features)
VALUES
  ('<module_id>', 'en', 'Greenhouses', 'Manage greenhouse operations', ARRAY['Climate control', 'Growing cycles']),
  ('<module_id>', 'fr', 'Serres', 'Gérer les opérations de serre', ARRAY['Contrôle climat', 'Cycles de culture']),
  ('<module_id>', 'ar', 'البيوت الزجاجية', 'إدارة عمليات الصوبة الزجاجية', ARRAY['التحكم في المناخ', 'دورات النمو']);
```

### 2. Navigation

Update `navigation_items` in the modules table:

```sql
UPDATE modules
SET navigation_items = ARRAY['/greenhouses', '/planting?module=greenhouses']
WHERE slug = 'greenhouses';
```

### 3. Frontend Route

Create route file in `project/src/routes/_authenticated/(production)/greenhouses.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/greenhouses')({
  component: Greenhouses,
});

function Greenhouses() {
  return <div>Greenhouses Management</div>;
}
```

## API Endpoints

### Module Configuration

- `GET /module-config` - Get module configuration with translations
- `POST /module-config/calculate-price` - Calculate subscription price
- `POST /module-config/clear-cache` - Clear configuration cache

### Subscriptions

- `POST /subscriptions/trial` - Create trial subscription
- `GET /subscriptions/check` - Check subscription validity
- `GET /subscriptions/usage` - Get usage statistics

## References

- [Module Config Service](https://github.com/agritech/platform/blob/main/agritech-api/src/modules/module-config)
- [Subscriptions Service](https://github.com/agritech/platform/blob/main/agritech-api/src/modules/subscriptions)
- [Database Schema](/database/schema)
