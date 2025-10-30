# Drawing State Reset Fix

## Issue
After closing or canceling a parcel drawing, users could not start a new drawing without reloading the page. The drawn polygon would remain on the map, and attempting to draw again would fail or behave unexpectedly.

## Root Cause
When users closed the parcel creation dialog (either via cancel buttons or the dialog's X button), the application state was reset but:
1. The temporary drawn feature remained in the OpenLayers vector source
2. The state variables were reset but the visual polygon persisted on the map
3. Attempting to draw again would create conflicts with the existing feature

## Solution
Created a centralized `cleanupDrawingState()` function that:

1. **Removes temporary drawn features from the map**:
   - Filters the vector source for polygons that don't have a `parcelId` (unsaved parcels)
   - Removes these temporary features from the map

2. **Resets all state variables**:
   - Dialog visibility states (`showNameDialog`, `showParcelForm`)
   - Parcel data (`parcelName`, `tempBoundary`, `parcelDetails`)
   - Calculated values (`calculatedArea`, `calculatedPerimeter`)

3. **Applied to all exit points**:
   - Name dialog cancel button
   - Details dialog cancel button
   - Dialog `onOpenChange` handler (when closing via X or escape)
   - After successful save (to clean up before the new parcel is added)

## Code Changes

### File: `project/src/components/Map.tsx`

#### Added cleanup function (lines 1096-1132):
```typescript
// Helper function to clean up drawing state
const cleanupDrawingState = () => {
  // Remove temporary drawn features from the map
  if (vectorSourceRef.current) {
    const features = vectorSourceRef.current.getFeatures();
    const tempFeatures = features.filter(f =>
      !f.get('parcelId') && // Not a saved parcel
      f.getGeometry() instanceof Polygon // Is a polygon (drawn parcel)
    );
    tempFeatures.forEach(f => vectorSourceRef.current?.removeFeature(f));
  }

  // Reset state
  setShowNameDialog(false);
  setShowParcelForm(false);
  setParcelName('');
  setTempBoundary([]);
  setParcelDetails({
    soil_type: '',
    area: 0,
    planting_density: 0,
    irrigation_type: '',
    crop_category: '',
    crop_type: '',
    variety: '',
    planting_system: '',
    spacing: '',
    density_per_hectare: 0,
    plant_count: 0,
    planting_date: '',
    planting_year: undefined,
    planting_type: '',
    rootstock: ''
  });
  setCalculatedArea(0);
  setCalculatedPerimeter(0);
};
```

#### Updated save handler (line 1169):
```typescript
const handleSaveParcel = async () => {
  // ... existing save logic ...

  // Clean up drawing state
  cleanupDrawingState();

  // ... callback logic ...
};
```

#### Updated name dialog cancel button (line 1273):
```typescript
<button onClick={cleanupDrawingState} className="px-4 py-2 text-gray-600 hover:text-gray-800">
  Annuler
</button>
```

#### Updated details dialog onOpenChange (lines 1290-1294):
```typescript
<Dialog open={farmId && enableDrawing && showParcelForm} onOpenChange={(open) => {
  if (!open) {
    cleanupDrawingState();
  }
}}>
```

#### Updated details dialog cancel button (line 1592):
```typescript
<Button variant="outline" onClick={cleanupDrawingState}>
  Annuler
</Button>
```

## Testing Checklist

- [x] Draw a parcel polygon
- [x] Close the name dialog using the cancel button → polygon should disappear
- [x] Draw a parcel polygon
- [x] Close the name dialog using escape key → polygon should disappear
- [x] Draw a parcel polygon, enter name, proceed to details dialog
- [x] Close the details dialog using cancel button → polygon should disappear
- [x] Draw a parcel polygon, enter name, proceed to details dialog
- [x] Close the details dialog using X button → polygon should disappear
- [x] Draw a parcel polygon, enter name, fill details, save
- [x] After save completes, draw a new parcel → should work without reload

## Benefits

1. **Improved user experience**: Users can now draw multiple parcels in a session without page reloads
2. **Consistent cleanup**: All exit points use the same cleanup logic
3. **Visual feedback**: Temporary drawings are immediately removed when canceled
4. **Maintainability**: Single source of truth for cleanup logic

## Related Files

- [project/src/components/Map.tsx](../project/src/components/Map.tsx) - Main implementation
- [project/src/components/FarmHierarchy/ParcelManagementModal.tsx](../project/src/components/FarmHierarchy/ParcelManagementModal.tsx) - Alternative parcel creation interface (not affected by this issue)

## Future Improvements

Consider:
1. Adding visual feedback when drawing state is cleaned up
2. Implementing undo/redo for drawing operations
3. Adding keyboard shortcuts for cancel operations (already has Escape for dialog close)
4. Saving partial parcel data to localStorage for recovery after accidental cancellation
