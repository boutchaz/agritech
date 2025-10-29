# Complex Business Logic Locations - AgriTech Platform

## Overview

This document catalogs all locations in the codebase where complex business logic resides. This includes calculation-heavy operations, data transformations, validation logic, and algorithmic processing.

---

## 1. Supabase Edge Functions (Deno/TypeScript)

**Location**: `supabase/functions/`

These serverless functions contain the most critical business logic that should be executed server-side for security, consistency, and performance.

### 1.1 Accounting Module (`accounting/`)

#### `create-invoice`
- **Complexity**: Medium-High
- **Logic**:
  - Invoice validation (required fields, line items validation)
  - Automatic invoice numbering generation
  - Total calculation (subtotal, tax, discount)
  - Line item validation and aggregation
  - Database transaction handling
  - Organization/farm context validation
  - Return formatted invoice with computed totals

#### `post-invoice`
- **Complexity**: High
- **Logic**:
  - Double-entry bookkeeping journal creation
  - Automatic journal entry generation from invoice
  - Account mapping (revenue accounts, receivables/payables)
  - Debit/credit balancing verification
  - Multi-table transaction (invoices → journal entries → GL entries)
  - Status transition validation (draft → submitted → paid)
  - Posting date logic and period validation

#### `allocate-payment`
- **Complexity**: Very High
- **Logic**:
  - Payment allocation algorithm across multiple invoices
  - Partial payment handling
  - Outstanding balance calculation
  - Payment priority logic (oldest first, manual allocation)
  - Multi-invoice allocation with remainder handling
  - Journal entry creation for payment allocation
  - Bank reconciliation preparation
  - Currency conversion if multi-currency
  - Payment method validation
  - Overpayment/credit note handling

#### `generate-financial-report`
- **Complexity**: Very High
- **Logic**:
  - Balance sheet generation (Assets = Liabilities + Equity)
  - Profit & Loss calculation (Revenue - Expenses)
  - Trial balance verification (Total Debits = Total Credits)
  - General ledger aggregation with date filtering
  - Aged receivables/payables calculation (30/60/90 day buckets)
  - Account hierarchy traversal (parent-child relationships)
  - Period comparison (current vs previous period)
  - Opening balance calculation
  - Closing balance computation
  - Report data aggregation and formatting
  - Multi-level account grouping

### 1.2 Task Management (`task-assignment/`)

#### `assign-task-auto`
- **Complexity**: High
- **Logic**:
  - Worker availability checking (schedule, vacations, sick leave)
  - Skill matching algorithm (worker skills vs task requirements)
  - Workload balancing (current task count per worker)
  - Priority-based task assignment
  - Geographic optimization (parcel location vs worker location)
  - Team composition logic (if team required)
  - Estimated duration calculation
  - Conflict detection (overlapping tasks)
  - Worker capacity calculation
  - Equipment availability verification

### 1.3 Analytics (`yield-prediction/`)

#### `predict-yield`
- **Complexity**: Very High
- **Logic**:
  - Machine learning model inference
  - Historical yield data analysis
  - Satellite index integration (NDVI, NDRE, SAVI trends)
  - Weather data incorporation (rainfall, temperature, GDD)
  - Soil data influence (NPK levels, pH, organic matter)
  - Crop phenology stage detection
  - Seasonal pattern recognition
  - Multi-variable regression analysis
  - Confidence interval calculation
  - Anomaly detection (outliers, extreme conditions)
  - Growth stage-specific yield adjustment
  - Expected vs actual yield comparison

### 1.4 Irrigation Management (`irrigation-scheduling/`)

#### `optimize-irrigation`
- **Complexity**: Very High
- **Logic**:
  - Evapotranspiration (ET₀) calculation (Penman-Monteith equation)
  - Crop coefficient (Kc) determination by growth stage
  - Soil moisture balance modeling
  - Water requirement calculation (ET × Kc × Area)
  - Rainfall forecast integration
  - Soil water holding capacity calculation
  - Root zone depth consideration
  - Irrigation system efficiency factors
  - Scheduling algorithm (when + how much to irrigate)
  - Multi-parcel optimization (water resource allocation)
  - Cost optimization (water + energy costs)
  - Deficit irrigation strategies for water scarcity

---

## 2. Database Functions (PostgreSQL/PL/pgSQL)

**Location**: `supabase/migrations/` (SQL files with function definitions)

### 2.1 Accounting Functions

#### `calculate_payment_allocation()`
- **Complexity**: High
- **Location**: Migration file with accounting schema
- **Logic**:
  - Finds all unpaid/partially paid invoices for a party
  - Allocates payment amount across invoices
  - Handles partial payments with remainder tracking
  - Updates invoice paid amounts and statuses
  - Creates allocation records linking payments to invoices
  - Returns allocation breakdown

#### `enforce_double_entry_balance()`
- **Complexity**: Medium
- **Trigger Function**: Validates journal entry balance
- **Logic**:
  - Sums all debit amounts in journal entry
  - Sums all credit amounts in journal entry
  - Compares totals (must be equal)
  - Raises exception if not balanced
  - Prevents posting unbalanced entries

#### `auto_generate_invoice_number()`
- **Complexity**: Medium
- **Trigger Function**: Before INSERT on invoices
- **Logic**:
  - Determines invoice type (sales/purchase)
  - Finds max invoice number for organization + year
  - Generates next sequential number with format: INV-YYYY-NNNNN
  - Handles year rollover (resets to 00001 each year)
  - Thread-safe with row-level locking

### 2.2 Parcel Area Calculation

#### `calculate_parcel_area()`
- **Complexity**: Medium-High
- **Trigger Function**: Before INSERT/UPDATE on parcels
- **Logic**:
  - Extracts GeoJSON boundary coordinates
  - Projects coordinates to appropriate UTM zone
  - Uses PostGIS ST_Area for accurate calculation
  - Converts square meters to hectares
  - Stores calculated_area for quick access
  - Handles geometry validation

---

## 3. Python Satellite Service (FastAPI)

**Location**: `satellite-indices-service/app/`

### 3.1 Satellite Image Processing

#### `process_vegetation_index()`
- **Complexity**: Very High
- **File**: `app/services/gee_service.py`
- **Logic**:
  - Google Earth Engine initialization
  - Sentinel-2 image collection filtering by date, AOI, cloud coverage
  - Cloud masking using QA60 band
  - Band selection (B4, B8, B11, B12 for various indices)
  - Index calculation formulas:
    - NDVI = (NIR - Red) / (NIR + Red)
    - NDRE = (NIR - RedEdge) / (NIR + RedEdge)
    - NDMI = (NIR - SWIR1) / (NIR + SWIR1)
    - SAVI = ((NIR - Red) / (NIR + Red + L)) × (1 + L), L = 0.5
    - EVI = G × ((NIR - Red) / (NIR + C1 × Red - C2 × Blue + L))
  - Image compositing (median, mean, max)
  - Value normalization (-1 to +1 range)
  - Export to GeoTIFF or PNG
  - Colormap application for visualization

#### `generate_time_series()`
- **Complexity**: High
- **Logic**:
  - Multi-date image collection fetching
  - Time-series value extraction per date
  - Missing data interpolation
  - Trend analysis (linear regression)
  - Seasonal decomposition
  - Anomaly detection (Z-score method)
  - Statistical aggregation (mean, std, min, max per period)
  - JSON export with statistics

#### `generate_heatmap()`
- **Complexity**: High
- **Logic**:
  - Grid-based spatial sampling (divides parcel into grid cells)
  - Index value extraction per grid cell
  - Statistical distribution calculation
  - Hotspot/coldspot detection
  - Spatial interpolation for smooth visualization
  - Color gradient mapping
  - GeoJSON output with cell values

---

## 4. Frontend Business Logic (React/TypeScript)

**Location**: `project/src/`

### 4.1 Soil Analysis Calculations

#### `soilRecommendations.ts`
- **Complexity**: High
- **File**: `project/src/utils/soilRecommendations.ts`
- **Logic**:
  - Crop-specific nutrient requirement lookup (olive, citrus, apple, grape, tomato)
  - pH adjustment calculation:
    - Lime requirement = pH deficit × 2.5 t/ha
    - Sulfur requirement for alkalinity correction
  - Nitrogen deficit calculation:
    - Fertilizer amount = N deficit × 450 kg/ha
    - Fractional application timing (40%-30%-30%)
  - Phosphorus deficit calculation:
    - P₂O₅ requirement = P deficit × 15000 kg/ha
  - Potassium deficit calculation:
    - K₂O requirement = K deficit × 400 kg/ha
  - Organic matter calculation:
    - Compost needed = OM deficit × 12 t/ha
  - Recommendation prioritization (high/medium/low)
  - Action plan generation with timing and quantities

### 4.2 Parcel Geometry Processing

#### `parcelAutomation.ts`
- **Complexity**: Very High
- **File**: `project/src/utils/parcelAutomation.ts`
- **Logic**:
  - **Area calculation**: Uses OpenLayers `getArea()` with EPSG:3857 projection, converts to hectares
  - **Perimeter calculation**: Haversine distance formula for geodesic calculation on sphere
  - **Boundary smoothing**: Chaikin's algorithm with adjustable smoothing factor
  - **Boundary simplification**: Douglas-Peucker algorithm for point reduction
  - **Self-intersection detection**: Line segment intersection algorithm
  - **Edge detection**: Sobel operator implementation (Sobel-X and Sobel-Y kernels)
  - **Contour detection**: Connected component analysis on edge map
  - **Grid snapping**: Coordinate rounding to grid size
  - **Validation**:
    - Minimum 3 points
    - Closed polygon verification
    - Self-intersection check
    - Area bounds validation

### 4.3 Satellite Analysis Visualization

#### `InteractiveIndexViewer.tsx`
- **Complexity**: High
- **File**: `project/src/components/SatelliteAnalysis/InteractiveIndexViewer.tsx`
- **Logic**:
  - Multi-index visualization management (NDVI, NDRE, NDMI simultaneously)
  - Color palette generation and mapping (5 palette types)
  - Heatmap data processing and rendering
  - Scatter plot data transformation
  - Leaflet map layer management
  - ECharts configuration for interactive charts
  - Time series data aggregation
  - User interaction handling (pan, zoom, point selection)
  - Data export preparation (GeoJSON, CSV)
  - View mode switching (single, multi-grid, multi-overlay)
  - Opacity control per layer

### 4.4 Dashboard Statistics

#### `ParcelsOverviewWidget.tsx`
- **Complexity**: Medium
- **File**: `project/src/components/Dashboard/ParcelsOverviewWidget.tsx`
- **Logic**:
  - Total area aggregation across farms/parcels
  - Parcel grouping by crop type
  - Top 3 crops sorting and display
  - Area calculation with fallback (calculated_area || area)
  - Statistics computation (count, sum)

---

## 5. Custom Hooks with Business Logic

**Location**: `project/src/hooks/`

### 5.1 `useWorkers.ts`
- **Complexity**: Medium
- **Logic**:
  - Worker availability filtering by date range
  - Skill matching queries
  - Workload calculation (task count per worker)
  - Schedule conflict detection
  - Worker assignment optimization hints

### 5.2 `useParcels.ts`
- **Complexity**: Medium
- **Logic**:
  - Multi-farm parcel aggregation
  - GeoJSON boundary parsing
  - Area calculation verification
  - Crop type categorization
  - Parcel filtering by status/crop

### 5.3 `useTasks.ts`
- **Complexity**: Medium
- **Logic**:
  - Task status lifecycle management
  - Priority-based sorting
  - Worker assignment tracking
  - Completion percentage calculation
  - Overdue task detection

---

## 6. Recommendations for Refactoring

### High Priority (Move to Edge Functions)

1. **Soil Recommendations** (`soilRecommendations.ts`)
   - Create: `supabase/functions/soil-analysis/generate-recommendations`
   - Reason: Heavy calculation, crop database should be server-side, potential ML integration

2. **Payment Allocation UI Logic** (if exists in frontend)
   - Ensure all allocation is handled by `allocate-payment` Edge Function
   - Frontend should only display results, not perform allocation

3. **Parcel Area Calculation** (currently in frontend)
   - Move complex haversine and geodesic calculations to database trigger
   - Use PostGIS ST_Area exclusively
   - Frontend should only validate and display

### Medium Priority (Consider Moving)

1. **Worker Assignment Logic** (if in frontend)
   - Should be in `assign-task-auto` Edge Function
   - Frontend only provides UI for manual override

2. **Time Series Aggregation** (if heavy in frontend)
   - Pre-compute in satellite service
   - Cache results in database
   - Frontend only visualizes

### Low Priority (Can Stay in Frontend)

1. **Visualization Color Mapping** (`InteractiveIndexViewer.tsx`)
   - UI-specific, no security/consistency issues
   - Performance acceptable in browser

2. **Dashboard Statistics** (`ParcelsOverviewWidget.tsx`)
   - Simple aggregation, acceptable client-side
   - Consider materialized view if slow

---

## 7. Performance Optimization Opportunities

### Database Level
- Add indexes on: `journal_entries(posting_date)`, `invoices(status, organization_id)`, `parcels(farm_id, crop_type)`
- Create materialized views for:
  - Account balances (refresh on journal post)
  - Aged receivables/payables (refresh daily)
  - Farm/parcel statistics (refresh hourly)

### Caching Strategy
- Redis/Memcached for:
  - Financial reports (TTL: 1 hour)
  - Satellite available dates (TTL: 24 hours)
  - Worker schedules (TTL: 15 minutes)
  - Dashboard statistics (TTL: 5 minutes)

### Background Processing
- Queue for heavy operations:
  - Financial report generation → Background job
  - Satellite image processing → Queue with progress tracking
  - Yield prediction → Nightly batch job
  - Email notifications → Async queue

---

## 8. Testing Requirements

### Critical Functions Requiring Tests

1. **Accounting Edge Functions**:
   - Unit tests: Invoice calculation accuracy
   - Integration tests: Double-entry balance enforcement
   - E2E tests: Payment allocation across multiple invoices

2. **Satellite Processing**:
   - Unit tests: Index calculation formulas (NDVI, NDRE, etc.)
   - Integration tests: GEE API interaction
   - Performance tests: Image processing time limits

3. **Parcel Geometry**:
   - Unit tests: Area/perimeter calculation accuracy
   - Edge cases: Self-intersecting polygons, invalid boundaries
   - Performance tests: Large polygon simplification

4. **Soil Recommendations**:
   - Unit tests: Fertilizer calculation formulas
   - Validation tests: Crop requirement ranges
   - Edge cases: Extreme pH/nutrient values

---

## 9. Security Considerations

### Edge Functions
- ✅ All accounting operations use RLS (Row Level Security)
- ✅ Organization/farm context validated in every function
- ⚠️ Add rate limiting for expensive operations (reports, predictions)
- ⚠️ Add audit logging for financial transactions

### Frontend Logic
- ⚠️ Never trust area calculations from frontend (verify server-side)
- ⚠️ Soil recommendations should be validated before storage
- ✅ Satellite data requests authenticated with Supabase token

### Database Functions
- ✅ All triggers validate organization ownership
- ✅ Double-entry balance enforced at database level
- ✅ Invoice numbering uses row-level locking (prevents duplicates)

---

## 10. Documentation Gaps

### Need Documentation
1. **Accounting double-entry rules** - Which accounts are debited/credited for each transaction type
2. **Payment allocation algorithm** - Detailed flowchart of allocation logic
3. **Yield prediction model** - Features, training data, accuracy metrics
4. **Irrigation calculation formulas** - ET₀ calculation parameters, crop coefficients by stage
5. **Worker assignment algorithm** - Scoring system, priority weights

### API Documentation Needed
- Edge Function request/response schemas (OpenAPI/Swagger)
- Satellite service endpoints documentation
- Error codes and handling guide

---

## Summary Statistics

- **Total Edge Functions with Complex Logic**: 7
- **Database Functions with Business Logic**: 3
- **Python Service Complex Functions**: 3
- **Frontend Utility Files with Logic**: 3
- **Hooks with Business Logic**: 3

**Most Complex Functions** (by lines of logic):
1. `generate-financial-report` - ~300+ lines
2. `allocate-payment` - ~250+ lines
3. `predict-yield` - ~200+ lines
4. `optimize-irrigation` - ~200+ lines
5. `parcelAutomation.ts` - ~377 lines

**Refactoring Priority**: Focus on moving soil recommendations and ensuring all financial calculations are server-side.
