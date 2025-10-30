# Farm Management

## Overview

The Farm Management module provides a comprehensive multi-level hierarchical structure for organizing agricultural operations. It follows the pattern: **Organizations → Farms → Parcels → Sub-parcels**, enabling precise management of land, crops, and operations at every level.

## Key Features

### Multi-Level Hierarchy

1. **Organizations** - Top-level tenant entities
   - Multi-tenant isolation with Row Level Security (RLS)
   - Currency and timezone settings
   - User role management
   - Organization-wide settings and preferences

2. **Farms** - Individual farm properties within an organization
   - Geographic location and boundaries
   - Farm-level managers and workers
   - Farm-specific settings and configurations
   - Cost center tracking for accounting

3. **Parcels** - Individual crop fields within a farm
   - GeoJSON-based boundary definitions
   - Crop type and variety tracking
   - Planting and harvest dates
   - Area calculations (hectares/acres)
   - Soil type and irrigation system information

4. **Divergent Sub-parcels** - Area of Interest (AOI) based divisions
   - Subdivide parcels for varied crop areas
   - Independent satellite analysis per sub-parcel
   - Flexible boundary management
   - Linked to parent parcel

### Geospatial Capabilities

The platform integrates advanced geospatial features for precise land management:

- **Interactive Map Interface** - Leaflet and React Leaflet for user-friendly mapping
- **Boundary Drawing Tools** - Draw and edit parcel boundaries directly on the map
- **GeoJSON Storage** - Industry-standard format for boundary data
- **Coordinate System Support** - Automatic conversion between Web Mercator (EPSG:3857) and WGS84
- **Area Calculations** - Automatic calculation of parcel areas in hectares or acres
- **Buffer Zones** - Support for 300m cloud detection buffers around parcels
- **Polygon Validation** - Ensures valid closed polygons for all boundaries

### Cost Center Integration

Each farm and parcel can be designated as a cost center for accounting purposes:

- Track expenses and revenues at farm or parcel level
- Enable profitability analysis by location
- Support for multi-dimensional cost allocation
- Integration with journal entries and invoices
- Comparative performance reporting across farms/parcels

## User Interface

### Farm Hierarchy View

The main farm hierarchy interface (`/farm-hierarchy`) provides:

- **Tree View Navigation** - Hierarchical display of organizations, farms, and parcels
- **Quick Add Buttons** - Create new farms and parcels with one click
- **Inline Editing** - Update farm and parcel information without page navigation
- **Status Indicators** - Visual cues for active/inactive farms and parcels
- **Search and Filter** - Find specific farms or parcels quickly

### Parcel Details View

Detailed parcel view (`/parcels`) includes:

- **Map Visualization** - See parcel boundaries on an interactive map
- **Crop Information** - Current crop, variety, planting date
- **Area Metrics** - Calculated area in preferred units
- **Satellite Data Summary** - Latest vegetation indices and analysis dates
- **Task List** - Recent and upcoming tasks for the parcel
- **Harvest History** - Past harvests with yields and quality metrics

### Farm Management Dashboard

The farm dashboard provides:

- **Farm Overview Cards** - Key metrics for each farm
- **Parcel Summary** - Total area, active parcels, crop distribution
- **Worker Assignment** - See which workers are assigned to each farm
- **Recent Activity** - Latest tasks, harvests, and satellite analyses
- **Weather Integration** - Current and forecasted weather for farm locations

## Usage Guide

### Creating an Organization

Organizations are typically created during user onboarding:

1. Navigate to `/onboarding`
2. Complete the organization setup form:
   - Organization name
   - Country and timezone
   - Primary currency
   - Business type (farming, research, consulting)
3. System automatically creates the organization and assigns you as admin
4. Invitation system for adding additional users

### Adding a New Farm

To create a farm within your organization:

1. Navigate to `/farm-hierarchy`
2. Click "Add Farm" button
3. Fill in the farm creation form:
   ```typescript
   {
     name: "Green Valley Farm",
     location: "California, USA",
     total_area: 250.5,
     area_unit: "hectares",
     timezone: "America/Los_Angeles"
   }
   ```
4. Optionally set farm-specific settings:
   - Default irrigation system
   - Soil type
   - Climate zone
5. Click "Create Farm"

### Creating a Parcel

To add a parcel to a farm:

1. Select a farm from the farm hierarchy
2. Click "Add Parcel" button
3. Use the map interface to draw the parcel boundary:
   - Click to add points
   - Double-click to close the polygon
   - Drag points to adjust boundaries
4. Fill in parcel details:
   ```typescript
   {
     name: "North Field Block A",
     crop_type: "Wheat",
     crop_variety: "Hard Red Winter",
     planting_date: "2024-10-15",
     expected_harvest_date: "2025-06-30",
     irrigation_system: "Center Pivot",
     soil_type: "Loam"
   }
   ```
5. System automatically calculates area from GeoJSON boundary
6. Click "Create Parcel"

### Creating Sub-parcels

For areas within a parcel that require separate analysis:

1. Open a parcel's detail view
2. Click "Add Sub-parcel"
3. Draw the sub-parcel boundary within the parent parcel
4. Provide a name and description
5. Sub-parcel inherits parent settings but allows independent analysis

### Editing Farm/Parcel Information

To update farm or parcel details:

1. Click the edit icon next to the farm/parcel name
2. Modify the desired fields
3. For boundary changes:
   - Click "Edit Boundary"
   - Drag points or add/remove points
   - Click "Save Boundary"
4. Save changes

## API Integration

### Database Schema

**Organizations Table:**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Farms Table:**
```sql
CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  total_area NUMERIC,
  area_unit TEXT DEFAULT 'hectares',
  boundary JSONB, -- GeoJSON geometry
  timezone TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Parcels Table:**
```sql
CREATE TABLE parcels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop_type TEXT,
  crop_variety TEXT,
  planting_date DATE,
  expected_harvest_date DATE,
  boundary JSONB NOT NULL, -- GeoJSON geometry
  area NUMERIC, -- Calculated area
  area_unit TEXT DEFAULT 'hectares',
  irrigation_system TEXT,
  soil_type TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Access Control

The platform uses a two-layer authorization system:

**Role Hierarchy (1-6):**
1. `system_admin` - Platform-wide access
2. `organization_admin` - Full organization management
3. `farm_manager` - Farm-level operations
4. `farm_worker` - Task execution and data entry
5. `day_laborer` - Limited to assigned tasks
6. `viewer` - Read-only access

**Permissions via CASL:**
```typescript
// Component-based permission check
<Can I="create" a="Farm">
  <CreateFarmButton />
</Can>

// Programmatic permission check
const canCreateFarm = useCan('create', 'Farm');
const canUpdateParcel = useCan('update', 'Parcel');
```

### Context Management

The `MultiTenantAuthProvider` manages the current context:

```typescript
const {
  currentOrganization,  // Selected organization
  currentFarm,          // Selected farm
  organizations,        // All user's organizations
  farms,               // Farms in current organization
  userRole,            // Role in current organization
  hasRole,             // Check specific role
  isAtLeastRole        // Check role hierarchy
} = useAuth();
```

### API Endpoints

**TanStack Query Hooks:**

```typescript
// Fetch farms for an organization
const { data: farms } = useQuery({
  queryKey: ['farms', organizationId],
  queryFn: () => supabase
    .from('farms')
    .select('*')
    .eq('organization_id', organizationId)
});

// Fetch parcels for a farm
const { data: parcels } = useQuery({
  queryKey: ['parcels', { farmId }],
  queryFn: () => supabase
    .from('parcels')
    .select('*')
    .eq('farm_id', farmId)
});

// Create a new parcel
const createParcelMutation = useMutation({
  mutationFn: (parcel) => supabase
    .from('parcels')
    .insert(parcel)
    .select()
    .single(),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['parcels'] });
  }
});
```

## Code Examples

### Converting Boundaries to GeoJSON

```typescript
import { convertBoundaryToGeoJSON } from '@/lib/satellite-api';

// Convert Leaflet coordinates to GeoJSON
const boundary = [
  [-120.5, 37.2],
  [-120.4, 37.2],
  [-120.4, 37.3],
  [-120.5, 37.3],
  [-120.5, 37.2]  // Closed polygon
];

const geoJson = convertBoundaryToGeoJSON(boundary);
// Result: { type: 'Polygon', coordinates: [[...]] }
```

### Creating a Parcel with Boundary

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { convertBoundaryToGeoJSON } from '@/lib/satellite-api';

const CreateParcelForm = () => {
  const queryClient = useQueryClient();

  const createParcel = useMutation({
    mutationFn: async (data) => {
      // Convert boundary to GeoJSON
      const boundary = convertBoundaryToGeoJSON(data.coordinates);

      const { data: parcel, error } = await supabase
        .from('parcels')
        .insert({
          name: data.name,
          farm_id: data.farmId,
          crop_type: data.cropType,
          crop_variety: data.cropVariety,
          boundary: boundary,
          area: data.area,
          area_unit: 'hectares',
          planting_date: data.plantingDate,
          expected_harvest_date: data.harvestDate
        })
        .select()
        .single();

      if (error) throw error;
      return parcel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      // Show success notification
    }
  });

  // Form implementation...
};
```

### Checking Permissions

```typescript
import { useCan } from '@/lib/casl/AbilityContext';
import { useAuth } from '@/components/MultiTenantAuthProvider';

const FarmManagementPage = () => {
  const { currentOrganization, userRole, isAtLeastRole } = useAuth();
  const canCreateFarm = useCan('create', 'Farm');
  const canDeleteParcel = useCan('delete', 'Parcel');
  const isFarmManager = isAtLeastRole('farm_manager');

  return (
    <div>
      {canCreateFarm && <CreateFarmButton />}
      {canDeleteParcel && <DeleteParcelButton />}
      {isFarmManager && <AdvancedSettingsPanel />}
    </div>
  );
};
```

## Best Practices

### Boundary Management

1. **Always close polygons** - Ensure first and last points match
2. **Use WGS84 coordinates** - Latitude/longitude in decimal degrees
3. **Validate boundaries** - Check for self-intersecting polygons
4. **Keep boundaries simple** - Avoid overly complex shapes (performance)
5. **Buffer zones** - Account for 300m buffer in satellite analysis

### Organization Structure

1. **One organization per business entity** - Legal and billing isolation
2. **Separate farms for different locations** - Geographic organization
3. **Logical parcel naming** - Use clear, consistent naming conventions
4. **Cost centers for key areas** - Enable profitability tracking
5. **Regular data cleanup** - Archive inactive farms and parcels

### Performance Optimization

1. **Pagination for large datasets** - Use limit/offset for 100+ parcels
2. **Selective data loading** - Fetch only needed fields
3. **Caching with TanStack Query** - Configure appropriate staleTime
4. **Lazy load boundaries** - Load map data only when displaying maps
5. **Debounced search** - For farm/parcel search inputs

## Related Features

- [Satellite Analysis](./satellite-analysis.md) - Vegetation monitoring for parcels
- [Task Management](./task-management.md) - Assign tasks to farms and parcels
- [Accounting](./accounting.md) - Cost center tracking and profitability
- [Workers](./workers.md) - Assign workers to farms

## Troubleshooting

### Common Issues

**Boundary not displaying on map:**
- Verify GeoJSON format is correct
- Check coordinate system (should be WGS84)
- Ensure polygon is closed (first point = last point)

**Permission denied errors:**
- Verify user has appropriate role in organization
- Check subscription plan includes required features
- Ensure RLS policies are properly configured

**Area calculation incorrect:**
- Verify boundary coordinates are in correct order
- Check for self-intersecting polygons
- Ensure coordinate system is WGS84 (not Web Mercator)

**Performance issues with many parcels:**
- Implement pagination (default 50 parcels per page)
- Use virtual scrolling for long lists
- Lazy load parcel boundaries on map zoom
