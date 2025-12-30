---
title: Profitability Analysis
description: Real-time financial performance tracking for parcels and crop cycles
---

# Profitability Analysis

The AgriTech Platform enables farmers to understand their financial performance down to the parcel level. By combining data from task management, inventory usage, and the accounting ledger, the platform provides a real-time view of profitability.

## Data Sources

Profitability data is aggregated from several sources:

1. **Direct Costs**: Labor, materials, and utilities tracked through Task Management.
2. **Inventory Usage**: Value of products (fertilizers, pesticides) consumed during operations.
3. **Accounting Ledger**: General expenses and overheads allocated to parcels.
4. **Revenue**: Harvest records and sales orders linked to specific parcels or crop cycles.

## Key Features

### Parcel Profitability
View the financial performance of an individual parcel over a selected date range.

- **Gross Margin**: Revenue minus direct variable costs.
- **Operating Profit**: Gross margin minus allocated fixed costs and overheads.
- **Cost Breakdown**: Visualization of costs by category (Labor, Irrigation, Inputs, etc.).
- **Historical Trends**: Compare current performance with previous cycles.

### Crop Cycle P&L
Specific analysis for a single crop production cycle, which may span multiple months.

- **Cumulative Costs**: Track how costs build up from soil preparation to harvest.
- **Unit Cost Analysis**: Calculate cost per kg or ton produced.
- **Break-even Point**: Determine the yield or price needed to cover all costs.

## Technical Implementation

Profitability analysis is powered by the `useProfitabilityQuery.ts` hook, which fetches data from a specialized API endpoint that aggregates ledger items and task costs.

### Example: Fetching Profitability Data

```typescript
import { useProfitabilityData } from '@/hooks/useProfitabilityQuery';

function ParcelProfitability({ parcelId, organizationId }) {
  const { data, isLoading } = useProfitabilityData(
    parcelId,
    '2023-01-01', // Start Date
    '2023-12-31', // End Date
    organizationId
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h3>Total Revenue: {data.totalRevenue}</h3>
      <h3>Total Costs: {data.totalCosts}</h3>
      <h3>Net Profit: {data.netProfit}</h3>
      
      {/* Cost category breakdown chart */}
      <ProfitabilityChart categories={data.costBreakdown} />
    </div>
  );
}
```

## Advanced Analytics

### Production Intelligence
The platform compares performance across different parcels and farms to identify "best practices."

- **Efficiency Metrics**: Revenue per hectare, cost per hectare.
- **Input Efficiency**: Yield achieved per unit of fertilizer or water used.
- **Anomaly Detection**: Identify parcels where costs are significantly higher than average.

### Multi-Dimension Filtering
Filter profitability reports by:
- Farm or Group of Farms
- Crop Type (e.g., Citrus, Wheat)
- Campaign Year
- Specific Agricultural Activity (e.g., only Irrigation costs)
