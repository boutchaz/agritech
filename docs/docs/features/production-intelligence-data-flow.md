# Production Intelligence - Data Flow & Population

This document explains how the Production Intelligence dashboard gets populated with data across all four core tables.

## Overview

The Production Intelligence system tracks agricultural performance through:
- **Yield History** - Historical harvest performance vs targets
- **Harvest Forecasts** - Future harvest predictions with confidence levels
- **Yield Benchmarks** - Performance targets and thresholds
- **Performance Alerts** - Automated monitoring and notifications

## Data Population Methods

### 1. Automatic Population from Harvests (Recommended)

**Trigger**: `trigger_auto_create_yield_from_harvest`
**Migration**: `20251030131000_auto_create_yield_from_harvest.sql`

When a harvest is recorded in the `harvests` table, the system automatically:

1. **Creates yield_history record** with:
   - Harvest details (date, quantity, quality)
   - Calculated yield per hectare (using parcel area)
   - Performance variance (actual vs benchmark target)
   - Performance rating (excellent/good/average/below_average/poor)

2. **Generates performance alert** if underperforming:
   - Created when variance < -20%
   - Severity: `critical` (< -35%), `high` (< -25%), `medium` (< -20%)
   - Status: `active` by default

**Example Flow**:
```sql
-- User records harvest via /harvests route
INSERT INTO harvests (
  farm_id, parcel_id, crop_type, harvest_date,
  quantity_harvested, unit_of_measure
) VALUES (
  'farm-123', 'parcel-456', 'Wheat', '2024-10-15',
  5000, 'kg'
);

-- Trigger automatically creates:
-- 1. yield_history record with calculated variance
-- 2. performance_alert if underperforming
```

**Code Location**: [project/supabase/migrations/20251030131000_auto_create_yield_from_harvest.sql](/Users/boutchaz/Documents/CodeLovers/agritech/project/supabase/migrations/20251030131000_auto_create_yield_from_harvest.sql)

---

### 2. Manual Yield Entry

**Component**: `YieldHistoryForm`
**Route**: Production Intelligence dashboard → "Record Yield" button

Used when:
- Recording historical data not captured in harvest system
- Importing legacy data
- Adding yields from external sources
- Recording yields before harvest module existed

**Form Fields**:
- **Location**: Farm and parcel selection
- **Crop Details**: Type, variety
- **Harvest Data**: Date, season, quality grade
- **Yield Metrics**:
  - Actual quantity harvested (required)
  - Unit of measure (kg/tons/lbs)
  - Target yield (optional - uses benchmark if not provided)
- **Financial Data**: Revenue, cost, profit (optional)
- **Context**: Growing conditions, irrigation, notes

**Data Validation**:
- All yields must be positive numbers
- Target yield defaults to active benchmark for crop type if not specified
- Variance and performance rating auto-calculated via trigger

**Code Location**: [project/src/components/ProductionIntelligence/YieldHistoryForm.tsx](/Users/boutchaz/Documents/CodeLovers/agritech/project/src/components/ProductionIntelligence/YieldHistoryForm.tsx:69-80)

---

### 3. Benchmark Setting

**Component**: `BenchmarkForm`
**Route**: Production Intelligence dashboard → "Set Benchmark" button

Used for:
- Defining target yields for crop types
- Setting performance thresholds (excellent/good/acceptable)
- Establishing financial targets
- Recording industry standards or historical averages

**Form Fields**:
- **Crop Details**: Type, variety (optional)
- **Scope**: Organization-wide, farm-specific, or parcel-specific
- **Benchmark Type**:
  - `organization_target` - Internal goals
  - `industry_standard` - Regional/national standards
  - `historical_average` - Based on past performance
  - `best_practice` - Aspirational targets
- **Yield Target**: Per hectare with unit of measure
- **Performance Thresholds**:
  - Excellent: ≥110% of target (default)
  - Good: ≥95% of target (default)
  - Acceptable: ≥80% of target (default)
  - Below acceptable = Underperforming
- **Financial Targets**: Revenue per hectare, profit margin %
- **Metadata**: Source, validity period, notes

**Best Practices**:
1. Set organization-wide benchmarks first
2. Override with farm-specific targets as needed
3. Use parcel-specific benchmarks for specialized plots
4. Review and update annually
5. Document data sources in "Source" field

**Code Location**: [project/src/components/ProductionIntelligence/BenchmarkForm.tsx](/Users/boutchaz/Documents/CodeLovers/agritech/project/src/components/ProductionIntelligence/BenchmarkForm.tsx:69-80)

---

### 4. Forecast Creation

**Component**: `HarvestForecastForm`
**Route**: Production Intelligence dashboard → "Create Forecast" button

Used for:
- Planning future harvest windows
- Resource allocation (labor, storage, transport)
- Market planning and pre-sales
- Cash flow projections

**Form Fields**:
- **Location**: Farm and parcel
- **Crop Details**: Type, variety
- **Timeline**:
  - Planting date (optional)
  - Forecast harvest window (start and end dates)
  - Season classification
- **Predictions**:
  - Predicted yield quantity and per-hectare rate
  - Confidence level (low/medium/high)
  - Yield range (min/max for uncertainty modeling)
  - Expected quality grade
- **Financial Estimates**:
  - Price per unit
  - Estimated revenue (auto-calculated)
  - Estimated cost
  - Estimated profit (auto-calculated)
- **Methodology**:
  - Forecast method (manual/historical_average/trend_analysis/ai_model)
  - Historical years used as basis
  - Adjustment factors (JSON object for weather, irrigation, etc.)
- **Notes**: Assumptions, external factors

**Forecast Lifecycle**:
1. **Created** → Status: `pending`
2. **Harvest occurs** → Link actual harvest via `actual_harvest_id`
3. **Auto-calculated** → Forecast accuracy % (actual vs predicted)
4. **Status updated** → `completed` or `cancelled`

**Code Location**: [project/src/components/ProductionIntelligence/HarvestForecastForm.tsx](/Users/boutchaz/Documents/CodeLovers/agritech/project/src/components/ProductionIntelligence/HarvestForecastForm.tsx:69-145)

---

## Data Integration Points

### From Harvest Module → Yield History

**Automatic Integration** via database trigger:

```typescript
// User records harvest at /harvests
const harvest = {
  farm_id: 'farm-123',
  parcel_id: 'parcel-456',
  crop_type: 'Tomatoes',
  harvest_date: '2024-10-20',
  quantity_harvested: 8500,
  unit_of_measure: 'kg',
  quality_grade: 'grade_a'
};

// Trigger executes:
// 1. Get parcel area (e.g., 2.5 hectares)
// 2. Calculate yield per hectare: 8500 / 2.5 = 3400 kg/ha
// 3. Find active benchmark for 'Tomatoes'
// 4. Calculate variance: (3400 - 3000) / 3000 = +13.3%
// 5. Rate performance: 'excellent' (>10%)
// 6. Create yield_history record
// 7. No alert needed (positive variance)
```

**Database Function**: `auto_create_yield_from_harvest()`
**Trigger**: `AFTER INSERT ON harvests`

### From Forecasts → Actual Performance Tracking

When harvest completes, link forecast to actual:

```sql
-- Update forecast with actual results
UPDATE harvest_forecasts
SET
  actual_harvest_id = 'harvest-789',
  actual_yield_quantity = 8200,
  forecast_accuracy_percent = (8200 / 8500.0 * 100) - 100, -- -3.5%
  status = 'completed'
WHERE id = 'forecast-123';
```

**Accuracy Rating**:
- Within ±5% = Excellent forecast
- Within ±10% = Good forecast
- Within ±20% = Acceptable forecast
- Beyond ±20% = Poor forecast (requires methodology review)

### Performance Alerts → Accounting Reconciliation

Alerts link directly to accounting for revenue verification:

```typescript
// From alert card, user clicks "View Invoices"
<Button
  onClick={() => navigate({
    to: '/accounting-invoices',
    search: { parcel_id: alert.parcel_id }
  })}
>
  <ExternalLink className="h-4 w-4 mr-1" />
  View Invoices
</Button>

// Accounting page shows filtered invoices for underperforming parcel
// Allows comparison of predicted revenue vs actual sales
```

**Use Case**: When parcel shows -25% yield variance, verify if revenue also dropped or if price compensated.

---

## Database Schema

### Yield History Table

```sql
CREATE TABLE yield_history (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  farm_id UUID NOT NULL,
  parcel_id UUID NOT NULL,
  harvest_id UUID REFERENCES harvests(id),

  -- Crop info
  crop_type TEXT NOT NULL,
  variety TEXT,
  harvest_date DATE NOT NULL,
  harvest_season TEXT,

  -- Yield metrics
  actual_yield_quantity NUMERIC(12,2) NOT NULL,
  actual_yield_per_hectare NUMERIC(12,2),
  unit_of_measure TEXT NOT NULL,
  quality_grade TEXT,

  -- Performance vs targets
  target_yield_quantity NUMERIC(12,2),
  target_yield_per_hectare NUMERIC(12,2),
  yield_variance_percent NUMERIC(6,2),
  performance_rating TEXT,

  -- Financial
  revenue_amount NUMERIC(15,2),
  cost_amount NUMERIC(15,2),
  profit_amount NUMERIC(15,2),
  profit_margin_percent NUMERIC(6,2),
  price_per_unit NUMERIC(12,2),
  currency_code TEXT NOT NULL,

  -- Growing conditions
  growing_days INTEGER,
  weather_conditions JSONB,
  soil_conditions JSONB,
  irrigation_total_m3 NUMERIC(12,2),
  notes TEXT
);
```

**Auto-calculated fields** via trigger:
- `yield_variance_percent`
- `performance_rating`
- `profit_margin_percent`

### Harvest Forecasts Table

```sql
CREATE TABLE harvest_forecasts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  farm_id UUID NOT NULL,
  parcel_id UUID NOT NULL,

  -- Crop and timeline
  crop_type TEXT NOT NULL,
  variety TEXT,
  planting_date DATE,
  forecast_harvest_date_start DATE NOT NULL,
  forecast_harvest_date_end DATE NOT NULL,
  forecast_season TEXT,

  -- Predictions
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  predicted_yield_quantity NUMERIC(12,2) NOT NULL,
  predicted_yield_per_hectare NUMERIC(12,2),
  unit_of_measure TEXT NOT NULL,
  predicted_quality_grade TEXT,
  min_yield_quantity NUMERIC(12,2),
  max_yield_quantity NUMERIC(12,2),

  -- Financial estimates
  estimated_revenue NUMERIC(15,2),
  estimated_cost NUMERIC(15,2),
  estimated_profit NUMERIC(15,2),
  estimated_price_per_unit NUMERIC(12,2),
  currency_code TEXT NOT NULL,

  -- Methodology
  forecast_method TEXT,
  based_on_historical_years INTEGER,
  adjustment_factors JSONB,

  -- Status and accuracy tracking
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  actual_harvest_id UUID REFERENCES harvests(id),
  actual_yield_quantity NUMERIC(12,2),
  forecast_accuracy_percent NUMERIC(6,2)
);
```

### Yield Benchmarks Table

```sql
CREATE TABLE yield_benchmarks (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  farm_id UUID,  -- NULL = org-wide
  parcel_id UUID,  -- NULL = farm-wide

  -- Crop details
  crop_type TEXT NOT NULL,
  variety TEXT,

  -- Benchmark definition
  benchmark_type TEXT NOT NULL,
  target_yield_per_hectare NUMERIC(12,2) NOT NULL,
  unit_of_measure TEXT NOT NULL,

  -- Performance thresholds
  excellent_threshold_percent NUMERIC(5,2) DEFAULT 110,
  good_threshold_percent NUMERIC(5,2) DEFAULT 95,
  acceptable_threshold_percent NUMERIC(5,2) DEFAULT 80,

  -- Financial targets
  target_revenue_per_hectare NUMERIC(15,2),
  target_profit_margin_percent NUMERIC(6,2),

  -- Metadata
  valid_from DATE,
  valid_until DATE,
  source TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE
);
```

**Hierarchy**: Parcel-specific > Farm-specific > Organization-wide

### Performance Alerts Table

```sql
CREATE TABLE performance_alerts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  farm_id UUID,
  parcel_id UUID,

  -- Alert details
  alert_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Context links
  yield_history_id UUID REFERENCES yield_history(id),
  forecast_id UUID REFERENCES harvest_forecasts(id),
  harvest_id UUID REFERENCES harvests(id),

  -- Metrics
  metric_name TEXT,
  actual_value NUMERIC(15,2),
  target_value NUMERIC(15,2),
  variance_percent NUMERIC(6,2),

  -- Workflow
  status TEXT CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);
```

**Auto-created by**: `auto_create_yield_from_harvest()` trigger

---

## Query Examples

### Get Parcel Performance Summary

```sql
SELECT * FROM get_parcel_performance_summary(
  p_organization_id := 'org-123',
  p_farm_id := 'farm-456',
  p_parcel_id := NULL,  -- All parcels
  p_from_date := '2024-01-01',
  p_to_date := '2024-12-31'
);
```

**Returns**:
- Parcel name, farm name
- Crop type
- Total harvests count
- Average yield per hectare
- Average variance %
- Performance rating
- Financial totals (revenue, cost, profit)
- Last harvest date

### Get Active Alerts for Farm

```typescript
const { data: alerts } = usePerformanceAlerts({
  farmId: 'farm-123',
  status: 'active',
  severity: 'critical'
});
```

### Get Upcoming Harvest Forecasts

```typescript
const { data: forecasts } = useHarvestForecasts({
  farmId: 'farm-123',
  status: 'pending',
  fromDate: new Date().toISOString().split('T')[0],
  toDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
});
```

---

## Recommended Workflows

### Initial Setup (New Organization)

1. **Set organization-wide benchmarks** for each crop type
   - Use industry standards or historical averages
   - Set conservative targets initially
   - Document sources

2. **Import historical yields** (if available)
   - Use "Record Yield" for past data
   - Provides baseline for forecasting
   - Helps calibrate benchmarks

3. **Create forecasts for current growing cycle**
   - Based on planting dates and historical data
   - Update confidence as season progresses
   - Link to actual harvests when complete

4. **Enable automatic tracking**
   - Record all harvests via harvest module
   - System auto-creates yield history
   - Alerts generated for underperforming parcels

### Ongoing Operations

**Weekly**:
- Review active performance alerts
- Acknowledge or dismiss false positives
- Update forecast confidence as data emerges

**Monthly**:
- Review underperforming parcels dashboard
- Cross-check with accounting for revenue reconciliation
- Update forecasts for upcoming harvests

**Quarterly**:
- Analyze forecast accuracy trends
- Adjust forecasting methodology if needed
- Review and update benchmarks

**Annually**:
- Set new annual benchmarks
- Archive old benchmarks (set `is_active = false`)
- Analyze year-over-year performance trends

---

## Troubleshooting

### "No data showing in dashboard"

**Check**:
1. Are harvests being recorded? (`SELECT COUNT(*) FROM harvests`)
2. Are benchmarks set? (`SELECT COUNT(*) FROM yield_benchmarks WHERE is_active = true`)
3. Is trigger enabled? (`SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_create_yield_from_harvest'`)
4. Are there RLS policy issues? (Check user has access to organization)

### "Variance calculation seems wrong"

**Verify**:
1. Parcel area is correct (yield per hectare = total / area)
2. Active benchmark exists for crop type
3. Units match between harvest and benchmark
4. Check trigger logic in migration file

### "Alerts not being generated"

**Debug**:
1. Check variance threshold (< -20% required)
2. Verify trigger executes (add test harvest)
3. Check alert table for entries
4. Verify RLS policies allow insert

---

## Related Documentation

- [Harvest Management](/Users/boutchaz/Documents/CodeLovers/agritech/docs/docs/features/harvest-tracking.md)
- [Accounting Integration](/Users/boutchaz/Documents/CodeLovers/agritech/docs/docs/features/accounting.md)
- [Database Schema](/Users/boutchaz/Documents/CodeLovers/agritech/docs/docs/database/schema.md)
- [Production Intelligence API](/Users/boutchaz/Documents/CodeLovers/agritech/docs/docs/api/production-intelligence.md)

---

## Code References

- **Dashboard**: [ProductionDashboard.tsx](/Users/boutchaz/Documents/CodeLovers/agritech/project/src/components/ProductionIntelligence/ProductionDashboard.tsx)
- **Forms**:
  - [YieldHistoryForm.tsx](/Users/boutchaz/Documents/CodeLovers/agritech/project/src/components/ProductionIntelligence/YieldHistoryForm.tsx)
  - [BenchmarkForm.tsx](/Users/boutchaz/Documents/CodeLovers/agritech/project/src/components/ProductionIntelligence/BenchmarkForm.tsx)
  - [HarvestForecastForm.tsx](/Users/boutchaz/Documents/CodeLovers/agritech/project/src/components/ProductionIntelligence/HarvestForecastForm.tsx)
- **Hooks**: [useProductionIntelligence.ts](/Users/boutchaz/Documents/CodeLovers/agritech/project/src/hooks/useProductionIntelligence.ts)
- **Migrations**:
  - [20251030130000_create_production_intelligence.sql](/Users/boutchaz/Documents/CodeLovers/agritech/project/supabase/migrations/20251030130000_create_production_intelligence.sql)
  - [20251030131000_auto_create_yield_from_harvest.sql](/Users/boutchaz/Documents/CodeLovers/agritech/project/supabase/migrations/20251030131000_auto_create_yield_from_harvest.sql)
- **Route**: [production-intelligence.tsx](/Users/boutchaz/Documents/CodeLovers/agritech/project/src/routes/production-intelligence.tsx)
