# Creating Components

This guide covers how to create reusable components in the AgriTech Platform, including proper organization, TypeScript typing, styling with Tailwind CSS, and integration with the UI component library.

## Overview

Components in the AgriTech Platform follow a structured organization:

- **UI Primitives:** `/project/src/components/ui/` - Reusable base components (Button, Input, Card, etc.)
- **Feature Components:** `/project/src/components/[Feature]/` - Feature-specific components
- **Layout Components:** `/project/src/components/` - App-wide layouts (Sidebar, Header, etc.)

## Component Structure

### Basic Component Template

```tsx
import React from 'react';

export interface ComponentNameProps {
  title: string;
  description?: string;
  onAction?: () => void;
  className?: string;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  title,
  description,
  onAction,
  className = '',
}) => {
  return (
    <div className={`base-styles ${className}`}>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {onAction && <button onClick={onAction}>Action</button>}
    </div>
  );
};

export default ComponentName;
```

## Step-by-Step Guide

### Step 1: Determine Component Type

**UI Primitive (Reusable across the app)**
- Location: `/project/src/components/ui/`
- Examples: Button, Input, Card, Dialog, Table
- Should be generic and highly reusable

**Feature Component (Specific to one feature)**
- Location: `/project/src/components/[FeatureName]/`
- Examples: `SatelliteAnalysis/`, `Tasks/`, `Harvests/`
- Contains business logic for a specific feature

### Step 2: Create the Component File

Let's create a feature component for displaying task statistics.

**Location:** `/project/src/components/Tasks/TaskStatsCard.tsx`

```tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

export interface TaskStatsCardProps {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  className?: string;
}

export const TaskStatsCard: React.FC<TaskStatsCardProps> = ({
  totalTasks,
  completedTasks,
  pendingTasks,
  overdueTasks,
  className = '',
}) => {
  const stats = [
    {
      label: 'Completed',
      value: completedTasks,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Pending',
      value: pendingTasks,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Overdue',
      value: overdueTasks,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Task Statistics</CardTitle>
        <CardDescription>Total: {totalTasks} tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex flex-col items-center p-4 rounded-lg border">
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskStatsCard;
```

### Step 3: Add TypeScript Types

Always define explicit TypeScript interfaces for props:

```tsx
// Define props interface
export interface TaskStatsCardProps {
  // Required props
  totalTasks: number;
  completedTasks: number;

  // Optional props with ?
  className?: string;
  onRefresh?: () => void;

  // Complex types
  tasks?: Array<{
    id: string;
    name: string;
    status: 'pending' | 'completed' | 'overdue';
  }>;
}
```

**Use Database Types:**

```tsx
import { Tables } from '@/types/database.types';

export interface TaskListProps {
  tasks: Tables<'tasks'>[];
  onTaskClick?: (task: Tables<'tasks'>) => void;
}
```

### Step 4: Style with Tailwind CSS

The AgriTech Platform uses Tailwind CSS for styling. Follow these conventions:

**Responsive Design:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
</div>
```

**Dark Mode Support:**
```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  {/* Automatically switches based on dark mode */}
</div>
```

**Common Patterns:**
```tsx
// Card with hover effect
<div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">

// Button states
<button className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">

// Spacing
<div className="space-y-4"> {/* Vertical spacing between children */}
<div className="flex gap-2"> {/* Horizontal gap between flex items */}
```

### Step 5: Create UI Primitives

If you need a new UI primitive, follow the existing patterns.

**Example: Input Component** (from `/project/src/components/ui/Input.tsx`)

```tsx
import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={[
          'flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600',
          'bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-200',
          invalid ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : '',
          className,
        ].join(' ')}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export default Input;
```

**Key Points:**
- Use `React.forwardRef` for components that need ref access
- Extend native HTML types for proper TypeScript support
- Support className override for customization
- Include dark mode styles
- Add proper ARIA attributes for accessibility

## Real-World Examples

### Example 1: Feature Component with Data Fetching

**Location:** `/project/src/components/Harvests/HarvestList.tsx`

```tsx
import React from 'react';
import { useHarvests } from '@/hooks/useHarvests';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Package } from 'lucide-react';
import { Tables } from '@/types/database.types';

export interface HarvestListProps {
  parcelId?: string;
  onHarvestClick?: (harvest: Tables<'harvests'>) => void;
  onCreateHarvest?: () => void;
}

export const HarvestList: React.FC<HarvestListProps> = ({
  parcelId,
  onHarvestClick,
  onCreateHarvest,
}) => {
  const { currentFarm } = useAuth();
  const { data: harvests = [], isLoading } = useHarvests(parcelId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Harvests</CardTitle>
        {onCreateHarvest && (
          <Button onClick={onCreateHarvest} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Harvest
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {harvests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No harvests recorded yet
          </div>
        ) : (
          <div className="space-y-2">
            {harvests.map((harvest) => (
              <div
                key={harvest.id}
                onClick={() => onHarvestClick?.(harvest)}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">{harvest.quantity} kg</p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(harvest.harvest_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {currentFarm?.currency_symbol || 'MAD'} {harvest.total_revenue || 0}
                  </p>
                  <p className="text-xs text-gray-500">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HarvestList;
```

### Example 2: Form Component with React Hook Form

```tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';

// Define validation schema
const taskFormSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  due_date: z.string().min(1, 'Due date is required'),
  assigned_to: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export interface TaskFormProps {
  defaultValues?: Partial<TaskFormValues>;
  onSubmit: (data: TaskFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: '',
      description: '',
      due_date: '',
      assigned_to: '',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium mb-1">Task Name</label>
            <Input {...field} placeholder="Enter task name" />
          </div>
        )}
      />

      <FormField
        control={form.control}
        name="due_date"
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <Input {...field} type="date" />
          </div>
        )}
      />

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Task'}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;
```

## Component Patterns

### Container/Presentation Pattern

**Container (Smart Component):**
```tsx
// TasksContainer.tsx
export const TasksContainer: React.FC = () => {
  const { data: tasks, isLoading } = useTasks();
  const mutation = useMutation({ mutationFn: createTask });

  const handleCreate = (data: TaskFormValues) => {
    mutation.mutate(data);
  };

  return <TasksList tasks={tasks} onCreateTask={handleCreate} isLoading={isLoading} />;
};
```

**Presentation (Dumb Component):**
```tsx
// TasksList.tsx
export interface TasksListProps {
  tasks: Task[];
  onCreateTask: (data: TaskFormValues) => void;
  isLoading: boolean;
}

export const TasksList: React.FC<TasksListProps> = ({ tasks, onCreateTask, isLoading }) => {
  return <div>{/* Render tasks */}</div>;
};
```

### Compound Components

For complex components with multiple parts:

```tsx
const Card = ({ children }) => <div className="rounded-lg border">{children}</div>;
Card.Header = ({ children }) => <div className="p-4 border-b">{children}</div>;
Card.Content = ({ children }) => <div className="p-4">{children}</div>;
Card.Footer = ({ children }) => <div className="p-4 border-t">{children}</div>;

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Content>Content</Card.Content>
  <Card.Footer>Footer</Card.Footer>
</Card>
```

## Best Practices

### 1. Use Path Aliases

```tsx
// ✅ Correct
import { Button } from '@/components/ui/button';
import { useTasks } from '@/hooks/useTasks';

// ❌ Wrong
import { Button } from '../../components/ui/button';
```

### 2. Export Types

```tsx
// Export component and types
export type { TaskStatsCardProps };
export { TaskStatsCard };
export default TaskStatsCard;
```

### 3. Prop Destructuring

```tsx
// ✅ Correct - Destructure in function signature
export const Component: React.FC<Props> = ({ title, description, className = '' }) => {

// ❌ Wrong - Access via props
export const Component: React.FC<Props> = (props) => {
  return <div>{props.title}</div>;
}
```

### 4. Conditional Rendering

```tsx
// ✅ Correct
{isLoading && <Spinner />}
{!data && <EmptyState />}
{data && <DataView data={data} />}

// ✅ Also correct with ternary
{isLoading ? <Spinner /> : <DataView data={data} />}
```

### 5. Component Composition

```tsx
// Compose smaller components
const ParcelCard = ({ parcel }) => (
  <Card>
    <ParcelHeader parcel={parcel} />
    <ParcelStats parcel={parcel} />
    <ParcelActions parcel={parcel} />
  </Card>
);
```

## Testing Components

Create test files alongside components:

**Location:** `/project/src/components/Tasks/__tests__/TaskStatsCard.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskStatsCard } from '../TaskStatsCard';

describe('TaskStatsCard', () => {
  it('renders task statistics correctly', () => {
    render(
      <TaskStatsCard
        totalTasks={10}
        completedTasks={5}
        pendingTasks={3}
        overdueTasks={2}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
```

## Checklist

- [ ] Component file created in appropriate directory
- [ ] TypeScript interfaces defined for props
- [ ] Proper imports using `@/` path alias
- [ ] Tailwind CSS classes for styling
- [ ] Dark mode support (if applicable)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading and error states handled
- [ ] Accessibility attributes (ARIA labels, etc.)
- [ ] Component exported as default and named export
- [ ] Types exported for reuse
- [ ] Documented with JSDoc comments (optional but recommended)

## Next Steps

- [Adding New Route](./adding-new-route.md) - Use your component in a route
- [Database Migration](./database-migration.md) - Add data layer for your component
- [Testing Guide](./testing.md) - Write comprehensive tests

## Reference

- **UI Components:** `/project/src/components/ui/`
- **Feature Components:** `/project/src/components/[Feature]/`
- **Tailwind Docs:** https://tailwindcss.com/docs
- **React Hook Form:** https://react-hook-form.com
- **Zod Validation:** https://zod.dev
