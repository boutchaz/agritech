# Components

The AgriTech Platform organizes components by feature and reusability, with a clear separation between UI primitives and business logic components.

## Component Organization

```
src/components/
├── ui/                          # Reusable UI primitives
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── FormField.tsx
│   ├── Dialog.tsx
│   ├── DatePicker.tsx
│   ├── PasswordInput.tsx
│   ├── Table.tsx
│   └── Checkbox.tsx
│
├── authorization/               # Permission wrappers
│   ├── Can.tsx
│   ├── LimitWarning.tsx
│   └── ProtectedRoute.tsx
│
├── SatelliteAnalysis/          # Satellite imagery features
│   ├── IndicesCalculator.tsx
│   ├── TimeSeriesChart.tsx
│   ├── IndexImageViewer.tsx
│   └── StatisticsCalculator.tsx
│
├── SoilAnalysis/               # Soil analysis features
│   ├── NutrientBarChart.tsx
│   ├── RecommendationsPanel.tsx
│   └── CSVBulkUpload.tsx
│
├── Analysis/                    # General analysis
│   ├── AnalysisCard.tsx
│   ├── SoilAnalysisForm.tsx
│   ├── SoilAnalysisFormRHF.tsx
│   ├── PlantAnalysisForm.tsx
│   └── WaterAnalysisForm.tsx
│
├── Workers/                     # Worker management
│   └── MetayageCalculator.tsx
│
├── Tasks/                       # Task management
│   └── TasksList.tsx
│
├── Payments/                    # Payment features
│   └── PaymentsList.tsx
│
├── FarmHierarchy/              # Organization/farm/parcel hierarchy
│   ├── FarmHierarchyHeader.tsx
│   └── FarmDetailsModal.tsx
│
├── WeatherAnalytics/           # Weather features
│   ├── WeatherAnalyticsView.tsx
│   ├── PrecipitationChart.tsx
│   ├── TemperatureCharts.tsx
│   └── DryWetConditionsCharts.tsx
│
├── Dashboard/                   # Dashboard widgets
│   ├── DashboardHome.tsx
│   └── DashboardSettings.tsx
│
└── [Root Components]            # Top-level components
    ├── MultiTenantAuthProvider.tsx
    ├── Sidebar.tsx
    ├── OrganizationSwitcher.tsx
    ├── FarmSwitcher.tsx
    ├── LanguageSwitcher.tsx
    ├── FeatureGate.tsx
    ├── SubscriptionBanner.tsx
    ├── OnboardingFlow.tsx
    └── CommandPalette.tsx
```

## UI Primitives

Reusable, styled components built on Radix UI primitives.

### FormField

Wrapper component for consistent form field styling:

```typescript
// src/components/ui/FormField.tsx
type FormFieldProps = {
  label?: React.ReactNode
  htmlFor?: string
  helper?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  htmlFor,
  helper,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helper}</p>
      ) : null}
    </div>
  )
}
```

**Usage:**

```typescript
<FormField
  label="Email"
  htmlFor="email"
  error={errors.email?.message}
  required
>
  <Input id="email" type="email" {...register('email')} />
</FormField>
```

### Input

Styled input component with dark mode support:

```typescript
// src/components/ui/Input.tsx
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full px-3 py-2 border border-gray-300 dark:border-gray-600',
        'rounded-md bg-white dark:bg-gray-700',
        'text-gray-900 dark:text-white',
        'focus:outline-none focus:ring-2 focus:ring-green-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
})
```

### Select

Styled select component:

```typescript
// src/components/ui/Select.tsx
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full px-3 py-2 border border-gray-300 dark:border-gray-600',
        'rounded-md bg-white dark:bg-gray-700',
        'text-gray-900 dark:text-white',
        'focus:outline-none focus:ring-2 focus:ring-green-500',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
})
```

### Dialog

Modal dialog built on Radix UI:

```typescript
import * as DialogPrimitive from '@radix-ui/react-dialog'

export function Dialog({ children, ...props }: DialogPrimitive.DialogProps) {
  return <DialogPrimitive.Root {...props}>{children}</DialogPrimitive.Root>
}

export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  children,
  className,
  ...props
}: DialogPrimitive.DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'bg-white dark:bg-gray-800 rounded-lg shadow-lg',
          'p-6 max-w-md w-full',
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
```

**Usage:**

```typescript
<Dialog>
  <DialogTrigger asChild>
    <button>Open Dialog</button>
  </DialogTrigger>
  <DialogContent>
    <h2>Dialog Title</h2>
    <p>Dialog content</p>
    <DialogClose asChild>
      <button>Close</button>
    </DialogClose>
  </DialogContent>
</Dialog>
```

## Feature Components

### Satellite Analysis

**IndicesCalculator.tsx** - Calculate vegetation indices for parcels

```typescript
interface IndicesCalculatorProps {
  parcelId: string
  onCalculated?: (data: SatelliteData) => void
}

export function IndicesCalculator({ parcelId, onCalculated }: IndicesCalculatorProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedIndices, setSelectedIndices] = useState<VegetationIndex[]>([])

  // Fetch available dates
  const { data: availableDates } = useQuery({
    queryKey: ['satellite-dates', parcelId],
    queryFn: () => satelliteApi.getAvailableDates(parcelId),
  })

  // Calculate indices mutation
  const calculateMutation = useMutation({
    mutationFn: (params: CalculateParams) =>
      satelliteApi.calculateIndices(parcelId, params),
    onSuccess: (data) => {
      onCalculated?.(data)
    },
  })

  return (
    <div>
      <DateSelect
        dates={availableDates}
        value={selectedDate}
        onChange={setSelectedDate}
      />
      <IndicesMultiSelect
        value={selectedIndices}
        onChange={setSelectedIndices}
      />
      <button
        onClick={() => calculateMutation.mutate({ date: selectedDate, indices: selectedIndices })}
        disabled={calculateMutation.isPending}
      >
        {calculateMutation.isPending ? 'Calculating...' : 'Calculate Indices'}
      </button>
    </div>
  )
}
```

### Multi-Tenant Context Switchers

**OrganizationSwitcher.tsx**

```typescript
import { useAuth } from '@/hooks/useAuth'

export function OrganizationSwitcher() {
  const { organizations, currentOrganization, setCurrentOrganization } = useAuth()

  return (
    <Select
      value={currentOrganization?.id}
      onValueChange={(id) => {
        const org = organizations.find(o => o.id === id)
        if (org) setCurrentOrganization(org)
      }}
    >
      {organizations.map(org => (
        <SelectItem key={org.id} value={org.id}>
          {org.name}
        </SelectItem>
      ))}
    </Select>
  )
}
```

**FarmSwitcher.tsx**

```typescript
export function FarmSwitcher() {
  const { farms, currentFarm, setCurrentFarm } = useAuth()

  if (farms.length === 0) return null

  return (
    <Select
      value={currentFarm?.id}
      onValueChange={(id) => {
        const farm = farms.find(f => f.id === id)
        if (farm) setCurrentFarm(farm)
      }}
    >
      {farms.map(farm => (
        <SelectItem key={farm.id} value={farm.id}>
          {farm.name}
        </SelectItem>
      ))}
    </Select>
  )
}
```

### Feature Gating

**FeatureGate.tsx**

```typescript
interface FeatureGateProps {
  feature: 'analytics' | 'sensor_integration' | 'advanced_reporting' | 'api_access'
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function FeatureGate({ feature, fallback, children }: FeatureGateProps) {
  const { data: subscription } = useSubscription()

  const featureMap = {
    analytics: subscription?.has_analytics,
    sensor_integration: subscription?.has_sensor_integration,
    advanced_reporting: subscription?.has_advanced_reporting,
    api_access: subscription?.has_api_access,
  }

  const hasFeature = featureMap[feature]

  if (!hasFeature) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}
```

**Usage:**

```typescript
<FeatureGate
  feature="analytics"
  fallback={<UpgradePrompt feature="Advanced Analytics" />}
>
  <AdvancedAnalyticsDashboard />
</FeatureGate>
```

### Sidebar Navigation

**Sidebar.tsx**

```typescript
interface Module {
  id: string
  name: string
  icon: string
  active: boolean
  category: string
}

interface SidebarProps {
  modules: Module[]
  activeModule: string
  onModuleChange: (moduleId: string) => void
  isDarkMode: boolean
  onThemeToggle: () => void
}

export function Sidebar({
  modules,
  activeModule,
  onModuleChange,
  isDarkMode,
  onThemeToggle,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-green-600">AgriTech</h1>
      </div>

      <nav className="space-y-1 px-2">
        {modules.map(module => (
          <button
            key={module.id}
            onClick={() => onModuleChange(module.id)}
            className={cn(
              'w-full flex items-center px-3 py-2 rounded-md',
              activeModule === module.id
                ? 'bg-green-50 text-green-600'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <Icon name={module.icon} className="mr-3" />
            {module.name}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-4 left-4">
        <button onClick={onThemeToggle}>
          {isDarkMode ? <Sun /> : <Moon />}
        </button>
      </div>
    </aside>
  )
}
```

## Component Patterns

### Compound Components

```typescript
// Card with compound components
export function Card({ children, className }: CardProps) {
  return <div className={cn('rounded-lg border bg-white', className)}>{children}</div>
}

Card.Header = function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-4 border-b">{children}</div>
}

Card.Content = function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="p-4">{children}</div>
}

Card.Footer = function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className="p-4 border-t">{children}</div>
}

// Usage
<Card>
  <Card.Header>
    <h2>Card Title</h2>
  </Card.Header>
  <Card.Content>
    <p>Card content</p>
  </Card.Content>
  <Card.Footer>
    <button>Action</button>
  </Card.Footer>
</Card>
```

### Render Props

```typescript
interface DataLoaderProps<T> {
  queryKey: string[]
  queryFn: () => Promise<T>
  children: (data: T, isLoading: boolean, error: Error | null) => React.ReactNode
}

export function DataLoader<T>({ queryKey, queryFn, children }: DataLoaderProps<T>) {
  const { data, isLoading, error } = useQuery({ queryKey, queryFn })

  return <>{children(data, isLoading, error)}</>
}

// Usage
<DataLoader queryKey={['parcels']} queryFn={fetchParcels}>
  {(parcels, isLoading, error) => {
    if (isLoading) return <Spinner />
    if (error) return <Error message={error.message} />
    return <ParcelsList parcels={parcels} />
  }}
</DataLoader>
```

### Custom Hooks + Components

```typescript
// Custom hook
function useParcelSelection() {
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const openDialog = (parcel: Parcel) => {
    setSelectedParcel(parcel)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setSelectedParcel(null)
    setIsDialogOpen(false)
  }

  return {
    selectedParcel,
    isDialogOpen,
    openDialog,
    closeDialog,
  }
}

// Component using the hook
function ParcelManager() {
  const { selectedParcel, isDialogOpen, openDialog, closeDialog } = useParcelSelection()

  return (
    <>
      <ParcelsList onParcelClick={openDialog} />
      <ParcelDialog
        parcel={selectedParcel}
        open={isDialogOpen}
        onClose={closeDialog}
      />
    </>
  )
}
```

## Component Best Practices

### 1. Single Responsibility

Each component should have one clear purpose:

```typescript
// Good: Focused component
function ParcelCard({ parcel }: { parcel: Parcel }) {
  return (
    <div className="parcel-card">
      <h3>{parcel.name}</h3>
      <p>{parcel.area} ha</p>
    </div>
  )
}

// Bad: Doing too much
function ParcelCardWithEverything({ parcel }: { parcel: Parcel }) {
  // Fetching data, form logic, validation, rendering...
}
```

### 2. Composition Over Inheritance

```typescript
// Good: Composition
function ParcelDetails({ parcel }: { parcel: Parcel }) {
  return (
    <Card>
      <ParcelHeader parcel={parcel} />
      <ParcelStats parcel={parcel} />
      <ParcelActions parcel={parcel} />
    </Card>
  )
}

// Bad: One giant component
function ParcelDetailsMonolith({ parcel }: { parcel: Parcel }) {
  // Everything in one component
}
```

### 3. Prop Drilling Solutions

Use Context or composition to avoid prop drilling:

```typescript
// Context approach
const ParcelContext = createContext<Parcel | null>(null)

function ParcelProvider({ parcel, children }: { parcel: Parcel; children: React.ReactNode }) {
  return <ParcelContext.Provider value={parcel}>{children}</ParcelContext.Provider>
}

function useParcel() {
  const parcel = useContext(ParcelContext)
  if (!parcel) throw new Error('useParcel must be used within ParcelProvider')
  return parcel
}

// Usage
<ParcelProvider parcel={parcel}>
  <ParcelDetails />
  <ParcelMap />
  <ParcelActions />
</ParcelProvider>
```

### 4. Error Boundaries

Wrap components with error boundaries:

```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

// Usage
<ErrorBoundary fallback={<ErrorMessage />}>
  <SatelliteAnalysis />
</ErrorBoundary>
```

### 5. Loading States

Always handle loading states:

```typescript
function ParcelsList() {
  const { data: parcels, isLoading, error } = useQuery({
    queryKey: ['parcels'],
    queryFn: fetchParcels,
  })

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage error={error} />
  }

  if (!parcels || parcels.length === 0) {
    return <EmptyState message="No parcels found" />
  }

  return (
    <div>
      {parcels.map(parcel => (
        <ParcelCard key={parcel.id} parcel={parcel} />
      ))}
    </div>
  )
}
```

### 6. TypeScript Props

Always type component props:

```typescript
interface ParcelCardProps {
  parcel: Parcel
  onEdit?: (parcel: Parcel) => void
  onDelete?: (parcelId: string) => void
  className?: string
}

export function ParcelCard({
  parcel,
  onEdit,
  onDelete,
  className,
}: ParcelCardProps) {
  // Component implementation
}
```

### 7. Memoization

Use memoization for expensive computations:

```typescript
import { useMemo } from 'react'

function ParcelStatistics({ parcel }: { parcel: Parcel }) {
  const statistics = useMemo(() => {
    return calculateComplexStatistics(parcel)
  }, [parcel])

  return <StatisticsDisplay stats={statistics} />
}
```

## Summary

The AgriTech Platform's component architecture emphasizes:

- **Organization by feature**: Related components are grouped together
- **Reusable UI primitives**: Consistent styling with `src/components/ui/`
- **Composition**: Small, focused components that compose together
- **Type safety**: All components are fully typed with TypeScript
- **Accessibility**: ARIA attributes and semantic HTML
- **Performance**: Memoization and lazy loading where appropriate

By following these patterns and best practices, components remain maintainable, testable, and reusable across the application.
