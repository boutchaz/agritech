# URL State Persistence - Parcels Page

## Overview

The parcels page (`/parcels`) now persists the selected parcel and active tab in the URL using search parameters. This allows users to:

- **Share links** to specific parcels and tabs
- **Reload the page** without losing their current view
- **Use browser back/forward** buttons to navigate between parcel views
- **Bookmark** specific parcel/tab combinations

## Implementation

### Search Parameters

The route supports two optional search parameters:

- `parcelId` - The ID of the selected parcel
- `tab` - The active tab name (e.g., 'overview', 'weather', 'satellite', etc.)

### URL Examples

```
# No parcel selected (default view)
http://localhost:5173/parcels

# Parcel selected, overview tab (default)
http://localhost:5173/parcels?parcelId=abc-123

# Parcel selected with weather tab active
http://localhost:5173/parcels?parcelId=abc-123&tab=weather

# Parcel selected with satellite tab active
http://localhost:5173/parcels?parcelId=abc-123&tab=satellite
```

### Behavior

1. **On page load:**
   - Reads `parcelId` and `tab` from URL search params
   - Sets initial state to match URL params
   - If no params exist, shows default view (no parcel selected, overview tab)

2. **When user selects a parcel:**
   - Updates `selectedParcelId` state
   - URL automatically updates to include `?parcelId=xxx`
   - Tab defaults to 'overview' unless already set

3. **When user changes tab:**
   - Updates `activeParcelTab` state
   - URL automatically updates to include `&tab=xxx`
   - 'overview' tab is omitted from URL (it's the default)

4. **On reload:**
   - State is restored from URL params
   - User sees exactly the same parcel and tab they were viewing

## Technical Details

### Route Definition

```typescript
export const Route = createFileRoute('/parcels')({
  component: AppContent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      parcelId: (search.parcelId as string) || undefined,
      tab: (search.tab as string) || undefined,
    };
  },
})
```

### State Synchronization

Two `useEffect` hooks handle bidirectional sync:

1. **URL → State:** Updates state when URL params change (e.g., browser back/forward)
2. **State → URL:** Updates URL when state changes (e.g., user clicks a parcel/tab)

### Key Features

- **Replace navigation:** Uses `replace: true` to avoid cluttering browser history
- **Conditional updates:** Only updates URL when values actually change
- **Default handling:** Omits 'overview' tab from URL to keep URLs clean
- **Type safety:** Full TypeScript support with validated search params

## User Benefits

✅ **Shareable URLs** - Send a link to a colleague showing a specific parcel's weather data
✅ **Persistent state** - Refresh without losing your place
✅ **Browser navigation** - Back/forward buttons work as expected
✅ **Bookmarkable** - Save frequently accessed parcel views
✅ **Deep linking** - Link directly to specific tabs from external sources

## Example Use Cases

### 1. Agronomist reviewing weather data
```
Navigate to: /parcels?parcelId=parcel-456&tab=weather
Reload page → Still on weather tab for parcel-456
```

### 2. Manager sharing profitability analysis
```
Copy URL: /parcels?parcelId=parcel-789&tab=profitability
Send to team → They see the same view immediately
```

### 3. Farmer checking satellite imagery
```
Open: /parcels?parcelId=my-field&tab=satellite
Bookmark → Quick access to satellite view anytime
```

## Implementation Files

- **Modified:** `/project/src/routes/parcels.tsx`
  - Added `validateSearch` to route definition
  - Added URL state sync effects
  - Initialized state from URL params

## Future Enhancements

Potential additions for even better UX:

1. **Filter state:** Persist farm filter selection
2. **Map view:** Remember map zoom/center position
3. **Date ranges:** Keep weather analytics date range in URL
4. **Sort order:** Remember how parcels are sorted
5. **View mode:** Persist list vs. grid view preference

---

**Status:** ✅ Implemented and tested
**Backwards Compatible:** Yes - works with or without URL params
