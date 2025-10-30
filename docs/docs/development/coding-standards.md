# Coding Standards

This document outlines the coding standards and best practices for the AgriTech Platform codebase.

## Table of Contents

- [TypeScript Guidelines](#typescript-guidelines)
- [React Best Practices](#react-best-practices)
- [File Organization](#file-organization)
- [Naming Conventions](#naming-conventions)
- [ESLint Configuration](#eslint-configuration)
- [Code Quality Principles](#code-quality-principles)
- [Common Patterns](#common-patterns)

## TypeScript Guidelines

### Type Safety

**Always use explicit types for function parameters and return values**:

```typescript
// ✅ Good - Explicit types
const calculateProfit = (
  revenue: number,
  costs: number
): number => {
  return revenue - costs;
};

// ❌ Bad - Implicit any
const calculateProfit = (revenue, costs) => {
  return revenue - costs;
};
```

**Avoid `any` type - use `unknown` when type is truly unknown**:

```typescript
// ✅ Good - Use unknown and type guards
const processData = (data: unknown): Farm[] => {
  if (!Array.isArray(data)) {
    throw new Error('Invalid data format');
  }
  return data as Farm[];
};

// ❌ Bad - Using any
const processData = (data: any): Farm[] => {
  return data;
};
```

**Use type inference for simple cases**:

```typescript
// ✅ Good - Type is obvious from assignment
const farmCount = 10;
const farmName = "North Field";
const isActive = true;

// ❌ Unnecessary - Type annotation is redundant
const farmCount: number = 10;
const farmName: string = "North Field";
```

### Type Definitions

**Use `interface` for object shapes, `type` for unions/intersections**:

```typescript
// ✅ Good - Interface for object shapes
interface Farm {
  id: string;
  name: string;
  organizationId: string;
  area: number;
}

// ✅ Good - Type for unions
type UserRole = 'admin' | 'manager' | 'worker' | 'viewer';

// ✅ Good - Type for complex combinations
type FarmWithParcels = Farm & {
  parcels: Parcel[];
};
```

**Use utility types effectively**:

```typescript
// Pick - Select specific properties
type FarmBasicInfo = Pick<Farm, 'id' | 'name' | 'area'>;

// Omit - Exclude specific properties
type CreateFarmDto = Omit<Farm, 'id' | 'createdAt'>;

// Partial - Make all properties optional
type UpdateFarmDto = Partial<Farm>;

// Required - Make all properties required
type CompleteFarm = Required<Farm>;

// Record - Create object type with specific keys
type FarmsByOrg = Record<string, Farm[]>;

// ReturnType - Extract return type from function
type QueryResult = ReturnType<typeof useFarms>;
```

**Define database types properly**:

```typescript
// Use generated types from database
import { Database } from '@/types/database.types';

// Extract table types
type Farm = Database['public']['Tables']['farms']['Row'];
type InsertFarm = Database['public']['Tables']['farms']['Insert'];
type UpdateFarm = Database['public']['Tables']['farms']['Update'];

// Helper types
type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
```

### Nullability and Optional Chaining

**Handle null/undefined explicitly**:

```typescript
// ✅ Good - Explicit null checks
const getFarmName = (farm: Farm | null): string => {
  if (!farm) {
    return 'Unknown Farm';
  }
  return farm.name;
};

// ✅ Good - Optional chaining
const areaInHectares = farm?.area ?? 0;

// ✅ Good - Nullish coalescing
const displayName = farm.name || 'Unnamed Farm'; // Empty string = falsy
const displayName = farm.name ?? 'Unnamed Farm'; // Only null/undefined

// ❌ Bad - Unsafe access
const areaInHectares = farm.area;
```

**Use discriminated unions for complex state**:

```typescript
// ✅ Good - Discriminated union
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

const renderFarmData = (state: RequestState<Farm>) => {
  switch (state.status) {
    case 'idle':
      return <div>Not loaded yet</div>;
    case 'loading':
      return <Spinner />;
    case 'success':
      return <FarmDetails farm={state.data} />;
    case 'error':
      return <ErrorMessage error={state.error} />;
  }
};
```

### Generics

**Use generics for reusable components and functions**:

```typescript
// ✅ Good - Generic hook
function useQueryData<T>(
  queryKey: string[],
  queryFn: () => Promise<T>
) {
  return useQuery<T>({
    queryKey,
    queryFn,
  });
}

// Usage
const { data: farms } = useQueryData<Farm[]>(
  ['farms', orgId],
  () => fetchFarms(orgId)
);
```

**Constrain generics when appropriate**:

```typescript
// ✅ Good - Constrained generic
function getProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K
): T[K] {
  return obj[key];
}

// Usage with type safety
const farm: Farm = { id: '1', name: 'Test', area: 100 };
const name = getProperty(farm, 'name'); // Type: string
const area = getProperty(farm, 'area'); // Type: number
```

## React Best Practices

### Component Structure

**Use functional components with TypeScript**:

```typescript
// ✅ Good - Functional component with explicit props
interface FarmCardProps {
  farm: Farm;
  onEdit?: (farm: Farm) => void;
  onDelete?: (farmId: string) => void;
  className?: string;
}

export const FarmCard: React.FC<FarmCardProps> = ({
  farm,
  onEdit,
  onDelete,
  className,
}) => {
  return (
    <div className={cn('farm-card', className)}>
      <h3>{farm.name}</h3>
      <p>Area: {farm.area} hectares</p>
      {onEdit && (
        <button onClick={() => onEdit(farm)}>Edit</button>
      )}
    </div>
  );
};
```

**Component file structure**:

```typescript
// 1. Imports - grouped by type
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

// 2. Types/Interfaces
interface Props {
  farmId: string;
}

// 3. Constants
const REFRESH_INTERVAL = 60000;

// 4. Component
export const FarmDetails: React.FC<Props> = ({ farmId }) => {
  // Hooks
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');

  // Queries
  const { data: farm, isLoading } = useQuery({
    queryKey: ['farm', farmId],
    queryFn: () => fetchFarm(farmId),
  });

  // Effects
  useEffect(() => {
    // Effect logic
  }, [farmId]);

  // Event handlers
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  // Render helpers
  const renderContent = () => {
    if (isLoading) return <Spinner />;
    if (!farm) return <NotFound />;
    return <FarmInfo farm={farm} />;
  };

  // Return
  return (
    <div>
      {renderContent()}
    </div>
  );
};

// 5. Helper functions (non-component)
function calculateTotalArea(parcels: Parcel[]): number {
  return parcels.reduce((sum, p) => sum + p.area, 0);
}
```

### Hooks Usage

**Rules of Hooks**:

```typescript
// ✅ Good - Hooks at top level
const MyComponent = () => {
  const [state, setState] = useState('');
  const { data } = useQuery(...);

  if (state === '') {
    return <div>Empty</div>;
  }

  return <div>{data}</div>;
};

// ❌ Bad - Conditional hooks
const MyComponent = () => {
  if (someCondition) {
    const [state, setState] = useState(''); // ❌ Never do this
  }
};
```

**Custom hooks for shared logic**:

```typescript
// ✅ Good - Extract complex logic into custom hook
export const useFarmData = (farmId: string) => {
  const { data: farm, isLoading: farmLoading } = useQuery({
    queryKey: ['farm', farmId],
    queryFn: () => fetchFarm(farmId),
  });

  const { data: parcels, isLoading: parcelsLoading } = useQuery({
    queryKey: ['parcels', farmId],
    queryFn: () => fetchParcels(farmId),
    enabled: !!farmId,
  });

  const totalArea = useMemo(
    () => parcels?.reduce((sum, p) => sum + p.area, 0) ?? 0,
    [parcels]
  );

  return {
    farm,
    parcels,
    totalArea,
    isLoading: farmLoading || parcelsLoading,
  };
};

// Usage in component
const FarmOverview = ({ farmId }: Props) => {
  const { farm, parcels, totalArea, isLoading } = useFarmData(farmId);

  if (isLoading) return <Spinner />;
  return <div>{/* Render data */}</div>;
};
```

**useEffect dependencies**:

```typescript
// ✅ Good - All dependencies listed
useEffect(() => {
  if (farmId) {
    fetchData(farmId);
  }
}, [farmId]);

// ✅ Good - Empty array for mount-only
useEffect(() => {
  initializeMap();
  return () => cleanupMap();
}, []);

// ❌ Bad - Missing dependencies
useEffect(() => {
  fetchData(farmId); // farmId should be in deps
}, []);

// ✅ Good - Stable callback with useCallback
const handleSubmit = useCallback((data: FormData) => {
  submitData(organizationId, data);
}, [organizationId]);

useEffect(() => {
  // handleSubmit won't cause unnecessary re-runs
}, [handleSubmit]);
```

### Performance Optimization

**Use React.memo for expensive components**:

```typescript
// ✅ Good - Memoize component that receives stable props
export const ParcelCard = React.memo<ParcelCardProps>(
  ({ parcel, onSelect }) => {
    return (
      <div onClick={() => onSelect(parcel.id)}>
        {parcel.name}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison
    return prevProps.parcel.id === nextProps.parcel.id;
  }
);
```

**useMemo for expensive calculations**:

```typescript
// ✅ Good - Memoize expensive calculation
const FarmStatistics = ({ parcels }: Props) => {
  const statistics = useMemo(() => {
    // Expensive calculation
    const totalArea = parcels.reduce((sum, p) => sum + p.area, 0);
    const avgYield = parcels.reduce((sum, p) => sum + p.yield, 0) / parcels.length;
    const cropDistribution = calculateCropDistribution(parcels);

    return { totalArea, avgYield, cropDistribution };
  }, [parcels]);

  return <div>{/* Render statistics */}</div>;
};

// ❌ Bad - Recalculates on every render
const FarmStatistics = ({ parcels }: Props) => {
  const totalArea = parcels.reduce((sum, p) => sum + p.area, 0);
  // ...
};
```

**useCallback for stable callbacks**:

```typescript
// ✅ Good - Stable callback reference
const ParcelList = ({ parcels }: Props) => {
  const [selected, setSelected] = useState<string[]>([]);

  const handleSelect = useCallback((parcelId: string) => {
    setSelected(prev => [...prev, parcelId]);
  }, []); // No dependencies = stable reference

  return (
    <div>
      {parcels.map(parcel => (
        <ParcelCard
          key={parcel.id}
          parcel={parcel}
          onSelect={handleSelect} // Same reference every render
        />
      ))}
    </div>
  );
};
```

### State Management

**Local state for component-specific data**:

```typescript
// ✅ Good - Local state for UI state
const FarmForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('details');

  // Component logic
};
```

**TanStack Query for server state**:

```typescript
// ✅ Good - Server state with React Query
const FarmList = ({ organizationId }: Props) => {
  const { data: farms, isLoading, error } = useQuery({
    queryKey: ['farms', organizationId],
    queryFn: () => fetchFarms(organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createFarm = useMutation({
    mutationFn: (data: CreateFarmDto) => api.createFarm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });

  // Component logic
};
```

**Jotai for global client state**:

```typescript
// atoms.ts
import { atom } from 'jotai';

export const mapViewAtom = atom<MapView>({
  center: [0, 0],
  zoom: 10,
});

// Component
import { useAtom } from 'jotai';
import { mapViewAtom } from '@/atoms';

const MapComponent = () => {
  const [mapView, setMapView] = useAtom(mapViewAtom);

  // Component logic
};
```

## File Organization

### Directory Structure

```
src/
├── components/
│   ├── ui/                  # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   └── index.ts
│   ├── Workers/            # Feature-specific components
│   │   ├── WorkerList.tsx
│   │   ├── WorkerCard.tsx
│   │   ├── WorkerForm.tsx
│   │   └── index.ts
│   └── ...
├── hooks/                  # Custom hooks
│   ├── useAuth.ts
│   ├── useFarms.ts
│   └── ...
├── lib/                    # Utilities and configs
│   ├── supabase.ts
│   ├── satellite-api.ts
│   ├── utils.ts
│   └── casl/
│       ├── ability.ts
│       └── defineAbilityFor.ts
├── routes/                 # TanStack Router routes
│   ├── __root.tsx
│   ├── _authenticated.tsx
│   ├── dashboard.tsx
│   └── ...
├── schemas/               # Zod validation schemas
│   ├── farmSchemas.ts
│   ├── workerSchemas.ts
│   └── ...
├── types/                 # TypeScript types
│   ├── database.types.ts
│   ├── index.ts
│   └── ...
└── locales/              # i18n translations
    ├── en/
    ├── fr/
    └── ar/
```

### Barrel Exports

**Use index.ts for clean imports**:

```typescript
// components/Workers/index.ts
export { WorkerList } from './WorkerList';
export { WorkerCard } from './WorkerCard';
export { WorkerForm } from './WorkerForm';
export { WorkerDetails } from './WorkerDetails';

// Usage elsewhere
import { WorkerList, WorkerCard } from '@/components/Workers';
```

### File Naming

- **Components**: PascalCase - `FarmDetails.tsx`, `WorkerList.tsx`
- **Hooks**: camelCase - `useAuth.ts`, `useFarms.ts`
- **Utilities**: camelCase - `formatCurrency.ts`, `geocoding.ts`
- **Types**: camelCase - `index.ts`, `database.types.ts`
- **Tests**: Match source - `FarmDetails.test.tsx`, `useAuth.test.ts`

## Naming Conventions

### Variables and Functions

```typescript
// camelCase for variables and functions
const farmCount = 10;
const isActive = true;
const calculateTotalArea = (parcels: Parcel[]) => { };

// PascalCase for components and classes
class FarmManager { }
const FarmCard = () => { };

// UPPER_SNAKE_CASE for constants
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_PAGE_SIZE = 20;
```

### Boolean Variables

```typescript
// ✅ Good - Use is/has/can/should prefix
const isLoading = true;
const hasPermission = false;
const canEdit = true;
const shouldRefetch = false;

// ❌ Bad - Ambiguous names
const loading = true;
const permission = false;
```

### Functions

```typescript
// ✅ Good - Verb-based names for actions
const fetchFarms = () => { };
const createWorker = () => { };
const updateParcel = () => { };
const deleteFarm = () => { };

// ✅ Good - get/set for accessors
const getName = () => { };
const setName = () => { };

// ✅ Good - handle for event handlers
const handleClick = () => { };
const handleSubmit = () => { };
const handleChange = () => { };
```

### Types and Interfaces

```typescript
// PascalCase for types and interfaces
interface Farm { }
type UserRole = 'admin' | 'manager';

// Props suffix for component props
interface FarmCardProps { }

// Dto suffix for data transfer objects
type CreateFarmDto = Omit<Farm, 'id'>;

// Avoid 'I' prefix for interfaces
interface Farm { } // ✅ Good
interface IFarm { } // ❌ Bad (old convention)
```

## ESLint Configuration

The project uses ESLint to enforce code quality. Key rules:

```javascript
// eslint.config.js
export default [
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',

      // React
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off', // Using TypeScript
      'react/react-in-jsx-scope': 'off', // React 17+

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
```

### Running ESLint

```bash
# Check for errors
npm run lint

# Auto-fix errors
npm run lint:fix

# Pre-commit hook (automatic)
git commit -m "message" # Runs lint-staged
```

## Code Quality Principles

### DRY (Don't Repeat Yourself)

```typescript
// ❌ Bad - Repetitive code
const fetchUserFarms = async (userId: string) => {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
};

const fetchOrgFarms = async (orgId: string) => {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('organization_id', orgId);
  if (error) throw error;
  return data;
};

// ✅ Good - Reusable function
const fetchFarms = async (filter: Record<string, any>) => {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .match(filter);
  if (error) throw error;
  return data;
};

// Usage
const userFarms = await fetchFarms({ user_id: userId });
const orgFarms = await fetchFarms({ organization_id: orgId });
```

### SOLID Principles

**Single Responsibility**:

```typescript
// ❌ Bad - Component does too much
const FarmManager = () => {
  // Fetching data
  // Validating forms
  // Rendering UI
  // Handling WebSocket
  // Managing local storage
};

// ✅ Good - Separate concerns
const useFarmData = () => { /* Data fetching */ };
const useFarmValidation = () => { /* Validation */ };
const FarmList = () => { /* Rendering */ };
const useFarmSync = () => { /* WebSocket */ };
```

**Open/Closed Principle**:

```typescript
// ✅ Good - Extensible without modification
interface Validator {
  validate(value: any): boolean;
}

class EmailValidator implements Validator {
  validate(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}

class PhoneValidator implements Validator {
  validate(value: string) {
    return /^\+?\d{10,}$/.test(value);
  }
}

// Add new validators without changing existing code
```

### Clean Code

**Descriptive names**:

```typescript
// ❌ Bad
const fn = (x: number, y: number) => x + y;
const d = new Date();

// ✅ Good
const calculateTotalArea = (width: number, height: number) => width * height;
const currentDate = new Date();
```

**Small functions**:

```typescript
// ✅ Good - Small, focused functions
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

const validateUser = (user: User): ValidationResult => {
  return {
    emailValid: validateEmail(user.email),
    passwordValid: validatePassword(user.password),
  };
};
```

**Avoid magic numbers**:

```typescript
// ❌ Bad
if (user.age >= 18) { }
setTimeout(callback, 300000);

// ✅ Good
const LEGAL_AGE = 18;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

if (user.age >= LEGAL_AGE) { }
setTimeout(callback, FIVE_MINUTES_MS);
```

## Common Patterns

### Error Handling

```typescript
// ✅ Good - Explicit error handling
try {
  const data = await fetchFarms(organizationId);
  return { data, error: null };
} catch (error) {
  console.error('Failed to fetch farms:', error);
  return { data: null, error: error as Error };
}

// ✅ Good - Error boundaries for components
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### API Client Pattern

```typescript
// lib/api-client.ts
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

export const apiClient = new ApiClient(import.meta.env.VITE_API_URL);
```

### Form Validation Pattern

```typescript
// schemas/farmSchemas.ts
import { z } from 'zod';

export const farmSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  area: z.number().positive('Area must be positive'),
  organizationId: z.string().uuid('Invalid organization ID'),
});

export type FarmFormData = z.infer<typeof farmSchema>;

// Component
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const FarmForm = () => {
  const form = useForm<FarmFormData>({
    resolver: zodResolver(farmSchema),
    defaultValues: {
      name: '',
      area: 0,
      organizationId: '',
    },
  });

  const onSubmit = async (data: FarmFormData) => {
    // data is fully typed and validated
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
};
```

By following these coding standards, we maintain a consistent, high-quality codebase that is easy to understand, maintain, and extend.
