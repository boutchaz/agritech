# API Pagination & Sorting Fixes Summary

This document summarizes all pagination and sorting parameter fixes made to API filter DTOs to ensure frontend compatibility.

## Problem Statement

The frontend was sending pagination and sorting parameters (`page`, `pageSize`, `sortBy`, `sortDir`) to API endpoints, but several filter DTOs did not have these properties defined, causing 400 Bad Request errors.

**Example Error:**
```json
{
  "statusCode": 400,
  "message": "{\"message\":[\"property page should not exist\",\"property pageSize should not exist\",\"property sortBy should not exist\",\"property sortDir should not exist\"],\"error\":\"Bad Request\",\"statusCode\":400}",
  "path": "/api/v1/organizations/b6dbb12a-d02e-46f3-8bdd-bb6b127a02f3/harvests?page=1&pageSize=12&sortBy=harvest_date&sortDir=desc"
}
```

## Solution Approach

The codebase has a base `PaginatedQueryDto` class that provides standard pagination and sorting parameters:

```typescript
export class PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction', enum: SortDirection, default: SortDirection.DESC })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDir?: SortDirection = SortDirection.DESC;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ description: 'Filter from date (inclusive)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date (inclusive)', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
```

DTOs can either:
1. **Extend `PaginatedQueryDto`** - Automatically inherits all pagination/sorting properties
2. **Define properties manually** - When custom validation is needed

## Fixes Applied

### ✅ Fixed: Harvest Filters DTO

**File:** [`harvests/dto/harvest-filters.dto.ts`](agritech-api/src/modules/harvests/dto/harvest-filters.dto.ts)

**Changes:**
- Added `page?: number` - Page number (default: 1)
- Added `pageSize?: number` - Page size (default: 12)
- Added `sortBy?: string` - Sort by field
- Added `sortDir?: 'asc' | 'desc'` - Sort direction with validation
- Added proper imports: `IsNumber`, `IsIn`, `Type`
- Added `@Type(() => Number)` decorators for proper type transformation

**Before:**
```typescript
export class HarvestFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by status (comma-separated)' })
  @IsOptional()
  @IsString()
  status?: string;
  // ... other filter properties
  // MISSING: page, pageSize, sortBy, sortDir
}
```

**After:**
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsDateString, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class HarvestFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by status (comma-separated)' })
  @IsOptional()
  @IsString()
  status?: string;
  // ... other filter properties

  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size (default: 12)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction (asc or desc)' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
```

## DTOs Already Using PaginatedQueryDto

The following DTOs already extend `PaginatedQueryDto` and have proper pagination/sorting:

### ✅ Tasks Filters DTO
**File:** [`tasks/dto/task-filters.dto.ts`](agritech-api/src/modules/tasks/dto/task-filters.dto.ts)
- Extends `PaginatedQueryDto`
- Has `page`, `pageSize`, `sortBy`, `sortDir` properties
- ✅ Working correctly

### ✅ Invoices Filters DTO
**File:** [`invoices/dto/invoice-filters.dto.ts`](agritech-api/src/modules/invoices/dto/invoice-filters.dto.ts)
- Extends `PaginatedQueryDto`
- Has `page`, `pageSize`, `sortBy`, `sortDir` properties
- ✅ Working correctly

### ✅ Sales Orders Filters DTO
**File:** [`sales-orders/dto/sales-order-filters.dto.ts`](agritech-api/src/modules/sales-orders/dto/sales-order-filters.dto.ts)
- Extends `PaginatedQueryDto`
- Has `page`, `pageSize`, `sortBy`, `sortDir` properties
- ✅ Working correctly

### ✅ Purchase Orders Filters DTO
**File:** [`purchase-orders/dto/purchase-order-filters.dto.ts`](agritech-api/src/modules/purchase-orders/dto/purchase-order-filters.dto.ts)
- Extends `PaginatedQueryDto`
- Has `page`, `pageSize`, `sortBy`, `sortDir` properties
- ✅ Working correctly

### ✅ Quotes Filters DTO
**File:** [`quotes/dto/quote-filters.dto.ts`](agritech-api/src/modules/quotes/dto/quote-filters.dto.ts)
- Extends `PaginatedQueryDto`
- Has `page`, `pageSize`, `sortBy`, `sortDir` properties
- ✅ Working correctly

## DTOs That May Need Review

The following DTOs might need pagination/sorting parameters depending on frontend usage:

### ⚠️ Reception Batches Filters DTO
**File:** [`reception-batches/dto/reception-batch-filters.dto.ts`](agritech-api/src/modules/reception-batches/dto/reception-batch-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- Has `date_from`, `date_to` filters
- **Status:** May need pagination if frontend lists batches

### ⚠️ Profitability Filters DTO
**File:** [`profitability/dto/profitability-filters.dto.ts`](agritech-api/src/modules/profitability/dto/profitability-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- Has `start_date`, `end_date` filters
- **Status:** May need pagination if frontend lists profitability data

### ⚠️ Analysis Filters DTO
**File:** [`analyses/dto/analysis-filters.dto.ts`](agritech-api/src/modules/analyses/dto/analysis-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- **Status:** May need pagination if frontend lists analyses

### ⚠️ Soil Analysis Filters DTO
**File:** [`soil-analyses/dto/soil-analysis-filters.dto.ts`](agritech-api/src/modules/soil-analyses/dto/soil-analysis-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- **Status:** May need pagination if frontend lists soil analyses

### ⚠️ Production Intelligence Filters DTOs
**Files:**
- [`production-intelligence/dto/yield-history-filters.dto.ts`](agritech-api/src/modules/production-intelligence/dto/yield-history-filters.dto.ts)
- [`production-intelligence/dto/parcel-performance-filters.dto.ts`](agritech-api/src/modules/production-intelligence/dto/parcel-performance-filters.dto.ts)
- [`production-intelligence/dto/alert-filters.dto.ts`](agritech-api/src/modules/production-intelligence/dto/alert-filters.dto.ts)
- [`production-intelligence/dto/forecast-filters.dto.ts`](agritech-api/src/modules/production-intelligence/dto/forecast-filters.dto.ts)
- [`production-intelligence/dto/benchmark-filters.dto.ts`](agritech-api/src/modules/production-intelligence/dto/benchmark-filters.dto.ts)
- **Status:** May need pagination if frontend lists these items

### ⚠️ Satellite Indices Filters DTO
**File:** [`satellite-indices/dto/satellite-index-filters.dto.ts`](agritech-api/src/modules/satellite-indices/dto/satellite-index-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- **Status:** May need pagination if frontend lists satellite indices

### ⚠️ Lab Services Filters DTOs
**Files:**
- [`lab-services/dto/lab-recommendation-filters.dto.ts`](agritech-api/src/modules/lab-services/dto/lab-recommendation-filters.dto.ts)
- [`lab-services/dto/sample-schedule-filters.dto.ts`](agritech-api/src/modules/lab-services/dto/sample-schedule-filters.dto.ts)
- [`lab-services/dto/lab-service-order-filters.dto.ts`](agritech-api/src/modules/lab-services/dto/lab-service-order-filters.dto.ts)
- **Status:** May need pagination if frontend lists these items

### ⚠️ Blog Filters DTO
**File:** [`blogs/dto/blog-filters.dto.ts`](agritech-api/src/modules/blogs/dto/blog-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- **Status:** May need pagination if frontend lists blogs

### ⚠️ Work Units Filters DTO
**File:** [`work-units/dto/work-unit-filters.dto.ts`](agritech-api/src/modules/work-units/dto/work-unit-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- **Status:** May need pagination if frontend lists work units

### ⚠️ Organization Users Filters DTO
**File:** [`organization-users/dto/organization-user-filters.dto.ts`](agritech-api/src/modules/organization-users/dto/organization-user-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- **Status:** May need pagination if frontend lists organization users

### ⚠️ Piece Work Filters DTO
**File:** [`piece-work/dto/piece-work-filters.dto.ts`](agritech-api/src/modules/piece-work/dto/piece-work-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- **Status:** May need pagination if frontend lists piece work

### ⚠️ Suppliers Filters DTO
**File:** [`suppliers/dto/supplier-filters.dto.ts`](agritech-api/src/modules/suppliers/dto/supplier-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- **Status:** May need pagination if frontend lists suppliers

### ⚠️ Customers Filters DTO
**File:** [`customers/dto/customer-filters.dto.ts`](agritech-api/src/modules/customers/dto/customer-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- **Status:** May need pagination if frontend lists customers

### ⚠️ Report Filters DTO
**File:** [`reports/dto/report-filters.dto.ts`](agritech-api/src/modules/reports/dto/report-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- **Status:** May need pagination if frontend generates reports

### ⚠️ Opening Stock Filters DTO
**File:** [`stock-entries/dto/opening-stock-filters.dto.ts`](agritech-api/src/modules/stock-entries/dto/opening-stock-filters.dto.ts)
- Does NOT extend `PaginatedQueryDto`
- **Status:** May need pagination if frontend lists opening stock

## Testing Recommendations

To ensure all pagination/sorting fixes work correctly:

### 1. Test Harvests API
```bash
# Test pagination
curl -X GET "https://agritech-api.thebzlab.online/api/v1/organizations/{orgId}/harvests?page=1&pageSize=12&sortBy=harvest_date&sortDir=desc" \
  -H "Authorization: Bearer {token}"

# Test with filters
curl -X GET "https://agritech-api.thebzlab.online/api/v1/organizations/{orgId}/harvests?page=1&pageSize=12&status=completed&sortBy=harvest_date&sortDir=desc" \
  -H "Authorization: Bearer {token}"
```

### 2. Test Other APIs
Test all APIs that use filter DTOs to ensure pagination works:
- Tasks API
- Invoices API
- Sales Orders API
- Purchase Orders API
- Quotes API
- Reception Batches API
- Profitability API
- Production Intelligence APIs

### 3. Verify Response Format
Ensure all paginated responses return proper format:
```typescript
{
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  totalPages: number
}
```

### 4. Check Frontend Integration
Verify frontend is sending parameters correctly:
```typescript
// Frontend should send:
const params = {
  page: 1,
  pageSize: 12,
  sortBy: 'harvest_date',
  sortDir: 'desc',
  status: 'completed'
};
```

## Summary

### ✅ Fixed
- **Harvests API** - Added pagination/sorting parameters to [`HarvestFiltersDto`](agritech-api/src/modules/harvests/dto/harvest-filters.dto.ts)

### ✅ Already Working
- Tasks API - Already extends `PaginatedQueryDto`
- Invoices API - Already extends `PaginatedQueryDto`
- Sales Orders API - Already extends `PaginatedQueryDto`
- Purchase Orders API - Already extends `PaginatedQueryDto`
- Quotes API - Already extends `PaginatedQueryDto`

### ⚠️ May Need Review
- Reception Batches API - May need pagination
- Profitability API - May need pagination
- Production Intelligence APIs - May need pagination
- Satellite Indices API - May need pagination
- Lab Services APIs - May need pagination
- Blog API - May need pagination
- Work Units API - May need pagination
- Organization Users API - May need pagination
- Piece Work API - May need pagination
- Suppliers API - May need pagination
- Customers API - May need pagination
- Reports API - May need pagination
- Opening Stock API - May need pagination

## Next Steps

1. **Test Harvests API** - Verify pagination/sorting works
2. **Monitor Frontend** - Check if other APIs need pagination
3. **Add Pagination** - Add pagination to DTOs that need it based on frontend usage
4. **Update Documentation** - Document pagination patterns for developers
5. **Add Tests** - Add unit tests for pagination/sorting logic

## Related Files

- Base Pagination DTO: [`common/dto/paginated-query.dto.ts`](agritech-api/src/common/dto/paginated-query.dto.ts)
- Harvests Filters: [`harvests/dto/harvest-filters.dto.ts`](agritech-api/src/modules/harvests/dto/harvest-filters.dto.ts)
- Tasks Filters: [`tasks/dto/task-filters.dto.ts`](agritech-api/src/modules/tasks/dto/task-filters.dto.ts)
- Invoices Filters: [`invoices/dto/invoice-filters.dto.ts`](agritech-api/src/modules/invoices/dto/invoice-filters.dto.ts)
- Sales Orders Filters: [`sales-orders/dto/sales-order-filters.dto.ts`](agritech-api/src/modules/sales-orders/dto/sales-order-filters.dto.ts)
- Purchase Orders Filters: [`purchase-orders/dto/purchase-order-filters.dto.ts`](agritech-api/src/modules/purchase-orders/dto/purchase-order-filters.dto.ts)
- Quotes Filters: [`quotes/dto/quote-filters.dto.ts`](agritech-api/src/modules/quotes/dto/quote-filters.dto.ts)

## Conclusion

The harvests API pagination/sorting issue has been fixed. The DTO now properly accepts `page`, `pageSize`, `sortBy`, and `sortDir` parameters with proper validation. Other major APIs (tasks, invoices, sales-orders, purchase-orders, quotes) already had proper pagination support.

Additional DTOs may need pagination added based on frontend usage patterns. Testing should be performed to verify all pagination/sorting functionality works correctly.
