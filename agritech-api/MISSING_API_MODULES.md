# Missing API Modules Analysis

Based on the comparison between existing API modules and frontend routes, this document identifies API modules that are missing or incomplete.

## Overview

- **Existing API Modules**: 60+ modules in `agritech-api/src/modules/`
- **Frontend Routes**: Organized by domain (core, accounting, inventory, production, settings, workforce, misc, auth, public)

## Missing API Modules

### 🔴 High Priority - Frontend Routes Exist, No API Module

These modules have frontend routes but no corresponding API module:

#### 1. **Bank Accounts Module**
**Frontend Routes**: None directly, but referenced in accounting
**API Module**: `bank-accounts/` exists but may need expansion
**Status**: ⚠️ Verify completeness

**Expected Endpoints**:
- `GET /bank-accounts` - List all bank accounts
- `POST /bank-accounts` - Create bank account
- `GET /bank-accounts/:id` - Get bank account details
- `PATCH /bank-accounts/:id` - Update bank account
- `DELETE /bank-accounts/:id` - Delete bank account
- `GET /bank-accounts/:id/transactions` - Get bank account transactions

#### 2. **Taxes Module**
**Frontend Routes**: Referenced in accounting (tax calculations)
**API Module**: `taxes/` exists but may need expansion
**Status**: ⚠️ Verify completeness

**Expected Endpoints**:
- `GET /taxes` - List all tax rates
- `POST /taxes` - Create tax rate
- `GET /taxes/:id` - Get tax details
- `PATCH /taxes/:id` - Update tax rate
- `DELETE /taxes/:id` - Delete tax rate
- `GET /taxes/calculate` - Calculate tax amount

#### 3. **Sequences Module**
**Frontend Routes**: Used for auto-numbering (invoices, quotes, orders)
**API Module**: `sequences/` exists but may need expansion
**Status**: ⚠️ Verify completeness

**Expected Endpoints**:
- `GET /sequences` - List all sequences
- `POST /sequences` - Create sequence
- `GET /sequences/:id` - Get sequence details
- `PATCH /sequences/:id` - Update sequence
- `POST /sequences/:id/next` - Get next number
- `POST /sequences/:id/reset` - Reset sequence

### 🟡 Medium Priority - Frontend Features Need API

These features exist in frontend but may need API endpoints:

#### 4. **Fiscal Years Module**
**Frontend Routes**: `settings.fiscal-years.tsx`
**API Module**: ❌ Does not exist
**Status**: 🔴 Missing

**Expected Endpoints**:
- `GET /fiscal-years` - List all fiscal years
- `POST /fiscal-years` - Create fiscal year
- `GET /fiscal-years/:id` - Get fiscal year details
- `PATCH /fiscal-years/:id` - Update fiscal year
- `POST /fiscal-years/:id/close` - Close fiscal year
- `POST /fiscal-years/:id/reopen` - Reopen fiscal year

#### 5. **Biological Assets Module**
**Frontend Routes**: `settings.biological-assets.tsx`
**API Module**: ❌ Does not exist
**Status**: 🔴 Missing

**Expected Endpoints**:
- `GET /biological-assets` - List all biological assets
- `POST /biological-assets` - Create biological asset
- `GET /biological-assets/:id` - Get biological asset details
- `PATCH /biological-assets/:id` - Update biological asset
- `DELETE /biological-assets/:id` - Delete biological asset
- `GET /biological-assets/:id/valuation` - Get asset valuation

#### 6. **Campaigns Module**
**Frontend Routes**: `campaigns.tsx`
**API Module**: ❌ Does not exist
**Status**: 🔴 Missing

**Expected Endpoints**:
- `GET /campaigns` - List all campaigns
- `POST /campaigns` - Create campaign
- `GET /campaigns/:id` - Get campaign details
- `PATCH /campaigns/:id` - Update campaign
- `DELETE /campaigns/:id` - Delete campaign
- `GET /campaigns/:id/parcels` - Get campaign parcels

#### 7. **Crop Cycles Module**
**Frontend Routes**: `crop-cycles.tsx`
**API Module**: ❌ Does not exist
**Status**: 🔴 Missing

**Expected Endpoints**:
- `GET /crop-cycles` - List all crop cycles
- `POST /crop-cycles` - Create crop cycle
- `GET /crop-cycles/:id` - Get crop cycle details
- `PATCH /crop-cycles/:id` - Update crop cycle
- `DELETE /crop-cycles/:id` - Delete crop cycle
- `POST /crop-cycles/:id/tasks` - Add task to cycle

#### 8. **Quality Control Module**
**Frontend Routes**: `quality-control.tsx`
**API Module**: ❌ Does not exist
**Status**: 🔴 Missing

**Expected Endpoints**:
- `GET /quality-controls` - List all quality controls
- `POST /quality-controls` - Create quality control
- `GET /quality-controls/:id` - Get quality control details
- `PATCH /quality-controls/:id` - Update quality control
- `DELETE /quality-controls/:id` - Delete quality control
- `GET /quality-controls/:id/results` - Get quality control results

#### 9. **Farm Hierarchy Module**
**Frontend Routes**: `farm-hierarchy.tsx`
**API Module**: ❌ Does not exist (may use existing farms/parcels)
**Status**: ⚠️ May use existing modules

**Expected Endpoints**:
- `GET /farm-hierarchy` - Get complete farm hierarchy
- `GET /farm-hierarchy/:farmId` - Get farm hierarchy
- `POST /farm-hierarchy/:farmId/parcels` - Add parcel to farm
- `PATCH /farm-hierarchy/:farmId/reorder` - Reorder hierarchy

### 🟢 Low Priority - Additional Features

These features would enhance the platform but are not critical:

#### 10. **Files Module**
**Frontend Routes**: `settings.files.tsx`
**API Module**: `files/` exists
**Status**: ✅ Exists

#### 11. **Documents Module**
**Frontend Routes**: `settings.documents.tsx`
**API Module**: `document-templates/` exists
**Status**: ✅ Exists

#### 12. **Marketplace Module**
**Frontend Routes**: `marketplace.tsx` with `quote-requests.sent.tsx` and `quote-requests.received.tsx`
**API Module**: `marketplace/` exists
**Status**: ⚠️ Verify completeness

**Expected Endpoints**:
- `GET /marketplace` - Get marketplace listings
- `GET /marketplace/quote-requests` - List quote requests
- `POST /marketplace/quote-requests` - Create quote request
- `GET /marketplace/quote-requests/:id` - Get quote request details
- `PATCH /marketplace/quote-requests/:id` - Update quote request
- `POST /marketplace/quote-requests/:id/respond` - Respond to quote request

#### 13. **Lab Services Module**
**Frontend Routes**: `lab-services.tsx`
**API Module**: `lab-services/` exists
**Status**: ✅ Exists

#### 14. **Infrastructure Module**
**Frontend Routes**: `infrastructure.tsx`
**API Module**: `structures/` exists
**Status**: ✅ Exists

#### 15. **Utilities Module**
**Frontend Routes**: `utilities.tsx`
**API Module**: `utilities/` exists
**Status**: ✅ Exists

## Existing API Modules with Frontend Routes

| API Module | Frontend Routes | Status |
|------------|----------------|--------|
| accounts | accounting/accounts.tsx | ✅ |
| customers | accounting/customers.tsx | ✅ |
| invoices | accounting/invoices.tsx | ✅ |
- payments | accounting/payments.tsx | ✅ |
| purchase-orders | accounting/purchase-orders.tsx | ✅ |
| quotes | accounting/quotes.tsx | ✅ |
| sales-orders | accounting/sales-orders.tsx | ✅ |
| journal-entries | accounting/journal.tsx | ✅ |
| items | inventory/items.tsx | ✅ |
| warehouses | inventory/warehouses.tsx | ✅ |
| suppliers | inventory/suppliers.tsx | ✅ |
| reception-batches | inventory/reception-batches.tsx | ✅ |
| stock-entries | inventory/entries.tsx | ✅ |
| farms | production/parcels.tsx, farm-hierarchy.tsx | ✅ |
| parcels | production/parcels.tsx | ✅ |
| harvests | production/harvests.tsx | ✅ |
| tasks | workforce/tasks.tsx | ✅ |
| workers | workforce/workers.tsx | ✅ |
| cost-centers | settings.cost-centers.tsx | ✅ |
| account-mappings | settings.account-mappings.tsx | ✅ |
| work-units | settings.work-units.tsx | ✅ |
| organizations | settings.organization.tsx | ✅ |
| users | settings.users.tsx | ✅ |
| subscriptions | settings.subscription.tsx | ✅ |
| organization-modules | settings.modules.tsx | ✅ |

## API Modules Without Frontend Routes

These API modules exist but don't have corresponding frontend routes:

| API Module | Purpose | Priority |
|------------|---------|----------|
| ai-reports | AI-powered reports | 🟡 Medium |
| analyses | General analyses | 🟢 Low |
| auth | Authentication | ✅ Core |
| casl | Authorization | ✅ Core |
| database | Database service | ✅ Core |
| demo-data | Demo data seeding | ✅ Development |
| events | Event tracking | 🟡 Medium |
| financial-reports | Financial reports | 🟡 Medium |
| notifications | Notifications | 🟡 Medium |
| organization-ai-settings | AI settings | 🟢 Low |
| organization-users | Organization users | ✅ Core |
| payment-records | Payment records | 🟡 Medium |
| piece-work | Piece work tracking | 🟡 Medium |
| product-applications | Product applications | 🟢 Low |
| production-intelligence | Production intelligence | 🟡 Medium |
| profitability | Profitability analysis | 🟡 Medium |
| reference-data | Reference data | ✅ Core |
| reports | General reports | 🟡 Medium |
| roles | Role management | ✅ Core |
| satellite-indices | Satellite indices | 🟡 Medium |
| soil-analyses | Soil analyses | 🟡 Medium |
| strapi | Strapi integration | ✅ Core |
| subscriptions | Subscriptions | ✅ Core |
| task-assignments | Task assignments | 🟡 Medium |
| tree-management | Tree management | 🟢 Low |
| users | User management | ✅ Core |

## Recommendations

### Immediate Actions (High Priority)

1. **Create Fiscal Years Module**
   - Essential for accounting and reporting
   - Frontend route exists: `settings.fiscal-years.tsx`
   - Required for financial statements

2. **Create Biological Assets Module**
   - Important for agricultural accounting (IAS 41)
   - Frontend route exists: `settings.biological-assets.tsx`
   - Required for proper asset management

3. **Create Campaigns Module**
   - Important for production planning
   - Frontend route exists: `campaigns.tsx`
   - Links to crop cycles and parcels

4. **Create Crop Cycles Module**
   - Core production feature
   - Frontend route exists: `crop-cycles.tsx`
   - Tracks planting to harvest

5. **Create Quality Control Module**
   - Important for product quality
   - Frontend route exists: `quality-control.tsx`
   - Required for certification

### Short-term Actions (Medium Priority)

6. **Verify Bank Accounts Module**
   - Check if existing module is complete
   - Ensure all accounting features work

7. **Verify Taxes Module**
   - Check if existing module is complete
   - Ensure tax calculations work

8. **Verify Sequences Module**
   - Check if existing module is complete
   - Ensure auto-numbering works

9. **Verify Marketplace Module**
   - Check if quote requests are supported
   - Ensure marketplace features work

### Long-term Actions (Low Priority)

10. **Enhance Production Intelligence**
    - Add AI-powered insights
    - Integrate with satellite data

11. **Enhance Profitability Analysis**
    - Add more detailed analytics
    - Integrate with cost centers

12. **Enhance Notifications**
    - Add real-time notifications
    - Integrate with events

## Implementation Priority

### Phase 1: Critical Missing Modules (Week 1)
1. Fiscal Years Module
2. Biological Assets Module
3. Campaigns Module
4. Crop Cycles Module
5. Quality Control Module

### Phase 2: Verify Existing Modules (Week 2)
1. Bank Accounts Module verification
2. Taxes Module verification
3. Sequences Module verification
4. Marketplace Module verification

### Phase 3: Enhance Existing Features (Week 3-4)
1. Production Intelligence enhancements
2. Profitability Analysis enhancements
3. Notifications enhancements
4. Reports enhancements

## Module Template

For creating new API modules, use this template:

```typescript
// agritech-api/src/modules/[module-name]/[module-name].module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { [ModuleName]Controller } from './[module-name].controller';
import { [ModuleName]Service } from './[module-name].service';

@Module({
  imports: [DatabaseModule],
  controllers: [[ModuleName]Controller],
  providers: [[ModuleName]Service],
  exports: [[ModuleName]Service],
})
export class [ModuleName]Module {}

// agritech-api/src/modules/[module-name]/[module-name].controller.ts
import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { [ModuleName]Service } from './[module-name].service';
import { Create[ModuleName]Dto } from './dto/create-[module-name].dto';
import { Update[ModuleName]Dto } from './dto/update-[module-name].dto';

@Controller('[module-name]')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class [ModuleName]Controller {
  constructor(private readonly [moduleName]Service: [ModuleName]Service) {}

  @Get()
  findAll(@OrganizationId() organizationId: string) {
    return this.[moduleName]Service.findAll(organizationId);
  }

  @Post()
  create(
    @OrganizationId() organizationId: string,
    @Body() createDto: Create[ModuleName]Dto,
  ) {
    return this.[moduleName]Service.create(organizationId, createDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.[moduleName]Service.findOne(id, organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() updateDto: Update[ModuleName]Dto,
  ) {
    return this.[moduleName]Service.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @OrganizationId() organizationId: string) {
    return this.[moduleName]Service.remove(id, organizationId);
  }
}

// agritech-api/src/modules/[module-name]/[module-name].service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class [ModuleName]Service {
  private readonly logger = new Logger([ModuleName]Service.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(organizationId: string) {
    const client = this.databaseService.getClient();
    const { data, error } = await client
      .from('[table-name]')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to fetch [module-name]: ${error.message}`);
      throw error;
    }

    return data;
  }

  async findOne(id: string, organizationId: string) {
    const client = this.databaseService.getClient();
    const { data, error } = await client
      .from('[table-name]')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch [module-name]: ${error.message}`);
      throw error;
    }

    return data;
  }

  async create(organizationId: string, createDto: Create[ModuleName]Dto) {
    const client = this.databaseService.getClient();
    const { data, error } = await client
      .from('[table-name]')
      .insert({
        organization_id: organizationId,
        ...createDto,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create [module-name]: ${error.message}`);
      throw error;
    }

    return data;
  }

  async update(id: string, organizationId: string, updateDto: Update[ModuleName]Dto) {
    const client = this.databaseService.getClient();
    const { data, error } = await client
      .from('[table-name]')
      .update(updateDto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update [module-name]: ${error.message}`);
      throw error;
    }

    return data;
  }

  async remove(id: string, organizationId: string) {
    const client = this.databaseService.getClient();
    const { error } = await client
      .from('[table-name]')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete [module-name]: ${error.message}`);
      throw error;
    }

    return { id };
  }
}
```

## Database Tables Required

For each missing module, ensure the corresponding database tables exist:

### Fiscal Years
```sql
CREATE TABLE fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(organization_id, name)
);
```

### Biological Assets
```sql
CREATE TABLE biological_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  farm_id UUID REFERENCES farms(id),
  parcel_id UUID REFERENCES parcels(id),
  asset_code VARCHAR(50) NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(100) NOT NULL,
  variety VARCHAR(100),
  planting_date DATE,
  quantity INTEGER,
  unit VARCHAR(50),
  fair_value DECIMAL(15,2),
  cost DECIMAL(15,2),
  depreciation DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(organization_id, asset_code)
);
```

### Campaigns
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  farm_id UUID REFERENCES farms(id),
  campaign_code VARCHAR(50) NOT NULL,
  campaign_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'planned',
  budget DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(organization_id, campaign_code)
);
```

### Crop Cycles
```sql
CREATE TABLE crop_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  farm_id UUID REFERENCES farms(id),
  parcel_id UUID REFERENCES parcels(id),
  campaign_id UUID REFERENCES campaigns(id),
  cycle_code VARCHAR(50) NOT NULL,
  crop_type VARCHAR(100) NOT NULL,
  variety VARCHAR(100),
  planting_date DATE,
  expected_harvest_date DATE,
  actual_harvest_date DATE,
  area DECIMAL(10,2),
  area_unit VARCHAR(50) DEFAULT 'ha',
  status VARCHAR(50) DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(organization_id, cycle_code)
);
```

### Quality Controls
```sql
CREATE TABLE quality_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  farm_id UUID REFERENCES farms(id),
  parcel_id UUID REFERENCES parcels(id),
  harvest_id UUID REFERENCES harvests(id),
  control_code VARCHAR(50) NOT NULL,
  control_date DATE NOT NULL,
  control_type VARCHAR(100) NOT NULL,
  sample_size INTEGER,
  passed BOOLEAN,
  grade VARCHAR(50),
  defects JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(organization_id, control_code)
);
```

## Conclusion

The AgriTech Platform has a solid foundation with 60+ API modules. However, 5 critical modules are missing that correspond to existing frontend routes:

1. **Fiscal Years** - Essential for accounting
2. **Biological Assets** - Required for agricultural accounting
3. **Campaigns** - Important for production planning
4. **Crop Cycles** - Core production feature
5. **Quality Control** - Required for product quality

These should be implemented as a priority to ensure full functionality of the frontend application.
