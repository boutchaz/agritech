# Adding a Complete Feature

This comprehensive guide walks you through adding a complete feature to the AgriTech Platform, from database schema to frontend UI, using a real-world example.

## Overview

Adding a feature involves these layers:

1. **Database Schema** - Create tables, RLS policies, functions
2. **Type Generation** - Generate TypeScript types from schema
3. **API Layer** - Create custom hooks for data fetching
4. **Components** - Build UI components
5. **Routes** - Create pages/routes
6. **Authorization** - Add CASL permissions
7. **Navigation** - Add to sidebar/menus
8. **Testing** - Write unit and E2E tests

## Example Feature: Irrigation Schedules

Let's build a complete feature for managing irrigation schedules across parcels.

## Phase 1: Database Schema

### Step 1: Create Migration

**File:** `/project/supabase/migrations/20251030140000_add_irrigation_schedules.sql`

```sql
-- =====================================================
-- Irrigation Schedules Feature
-- =====================================================
-- Manages irrigation schedules, execution, and water usage tracking
-- =====================================================

-- Irrigation schedules table
CREATE TABLE IF NOT EXISTS irrigation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,

  -- Schedule details
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Timing
  start_date DATE NOT NULL,
  end_date DATE,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  time_of_day TIME NOT NULL DEFAULT '06:00:00',
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),

  -- Water amount
  water_amount_cubic_meters DECIMAL(10, 2) CHECK (water_amount_cubic_meters > 0),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'paused', 'completed', 'cancelled')),

  -- Custom schedule (for frequency = 'custom')
  custom_schedule JSONB, -- e.g., {"days": [1, 3, 5], "weeks": [1, 2]}

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Irrigation executions (log of actual irrigation events)
CREATE TABLE IF NOT EXISTS irrigation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES irrigation_schedules(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,

  -- Execution details
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  actual_date DATE,
  actual_time TIME,
  actual_duration_minutes INT,
  actual_water_cubic_meters DECIMAL(10, 2),

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  notes TEXT,
  failure_reason TEXT,

  -- Worker assignment
  executed_by UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_irrigation_schedules_org ON irrigation_schedules(organization_id);
CREATE INDEX idx_irrigation_schedules_farm ON irrigation_schedules(farm_id);
CREATE INDEX idx_irrigation_schedules_parcel ON irrigation_schedules(parcel_id);
CREATE INDEX idx_irrigation_schedules_active ON irrigation_schedules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_irrigation_schedules_dates ON irrigation_schedules(start_date, end_date);

CREATE INDEX idx_irrigation_executions_schedule ON irrigation_executions(schedule_id);
CREATE INDEX idx_irrigation_executions_org ON irrigation_executions(organization_id);
CREATE INDEX idx_irrigation_executions_dates ON irrigation_executions(scheduled_date, actual_date);
CREATE INDEX idx_irrigation_executions_status ON irrigation_executions(status);

-- Enable RLS
ALTER TABLE irrigation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE irrigation_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for irrigation_schedules
CREATE POLICY "Users can view schedules from their organizations"
  ON irrigation_schedules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create schedules in their organizations"
  ON irrigation_schedules FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update schedules in their organizations"
  ON irrigation_schedules FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete schedules"
  ON irrigation_schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE user_id = auth.uid()
        AND organization_id = irrigation_schedules.organization_id
        AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- RLS Policies for irrigation_executions
CREATE POLICY "Users can view executions from their organizations"
  ON irrigation_executions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create executions in their organizations"
  ON irrigation_executions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update executions in their organizations"
  ON irrigation_executions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Triggers
CREATE OR REPLACE FUNCTION update_irrigation_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER irrigation_schedules_updated_at
  BEFORE UPDATE ON irrigation_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_irrigation_schedules_updated_at();

-- Helper function: Generate executions for a schedule
CREATE OR REPLACE FUNCTION generate_irrigation_executions(
  p_schedule_id UUID,
  p_days_ahead INT DEFAULT 30
)
RETURNS INT AS $$
DECLARE
  v_schedule RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_count INT := 0;
BEGIN
  -- Get schedule details
  SELECT * INTO v_schedule FROM irrigation_schedules WHERE id = p_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;

  v_current_date := CURRENT_DATE;
  v_end_date := LEAST(
    v_current_date + p_days_ahead,
    COALESCE(v_schedule.end_date, v_current_date + p_days_ahead)
  );

  -- Generate executions based on frequency
  WHILE v_current_date <= v_end_date LOOP
    -- Check if execution should be created based on frequency
    IF (v_schedule.frequency = 'daily') OR
       (v_schedule.frequency = 'weekly' AND EXTRACT(DOW FROM v_current_date) = EXTRACT(DOW FROM v_schedule.start_date)) THEN

      -- Insert execution if not exists
      INSERT INTO irrigation_executions (
        schedule_id,
        organization_id,
        parcel_id,
        scheduled_date,
        scheduled_time,
        status
      )
      VALUES (
        p_schedule_id,
        v_schedule.organization_id,
        v_schedule.parcel_id,
        v_current_date,
        v_schedule.time_of_day,
        'pending'
      )
      ON CONFLICT DO NOTHING;

      v_count := v_count + 1;
    END IF;

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE irrigation_schedules IS 'Irrigation schedules for parcels with recurrence rules';
COMMENT ON TABLE irrigation_executions IS 'Log of individual irrigation events (scheduled and actual)';
COMMENT ON FUNCTION generate_irrigation_executions IS 'Generates pending irrigation executions for a schedule';
```

### Step 2: Apply Migration and Generate Types

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Test locally
npm run db:reset

# Generate types
npm run db:generate-types

# Push to remote
npm run db:push

# Regenerate types from remote
npm run db:generate-types-remote
```

## Phase 2: API Layer (Custom Hooks)

### Step 3: Create Custom Hooks

**File:** `/project/src/hooks/useIrrigationSchedules.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { Tables } from '@/types/database.types';

type IrrigationSchedule = Tables<'irrigation_schedules'>;
type IrrigationExecution = Tables<'irrigation_executions'>;

export const useIrrigationSchedules = (parcelId?: string) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['irrigation-schedules', { organizationId: currentOrganization?.id, parcelId }],
    queryFn: async () => {
      let query = supabase
        .from('irrigation_schedules')
        .select('*, parcels(name), farms(name)')
        .eq('organization_id', currentOrganization!.id)
        .order('created_at', { ascending: false });

      if (parcelId) {
        query = query.eq('parcel_id', parcelId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization,
  });
};

export const useCreateIrrigationSchedule = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (schedule: Omit<IrrigationSchedule, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
      const { data, error } = await supabase
        .from('irrigation_schedules')
        .insert({
          ...schedule,
          organization_id: currentOrganization!.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate executions for next 30 days
      const { data: execCount, error: execError } = await supabase.rpc('generate_irrigation_executions', {
        p_schedule_id: data.id,
        p_days_ahead: 30,
      });

      if (execError) console.error('Failed to generate executions:', execError);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irrigation-schedules'] });
    },
  });
};

export const useUpdateIrrigationSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<IrrigationSchedule> }) => {
      const { data, error } = await supabase
        .from('irrigation_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irrigation-schedules'] });
    },
  });
};

export const useDeleteIrrigationSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('irrigation_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irrigation-schedules'] });
    },
  });
};

export const useIrrigationExecutions = (scheduleId?: string, status?: string) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['irrigation-executions', { organizationId: currentOrganization?.id, scheduleId, status }],
    queryFn: async () => {
      let query = supabase
        .from('irrigation_executions')
        .select('*, irrigation_schedules(name), parcels(name)')
        .eq('organization_id', currentOrganization!.id)
        .order('scheduled_date', { ascending: false });

      if (scheduleId) {
        query = query.eq('schedule_id', scheduleId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization,
  });
};

export const useCompleteIrrigationExecution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      actualDuration,
      actualWater,
      notes,
    }: {
      id: string;
      actualDuration: number;
      actualWater: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('irrigation_executions')
        .update({
          status: 'completed',
          actual_date: new Date().toISOString().split('T')[0],
          actual_time: new Date().toISOString().split('T')[1].substring(0, 8),
          actual_duration_minutes: actualDuration,
          actual_water_cubic_meters: actualWater,
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['irrigation-executions'] });
    },
  });
};
```

## Phase 3: Components

### Step 4: Create Components

**File:** `/project/src/components/Irrigation/ScheduleForm.tsx`

```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';

const scheduleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  parcel_id: z.string().min(1, 'Parcel is required'),
  farm_id: z.string().min(1, 'Farm is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'custom']),
  time_of_day: z.string().default('06:00:00'),
  duration_minutes: z.number().min(1, 'Duration must be positive'),
  water_amount_cubic_meters: z.number().min(0.1, 'Water amount must be positive'),
  description: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

export interface ScheduleFormProps {
  defaultValues?: Partial<ScheduleFormValues>;
  onSubmit: (data: ScheduleFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  parcels?: Array<{ id: string; name: string }>;
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
  parcels = [],
}) => {
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      frequency: 'daily',
      time_of_day: '06:00:00',
      duration_minutes: 60,
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
            <label className="block text-sm font-medium mb-1">Schedule Name</label>
            <Input {...field} placeholder="Morning irrigation" />
          </div>
        )}
      />

      <FormField
        control={form.control}
        name="parcel_id"
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium mb-1">Parcel</label>
            <Select {...field}>
              <option value="">Select parcel</option>
              {parcels.map((parcel) => (
                <option key={parcel.id} value={parcel.id}>
                  {parcel.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input {...field} type="date" />
            </div>
          )}
        />

        <FormField
          control={form.control}
          name="end_date"
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
              <Input {...field} type="date" />
            </div>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="frequency"
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium mb-1">Frequency</label>
            <Select {...field}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </div>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="time_of_day"
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium mb-1">Time of Day</label>
              <Input {...field} type="time" />
            </div>
          )}
        />

        <FormField
          control={form.control}
          name="duration_minutes"
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
              <Input
                {...field}
                type="number"
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
            </div>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="water_amount_cubic_meters"
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium mb-1">Water Amount (m³)</label>
            <Input
              {...field}
              type="number"
              step="0.1"
              onChange={(e) => field.onChange(parseFloat(e.target.value))}
            />
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
          {isLoading ? 'Saving...' : 'Save Schedule'}
        </Button>
      </div>
    </form>
  );
};
```

**File:** `/project/src/components/Irrigation/ScheduleList.tsx`

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Droplet, Edit, Trash2 } from 'lucide-react';
import { Tables } from '@/types/database.types';

type IrrigationSchedule = Tables<'irrigation_schedules'>;

export interface ScheduleListProps {
  schedules: IrrigationSchedule[];
  onEdit?: (schedule: IrrigationSchedule) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({
  schedules,
  onEdit,
  onDelete,
  isLoading,
}) => {
  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Droplet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No irrigation schedules yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {schedules.map((schedule) => (
        <Card key={schedule.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{schedule.name}</CardTitle>
              <div className="flex gap-2">
                <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                  {schedule.status}
                </Badge>
                {onEdit && (
                  <Button size="sm" variant="outline" onClick={() => onEdit(schedule)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(schedule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm capitalize">{schedule.frequency}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{schedule.time_of_day}</span>
              </div>
              <div className="flex items-center gap-2">
                <Droplet className="h-4 w-4 text-blue-500" />
                <span className="text-sm">{schedule.water_amount_cubic_meters} m³</span>
              </div>
              <div className="text-sm text-gray-600">
                {schedule.duration_minutes} minutes
              </div>
            </div>
            {schedule.description && (
              <p className="text-sm text-gray-600 mt-2">{schedule.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

## Phase 4: Routes

### Step 5: Create Route

**File:** `/project/src/routes/irrigation.tsx`

```typescript
import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useIrrigationSchedules, useCreateIrrigationSchedule, useDeleteIrrigationSchedule } from '@/hooks/useIrrigationSchedules';
import { useParcels } from '@/hooks/useParcels';
import { ScheduleList } from '@/components/Irrigation/ScheduleList';
import { ScheduleForm } from '@/components/Irrigation/ScheduleForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

function IrrigationPage() {
  const { currentFarm } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: schedules = [], isLoading } = useIrrigationSchedules();
  const { data: parcels = [] } = useParcels(currentFarm?.id || null);
  const createMutation = useCreateIrrigationSchedule();
  const deleteMutation = useDeleteIrrigationSchedule();

  const handleCreate = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Irrigation schedule created successfully');
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to create schedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Schedule deleted');
      } catch (error) {
        toast.error('Failed to delete schedule');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Irrigation Schedules</h1>
          <p className="text-gray-600 mt-1">Manage automated irrigation schedules</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Schedule
        </Button>
      </div>

      <ScheduleList
        schedules={schedules}
        isLoading={isLoading}
        onDelete={handleDelete}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Irrigation Schedule</DialogTitle>
          </DialogHeader>
          <ScheduleForm
            parcels={parcels}
            onSubmit={handleCreate}
            onCancel={() => setIsDialogOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/irrigation')({
  component: withRouteProtection(IrrigationPage, 'create', 'Task'),
});
```

## Phase 5: Authorization

### Step 6: Add CASL Permissions

**File:** `/project/src/lib/casl/defineAbilityFor.ts`

```typescript
// Add to defineAbilityFor function
can('manage', 'IrrigationSchedule', {
  organization_id: user.organization_id,
});

// For farm_manager role and above
if (isAtLeastRole(role, 'farm_manager')) {
  can(['create', 'update', 'delete'], 'IrrigationSchedule');
}

// For farm_worker role
if (role === 'farm_worker') {
  can(['read', 'update'], 'IrrigationSchedule'); // Can view and mark as completed
}
```

## Phase 6: Navigation

### Step 7: Add to Sidebar

**File:** `/project/src/components/Sidebar.tsx`

```typescript
import { Droplet } from 'lucide-react';

// Add to navigation items
{
  id: 'irrigation',
  name: 'Irrigation',
  icon: Droplet,
  path: '/irrigation',
  category: 'operations',
}
```

## Phase 7: Testing

### Step 8: Write Tests

**File:** `/project/src/hooks/__tests__/useIrrigationSchedules.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useIrrigationSchedules } from '../useIrrigationSchedules';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

describe('useIrrigationSchedules', () => {
  it('fetches irrigation schedules', async () => {
    const { result } = renderHook(() => useIrrigationSchedules());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
  });
});
```

## Checklist

**Database:**
- [ ] Migration file created and tested locally
- [ ] RLS policies implemented for multi-tenancy
- [ ] Indexes added for performance
- [ ] Helper functions/triggers created
- [ ] Types generated from schema

**API Layer:**
- [ ] Custom hooks created for data fetching
- [ ] Mutations implemented (create, update, delete)
- [ ] Query keys properly structured
- [ ] Error handling implemented

**Components:**
- [ ] Form component with validation (Zod + React Hook Form)
- [ ] List/table component for displaying data
- [ ] Detail view component
- [ ] Loading and empty states

**Routes:**
- [ ] Route file created with proper naming
- [ ] Route protected with authentication
- [ ] Navigation integrated
- [ ] Page layout and structure

**Authorization:**
- [ ] CASL permissions added
- [ ] Role-based access implemented
- [ ] Feature gates added (if needed)

**Testing:**
- [ ] Unit tests for hooks
- [ ] Component tests
- [ ] E2E tests for critical flows

## Next Steps

- [Satellite Integration](./satellite-integration.md) - Add satellite data analysis
- [Testing Guide](./testing.md) - Comprehensive testing strategies
- [Deployment](./deployment.md) - Deploy your feature to production

## Reference

- **Database Migrations:** `/project/supabase/migrations/`
- **Custom Hooks:** `/project/src/hooks/`
- **Components:** `/project/src/components/`
- **Routes:** `/project/src/routes/`
- **CASL Permissions:** `/project/src/lib/casl/defineAbilityFor.ts`
