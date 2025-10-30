# Task Management

## Overview

The Task Management module provides comprehensive tools for planning, assigning, tracking, and analyzing agricultural operations. It supports various task types from irrigation and fertilization to harvest, with built-in cost tracking, worker assignment, payment status management, and calendar visualization.

## Key Features

### Task Types

The platform supports multiple agricultural task categories:

1. **Irrigation Tasks**
   - Schedule and track watering operations
   - Link to NDMI satellite data for water stress monitoring
   - Record water volume and duration
   - Track pump hours and electricity costs

2. **Fertilization Tasks**
   - Plan fertilizer applications
   - Link to NDRE satellite data for nitrogen monitoring
   - Track fertilizer types and quantities
   - Calculate application rates (kg/ha or lbs/acre)

3. **Pesticide Application**
   - Record pest control operations
   - Track chemicals used and concentrations
   - Safety interval tracking
   - Compliance documentation

4. **Harvest Tasks**
   - Schedule harvest operations
   - Record harvest quantities and quality
   - Link to profitability module
   - Track labor hours and costs

5. **Maintenance Tasks**
   - Equipment maintenance schedules
   - Infrastructure repairs
   - Preventive maintenance tracking

6. **Planting/Seeding**
   - Track planting dates and seed varieties
   - Record seeding rates
   - Monitor germination periods

7. **Custom Tasks**
   - Flexible task definition for unique operations
   - Custom fields and metadata

### Worker Assignment

Assign tasks to permanent workers or day laborers:

- **Permanent Workers** - Salaried employees with contracts
- **Day Laborers** - Temporary workers with daily rates
- **Team Assignment** - Assign multiple workers to single task
- **Skill Matching** - Match worker skills to task requirements
- **Workload Balancing** - Visual indicator of worker capacity
- **Assignment History** - Track who did what and when

### Cost Tracking

Comprehensive cost tracking for profitability analysis:

#### Labor Costs
- Hourly wages or daily rates
- Overtime calculations
- Benefits and additional costs
- Cost per hectare/acre metrics

#### Material Costs
- Seeds, fertilizers, pesticides
- Fuel and utilities
- Equipment rental
- Supplies and consumables

#### Utilities Costs
- Water usage and costs
- Electricity for irrigation pumps
- Fuel for tractors and machinery

#### Total Task Cost
- Automatic aggregation of all cost categories
- Cost per unit area calculations
- Comparison to budget/estimates
- Historical cost trending

### Payment Status Management

Track financial aspects of task completion:

- **Unpaid** - Task complete but payment pending
- **Partially Paid** - Some workers paid, others pending
- **Fully Paid** - All costs settled
- **Payment Tracking** - Link to accounting payment records
- **Batch Payments** - Pay multiple tasks at once
- **Payment Reports** - Outstanding payment summaries

### Calendar View

Visual task planning and tracking:

- **Month View** - See all tasks for a month at a glance
- **Week View** - Detailed weekly schedule
- **Day View** - Hour-by-hour task breakdown
- **Color Coding** - Different colors for task types and status
- **Drag and Drop** - Reschedule tasks by dragging
- **Recurring Tasks** - Set up repeating tasks (e.g., daily irrigation)
- **Filters** - Show/hide by farm, parcel, worker, or status

## User Interface

### Task List View (`/tasks`)

The main task management interface provides:

1. **Task Table**
   - Sortable columns: date, task type, parcel, worker, status, cost
   - Search and filter capabilities
   - Status indicators (pending, in-progress, completed)
   - Quick actions: edit, complete, delete
   - Pagination for large datasets

2. **Filter Panel**
   - Date range selector
   - Task type filter (checkboxes)
   - Parcel/farm selector
   - Worker selector
   - Status filter (pending, in-progress, completed, cancelled)
   - Payment status filter

3. **Create Task Button**
   - Opens task creation modal
   - Quick task templates for common operations
   - Bulk task creation for recurring operations

4. **Summary Cards**
   - Total tasks this month
   - Tasks pending completion
   - Total labor hours
   - Total costs
   - Outstanding payments

### Task Calendar View (`/tasks/calendar`)

Calendar interface features:

- **Navigation Controls** - Previous/next month, today button
- **View Switcher** - Month, week, day views
- **Event Display**:
  - Task name and type
  - Assigned worker(s)
  - Duration (hours)
  - Status indicator
- **Click Actions**:
  - Click task to view details
  - Click empty date to create new task
  - Drag to reschedule
- **Color Legend** - Task type colors explained

### Task Detail View

Detailed task information modal:

1. **Basic Information**
   - Task name and description
   - Task type and category
   - Farm and parcel
   - Scheduled date and time
   - Duration (hours)
   - Status and priority

2. **Worker Assignment**
   - Primary worker
   - Additional workers (team)
   - Worker skills and qualifications
   - Estimated vs actual hours

3. **Cost Breakdown**
   - Labor costs (itemized by worker)
   - Material costs (itemized by product)
   - Utilities costs
   - Equipment costs
   - Total cost with per-hectare calculation

4. **Materials Used**
   - Product name and type
   - Quantity used
   - Unit cost
   - Total material cost
   - Stock deduction (links to inventory)

5. **Completion Details**
   - Completion date/time
   - Actual hours worked
   - Completion notes
   - Quality ratings
   - Photos/attachments

6. **Payment Information**
   - Payment status
   - Amount paid
   - Payment date
   - Payment method
   - Link to payment record (accounting module)

### Create/Edit Task Form

Comprehensive task creation/editing:

1. **Task Details Section**
   ```typescript
   {
     name: "Weekly Irrigation - North Field",
     task_type: "irrigation",
     description: "Regular watering schedule",
     priority: "medium",
     scheduled_date: "2024-10-25",
     scheduled_time: "06:00",
     estimated_hours: 4
   }
   ```

2. **Location Section**
   - Farm selector
   - Parcel selector (multi-select for tasks spanning multiple parcels)
   - Sub-parcel option

3. **Worker Assignment**
   - Primary worker dropdown
   - Add additional workers
   - Display worker availability
   - Show worker current workload

4. **Cost Estimation**
   - Labor cost calculator (auto-fills from worker rates)
   - Material cost input (links to inventory)
   - Utilities cost input
   - Equipment cost input

5. **Materials Section**
   - Add materials from inventory
   - Quantity input with unit selection
   - Automatic stock availability check
   - Cost calculation from inventory prices

6. **Recurrence Options**
   - One-time or recurring
   - Recurrence pattern (daily, weekly, monthly)
   - End date or number of occurrences

## Usage Guide

### Creating a Simple Task

1. Navigate to `/tasks`
2. Click "Create Task" button
3. Fill in basic information:
   - Task name: "Apply Fertilizer - Block A"
   - Type: Fertilization
   - Farm/Parcel: Select from dropdowns
   - Date: October 25, 2024
   - Duration: 3 hours
4. Assign worker: Select from available workers
5. Add materials:
   - Product: Nitrogen Fertilizer (20-5-10)
   - Quantity: 50 kg
   - System auto-calculates cost from inventory
6. Click "Create Task"

### Assigning Workers to Tasks

To assign workers:

1. Open task detail or edit form
2. Click "Assign Worker" dropdown
3. Select primary worker (required)
4. Optionally add team members:
   - Click "Add Worker"
   - Select additional workers
   - Set role (e.g., operator, helper)
5. System displays:
   - Worker availability (already assigned tasks)
   - Current workload (hours this week)
   - Skills match indicator
6. Save assignment

### Recording Task Completion

When a task is finished:

1. Open task from list or calendar
2. Click "Mark Complete" button
3. Fill completion form:
   ```typescript
   {
     completion_date: "2024-10-25",
     actual_hours: 3.5,
     completion_notes: "Applied fertilizer evenly across entire field",
     quality_rating: 5,
     issues_encountered: "None"
   }
   ```
4. Update costs if different from estimate:
   - Adjust labor hours
   - Add actual material quantities used
   - Add any unexpected costs
5. Upload photos (optional)
6. Click "Save Completion"
7. Task status changes to "Completed"

### Tracking Task Costs

To track and analyze costs:

1. View individual task costs in task detail
2. Use task list filters to find:
   - Tasks by cost range
   - Tasks by parcel (compare fields)
   - Tasks by date range (monthly reports)
3. Export cost data to CSV
4. Link to accounting module for detailed financial reports

### Managing Payment Status

To track payments:

1. Completed tasks show "Payment Status: Unpaid"
2. To mark as paid:
   - Open task detail
   - Click "Record Payment"
   - Enter payment details:
     ```typescript
     {
       payment_date: "2024-10-31",
       amount_paid: 150.00,
       payment_method: "bank_transfer",
       payment_reference: "PAY-2024-1025"
     }
     ```
   - Link to accounting payment record (optional)
3. Payment status updates to "Paid"
4. Run "Outstanding Payments" report to see unpaid tasks

### Using the Calendar View

To work with the calendar:

1. Navigate to `/tasks/calendar`
2. Select desired view (month/week/day)
3. Navigate dates using arrows or date picker

**Creating tasks:**
- Click on empty date/time slot
- Quick create modal appears
- Fill basic info and save

**Rescheduling tasks:**
- Drag task to new date/time
- Confirmation dialog appears
- System checks worker availability
- Save changes

**Viewing task details:**
- Click on task event
- Detail panel slides in
- Edit or complete from panel

### Creating Recurring Tasks

For regular operations like daily irrigation:

1. Create task as normal
2. Enable "Recurring Task" checkbox
3. Configure recurrence:
   ```typescript
   {
     recurrence_pattern: "daily",
     recurrence_interval: 1, // Every 1 day
     recurrence_days: [1, 2, 3, 4, 5], // Mon-Fri only
     recurrence_end_type: "date",
     recurrence_end_date: "2024-11-30"
   }
   ```
4. System creates series of tasks
5. Edit individual occurrences or entire series

### Bulk Operations

For multiple tasks:

1. Select multiple tasks using checkboxes
2. Choose bulk action:
   - **Bulk Complete** - Mark all as complete
   - **Bulk Assign** - Assign same worker to all
   - **Bulk Payment** - Mark all as paid
   - **Bulk Delete** - Remove selected tasks
   - **Bulk Export** - Export to CSV
3. Confirm action
4. System processes all selected tasks

## API Integration

### Database Schema

**Tasks Table:**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL, -- irrigation, fertilization, pesticide, etc.
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled

  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  estimated_hours NUMERIC,
  completion_date TIMESTAMPTZ,
  actual_hours NUMERIC,

  -- Worker Assignment
  assigned_worker_id UUID REFERENCES workers(id),
  assigned_day_laborer_id UUID REFERENCES day_laborers(id),

  -- Costs
  labor_cost NUMERIC DEFAULT 0,
  material_cost NUMERIC DEFAULT 0,
  utilities_cost NUMERIC DEFAULT 0,
  equipment_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS
    (labor_cost + material_cost + utilities_cost + equipment_cost) STORED,

  -- Payment
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, partial, paid
  payment_date DATE,
  payment_amount NUMERIC,
  payment_reference TEXT,

  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- daily, weekly, monthly
  recurrence_parent_id UUID REFERENCES tasks(id),

  -- Completion Details
  completion_notes TEXT,
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  issues_encountered TEXT,

  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_date ON tasks(scheduled_date DESC);
CREATE INDEX idx_tasks_parcel ON tasks(parcel_id, scheduled_date DESC);
CREATE INDEX idx_tasks_worker ON tasks(assigned_worker_id, scheduled_date DESC);
CREATE INDEX idx_tasks_status ON tasks(organization_id, status, scheduled_date DESC);
```

**Task Materials Table:**
```sql
CREATE TABLE task_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory(id),
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_cost NUMERIC,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Task Workers Table (for team assignments):**
```sql
CREATE TABLE task_workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  role TEXT, -- operator, helper, supervisor
  hours_worked NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, worker_id)
);
```

### TanStack Query Hooks

```typescript
// Fetch tasks with filters
const useTasks = (organizationId: string, filters?: TaskFilters) => {
  return useQuery({
    queryKey: ['tasks', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          farms(name),
          parcels(name),
          workers(first_name, last_name),
          task_materials(*)
        `)
        .eq('organization_id', organizationId);

      if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
      if (filters?.parcel_id) query = query.eq('parcel_id', filters.parcel_id);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.task_type) query = query.eq('task_type', filters.task_type);
      if (filters?.start_date) query = query.gte('scheduled_date', filters.start_date);
      if (filters?.end_date) query = query.lte('scheduled_date', filters.end_date);

      const { data, error } = await query.order('scheduled_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Create task mutation
const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: CreateTaskInput) => {
      const { materials, ...taskData } = task;

      // Create task
      const { data: createdTask, error: taskError } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (taskError) throw taskError;

      // Add materials if provided
      if (materials && materials.length > 0) {
        const { error: materialsError } = await supabase
          .from('task_materials')
          .insert(
            materials.map(m => ({
              task_id: createdTask.id,
              ...m
            }))
          );

        if (materialsError) throw materialsError;
      }

      return createdTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    }
  });
};

// Complete task mutation
const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      taskId: string;
      completion_date: string;
      actual_hours: number;
      completion_notes?: string;
      quality_rating?: number;
    }) => {
      const { data: task, error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completion_date: data.completion_date,
          actual_hours: data.actual_hours,
          completion_notes: data.completion_notes,
          quality_rating: data.quality_rating
        })
        .eq('id', data.taskId)
        .select()
        .single();

      if (error) throw error;
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task marked as complete');
    }
  });
};
```

## Code Examples

### Creating a Task with Materials

```typescript
import { useCreateTask } from '@/hooks/useTasks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema } from '@/schemas/task';

const CreateTaskForm = () => {
  const createTask = useCreateTask();

  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      task_type: 'irrigation',
      scheduled_date: new Date(),
      estimated_hours: 0,
      materials: []
    }
  });

  const onSubmit = (data) => {
    createTask.mutate({
      ...data,
      organization_id: currentOrganization.id,
      farm_id: currentFarm.id,
      created_by: user.id
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <Input {...field} label="Task Name" />
        )}
      />

      <FormField
        control={form.control}
        name="task_type"
        render={({ field }) => (
          <Select {...field} label="Task Type">
            <option value="irrigation">Irrigation</option>
            <option value="fertilization">Fertilization</option>
            <option value="pesticide">Pesticide Application</option>
            <option value="harvest">Harvest</option>
          </Select>
        )}
      />

      {/* Materials Section */}
      <MaterialsFieldArray control={form.control} />

      <Button type="submit" disabled={createTask.isPending}>
        Create Task
      </Button>
    </form>
  );
};
```

### Calendar Integration

```typescript
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const TaskCalendar = () => {
  const { data: tasks } = useTasks(organizationId, {
    start_date: startOfMonth(new Date()),
    end_date: endOfMonth(new Date())
  });

  const events = tasks?.map(task => ({
    id: task.id,
    title: task.name,
    start: task.scheduled_date,
    backgroundColor: getTaskTypeColor(task.task_type),
    extendedProps: {
      status: task.status,
      worker: task.workers?.first_name,
      cost: task.total_cost
    }
  }));

  const handleEventClick = (info) => {
    // Open task detail modal
    openTaskDetail(info.event.id);
  };

  const handleDateClick = (info) => {
    // Open create task form with pre-filled date
    openCreateTask({ scheduled_date: info.date });
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={events}
      eventClick={handleEventClick}
      dateClick={handleDateClick}
      editable={true}
      droppable={true}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      }}
    />
  );
};
```

### Cost Tracking and Reporting

```typescript
const TaskCostSummary = ({ farmId, dateRange }) => {
  const { data: tasks } = useTasks(organizationId, {
    farm_id: farmId,
    start_date: dateRange.start,
    end_date: dateRange.end,
    status: 'completed'
  });

  const summary = useMemo(() => {
    if (!tasks) return null;

    return {
      totalTasks: tasks.length,
      totalCost: tasks.reduce((sum, t) => sum + (t.total_cost || 0), 0),
      laborCost: tasks.reduce((sum, t) => sum + (t.labor_cost || 0), 0),
      materialCost: tasks.reduce((sum, t) => sum + (t.material_cost || 0), 0),
      utilitiesCost: tasks.reduce((sum, t) => sum + (t.utilities_cost || 0), 0),
      averageCostPerTask: tasks.reduce((sum, t) => sum + (t.total_cost || 0), 0) / tasks.length,
      costByType: tasks.reduce((acc, t) => {
        acc[t.task_type] = (acc[t.task_type] || 0) + (t.total_cost || 0);
        return acc;
      }, {})
    };
  }, [tasks]);

  return (
    <div className="cost-summary">
      <h2>Task Cost Summary</h2>
      <div className="metrics">
        <MetricCard label="Total Tasks" value={summary.totalTasks} />
        <MetricCard label="Total Cost" value={formatCurrency(summary.totalCost)} />
        <MetricCard label="Labor Cost" value={formatCurrency(summary.laborCost)} />
        <MetricCard label="Material Cost" value={formatCurrency(summary.materialCost)} />
        <MetricCard label="Avg Cost/Task" value={formatCurrency(summary.averageCostPerTask)} />
      </div>
      <CostByTypeChart data={summary.costByType} />
    </div>
  );
};
```

## Best Practices

### Task Planning

1. **Schedule in advance** - Plan tasks at least 1 week ahead
2. **Consider weather** - Check forecasts before scheduling outdoor tasks
3. **Worker capacity** - Don't overload workers (max 8-10 hours/day)
4. **Equipment availability** - Ensure machinery is available
5. **Sequential dependencies** - Order tasks logically (irrigate before fertilize)

### Cost Management

1. **Accurate estimates** - Use historical data for cost estimates
2. **Track actuals** - Record actual costs, not just estimates
3. **Regular reviews** - Weekly cost review meetings
4. **Variance analysis** - Investigate large estimate vs actual differences
5. **Budget alerts** - Set up notifications for cost overruns

### Worker Assignment

1. **Skill matching** - Assign workers with appropriate skills
2. **Cross-training** - Develop multi-skilled workforce
3. **Fair distribution** - Balance workload across team
4. **Proximity** - Assign workers to nearby fields when possible
5. **Team consistency** - Keep successful teams together

### Data Quality

1. **Timely completion** - Mark tasks complete on same day
2. **Detailed notes** - Record observations and issues
3. **Photos** - Attach photos for major operations
4. **Accurate hours** - Record actual time, not estimates
5. **Material tracking** - Link to inventory for stock accuracy

## Related Features

- [Workers](./workers.md) - Manage permanent workers and day laborers
- [Inventory](./inventory.md) - Track materials used in tasks
- [Satellite Analysis](./satellite-analysis.md) - Use satellite data to inform tasks
- [Accounting](./accounting.md) - Link task costs to financial records

## Troubleshooting

### Task Not Appearing on Calendar

**Issue:** Created task doesn't show on calendar

**Solutions:**
- Verify date is within calendar view range
- Check filter settings (task type, status, worker)
- Ensure task has valid scheduled_date
- Refresh page or clear cache
- Check browser console for errors

### Worker Assignment Conflicts

**Issue:** Cannot assign worker to task

**Solutions:**
- Check worker availability (may have conflicting task)
- Verify worker is active (not terminated)
- Ensure worker belongs to correct organization
- Check subscription limits for worker count
- Verify user has permission to assign workers

### Cost Calculations Incorrect

**Issue:** Total cost doesn't match sum of components

**Solutions:**
- Check GENERATED ALWAYS AS column is working
- Recalculate by updating any cost field
- Verify all cost fields are numeric (not null)
- Check for database trigger issues
- Manually verify calculation in SQL

### Recurring Tasks Not Created

**Issue:** Recurring task series incomplete

**Solutions:**
- Check recurrence_end_date is in future
- Verify recurrence_pattern is valid
- Ensure sufficient subscription quota
- Check for date calculation errors
- Review server logs for errors
