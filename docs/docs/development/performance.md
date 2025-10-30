# Performance Optimization

Guide to optimizing performance in the AgriTech Platform.

## Table of Contents

- [Performance Metrics](#performance-metrics)
- [React Query Optimization](#react-query-optimization)
- [React Performance](#react-performance)
- [Bundle Size Optimization](#bundle-size-optimization)
- [Image Optimization](#image-optimization)
- [Database Query Optimization](#database-query-optimization)
- [Network Performance](#network-performance)
- [Monitoring and Profiling](#monitoring-and-profiling)

## Performance Metrics

### Core Web Vitals

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTFB** (Time to First Byte): < 600ms
- **FCP** (First Contentful Paint): < 1.8s
- **TTI** (Time to Interactive): < 3.8s

### Performance Budget

- Initial bundle: < 200KB gzipped
- Total JavaScript: < 500KB gzipped
- Time to interactive: < 3s on 3G
- Lighthouse score: > 90

## React Query Optimization

### Caching Strategy

**Configure staleTime and cacheTime**:

```typescript
// Global defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

// Per-query configuration
const { data } = useQuery({
  queryKey: ['farms', organizationId],
  queryFn: () => fetchFarms(organizationId),
  staleTime: 5 * 60 * 1000, // Longer for stable data
  cacheTime: 10 * 60 * 1000,
});
```

**Appropriate staleTime values**:
- User profile: 5 minutes (rarely changes)
- Farms/Parcels: 5 minutes (stable)
- Tasks: 1 minute (updates frequently)
- Real-time data: 0 (always fresh)
- Satellite data: 30 minutes (expensive to fetch)

### Prefetching

**Prefetch on hover**:

```typescript
const FarmCard = ({ farm }: Props) => {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch details when user hovers
    queryClient.prefetchQuery({
      queryKey: ['farm', farm.id],
      queryFn: () => fetchFarmDetails(farm.id),
    });
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      <h3>{farm.name}</h3>
    </div>
  );
};
```

**Prefetch on route change**:

```typescript
// In route loader
export const Route = createFileRoute('/farms/$farmId')({
  loader: ({ context, params }) => {
    // Prefetch data before navigating
    context.queryClient.ensureQueryData({
      queryKey: ['farm', params.farmId],
      queryFn: () => fetchFarm(params.farmId),
    });
  },
});
```

### Parallel Queries

```typescript
// Bad - Sequential queries (slow)
const { data: farms } = useQuery(['farms'], fetchFarms);
const { data: parcels } = useQuery(['parcels'], fetchParcels);
const { data: workers } = useQuery(['workers'], fetchWorkers);

// Good - Parallel queries (fast)
const queries = useQueries({
  queries: [
    { queryKey: ['farms'], queryFn: fetchFarms },
    { queryKey: ['parcels'], queryFn: fetchParcels },
    { queryKey: ['workers'], queryFn: fetchWorkers },
  ],
});

const [farmsQuery, parcelsQuery, workersQuery] = queries;
```

### Pagination

```typescript
// Instead of fetching all data
const { data: allTasks } = useQuery(['tasks'], () =>
  fetchTasks({ limit: 1000 })
);

// Use pagination
const [page, setPage] = useState(1);
const { data: tasks } = useQuery(
  ['tasks', { page, limit: 20 }],
  () => fetchTasks({ page, limit: 20 }),
  {
    keepPreviousData: true, // Smooth pagination
  }
);
```

### Infinite Queries

```typescript
// For infinite scroll
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['tasks'],
  queryFn: ({ pageParam = 0 }) => fetchTasks({
    offset: pageParam,
    limit: 20,
  }),
  getNextPageParam: (lastPage, pages) => {
    if (lastPage.length < 20) return undefined;
    return pages.length * 20;
  },
});

// Render with intersection observer
const { ref } = useInView({
  onChange: (inView) => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  },
});
```

## React Performance

### React.memo

**Memoize expensive components**:

```typescript
// Component re-renders on every parent render
const ParcelCard = ({ parcel, onSelect }: Props) => {
  return <div onClick={() => onSelect(parcel.id)}>{parcel.name}</div>;
};

// Memoized - only re-renders when props change
export const ParcelCard = React.memo<Props>(
  ({ parcel, onSelect }) => {
    return <div onClick={() => onSelect(parcel.id)}>{parcel.name}</div>;
  },
  (prevProps, nextProps) => {
    // Custom comparison
    return prevProps.parcel.id === nextProps.parcel.id;
  }
);
```

### useMemo

**Memoize expensive calculations**:

```typescript
const FarmStatistics = ({ parcels }: Props) => {
  // Expensive calculation runs on every render
  const totalArea = parcels.reduce((sum, p) => sum + p.area, 0);
  const avgYield = parcels.reduce((sum, p) => sum + p.yield, 0) / parcels.length;

  // Memoized - only recalculates when parcels change
  const statistics = useMemo(() => {
    const totalArea = parcels.reduce((sum, p) => sum + p.area, 0);
    const avgYield = parcels.reduce((sum, p) => sum + p.yield, 0) / parcels.length;
    const cropDistribution = calculateCropDistribution(parcels);
    return { totalArea, avgYield, cropDistribution };
  }, [parcels]);

  return <div>{/* Render statistics */}</div>;
};
```

### useCallback

**Stable callback references**:

```typescript
const ParcelList = ({ parcels }: Props) => {
  const [selected, setSelected] = useState<string[]>([]);

  // New function created on every render
  const handleSelect = (parcelId: string) => {
    setSelected(prev => [...prev, parcelId]);
  };

  // Stable function reference
  const handleSelectMemoized = useCallback((parcelId: string) => {
    setSelected(prev => [...prev, parcelId]);
  }, []); // Empty deps = never changes

  return (
    <div>
      {parcels.map(parcel => (
        <ParcelCard
          key={parcel.id}
          parcel={parcel}
          onSelect={handleSelectMemoized} // Same reference every render
        />
      ))}
    </div>
  );
};
```

### Code Splitting

**Route-based splitting**:

```typescript
// Automatic with TanStack Router
export const Route = createFileRoute('/satellite-analysis')({
  component: () => import('./SatelliteAnalysis').then(m => m.SatelliteAnalysis),
});
```

**Component-based splitting**:

```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const SatelliteMap = lazy(() => import('@/components/SatelliteMap'));
const HeavyChart = lazy(() => import('@/components/HeavyChart'));

const SatelliteAnalysis = () => {
  return (
    <div>
      <Suspense fallback={<Spinner />}>
        <SatelliteMap />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <HeavyChart />
      </Suspense>
    </div>
  );
};
```

**Library splitting**:

```typescript
// Load heavy libraries on demand
const exportToPDF = async () => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  // Use doc...
};

const showMap = async () => {
  const L = await import('leaflet');
  // Use leaflet...
};
```

### Virtual Scrolling

**For long lists**:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualWorkerList = ({ workers }: Props) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: workers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Row height
    overscan: 5, // Render extra items for smooth scrolling
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <WorkerCard worker={workers[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Debouncing and Throttling

**Debounce search input**:

```typescript
import { useState, useEffect } from 'react';

const SearchInput = () => {
  const [value, setValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 300); // Wait 300ms after last keystroke

    return () => clearTimeout(timer);
  }, [value]);

  // Use debouncedValue for API calls
  const { data } = useQuery({
    queryKey: ['search', debouncedValue],
    queryFn: () => search(debouncedValue),
    enabled: debouncedValue.length > 2,
  });

  return <input value={value} onChange={e => setValue(e.target.value)} />;
};
```

**Throttle scroll handler**:

```typescript
import { useCallback, useRef } from 'react';

const useThrottle = (callback: () => void, delay: number) => {
  const lastRun = useRef(Date.now());

  return useCallback(() => {
    const now = Date.now();
    if (now - lastRun.current >= delay) {
      callback();
      lastRun.current = now;
    }
  }, [callback, delay]);
};

const ScrollComponent = () => {
  const handleScroll = useThrottle(() => {
    // Handle scroll (max once per 100ms)
  }, 100);

  return <div onScroll={handleScroll}>...</div>;
};
```

## Bundle Size Optimization

### Analyze Bundle

```bash
# Install analyzer
npm install --save-dev vite-bundle-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});

# Build and analyze
npm run build
```

### Tree Shaking

```typescript
// Bad - Imports entire library
import _ from 'lodash';
_.debounce(fn, 100);

// Good - Import specific functions
import debounce from 'lodash/debounce';
debounce(fn, 100);

// Or use native alternatives
const debounce = (fn: Function, delay: number) => {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
```

### Dynamic Imports

```typescript
// Static import (always loaded)
import { HeavyComponent } from './HeavyComponent';

// Dynamic import (loaded on demand)
const loadHeavyComponent = () => {
  return import('./HeavyComponent').then(m => m.HeavyComponent);
};
```

### Externalize Dependencies

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
```

## Image Optimization

### Image Formats

- Use WebP for photos (smaller than JPEG)
- Use SVG for icons and logos
- Use PNG for images requiring transparency

### Lazy Loading

```typescript
// Native lazy loading
<img src="farm.jpg" loading="lazy" alt="Farm" />

// With Intersection Observer
const LazyImage = ({ src, alt }: Props) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isLoaded ? src : 'placeholder.jpg'}
      alt={alt}
    />
  );
};
```

### Responsive Images

```typescript
<img
  src="farm-800.jpg"
  srcSet="
    farm-400.jpg 400w,
    farm-800.jpg 800w,
    farm-1200.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Farm"
/>
```

### Image Compression

```bash
# Use tools like:
# - ImageOptim (Mac)
# - Squoosh (Web)
# - sharp (Node.js)

# Example with sharp
npm install sharp

# Script
const sharp = require('sharp');
sharp('input.jpg')
  .resize(800)
  .webp({ quality: 80 })
  .toFile('output.webp');
```

## Database Query Optimization

### Select Only Required Columns

```typescript
// Bad - Fetches all columns
const { data } = await supabase
  .from('farms')
  .select('*')
  .eq('organization_id', orgId);

// Good - Select specific columns
const { data } = await supabase
  .from('farms')
  .select('id, name, area')
  .eq('organization_id', orgId);
```

### Use Indexes

```sql
-- Add index on frequently queried columns
CREATE INDEX idx_farms_organization_id ON farms(organization_id);
CREATE INDEX idx_parcels_farm_id ON parcels(farm_id);
CREATE INDEX idx_tasks_parcel_id ON tasks(parcel_id);

-- Composite index for common query patterns
CREATE INDEX idx_tasks_parcel_date ON tasks(parcel_id, due_date);
```

### Limit Results

```typescript
// Bad - Fetches all results
const { data } = await supabase
  .from('tasks')
  .select('*');

// Good - Paginate results
const { data } = await supabase
  .from('tasks')
  .select('*')
  .range(0, 19) // First 20 results
  .order('created_at', { ascending: false });
```

### Avoid N+1 Queries

```typescript
// Bad - N+1 queries
const { data: farms } = await supabase.from('farms').select('*');
for (const farm of farms) {
  const { data: parcels } = await supabase
    .from('parcels')
    .select('*')
    .eq('farm_id', farm.id);
  farm.parcels = parcels;
}

// Good - Single query with join
const { data: farms } = await supabase
  .from('farms')
  .select(`
    *,
    parcels (*)
  `);
```

### Use RPC for Complex Queries

```sql
-- Create function for complex query
CREATE OR REPLACE FUNCTION get_farm_statistics(farm_id uuid)
RETURNS json AS $$
  SELECT json_build_object(
    'total_area', SUM(area),
    'parcel_count', COUNT(*),
    'crop_types', array_agg(DISTINCT crop_type)
  )
  FROM parcels
  WHERE farm_id = $1;
$$ LANGUAGE sql STABLE;
```

```typescript
// Call from frontend
const { data } = await supabase.rpc('get_farm_statistics', {
  farm_id: farmId,
});
```

## Network Performance

### HTTP/2

Ensure server supports HTTP/2 for:
- Multiplexing requests
- Header compression
- Server push

### Compression

```typescript
// Vite automatically compresses with gzip/brotli
export default defineConfig({
  build: {
    minify: 'esbuild',
    cssMinify: true,
  },
});
```

### CDN

Use CDN for:
- Static assets
- Images
- Fonts
- Third-party libraries

### Caching Headers

```typescript
// Set appropriate cache headers
Cache-Control: public, max-age=31536000, immutable // Static assets
Cache-Control: private, max-age=3600 // User-specific data
Cache-Control: no-cache // Dynamic content
```

### Service Worker

```typescript
// Register service worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

## Monitoring and Profiling

### Performance Monitoring

```typescript
// Measure page load time
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];
  console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart);
});

// Measure specific operations
const measureOperation = async (name: string, fn: () => Promise<any>) => {
  const start = performance.now();
  await fn();
  const duration = performance.now() - start;
  console.log(`${name} took ${duration}ms`);
};
```

### React Profiler

```typescript
import { Profiler } from 'react';

<Profiler
  id="FarmList"
  onRender={(id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    console.log({
      id,
      phase,
      actualDuration, // Actual render time
      baseDuration, // Estimated render time without memoization
      startTime,
      commitTime,
    });
  }}
>
  <FarmList />
</Profiler>
```

### Lighthouse

```bash
# Run Lighthouse
npx lighthouse http://localhost:5173 --view

# CI integration
npm install --save-dev @lhci/cli

# Run in CI
lhci autorun
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npx vite-bundle-visualizer
```

## Performance Checklist

### Development
- [ ] Use React DevTools Profiler
- [ ] Memoize expensive components
- [ ] Optimize re-renders
- [ ] Use proper dependencies in hooks
- [ ] Implement code splitting
- [ ] Lazy load heavy components

### Build
- [ ] Analyze bundle size
- [ ] Remove unused dependencies
- [ ] Enable tree shaking
- [ ] Minify code
- [ ] Compress assets
- [ ] Generate source maps

### Database
- [ ] Add indexes on query columns
- [ ] Limit result sets
- [ ] Avoid N+1 queries
- [ ] Use connection pooling
- [ ] Cache frequent queries

### Network
- [ ] Enable compression
- [ ] Use CDN
- [ ] Set cache headers
- [ ] Implement lazy loading
- [ ] Optimize images

### Monitoring
- [ ] Set up performance monitoring
- [ ] Track Core Web Vitals
- [ ] Monitor bundle size
- [ ] Log slow queries
- [ ] Set performance budgets

Following these optimization techniques ensures the AgriTech Platform remains fast and responsive for all users.
