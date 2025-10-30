# Debugging Guide

Comprehensive guide to debugging the AgriTech Platform during development.

## Table of Contents

- [Browser DevTools](#browser-devtools)
- [React DevTools](#react-devtools)
- [TanStack Query DevTools](#tanstack-query-devtools)
- [Debugging Hooks](#debugging-hooks)
- [Network Debugging](#network-debugging)
- [Database Debugging](#database-debugging)
- [Debugging Techniques](#debugging-techniques)
- [Common Issues](#common-issues)

## Browser DevTools

### Console

**Logging strategies**:

```typescript
// Development-only logging
if (import.meta.env.DEV) {
  console.log('User data:', user);
  console.table(farms); // Display arrays as tables
  console.group('Farm Operations');
  console.log('Creating farm:', farmData);
  console.groupEnd();
}

// Error logging (always enabled)
console.error('Failed to fetch farms:', error);
console.warn('Subscription limit reached');

// Performance measurement
console.time('fetchFarms');
await fetchFarms();
console.timeEnd('fetchFarms');

// Stack traces
console.trace('Function call trace');
```

**Console methods**:
- `console.log()` - General logging
- `console.error()` - Error messages
- `console.warn()` - Warnings
- `console.info()` - Informational messages
- `console.debug()` - Debug messages (filtered by default)
- `console.table()` - Display arrays/objects as tables
- `console.group()/groupEnd()` - Group related logs
- `console.time()/timeEnd()` - Performance timing
- `console.trace()` - Stack trace

### Network Tab

**Inspecting API requests**:

1. Open DevTools → Network tab
2. Filter by type: XHR/Fetch
3. Click request to see:
   - Headers (request/response)
   - Preview (formatted response)
   - Response (raw data)
   - Timing (performance breakdown)

**Common checks**:
- Status code (200, 401, 403, 404, 500)
- Request payload
- Response data
- Headers (Authorization, Content-Type)
- Timing (identify slow requests)

**Network throttling**:
- Simulate slow connections
- Test loading states
- Verify timeouts

### Application Tab

**Inspect storage**:

```typescript
// LocalStorage
localStorage.getItem('currentOrganization');
localStorage.setItem('debug', 'true');
localStorage.removeItem('staleData');
localStorage.clear();

// SessionStorage
sessionStorage.getItem('tempData');

// IndexedDB
// Used by TanStack Query for persistence
```

**Check cookies**:
- Supabase auth tokens
- Session cookies
- CSRF tokens

### Sources Tab

**Breakpoint debugging**:

1. Open Sources tab
2. Navigate to source file
3. Click line number to set breakpoint
4. Trigger code execution
5. Inspect variables in scope
6. Step through code:
   - Step over (F10) - Execute current line
   - Step into (F11) - Enter function call
   - Step out (Shift+F11) - Exit current function
   - Resume (F8) - Continue execution

**Conditional breakpoints**:
```javascript
// Right-click line number → Add conditional breakpoint
farmId === 'specific-id'
```

**Logpoints** (non-breaking logs):
```javascript
// Right-click → Add logpoint
console.log('Farm:', farm, 'User:', user)
```

## React DevTools

### Installation

Chrome/Edge: Install "React Developer Tools" extension

### Components Tab

**Inspect component tree**:
- View component hierarchy
- Inspect props and state
- See hooks values
- Trace component updates

**Component search**:
- Search by component name
- Filter by type (host, function, class)

**Edit props/state**:
- Double-click values to edit
- Test different scenarios
- Debug edge cases

**Profiler**:
- Record component renders
- Identify performance bottlenecks
- See why components re-rendered

### Example Debugging Session

```typescript
// Component
const FarmDetails = ({ farmId }: Props) => {
  const { data: farm } = useFarm(farmId);
  const [isEditing, setIsEditing] = useState(false);

  // 1. Open React DevTools
  // 2. Find FarmDetails component
  // 3. Inspect props: farmId
  // 4. Inspect hooks: useFarm (data, isLoading, error)
  // 5. Inspect state: isEditing
  // 6. Edit farmId to test with different farm
  // 7. Toggle isEditing to test edit mode

  return <div>...</div>;
};
```

## TanStack Query DevTools

### Enabling DevTools

```typescript
// In main.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Features

**Query inspection**:
- View all active queries
- See query keys
- Inspect cached data
- Check query status (loading, success, error)
- View last updated time
- See staleTime and cacheTime

**Query manipulation**:
- Refetch query manually
- Invalidate query
- Remove query from cache
- Reset error state

**Debug scenarios**:

```typescript
// 1. Check if query is cached
// Open DevTools → Find query by key
// See "Data updated at" timestamp

// 2. Test stale data behavior
// Invalidate query → See refetch
// Change staleTime → Observe behavior

// 3. Debug failed queries
// See error details
// Retry manually
// Check retry count

// 4. Inspect query dependencies
// See enabled conditions
// Check query key structure
```

## Debugging Hooks

### Custom hook debugging

```typescript
// Add console logs
export const useFarms = (organizationId: string) => {
  console.log('useFarms called with:', organizationId);

  const query = useQuery({
    queryKey: ['farms', organizationId],
    queryFn: () => {
      console.log('Fetching farms for:', organizationId);
      return fetchFarms(organizationId);
    },
    enabled: !!organizationId,
  });

  console.log('useFarms result:', query);

  return query;
};
```

### useEffect debugging

```typescript
// Track effect executions
useEffect(() => {
  console.log('Effect triggered');
  console.log('Dependencies:', { farmId, userId });

  // Effect logic
  const result = doSomething();
  console.log('Effect result:', result);

  return () => {
    console.log('Effect cleanup');
  };
}, [farmId, userId]);
```

### useState debugging

```typescript
// Track state changes
const [count, setCount] = useState(0);

const increment = () => {
  console.log('Before:', count);
  setCount(prev => {
    const next = prev + 1;
    console.log('After:', next);
    return next;
  });
};
```

## Network Debugging

### Supabase Queries

**Enable query logging**:

```typescript
// In lib/supabase.ts
const supabase = createClient(url, key, {
  // Enable logging in development
  ...(import.meta.env.DEV && {
    auth: {
      debug: true,
    },
  }),
});

// Or manually log queries
const { data, error } = await supabase
  .from('farms')
  .select('*')
  .eq('organization_id', orgId);

console.log('Query result:', { data, error });
```

### API Request Debugging

```typescript
// Intercept fetch requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('Fetch request:', args);
  const response = await originalFetch(...args);
  console.log('Fetch response:', response);
  return response;
};
```

### CORS Issues

```typescript
// Check CORS headers in Network tab
// Look for:
// - Access-Control-Allow-Origin
// - Access-Control-Allow-Methods
// - Access-Control-Allow-Headers

// Test with curl
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://api.example.com/endpoint
```

## Database Debugging

### Supabase Studio

**SQL Editor**:

```sql
-- Check data
SELECT * FROM farms WHERE organization_id = 'org-123';

-- Verify RLS policies
SELECT * FROM farms; -- Should only return accessible farms

-- Check user permissions
SELECT * FROM organization_users WHERE user_id = auth.uid();

-- Test RPC functions
SELECT * FROM get_user_organizations();
```

**Table editor**:
- View/edit data
- Filter and sort
- Add/delete rows
- Check constraints

**Authentication**:
- View users
- Check user metadata
- See login history

**Logs**:
- View API logs
- Check error messages
- Monitor slow queries

### Local Supabase Debugging

```bash
# View logs
docker logs supabase_db_agritech
docker logs supabase_auth_agritech
docker logs supabase_rest_agritech

# Connect to database
psql postgresql://postgres:postgres@localhost:54322/postgres

# Check running services
docker ps | grep supabase
```

### PostgreSQL Queries

```sql
-- Check table structure
\d farms

-- View indexes
\di

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'farms';

-- View functions
\df

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM farms
WHERE organization_id = 'org-123';
```

## Debugging Techniques

### Rubber Duck Debugging

Explain your code/problem out loud to an inanimate object. Often, the act of explaining reveals the issue.

### Binary Search

1. Comment out half the code
2. Check if issue persists
3. If yes, issue is in remaining code
4. If no, issue is in commented code
5. Repeat with smaller sections

### Console.log Debugging

```typescript
// Strategic logging
function calculateProfit(revenue: number, costs: number) {
  console.log('Input:', { revenue, costs });

  const profit = revenue - costs;
  console.log('Calculated profit:', profit);

  const margin = (profit / revenue) * 100;
  console.log('Profit margin:', margin);

  return { profit, margin };
}
```

### Debugger Statement

```typescript
function processData(data: unknown) {
  debugger; // Pauses execution here

  if (!Array.isArray(data)) {
    debugger; // Another breakpoint
    throw new Error('Invalid data');
  }

  return data.map(item => {
    debugger; // Breaks on each iteration
    return transform(item);
  });
}
```

### Error Boundaries

```typescript
// Catch and log React errors
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error:', error);
    console.error('Error info:', errorInfo);
    console.error('Component stack:', errorInfo.componentStack);

    // Send to error tracking service
    // logErrorToService(error, errorInfo);
  }
}
```

### Source Maps

Ensure source maps are enabled for debugging production builds:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: true, // Generate source maps
  },
});
```

## Common Issues

### Component Not Re-rendering

**Check dependencies**:
```typescript
// Missing dependency
useEffect(() => {
  fetchData(farmId); // farmId not in deps
}, []); // ❌

// Fixed
useEffect(() => {
  fetchData(farmId);
}, [farmId]); // ✅
```

**Check reference equality**:
```typescript
// Object created on every render
const options = { page: 1, limit: 10 }; // ❌ New object each time

// Fixed with useMemo
const options = useMemo(() => ({
  page: 1,
  limit: 10,
}), []); // ✅ Stable reference
```

### Infinite Loop

```typescript
// Causes infinite loop
useEffect(() => {
  setData(newData); // Triggers re-render
}, [data]); // Dependency on state that's being set

// Fixed
useEffect(() => {
  fetchData().then(setData);
}, [fetchData]); // Only runs when fetchData changes
```

### Stale Closure

```typescript
// Captures old value
const [count, setCount] = useState(0);

useEffect(() => {
  const timer = setInterval(() => {
    setCount(count + 1); // Always uses initial count (0)
  }, 1000);
  return () => clearInterval(timer);
}, []); // Empty deps = stale closure

// Fixed with functional update
useEffect(() => {
  const timer = setInterval(() => {
    setCount(prev => prev + 1); // Uses current value
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

### Memory Leaks

```typescript
// Memory leak - missing cleanup
useEffect(() => {
  const subscription = observable.subscribe(data => {
    setData(data);
  });
  // ❌ No cleanup
}, []);

// Fixed
useEffect(() => {
  const subscription = observable.subscribe(data => {
    setData(data);
  });
  return () => subscription.unsubscribe(); // ✅ Cleanup
}, []);
```

### Type Errors

```typescript
// Use TypeScript compiler
npm run type-check

// Or VS Code Problems panel
// Check for red squiggles
// Hover for error details
```

## Performance Debugging

### React Profiler

```typescript
import { Profiler } from 'react';

<Profiler
  id="FarmList"
  onRender={(id, phase, actualDuration) => {
    console.log(`${id} (${phase}) took ${actualDuration}ms`);
  }}
>
  <FarmList />
</Profiler>
```

### Performance API

```typescript
// Measure operation time
performance.mark('fetchStart');
await fetchFarms();
performance.mark('fetchEnd');
performance.measure('fetchFarms', 'fetchStart', 'fetchEnd');

const measure = performance.getEntriesByName('fetchFarms')[0];
console.log(`fetchFarms took ${measure.duration}ms`);
```

### React DevTools Profiler

1. Open React DevTools
2. Go to Profiler tab
3. Click record
4. Perform actions
5. Stop recording
6. Analyze flame graph
7. Identify slow components

## Debugging Tools

### VS Code Extensions

- **ES7+ React/Redux/React-Native snippets**: Code snippets
- **Error Lens**: Inline error display
- **REST Client**: Test API requests
- **SQLTools**: Database queries

### Browser Extensions

- **React Developer Tools**
- **Redux DevTools** (if using Redux)
- **JSON Formatter**
- **Wappalyzer** (detect technologies)

### Command Line Tools

```bash
# Network debugging
curl -v https://api.example.com/farms

# JSON formatting
echo '{"name":"Farm"}' | jq

# Port usage
lsof -i :5173

# Process monitoring
top
htop

# Log streaming
tail -f logs/app.log
```

## Best Practices

1. **Remove debug code before committing**
2. **Use descriptive log messages**
3. **Log context, not just values**
4. **Use appropriate log levels**
5. **Check browser console regularly**
6. **Learn keyboard shortcuts**
7. **Use proper debugging tools, not just console.log**
8. **Understand the stack trace**
9. **Document tricky bugs and solutions**
10. **Set up error tracking early**

---

Effective debugging is a skill that improves with practice. Use these tools and techniques to quickly identify and resolve issues during development.
