# Frontend Updates for AOI-Based Cloud Masking

## Summary

The frontend has been updated to support the new AOI-based cloud masking feature. **No UI changes are required** - the feature works automatically with optimal defaults.

## Changes Made

### 1. Updated API Client (`satellite-api.ts`)
**Status:** ✅ Already staged

Added TypeScript interfaces and default values:
```typescript
export interface IndexCalculationRequest {
  // ... existing fields ...
  use_aoi_cloud_filter?: boolean;  // NEW: Default true
  cloud_buffer_meters?: number;    // NEW: Default 300m
}

// Automatically applies defaults before sending to backend
async calculateIndices(request: IndexCalculationRequest) {
  const requestWithDefaults = {
    use_aoi_cloud_filter: true,
    cloud_buffer_meters: 300,
    ...request
  };
  // ...
}
```

### 2. Updated Legacy Service (`satelliteIndicesService.ts`)
**Status:** ✅ Just updated

```typescript
export interface IndexCalculationRequest {
  // ... existing fields ...
  use_aoi_cloud_filter?: boolean;
  cloud_buffer_meters?: number;
}

async calculateIndices(request: IndexCalculationRequest) {
  const requestWithDefaults = {
    use_aoi_cloud_filter: true,  // Enable by default
    cloud_buffer_meters: 300,    // 300m buffer by default
    ...request
  };
  // ...
}
```

## Components Affected

### Using `satellite-api.ts` (Already Updated) ✅
- `routes/satellite-analysis.tsx`
- `components/SatelliteAnalysis/StatisticsCalculator.tsx`
- `components/SatelliteAnalysis/IndexImageViewer.tsx`
- `components/SatelliteAnalysis/LeafletHeatmapViewer.tsx`
- `components/SatelliteAnalysis/InteractiveIndexViewer.tsx`
- `components/SatelliteAnalysis/TimeSeriesChart.tsx`
- `components/SatelliteAnalysis/IndicesCalculator.tsx`

### Using `satelliteIndicesService.ts` (Now Updated) ✅
- `components/SatelliteIndices.tsx`
- `components/MultiIndexChart.tsx`
- `components/TimeSeriesChart.tsx`
- `hooks/useSatelliteIndices.ts`

## How It Works

### Automatic Behavior

**Before:**
```typescript
// Component code (no changes needed)
const result = await calculateIndices({
  aoi: farmGeometry,
  date_range: { start_date: "2025-02-10", end_date: "2025-02-11" },
  indices: ["NDVI", "NDRE"],
  cloud_coverage: 10
});

// Request sent to backend:
// ❌ Uses tile-wide cloud filtering (30% clouds → rejected)
```

**After:**
```typescript
// Component code (SAME - no changes needed)
const result = await calculateIndices({
  aoi: farmGeometry,
  date_range: { start_date: "2025-02-10", end_date: "2025-02-11" },
  indices: ["NDVI", "NDRE"],
  cloud_coverage: 10
});

// Request sent to backend (defaults automatically added):
// {
//   ...request,
//   use_aoi_cloud_filter: true,  // ✅ Added automatically
//   cloud_buffer_meters: 300     // ✅ Added automatically
// }
// ✅ Uses AOI-based filtering (0% clouds in farm → accepted)
```

### Custom Configuration (Optional)

If a component needs to customize the behavior:

```typescript
// Example: No buffer (strict AOI-only)
const result = await calculateIndices({
  aoi: farmGeometry,
  date_range: { start_date: "2025-02-01", end_date: "2025-02-28" },
  indices: ["NDVI"],
  cloud_buffer_meters: 0  // Override default
});

// Example: Large buffer (more conservative)
const result = await calculateIndices({
  aoi: farmGeometry,
  date_range: { start_date: "2025-02-01", end_date: "2025-02-28" },
  indices: ["NDVI"],
  cloud_buffer_meters: 1000  // 1km buffer
});

// Example: Disable AOI filtering (not recommended)
const result = await calculateIndices({
  aoi: farmGeometry,
  date_range: { start_date: "2025-02-01", end_date: "2025-02-28" },
  indices: ["NDVI"],
  use_aoi_cloud_filter: false  // Revert to tile-wide filtering
});
```

## Component Changes Required

### ✅ No Changes Required

All existing components will **automatically benefit** from AOI-based cloud filtering without any code changes:

- ✅ `SatelliteIndices.tsx` - Works automatically
- ✅ `IndicesCalculator.tsx` - Works automatically
- ✅ `useSatelliteIndices.ts` - Works automatically
- ✅ All other components - Work automatically

### 🔧 Optional UI Enhancements

If you want to give users control over cloud filtering settings, you could add UI controls:

#### Example: Advanced Settings Panel

```typescript
// Add to IndicesCalculator or SatelliteIndices component
const [cloudBuffer, setCloudBuffer] = useState(300);
const [enableAOIFilter, setEnableAOIFilter] = useState(true);

// In the UI:
<div className="advanced-settings">
  <label>
    <input
      type="checkbox"
      checked={enableAOIFilter}
      onChange={(e) => setEnableAOIFilter(e.target.checked)}
    />
    Use AOI-based cloud filtering
  </label>
  
  {enableAOIFilter && (
    <div>
      <label>Cloud buffer (meters):</label>
      <input
        type="number"
        value={cloudBuffer}
        onChange={(e) => setCloudBuffer(Number(e.target.value))}
        min={0}
        max={5000}
        step={50}
      />
      <small>Default: 300m. Increase to be more conservative about nearby clouds.</small>
    </div>
  )}
</div>

// In the calculation:
const result = await calculateIndices({
  // ... other params
  use_aoi_cloud_filter: enableAOIFilter,
  cloud_buffer_meters: cloudBuffer
});
```

#### Example: Info Display

```typescript
// Show cloud coverage information
{indicesData?.metadata && (
  <div className="cloud-info">
    <Info className="w-4 h-4" />
    <span>
      Cloud coverage: {indicesData.metadata.cloud_coverage}%
      {indicesData.metadata.cloud_coverage < 10 && (
        <span className="text-green-600 ml-2">✓ Clear skies over farm</span>
      )}
    </span>
  </div>
)}
```

## TypeScript Benefits

The updated interfaces provide:

1. **Type safety** - Autocomplete for new parameters
2. **Documentation** - Inline comments explain each parameter
3. **Optional fields** - Backward compatible with existing code
4. **Default values** - Applied automatically in both services

## Testing

### Frontend Build Test
```bash
cd project
npm run build
```

### Type Check Test
```bash
cd project
npm run type-check  # or npx tsc --noEmit
```

### Expected Results
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ All existing components compile successfully
- ✅ All API calls work with new defaults

## Deployment Checklist

- [x] TypeScript interfaces updated
- [x] Default values applied in both API clients
- [x] No linting errors
- [x] Backward compatible with existing component code
- [ ] (Optional) Add UI controls for cloud buffer settings
- [ ] (Optional) Display AOI cloud coverage in results

## Files Modified

```
project/src/
├── lib/
│   └── satellite-api.ts                    ✅ Updated (staged)
└── services/
    └── satelliteIndicesService.ts          ✅ Updated (just now)
```

## Migration Notes

### For Developers

**No migration needed!** Existing component code works without changes:

```typescript
// This code works exactly as before, but now with AOI filtering
const result = await satelliteIndicesService.calculateIndices({
  aoi: { geometry: farmPolygon },
  date_range: { start_date: "2025-02-10", end_date: "2025-02-11" },
  indices: ["NDVI"],
  cloud_coverage: 10
});
// ✅ Automatically gets: use_aoi_cloud_filter: true, cloud_buffer_meters: 300
```

### For End Users

**No changes visible!** Users will simply notice:

- ✅ More available satellite readings
- ✅ Fewer "unavailable due to clouds" messages
- ✅ Data available on previously problematic dates (like 02/10/2025, 12/10/2025)

## Performance Impact

- **No performance degradation** - Default behavior is optimal
- **Faster results** - AOI-based filtering is more permissive (finds more usable images)
- **Same API response time** - Backend handles the computation

## Browser Compatibility

No changes to browser compatibility. Works with:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ All modern browsers

## Summary

### What Changed
- ✅ Two TypeScript interfaces updated
- ✅ Two API clients apply defaults automatically

### What Didn't Change
- ✅ No component code changes needed
- ✅ No UI changes
- ✅ No breaking changes
- ✅ Same API for developers

### Result
Users automatically get better satellite data availability with **zero code changes** in existing components! 🎉

---

**Last Updated:** October 18, 2025  
**Related:** See `AOI_CLOUD_MASKING_FIX.md` for backend implementation details

