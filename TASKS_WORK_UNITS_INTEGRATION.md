# Tasks & Work Units Integration - Complete Summary

## Overview

This update fixes three critical bugs in the Tasks system and fully integrates work units for piece-work payment tracking with automatic accounting.

---

## 🐛 Bugs Fixed

### 1. TasksCalendar Month Navigation ✅

**Problem**: Month navigation never updated the Supabase query window. `startDate/endDate` were derived once from `new Date()` when the component mounted, so changing the month/year still showed the original month's tasks.

**Solution**:
- Moved `CalendarProvider` outside the component that reads calendar context
- Created `TasksCalendarInner` that uses `useCalendarMonth()` and `useCalendarYear()` hooks
- Added `useMemo` to recalculate date range whenever month/year changes
- Query now refetches automatically when user pages forward/back

**Files Modified**:
- [project/src/components/Tasks/TasksCalendar.tsx](project/src/components/Tasks/TasksCalendar.tsx)

**Changes**:
```typescript
// BEFORE: Date range calculated once on mount
const now = new Date();
const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

// AFTER: Date range recalculates when calendar month/year changes
const [month] = useCalendarMonth();
const [year] = useCalendarYear();

const { startDate, endDate } = useMemo(() => {
  const currentDate = new Date(year, month);
  return {
    startDate: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
  };
}, [month, year]);
```

---

### 2. TaskForm Empty String Handling ✅

**Problem**: The form kept empty strings for optional columns (`scheduled_start`, `due_date`, `assigned_to`, etc.) and passed them straight to Supabase. Postgres date/timestamptz columns reject `''`, so leaving those fields blank caused 422 errors on insert/update.

**Solution**:
- Added data cleaning in `handleSubmit` before sending to mutations
- Converts empty strings to `undefined` for optional fields
- Postgres can now properly handle `NULL` values

**Files Modified**:
- [project/src/components/Tasks/TaskForm.tsx](project/src/components/Tasks/TaskForm.tsx)

**Changes**:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Clean up form data: convert empty strings to undefined
  const cleanedData = Object.fromEntries(
    Object.entries(formData).map(([key, value]) => {
      if (value === '' && ['scheduled_start', 'due_date', 'assigned_to', 'parcel_id', 'farm_id', 'notes', 'description'].includes(key)) {
        return [key, undefined];
      }
      return [key, value];
    })
  ) as Partial<CreateTaskRequest>;

  // Now send cleanedData instead of formData
  if (task) {
    await updateTask.mutateAsync({ taskId: task.id, updates: cleanedData });
  } else {
    await createTask.mutateAsync({ ...cleanedData, organization_id: organizationId });
  }
};
```

---

### 3. Task Selection Opens Form ✅

**Problem**: Clicking a row in TasksList only set `selectedTaskId`; nothing ever rendered the selected task. No way to view/edit an existing task from `/tasks` (the modal only opened for "Nouvelle tâche").

**Solution**:
- Added `useQuery` to fetch full task data when `selectedTaskId` changes
- Created `handleSelectTask` that both sets ID and opens the form
- Pass `selectedTask` data to `TaskForm` component

**Files Modified**:
- [project/src/routes/tasks.index.tsx](project/src/routes/tasks.index.tsx)

**Changes**:
```typescript
// Fetch selected task data when selectedTaskId changes
const { data: selectedTask } = useQuery({
  queryKey: ['task', selectedTaskId],
  queryFn: async () => {
    if (!selectedTaskId) return null;
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', selectedTaskId)
      .single();
    return data as Task;
  },
  enabled: !!selectedTaskId,
});

// Open form when task selected
const handleSelectTask = (taskId: string) => {
  setSelectedTaskId(taskId);
  setShowTaskForm(true);  // ← This was missing!
};

// Pass task to form
<TaskForm
  task={selectedTask}  // ← Now shows existing task data
  organizationId={currentOrganization.id}
  farms={farms}
  onClose={...}
  onSuccess={...}
/>
```

---

## 🚀 New Feature: Work Units Integration

### Database Migration

**File**: [project/supabase/migrations/20251031000002_integrate_tasks_with_work_units.sql](project/supabase/migrations/20251031000002_integrate_tasks_with_work_units.sql)

**What It Creates**:

#### 1. Extended `tasks` table with work unit fields:
```sql
ALTER TABLE tasks ADD COLUMN work_unit_id UUID REFERENCES work_units(id);
ALTER TABLE tasks ADD COLUMN units_required DECIMAL(10, 2);
ALTER TABLE tasks ADD COLUMN units_completed DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN rate_per_unit DECIMAL(10, 2);
ALTER TABLE tasks ADD COLUMN payment_type VARCHAR(20) DEFAULT 'daily'
  CHECK (payment_type IN ('daily', 'per_unit', 'monthly', 'metayage'));
```

#### 2. New `task_costs` table for detailed cost tracking:
```sql
CREATE TABLE task_costs (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  organization_id UUID REFERENCES organizations(id),

  -- Cost Details
  cost_type VARCHAR(50) CHECK (cost_type IN ('labor', 'material', 'equipment', 'utility', 'other')),
  description TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(12, 2) NOT NULL,

  -- Payment Status
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_date DATE,
  payment_reference VARCHAR(100),

  -- Accounting
  journal_entry_id UUID REFERENCES journal_entries(id),
  account_id UUID REFERENCES accounts(id),

  -- Work Unit Reference
  work_unit_id UUID REFERENCES work_units(id),
  units_completed DECIMAL(10, 2),
  rate_per_unit DECIMAL(10, 2),

  -- Worker Reference
  worker_id UUID REFERENCES workers(id),
  piece_work_record_id UUID REFERENCES piece_work_records(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);
```

#### 3. Functions for payment calculation:

**`calculate_task_payment(p_task_id UUID)`**
- Returns total cost, labor cost, material cost, units completed, and payment pending
- Aggregates all costs for a task

**`complete_task_with_payment(p_task_id, p_units_completed, p_quality_rating, p_notes)`**
- Completes a task
- Automatically creates piece-work records for per-unit payment
- Creates task cost entries for labor
- Returns task_cost_id

**`create_task_cost_journal_entry(p_task_cost_id UUID)`**
- Automatically creates double-entry accounting journal entries
- Debits expense accounts (labor, material, equipment, etc.)
- Credits Cash or Accounts Payable
- Links to cost centers (farm/parcel)
- Called automatically via trigger when payment_status = 'paid'

#### 4. Automatic accounting trigger:
```sql
CREATE TRIGGER task_cost_journal_trigger
  AFTER INSERT OR UPDATE OF payment_status ON task_costs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_task_cost_journal();
```

#### 5. Link piece_work_records to tasks:
```sql
ALTER TABLE piece_work_records ADD COLUMN task_id UUID REFERENCES tasks(id);
```

---

### TypeScript Types

**File**: [project/src/types/tasks.ts](project/src/types/tasks.ts)

**Added to `Task` interface**:
```typescript
// Work Unit Payment (NEW)
work_unit_id?: string;
units_required?: number;
units_completed?: number;
rate_per_unit?: number;
payment_type?: 'daily' | 'per_unit' | 'monthly' | 'metayage';
```

**New `TaskCost` interface**:
```typescript
export interface TaskCost {
  id: string;
  task_id: string;
  organization_id: string;
  cost_type: 'labor' | 'material' | 'equipment' | 'utility' | 'other';
  description?: string;
  quantity?: number;
  unit_price?: number;
  total_amount: number;
  payment_status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payment_date?: string;
  payment_reference?: string;
  journal_entry_id?: string;
  account_id?: string;
  work_unit_id?: string;
  units_completed?: number;
  rate_per_unit?: number;
  worker_id?: string;
  piece_work_record_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  worker_name?: string;
  work_unit_code?: string;
  work_unit_name?: string;
}
```

---

### Updated TaskForm UI

**File**: [project/src/components/Tasks/TaskForm.tsx](project/src/components/Tasks/TaskForm.tsx)

**New Fields Added**:

1. **Payment Type Selector**:
   - Par jour (daily)
   - À l'unité (per_unit) - Piece-work
   - Mensuel (monthly)
   - Métayage (revenue share)

2. **Work Unit Selector** (visible when payment_type = 'per_unit'):
   - Dropdown populated from `work_units` table
   - Shows unit name and code (e.g., "Arbre (TREE)")

3. **Units Required** (visible when work unit selected):
   - Number input
   - Example: 100 trees to prune

4. **Rate Per Unit** (visible when work unit selected):
   - Number input in MAD currency
   - Example: 5.00 MAD per tree
   - Shows calculated total: "Total estimé: 500.00 MAD"

**Form Data Initialization**:
```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  payment_type: task?.payment_type || 'daily',
  work_unit_id: task?.work_unit_id || undefined,
  units_required: task?.units_required || undefined,
  rate_per_unit: task?.rate_per_unit || undefined,
});

// Fetch work units
const { data: workUnits = [] } = useQuery({
  queryKey: ['work-units', organizationId],
  queryFn: async () => {
    const { supabase } = await import('../../lib/supabase');
    const { data } = await supabase
      .from('work_units')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');
    return data || [];
  },
  enabled: !!organizationId,
});
```

---

## 🎯 How It Works End-to-End

### Example Workflow: Pruning Trees

#### 1. Create Task with Work Units

```
Task Title: "Taille des oliviers - Parcelle Nord"
Task Type: Pruning
Payment Type: À l'unité (per_unit)
Work Unit: TREE (Arbre)
Units Required: 150 trees
Rate Per Unit: 5.00 MAD
Worker: Ahmed (Travailleur permanent)
```

**Estimated Total**: 150 × 5.00 = **750 MAD**

#### 2. Worker Completes Task

When task is marked as completed:
```sql
SELECT complete_task_with_payment(
  p_task_id := 'task-uuid',
  p_units_completed := 150,
  p_quality_rating := 5,
  p_notes := 'Excellent work, all trees pruned properly'
);
```

**What Happens Automatically**:

1. **Task updated**:
   - `status` → 'completed'
   - `completion_percentage` → 100
   - `units_completed` → 150
   - `completed_date` → NOW()

2. **Piece-work record created** in `piece_work_records`:
   ```
   worker_id: Ahmed
   work_unit_id: TREE
   task_id: task-uuid
   units_completed: 150
   rate_per_unit: 5.00
   total_amount: 750.00 MAD (calculated)
   payment_status: 'pending'
   quality_rating: 5
   ```

3. **Task cost created** in `task_costs`:
   ```
   task_id: task-uuid
   cost_type: 'labor'
   description: 'Piece-work payment: Taille des oliviers'
   quantity: 150
   unit_price: 5.00
   total_amount: 750.00 MAD
   payment_status: 'pending'
   worker_id: Ahmed
   piece_work_record_id: piece-work-uuid
   ```

#### 3. Approve and Pay Worker

Mark `task_costs.payment_status = 'paid'`:

**Automatic Accounting Entry Created**:

```
Journal Entry: TASK-12345678
Date: Today
Type: expense
Status: posted

Debit:  Labor Expense (6211)      750.00 MAD  [Cost Center: Parcelle Nord]
Credit: Cash (1010)                750.00 MAD
```

**Chart of Accounts Used**:
- **6211**: Labor Expense (operating expense)
- **1010**: Cash (asset account)
- **2100**: Accounts Payable (if not paid immediately)

**Result**:
- ✅ Task completed and tracked
- ✅ Worker payment recorded
- ✅ Piece-work statistics captured
- ✅ Accounting automatically updated
- ✅ Cost center tracks expense to specific parcel

---

## 📊 Benefits

### 1. **Accurate Cost Tracking**
- Know exact labor costs per task
- Track piece-work vs daily wage vs monthly salary
- Compare estimated vs actual costs

### 2. **Worker Payment Transparency**
- Clear records of units completed
- Automated payment calculation
- Quality ratings tracked
- No disputes over payment amounts

### 3. **Automatic Accounting**
- No manual journal entries needed
- Double-entry bookkeeping enforced
- Cost centers link expenses to farms/parcels
- Real-time financial data

### 4. **Analytics & Reporting**
- Which tasks are most expensive?
- Which workers are most productive?
- Cost per unit by work type
- Profitability by parcel/farm

### 5. **Multi-Payment Type Support**
- **Daily**: Fixed rate per day
- **Per Unit**: Payment per tree/box/kg/liter
- **Monthly**: Fixed monthly salary
- **Métayage**: Revenue sharing (common in Morocco)

---

## 🚀 Next Steps to Use

### 1. Apply the Migration

**Option A: Via Supabase CLI**
```bash
npm run db:push
```

**Option B: Supabase Dashboard**
1. Go to SQL Editor
2. Copy contents of `20251031000002_integrate_tasks_with_work_units.sql`
3. Paste and Run

### 2. Load Work Units (if not already done)

Go to: `Settings → Unités de travail`
Click: **"Load Default Units"**

This creates:
- TREE (Arbre)
- BOX (Caisse)
- KG (Kilogramme)
- LITER (Litre)
- TON, M2, M3, HECTARE

### 3. Create a Test Task with Work Units

1. Go to: `/tasks` or `/tasks/calendar`
2. Click: **"Nouvelle tâche"**
3. Fill in:
   - Title: "Test pruning task"
   - Type: Pruning
   - Payment Type: **À l'unité**
   - Work Unit: **TREE (Arbre)**
   - Units Required: **10**
   - Rate: **5.00 MAD**
   - Assign to a worker
4. Save

Expected total: 10 × 5 = **50 MAD**

### 4. Complete the Task

(You'll need to create a completion UI or use SQL):
```sql
SELECT complete_task_with_payment(
  'your-task-id',
  10,  -- units completed
  5,   -- quality rating
  'Test completion'
);
```

### 5. Verify Results

**Check piece_work_records**:
```sql
SELECT * FROM piece_work_records
WHERE task_id = 'your-task-id';
```

**Check task_costs**:
```sql
SELECT * FROM task_costs
WHERE task_id = 'your-task-id';
```

**Mark as paid and check accounting**:
```sql
UPDATE task_costs
SET payment_status = 'paid', payment_date = CURRENT_DATE
WHERE task_id = 'your-task-id';

-- Check journal entry was created
SELECT * FROM journal_entries
WHERE reference = 'TASK-' || LEFT('your-task-id', 8);
```

---

## 📁 Files Modified/Created

### Modified Files

1. **[project/src/components/Tasks/TasksCalendar.tsx](project/src/components/Tasks/TasksCalendar.tsx)**
   - Fixed month navigation bug
   - Added calendar context integration

2. **[project/src/components/Tasks/TaskForm.tsx](project/src/components/Tasks/TaskForm.tsx)**
   - Fixed empty string handling
   - Added work unit payment fields
   - Added payment type selector
   - Added units required/rate fields with live total calculation

3. **[project/src/routes/tasks.index.tsx](project/src/routes/tasks.index.tsx)**
   - Fixed task selection to open form
   - Added task data fetching

4. **[project/src/types/tasks.ts](project/src/types/tasks.ts)**
   - Added work unit fields to Task interface
   - Added new TaskCost interface

### New Files

1. **[project/supabase/migrations/20251031000002_integrate_tasks_with_work_units.sql](project/supabase/migrations/20251031000002_integrate_tasks_with_work_units.sql)** (500+ lines)
   - Complete database schema for task-work unit integration
   - Automatic accounting functions
   - RLS policies

---

## 🎨 UI Improvements

### Task Form - New Section

```
┌─────────────────────────────────────────────────────────┐
│ Paiement et Unités de Travail                          │
├─────────────────────────────────────────────────────────┤
│ Type de paiement:    │ Work Unit:                       │
│ [À l'unité ▼]        │ [TREE (Arbre) ▼]                │
│                                                          │
│ Unités requises:     │ Tarif par unité (MAD):          │
│ [100          ]      │ [5.00              ]            │
│                      │ Total estimé: 500.00 MAD        │
└─────────────────────────────────────────────────────────┘
```

**Conditional Display**:
- Work Unit dropdown only shows when "À l'unité" is selected
- Units Required & Rate only show when a work unit is selected
- Total is calculated live as you type

---

## ✅ Testing Checklist

- [x] Calendar month navigation refetches tasks
- [x] Tasks with empty dates save without 422 errors
- [x] Clicking a task row opens the form with task data
- [ ] Work unit migration applies successfully
- [ ] Task form shows work unit fields
- [ ] Task with piece-work payment can be created
- [ ] Completing task creates piece-work record
- [ ] Completing task creates task cost entry
- [ ] Paying task cost creates journal entry
- [ ] Journal entry debits/credits correct accounts
- [ ] Cost center links expense to parcel

---

## 🔧 Technical Details

### Database Functions

**Function**: `complete_task_with_payment`
- **Purpose**: Complete a task and auto-create payment records
- **Parameters**:
  - `p_task_id`: UUID of task
  - `p_units_completed`: How many units completed (optional, defaults to units_required)
  - `p_quality_rating`: 1-5 stars (optional)
  - `p_notes`: Completion notes (optional)
- **Returns**: UUID of created task_cost record
- **Side Effects**:
  - Updates task status to 'completed'
  - Creates piece_work_records entry
  - Creates task_costs entry

**Function**: `create_task_cost_journal_entry`
- **Purpose**: Create accounting journal when cost is paid
- **Parameters**: `p_task_cost_id`: UUID
- **Returns**: UUID of created journal_entry
- **Logic**:
  - Gets cost center from parcel or farm
  - Selects correct expense account by cost_type
  - Debits expense account
  - Credits Cash (if paid) or Accounts Payable (if accrued)
  - Links journal to task_cost record

**Function**: `calculate_task_payment`
- **Purpose**: Aggregate all costs for a task
- **Parameters**: `p_task_id`: UUID
- **Returns**: Table with total_cost, labor_cost, material_cost, units_completed, payment_pending

### Triggers

**Trigger**: `task_cost_journal_trigger`
- **Event**: AFTER INSERT OR UPDATE OF payment_status ON task_costs
- **Action**: Calls `trigger_create_task_cost_journal()` when payment_status changes to 'paid'

**Trigger**: `update_task_costs_timestamp`
- **Event**: BEFORE UPDATE ON task_costs
- **Action**: Updates updated_at column

---

## 🎉 Summary

**3 Critical Bugs Fixed** + **Complete Work Units Integration**

All tasks now support:
- ✅ Piece-work payment tracking
- ✅ Automatic payment calculation
- ✅ Automatic accounting journal entries
- ✅ Cost center allocation
- ✅ Worker productivity tracking
- ✅ Quality ratings
- ✅ Multi-payment type support

**Everything is accounted for automatically!** 📊💰

