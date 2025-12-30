---
title: Agricultural Accounting
description: Management of agricultural campaigns, crop cycles, biological assets, and fiscal years
---

# Agricultural Accounting

The AgriTech Platform provides a specialized accounting module tailored for agricultural operations. This module goes beyond standard bookkeeping to track the unique lifecycle of crops and biological assets.

## Core Concepts

### Agricultural Campaigns
Campaigns represent major agricultural cycles, often spanning across calendar years. A campaign group's multiple crop cycles together for aggregate reporting.

- **Multi-year support**: Campaigns can start in one year and end in another.
- **Aggregation**: View performance across all farms and parcels for a specific campaign.
- **Status tracking**: Manage active, planned, and completed campaigns.

### Crop Cycles
Crop cycles are the heart of agricultural cost tracking. They allow you to allocate costs and revenues to a specific planting or production period on a parcel.

- **Cost Allocation**: Assign labor, material, and utility costs to specific crop cycles.
- **Revenue Tracking**: Record harvests and sales linked to the cycle.
- **PnL Analysis**: Real-time profitability tracking for each individual crop cycle.
- **Status Management**: Track from preparation and planting to harvest and completion.

### Biological Assets
Biological assets include permanent crops like fruit trees, vines, or livestock that provide value over multiple years.

- **Inventory & Mapping**: Track individual trees or groups of plants with geospatial data.
- **Valuation**: Record periodic valuations of assets based on growth and market conditions.
- **Depreciation/Appreciation**: Manage the financial value of assets over their productive life.
- **Cost Accumulation**: Track maintenance costs (fertilization, pruning) separately from production costs.

### Fiscal Years & Periods
Standardize financial reporting with defined fiscal years and periods.

- **Custom Fiscal Years**: Define years that don't align with calendar years (e.g., Oct-Sep).
- **Period Management**: Automated creation of monthly or quarterly periods.
- **Closing Procedures**: Formal process for closing periods and years to prevent further changes.

## Using the Agricultural Accounting Hooks

The platform provides a comprehensive set of hooks in `useAgriculturalAccounting.ts` to interact with these features.

### Managing Crop Cycles

```typescript
import { useCropCycles, useCreateCropCycle } from '@/hooks/useAgriculturalAccounting';

function CropCycleManager() {
  const { data: cycles, isLoading } = useCropCycles({ status: 'active' });
  const createMutation = useCreateCropCycle();

  const handleCreate = (data) => {
    createMutation.mutate(data);
  };

  // Render logic...
}
```

### Allocating Costs to a Cycle

Costs can be allocated to a crop cycle to build an accurate P&L.

```typescript
import { useCreateCropCycleAllocation } from '@/hooks/useAgriculturalAccounting';

function CostAllocator({ cropCycleId }) {
  const allocateMutation = useCreateCropCycleAllocation();

  const handleAllocate = (amount, categoryId) => {
    allocateMutation.mutate({
      crop_cycle_id: cropCycleId,
      amount,
      category_id: categoryId,
      allocation_date: new Date().toISOString(),
    });
  };

  // Render logic...
}
```

## Reporting

The module includes several specialized reports:

1. **Crop Cycle P&L**: Detailed breakdown of revenues and expenses for selected cycles.
2. **WIP (Work in Progress) Valuation**: Current value of growing crops that haven't been harvested.
3. **Biological Assets Summary**: Overview of the quantity and value of permanent assets.
4. **Fiscal-Campaign Reconciliation**: Aligning agricultural campaign performance with financial fiscal years.
