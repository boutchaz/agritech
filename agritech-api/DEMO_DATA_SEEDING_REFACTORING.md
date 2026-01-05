# Demo Data Seeding Refactoring

## Overview

This document describes the refactoring of the demo data seeding functionality in the NestJS API. The original monolithic `demo-data.service.ts` (3,873 lines) has been split into modular, maintainable seed services organized by domain.

## Problem Statement

The original demo data seeding implementation had several issues:
- **Monolithic structure**: All seeding logic was in a single 3,873-line service file
- **Poor maintainability**: Difficult to locate and update specific domain logic
- **Testing challenges**: Hard to test individual seeding components
- **Code duplication**: Similar patterns repeated across different domains
- **Complexity**: Difficult for new developers to understand the seeding flow

## Solution

The seeding functionality has been refactored into modular seed services, each responsible for a specific domain:

```
agritech-api/src/modules/demo-data/seeds/
├── farm.seed.ts           # Farm and parcels seeding
├── workers.seed.ts        # Workers seeding
├── tasks.seed.ts          # Tasks seeding
├── cost-centers.seed.ts   # Cost centers seeding
├── structures.seed.ts     # Infrastructure structures seeding
├── utilities.seed.ts      # Utilities (fixed costs) seeding
├── inventory.seed.ts      # Items, warehouses, and stock entries seeding
├── accounting.seed.ts     # Parties, quotes, sales orders, purchase orders, invoices, payments, journal entries seeding
├── production.seed.ts     # Harvests, reception batches, costs, revenues seeding
└── index.ts              # Export file for all seed modules
```

## Seed Service Architecture

Each seed service follows a consistent pattern:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DomainSeedService {
  private readonly logger = new Logger(DomainSeedService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create demo entities for this domain
   */
  async createDemoEntities(
    organizationId: string,
    farmId: string,
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();
    // Seeding logic here
  }
}
```

### Key Design Principles

1. **Single Responsibility**: Each service handles one domain only
2. **Dependency Injection**: Services receive `DatabaseService` via constructor
3. **Admin Client**: All seeding uses admin client to bypass RLS
4. **Error Handling**: Services log errors but don't throw (seeding is optional)
5. **Return Data**: Services return created entities for use by other services
6. **Consistent Naming**: Methods use `createDemo*` prefix

## Seed Service Details

### 1. FarmSeedService

**Purpose**: Seed farm and parcel data

**Methods**:
- `createDemoFarm(organizationId, userId)` - Creates demo farm in Berkane, Morocco
- `createDemoParcels(organizationId, farmId, userId)` - Creates 4 demo parcels:
  - Parcel 1: Clémentines (Nules variety)
  - Parcel 2: Oranges (Navel Late variety)
  - Parcel 3: Tomatoes (Marmande variety)
  - Parcel 4: Olives (Picholine Marocaine variety)

**Returns**: `{ farm, parcels }`

### 2. WorkersSeedService

**Purpose**: Seed worker data

**Methods**:
- `createDemoWorkers(organizationId, farmId, userId)` - Creates 3 demo workers:
  - Ahmed Benali (Team Leader)
  - Fatima Alami (Harvester)
  - Mohamed Tazi (Irrigation Specialist)

**Returns**: Array of created workers

### 3. TasksSeedService

**Purpose**: Seed task data

**Methods**:
- `createDemoTasks(organizationId, farmId, parcels, workers, userId)` - Creates 10 demo tasks:
  - Pruning (In Progress)
  - Fertilization (Pending)
  - Pest Control (Completed)
  - Irrigation (Scheduled)
  - Harvest (In Progress)
  - Planting (Completed)
  - Weeding (Pending)
  - Soil Preparation (Completed)
  - Pest Monitoring (In Progress)
  - Equipment Maintenance (Pending)

**Returns**: Array of created tasks

### 4. CostCentersSeedService

**Purpose**: Seed cost center data

**Methods**:
- `createDemoCostCenters(organizationId, farmId, parcels, userId)` - Creates one cost center per parcel

**Returns**: Array of created cost centers

### 5. StructuresSeedService

**Purpose**: Seed infrastructure structure data

**Methods**:
- `createDemoStructures(organizationId, farmId, userId)` - Creates organization-level and farm-level structures:
  - Organization: Main Office, Storage Facility, Processing Plant
  - Farm: Irrigation System, Greenhouse, Cold Storage, Equipment Shed

**Returns**: Array of created structures

### 6. UtilitiesSeedService

**Purpose**: Seed utilities (fixed costs) data

**Methods**:
- `createDemoUtilities(organizationId, farmId, userId)` - Creates utility bills:
  - Electricity (monthly)
  - Water (monthly)
  - Diesel (monthly)
  - Internet (monthly)
  - Phone (monthly)
  - Gas (monthly)
  - Other (quarterly)

**Returns**: Array of created utilities

### 7. InventorySeedService

**Purpose**: Seed inventory data

**Methods**:
- `createDemoItems(organizationId, farmId, userId)` - Creates:
  - 1 warehouse (Entrepôt Principal)
  - 4 item groups (Engrais, Semences, Produits Phytosanitaires, Équipements)
  - 8 items with various properties
- `createDemoStockEntries(organizationId, warehouse, items, userId)` - Creates:
  - 6 stock entries (Material Receipt, Material Issue, Stock Reconciliation)
  - Stock entry items with batch numbers and expiry dates

**Returns**: `{ warehouse, items }`

### 8. AccountingSeedService

**Purpose**: Seed accounting data

**Methods**:
- `createDemoParties(organizationId, userId)` - Creates 3 customers and 3 suppliers
- `createDemoQuotes(organizationId, customers, userId)` - Creates 3 quotes (Draft, Sent, Accepted)
- `createDemoSalesOrders(organizationId, customers, userId)` - Creates 2 sales orders
- `createDemoPurchaseOrders(organizationId, suppliers, userId)` - Creates 2 purchase orders
- `createDemoInvoices(organizationId, customers, userId)` - Creates 3 invoices (Paid, Overdue, Unpaid)
- `createDemoPayments(organizationId, invoices, customers, suppliers, userId)` - Creates 2 payments
- `createDemoJournalEntries(organizationId, userId)` - Creates 1 journal entry with lines

**Returns**: Objects containing created entities

### 9. ProductionSeedService

**Purpose**: Seed production data

**Methods**:
- `createDemoHarvests(organizationId, farmId, parcels, workers, userId)` - Creates 5 harvests (4 completed, 1 in progress)
- `createDemoReceptionBatches(organizationId, farmId, harvests, userId)` - Creates 4 reception batches
- `createDemoProductionCosts(organizationId, farmId, parcels, tasks, userId)` - Creates 9 production costs (labor, input, equipment, other)
- `createDemoProductionRevenues(organizationId, farmId, parcels, harvests, receptionBatches, userId)` - Creates 4 production revenues

**Returns**: Objects containing created entities

## Integration with DemoDataService

The refactored seed services are integrated into the main `demo-data.service.ts`:

```typescript
import { FarmSeedService } from './seeds/farm.seed';
import { WorkersSeedService } from './seeds/workers.seed';
// ... other imports

@Injectable()
export class DemoDataService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly farmSeedService: FarmSeedService,
    private readonly workersSeedService: WorkersSeedService,
    // ... other seed services
  ) {}

  async seedDemoData(organizationId: string, userId: string) {
    // Create farm and parcels
    const { farm, parcels } = await this.farmSeedService.createDemoFarm(organizationId, userId);
    const demoParcels = await this.farmSeedService.createDemoParcels(organizationId, farm.id, userId);

    // Create workers
    const workers = await this.workersSeedService.createDemoWorkers(organizationId, farm.id, userId);

    // Create tasks
    const tasks = await this.tasksSeedService.createDemoTasks(
      organizationId,
      farm.id,
      demoParcels,
      workers,
      userId,
    );

    // ... continue with other domains
  }
}
```

## Module Registration

The seed services must be registered in `demo-data.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DemoDataService } from './demo-data.service';
import { FarmSeedService } from './seeds/farm.seed';
import { WorkersSeedService } from './seeds/workers.seed';
// ... other imports

@Module({
  imports: [DatabaseModule],
  providers: [
    DemoDataService,
    FarmSeedService,
    WorkersSeedService,
    // ... other seed services
  ],
  exports: [DemoDataService],
})
export class DemoDataModule {}
```

## Benefits of Refactoring

### 1. Improved Maintainability
- Each domain has its own file, making it easy to locate and update logic
- Smaller files are easier to understand and modify
- Changes to one domain don't affect others

### 2. Better Testing
- Each seed service can be tested independently
- Mock dependencies easily for unit tests
- Test coverage can be measured per domain

### 3. Code Reusability
- Seed services can be used independently for specific scenarios
- Common patterns can be extracted into helper functions
- Services can be combined in different ways

### 4. Easier Onboarding
- New developers can understand one domain at a time
- Clear separation of concerns
- Consistent patterns across services

### 5. Scalability
- Easy to add new seed services for new domains
- Services can be extended without affecting others
- Parallel seeding possible (if needed)

## Usage Examples

### Seeding All Demo Data

```typescript
@Injectable()
export class DemoDataService {
  async seedDemoData(organizationId: string, userId: string) {
    // Sequential seeding (current approach)
    const { farm, parcels } = await this.farmSeedService.createDemoFarm(organizationId, userId);
    const demoParcels = await this.farmSeedService.createDemoParcels(organizationId, farm.id, userId);
    const workers = await this.workersSeedService.createDemoWorkers(organizationId, farm.id, userId);
    const tasks = await this.tasksSeedService.createDemoTasks(organizationId, farm.id, demoParcels, workers, userId);
    const costCenters = await this.costCentersSeedService.createDemoCostCenters(organizationId, farm.id, demoParcels, userId);
    const structures = await this.structuresSeedService.createDemoStructures(organizationId, farm.id, userId);
    const utilities = await this.utilitiesSeedService.createDemoUtilities(organizationId, farm.id, userId);
    const { warehouse, items } = await this.inventorySeedService.createDemoItems(organizationId, farm.id, userId);
    await this.inventorySeedService.createDemoStockEntries(organizationId, warehouse, items, userId);
    const { customers, suppliers } = await this.accountingSeedService.createDemoParties(organizationId, userId);
    const quotes = await this.accountingSeedService.createDemoQuotes(organizationId, customers, userId);
    const salesOrders = await this.accountingSeedService.createDemoSalesOrders(organizationId, customers, userId);
    const purchaseOrders = await this.accountingSeedService.createDemoPurchaseOrders(organizationId, suppliers, userId);
    const invoices = await this.accountingSeedService.createDemoInvoices(organizationId, customers, userId);
    const payments = await this.accountingSeedService.createDemoPayments(organizationId, invoices, customers, suppliers, userId);
    await this.accountingSeedService.createDemoJournalEntries(organizationId, userId);
    const harvests = await this.productionSeedService.createDemoHarvests(organizationId, farm.id, demoParcels, workers, userId);
    const receptionBatches = await this.productionSeedService.createDemoReceptionBatches(organizationId, farm.id, harvests, userId);
    const productionCosts = await this.productionSeedService.createDemoProductionCosts(organizationId, farm.id, demoParcels, tasks, userId);
    const productionRevenues = await this.productionSeedService.createDemoProductionRevenues(organizationId, farm.id, demoParcels, harvests, receptionBatches, userId);

    return {
      farm,
      parcels: demoParcels,
      workers,
      tasks,
      costCenters,
      structures,
      utilities,
      warehouse,
      items,
      customers,
      suppliers,
      quotes,
      salesOrders,
      purchaseOrders,
      invoices,
      payments,
      harvests,
      receptionBatches,
      productionCosts,
      productionRevenues,
    };
  }
}
```

### Seeding Specific Domain Only

```typescript
// Seed only inventory data
const { warehouse, items } = await this.inventorySeedService.createDemoItems(organizationId, farmId, userId);
await this.inventorySeedService.createDemoStockEntries(organizationId, warehouse, items, userId);
```

## Future Improvements

### 1. Parallel Seeding
Some domains can be seeded in parallel since they don't depend on each other:

```typescript
// Parallel seeding for independent domains
const [structures, utilities, customers, suppliers] = await Promise.all([
  this.structuresSeedService.createDemoStructures(organizationId, farmId, userId),
  this.utilitiesSeedService.createDemoUtilities(organizationId, farmId, userId),
  this.accountingSeedService.createDemoParties(organizationId, userId),
]);
```

### 2. Configuration Options
Add configuration to control what data is seeded:

```typescript
interface SeedingOptions {
  includeFarm?: boolean;
  includeWorkers?: boolean;
  includeTasks?: boolean;
  includeInventory?: boolean;
  includeAccounting?: boolean;
  includeProduction?: boolean;
}

async seedDemoData(organizationId: string, userId: string, options: SeedingOptions = {}) {
  if (options.includeFarm !== false) {
    // Seed farm data
  }
  // ... etc
}
```

### 3. Data Variants
Create different data variants for different scenarios:

```typescript
enum DataVariant {
  MINIMAL,    // Just enough to demonstrate features
  STANDARD,   // Full demo data (current)
  EXTENSIVE,  // Large dataset for performance testing
}
```

### 4. Seeding Validation
Add validation to ensure data integrity:

```typescript
async validateSeededData(organizationId: string) {
  // Check that all expected entities exist
  // Check relationships are valid
  // Check data consistency
}
```

## Testing Strategy

### Unit Tests

Each seed service should have unit tests:

```typescript
describe('FarmSeedService', () => {
  let service: FarmSeedService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FarmSeedService,
        {
          provide: DatabaseService,
          useValue: { getAdminClient: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<FarmSeedService>(FarmSeedService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  it('should create demo farm', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Test the full seeding flow:

```typescript
describe('DemoDataService Integration', () => {
  it('should seed all demo data', async () => {
    const result = await service.seedDemoData(organizationId, userId);
    expect(result.farm).toBeDefined();
    expect(result.parcels).toHaveLength(4);
    // ... etc
  });
});
```

## Migration Notes

### For Existing Code

The refactoring maintains backward compatibility. The `DemoDataService` public API remains the same:

```typescript
// This still works
await demoDataService.seedDemoData(organizationId, userId);
```

### For New Code

You can now use individual seed services directly:

```typescript
import { InventorySeedService } from './seeds/inventory.seed';

@Injectable()
export class CustomService {
  constructor(
    private readonly inventorySeedService: InventorySeedService,
  ) {}

  async seedInventoryOnly(organizationId: string, farmId: string, userId: string) {
    const { warehouse, items } = await this.inventorySeedService.createDemoItems(organizationId, farmId, userId);
    await this.inventorySeedService.createDemoStockEntries(organizationId, warehouse, items, userId);
  }
}
```

## Conclusion

The refactoring of demo data seeding improves code organization, maintainability, and testability. The modular architecture allows for easier extension and modification of seeding logic while maintaining backward compatibility with existing code.

## Related Files

- `agritech-api/src/modules/demo-data/demo-data.service.ts` - Main demo data service
- `agritech-api/src/modules/demo-data/demo-data.module.ts` - Module registration
- `agritech-api/src/modules/demo-data/seeds/` - Modular seed services
- `agritech-api/src/modules/demo-data/demo-data.controller.ts` - API endpoint for seeding
