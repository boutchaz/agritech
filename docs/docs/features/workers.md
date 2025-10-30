# Workers Management

## Overview

The Workers Management module provides comprehensive employee and labor tracking for agricultural operations. It distinguishes between permanent workers (employees with contracts and salaries) and day laborers (temporary workers with daily rates), supporting assignment to tasks, salary tracking, performance monitoring, and integration with task costing and payroll.

## Key Features

### Worker Types

#### Permanent Workers

Full-time or contract employees:

- **Employment Contracts** - Store contract details and terms
- **Salary Information** - Monthly or hourly wages
- **Benefits Tracking** - Health insurance, housing, transport allowances
- **Skill Sets** - Certifications, specializations, equipment operation
- **Work History** - Complete employment history with organization
- **Performance Reviews** - Regular evaluation and ratings
- **Leave Management** - Vacation, sick leave, holidays
- **Training Records** - Skills development and certifications

#### Day Laborers

Temporary and seasonal workers:

- **Daily Rates** - Simple daily wage structure
- **Availability Calendar** - Track when available for work
- **Task Assignment** - Assign to specific short-term tasks
- **Payment Tracking** - Daily payment records
- **Seasonal Patterns** - Track seasonal availability
- **Skills Tracking** - Basic skill profile
- **Work History** - Past engagements with organization

### Skill Management

Track worker capabilities:

- **Skill Categories**
  - Equipment Operation (tractors, harvesters, irrigation systems)
  - Agricultural Techniques (pruning, grafting, harvesting)
  - Specialized Knowledge (organic farming, pest management)
  - Safety Certifications (pesticide application, first aid)

- **Skill Levels**
  - Beginner
  - Intermediate
  - Advanced
  - Expert/Certified

- **Skill Matching** - Match worker skills to task requirements
- **Training Needs** - Identify skill gaps and training opportunities

### Task Assignment

Assign workers to agricultural tasks:

- **Direct Assignment** - Assign specific worker to task
- **Team Assignment** - Assign multiple workers to task
- **Skill-based Assignment** - Suggest workers based on required skills
- **Availability Check** - Verify worker is available for date/time
- **Workload Management** - Track worker capacity and hours
- **Assignment History** - Complete record of all assignments
- **Performance on Tasks** - Rate work quality and efficiency

### Salary and Compensation Tracking

Manage worker compensation:

#### Permanent Workers

- **Base Salary** - Monthly or hourly wage
- **Allowances**
  - Housing allowance
  - Transport allowance
  - Food allowance
  - Mobile/communication
- **Bonuses and Incentives**
  - Performance bonuses
  - Harvest bonuses
  - Retention bonuses
- **Deductions**
  - Taxes and social security
  - Advances and loans
  - Insurance premiums
- **Payroll Integration** - Link to accounting for payroll processing

#### Day Laborers

- **Daily Rate** - Fixed daily wage
- **Hourly Rate** - For partial day work
- **Piece Rate** - Payment by quantity (e.g., per kg harvested)
- **Payment Status** - Track paid/unpaid days
- **Payment History** - Complete payment records

### Attendance and Time Tracking

Monitor worker attendance:

- **Daily Attendance** - Check-in/check-out times
- **Task Hours** - Hours worked on specific tasks
- **Overtime Tracking** - Hours beyond standard workday
- **Leave Tracking** - Vacation, sick leave, unpaid leave
- **Absence Management** - Track and manage absences
- **Attendance Reports** - Weekly/monthly attendance summaries

### Performance Management

Evaluate and improve worker performance:

- **Task Completion Rates** - On-time completion metrics
- **Quality Ratings** - Work quality scores
- **Productivity Metrics** - Output per hour/day
- **Supervisor Feedback** - Qualitative performance notes
- **Performance Reviews** - Formal periodic reviews
- **Performance Trends** - Track improvement over time
- **Recognition and Rewards** - Acknowledge top performers

### Document Management

Store important worker documents:

- **Identification Documents** - ID cards, passports
- **Contracts** - Employment agreements
- **Certifications** - Training certificates, licenses
- **Medical Records** - Health checkups, vaccinations
- **Safety Training** - Safety protocol acknowledgments
- **Performance Reviews** - Past review documents
- **Secure Storage** - Documents stored in Supabase Storage

## User Interface

### Workers List View (`/workers`)

Main workers management interface:

1. **Worker Cards/Table**
   - Photo and name
   - Worker type (permanent/day laborer)
   - Primary skills
   - Current assignment
   - Status (active, on leave, inactive)
   - Contact information
   - Quick actions (view, edit, assign)

2. **Filter and Search**
   - Search by name, ID, or phone
   - Filter by type (permanent/day laborer)
   - Filter by status (active/inactive)
   - Filter by skills
   - Filter by current assignment
   - Sort by name, hire date, salary

3. **Summary Cards**
   - Total permanent workers
   - Total day laborers
   - Active workers today
   - Workers on leave
   - Average daily cost

4. **Action Buttons**
   - Add new worker
   - Import workers (CSV)
   - Generate payroll report
   - Export worker list

### Day Laborers View (`/day-laborers`)

Dedicated interface for temporary workers:

1. **Laborer Table**
   - Name and contact
   - Daily rate
   - Skills
   - Availability status
   - Last worked date
   - Total days worked
   - Outstanding payments
   - Quick assign button

2. **Availability Calendar**
   - Weekly/monthly availability view
   - Color-coded by status:
     - Green: Available
     - Yellow: Partially available
     - Red: Unavailable
     - Blue: Already assigned
   - Click to mark availability

3. **Payment Tracking**
   - Days worked this period
   - Total amount earned
   - Amount paid
   - Outstanding balance
   - Quick payment entry

### Worker Detail View

Comprehensive worker profile:

1. **Personal Information Tab**
   - Full name and photo
   - Date of birth
   - National ID or passport
   - Contact details (phone, email, address)
   - Emergency contact
   - Bank account details (for payments)

2. **Employment Tab**
   - Worker type
   - Hire date
   - Contract details:
     - Contract type (permanent, temporary, seasonal)
     - Contract start and end dates
     - Probation period
     - Notice period
   - Termination information (if applicable)
   - Re-hire eligibility

3. **Compensation Tab**
   - **For Permanent Workers:**
     ```typescript
     {
       base_salary: 2000.00,
       salary_frequency: "monthly",
       housing_allowance: 300.00,
       transport_allowance: 100.00,
       food_allowance: 150.00,
       total_monthly_compensation: 2550.00,
       payment_method: "bank_transfer",
       bank_account: "1234567890"
     }
     ```
   - **For Day Laborers:**
     ```typescript
     {
       daily_rate: 50.00,
       hourly_rate: 6.25,
       piece_rate: 0.10, // per kg harvested
       preferred_payment_method: "cash"
     }
     ```

4. **Skills Tab**
   - List of skills with proficiency levels
   - Certifications and licenses
   - Equipment operation capabilities
   - Training history
   - Skill assessment dates
   - Skill gaps and recommended training

5. **Assignments Tab**
   - Current assignments
   - Assignment history
   - Total tasks completed
   - Average task duration
   - Performance ratings on tasks
   - Farms/parcels worked

6. **Attendance Tab**
   - Current month attendance
   - Check-in/check-out times
   - Hours worked per day
   - Overtime hours
   - Leave taken
   - Absence records
   - Attendance percentage

7. **Performance Tab**
   - Overall performance score
   - Performance trend chart
   - Recent performance reviews
   - Supervisor feedback
   - Strengths and areas for improvement
   - Performance goals

8. **Documents Tab**
   - Uploaded documents list
   - Document preview
   - Upload new documents
   - Download documents
   - Document expiry tracking

### Add/Edit Worker Form

Comprehensive worker information form:

1. **Basic Information Section**
   - First name, middle name, last name
   - Date of birth
   - Gender
   - National ID or passport number
   - Photo upload
   - Phone number (primary, secondary)
   - Email address
   - Physical address

2. **Employment Details Section**
   - Worker type: Permanent or Day Laborer
   - Hire date
   - Farm assignment (if assigned to specific farm)
   - Position/job title
   - Reports to (supervisor)
   - Employment status (active, on leave, terminated)

3. **Contract Information** (for permanent workers)
   - Contract type
   - Contract start date
   - Contract end date (if fixed-term)
   - Probation period (months)
   - Notice period (days)
   - Work schedule (days per week, hours per day)

4. **Compensation Section**
   - Salary/wage amount
   - Payment frequency
   - Allowances (add multiple)
   - Payment method
   - Bank account details
   - Tax ID (if applicable)

5. **Skills Section**
   - Add skills from predefined list
   - Set proficiency level
   - Add certifications
   - Upload certification documents

6. **Emergency Contact**
   - Contact name
   - Relationship
   - Phone number
   - Address

### Worker Assignment Dialog

Assign worker to task:

1. **Task Selection**
   - List of available tasks
   - Task details preview
   - Date, time, duration
   - Required skills

2. **Worker Selection**
   - Available workers for date/time
   - Skill match indicator
   - Current workload indicator
   - Distance to task location (if available)

3. **Assignment Details**
   - Role on task (operator, helper, supervisor)
   - Estimated hours
   - Expected completion date

4. **Conflict Resolution**
   - Shows if worker has conflicting assignment
   - Option to reassign or find alternative

### Payroll Report

Generate payroll for period:

1. **Report Parameters**
   - Pay period (start and end dates)
   - Worker type (permanent, day laborer, or both)
   - Specific workers or all

2. **Payroll Summary Table**
   - Worker name and ID
   - Days/hours worked
   - Base pay
   - Allowances
   - Bonuses
   - Deductions
   - Net pay
   - Payment status

3. **Export Options**
   - Export to Excel for payroll processing
   - Export to CSV for accounting system
   - Generate payment vouchers (PDF)

## Usage Guide

### Adding a Permanent Worker

1. Navigate to `/workers`
2. Click "Add Worker" button
3. Fill in worker details:
   ```typescript
   {
     type: "permanent",
     first_name: "John",
     last_name: "Doe",
     date_of_birth: "1985-05-15",
     national_id: "123456789",
     phone: "+1234567890",
     email: "john.doe@example.com",
     hire_date: "2024-01-15",
     position: "Farm Manager",
     base_salary: 3000.00,
     salary_frequency: "monthly",
     housing_allowance: 500.00,
     transport_allowance: 200.00,
     contract_type: "permanent",
     skills: ["tractor_operation", "irrigation_management", "team_leadership"]
   }
   ```
4. Upload employment contract and ID documents
5. Click "Create Worker"

### Adding a Day Laborer

1. Navigate to `/day-laborers`
2. Click "Add Day Laborer"
3. Fill in basic information:
   ```typescript
   {
     type: "day_laborer",
     first_name: "Maria",
     last_name: "Garcia",
     phone: "+1234567891",
     daily_rate: 50.00,
     skills: ["harvesting", "weeding"],
     availability: "flexible"
   }
   ```
4. Set availability calendar
5. Click "Create Laborer"

### Assigning a Worker to a Task

1. Navigate to task detail (from `/tasks`)
2. Click "Assign Worker" button
3. Select worker from dropdown
   - System shows:
     - Worker availability (green = available, red = conflict)
     - Skill match percentage
     - Current workload (hours this week)
     - Distance to task location
4. Select role (operator, helper, supervisor)
5. Set estimated hours
6. Click "Assign"
7. System updates:
   - Task shows assigned worker
   - Worker's schedule shows task
   - Labor cost calculated for task

### Recording Attendance

For daily attendance tracking:

1. Navigate to worker detail
2. Go to "Attendance" tab
3. Click "Record Attendance"
4. For today's date:
   - Check-in time: 07:00
   - Check-out time: 15:30
   - Break time: 0.5 hours
   - Total hours: 8.0
5. Click "Save Attendance"
6. System calculates:
   - Regular hours
   - Overtime hours (if applicable)
   - Daily cost based on salary/rate

### Managing Worker Skills

To update worker skills:

1. Open worker detail
2. Go to "Skills" tab
3. Click "Add Skill"
4. Select skill from list:
   - Skill: Tractor Operation
   - Proficiency: Advanced
   - Certification: Yes
   - Certification Date: 2023-06-15
   - Expiry Date: 2026-06-15
5. Upload certification document
6. Click "Save Skill"
7. System updates worker profile and enables matching to tractor-related tasks

### Processing Payroll

To generate payroll for month:

1. Navigate to `/workers`
2. Click "Generate Payroll Report"
3. Set parameters:
   - Pay period: October 1-31, 2024
   - Worker type: Permanent workers
   - Include: All active workers
4. System calculates for each worker:
   - Days worked
   - Base salary
   - Allowances
   - Bonuses (if any)
   - Deductions (taxes, advances)
   - Net pay
5. Review report for accuracy
6. Export to Excel
7. Process payments through accounting module
8. Mark as paid in system

### Tracking Day Laborer Payments

To pay day laborers:

1. Navigate to `/day-laborers`
2. Click on laborer to view detail
3. Go to "Payment" section
4. Review outstanding balance:
   - Days worked this period: 15
   - Daily rate: $50
   - Total earned: $750
   - Paid to date: $500
   - Outstanding: $250
5. Click "Record Payment"
6. Enter payment details:
   ```typescript
   {
     payment_date: "2024-10-31",
     amount: 250.00,
     payment_method: "cash",
     reference: "OCT-2024-HARVEST"
   }
   ```
7. Click "Save Payment"
8. Outstanding balance updates to $0
9. Payment recorded in accounting

### Performance Review

To conduct performance review:

1. Open worker detail
2. Go to "Performance" tab
3. Click "New Review"
4. Fill review form:
   ```typescript
   {
     review_period: "Q3 2024",
     reviewer_id: manager_id,
     review_date: "2024-10-31",

     ratings: {
       work_quality: 4,
       productivity: 5,
       reliability: 4,
       teamwork: 4,
       initiative: 3
     },

     overall_rating: 4.0,

     strengths: "Excellent productivity and reliability. Consistently meets deadlines.",
     areas_for_improvement: "Could take more initiative in suggesting process improvements.",
     goals: "Complete advanced irrigation training by year-end",

     recommendation: "continue_employment"
   }
   ```
5. Worker can view review (if enabled)
6. Review stored in performance history

## API Integration

### Database Schema

**Workers Table:**
```sql
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id),

  -- Personal Information
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  national_id TEXT,
  passport_number TEXT,
  photo_url TEXT,

  -- Contact
  phone TEXT,
  secondary_phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT,

  -- Employment
  hire_date DATE NOT NULL,
  termination_date DATE,
  position TEXT,
  supervisor_id UUID REFERENCES workers(id),
  employment_status TEXT DEFAULT 'active', -- active, on_leave, terminated

  -- Contract (for permanent workers)
  contract_type TEXT, -- permanent, fixed_term, seasonal
  contract_start_date DATE,
  contract_end_date DATE,
  probation_period_months INTEGER,
  notice_period_days INTEGER,

  -- Compensation
  base_salary NUMERIC,
  salary_frequency TEXT, -- monthly, hourly
  housing_allowance NUMERIC DEFAULT 0,
  transport_allowance NUMERIC DEFAULT 0,
  food_allowance NUMERIC DEFAULT 0,
  other_allowances NUMERIC DEFAULT 0,
  total_compensation NUMERIC GENERATED ALWAYS AS
    (COALESCE(base_salary, 0) + COALESCE(housing_allowance, 0) +
     COALESCE(transport_allowance, 0) + COALESCE(food_allowance, 0) +
     COALESCE(other_allowances, 0)) STORED,

  -- Payment Details
  payment_method TEXT, -- bank_transfer, cash, mobile_money
  bank_name TEXT,
  bank_account_number TEXT,
  mobile_money_number TEXT,
  tax_id TEXT,

  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,

  -- Metadata
  skills JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Day Laborers Table:**
```sql
CREATE TABLE day_laborers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  national_id TEXT,
  phone TEXT NOT NULL,
  address TEXT,

  -- Rates
  daily_rate NUMERIC NOT NULL,
  hourly_rate NUMERIC,
  piece_rate NUMERIC, -- e.g., per kg harvested

  -- Payment
  preferred_payment_method TEXT DEFAULT 'cash',
  mobile_money_number TEXT,
  bank_account_number TEXT,

  -- Skills and Availability
  skills JSONB DEFAULT '[]',
  availability_status TEXT DEFAULT 'available', -- available, busy, unavailable
  availability_notes TEXT,

  -- Statistics
  total_days_worked INTEGER DEFAULT 0,
  last_worked_date DATE,
  average_rating NUMERIC,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Attendance Table:**
```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,

  attendance_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  break_hours NUMERIC DEFAULT 0,
  total_hours NUMERIC,
  overtime_hours NUMERIC DEFAULT 0,

  status TEXT NOT NULL, -- present, absent, on_leave, holiday
  leave_type TEXT, -- sick, vacation, unpaid
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(worker_id, attendance_date)
);
```

**Performance Reviews Table:**
```sql
CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES user_profiles(id),

  review_period TEXT NOT NULL, -- "Q3 2024", "2024", etc.
  review_date DATE NOT NULL,

  work_quality_rating INTEGER CHECK (work_quality_rating BETWEEN 1 AND 5),
  productivity_rating INTEGER CHECK (productivity_rating BETWEEN 1 AND 5),
  reliability_rating INTEGER CHECK (reliability_rating BETWEEN 1 AND 5),
  teamwork_rating INTEGER CHECK (teamwork_rating BETWEEN 1 AND 5),
  initiative_rating INTEGER CHECK (initiative_rating BETWEEN 1 AND 5),
  overall_rating NUMERIC,

  strengths TEXT,
  areas_for_improvement TEXT,
  goals TEXT,
  recommendation TEXT, -- continue, promotion, pip, termination

  worker_comments TEXT,
  worker_acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### TanStack Query Hooks

```typescript
// Fetch workers
const useWorkers = (organizationId: string, filters?: WorkerFilters) => {
  return useQuery({
    queryKey: ['workers', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('workers')
        .select('*')
        .eq('organization_id', organizationId);

      if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
      if (filters?.status) query = query.eq('employment_status', filters.status);
      if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);

      const { data, error } = await query.order('last_name');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

// Create worker mutation
const useCreateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (worker: CreateWorkerInput) => {
      const { data, error } = await supabase
        .from('workers')
        .insert({
          ...worker,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success('Worker added successfully');
    }
  });
};
```

## Code Examples

### Worker Assignment with Skill Matching

```typescript
const TaskWorkerAssignment = ({ task }) => {
  const { data: workers } = useWorkers(organizationId, {
    status: 'active',
    is_active: true
  });

  const matchedWorkers = useMemo(() => {
    if (!workers || !task.required_skills) return workers;

    return workers
      .map(worker => {
        const workerSkills = worker.skills || [];
        const matchedSkills = task.required_skills.filter(reqSkill =>
          workerSkills.some(ws => ws.skill === reqSkill)
        );
        const matchPercentage = (matchedSkills.length / task.required_skills.length) * 100;

        return {
          ...worker,
          matchPercentage,
          matchedSkills
        };
      })
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [workers, task.required_skills]);

  return (
    <div className="worker-assignment">
      <h3>Assign Worker to Task</h3>
      <div className="worker-list">
        {matchedWorkers.map(worker => (
          <div key={worker.id} className="worker-card">
            <div className="worker-info">
              <Avatar src={worker.photo_url} name={`${worker.first_name} ${worker.last_name}`} />
              <div>
                <p className="name">{worker.first_name} {worker.last_name}</p>
                <p className="position">{worker.position}</p>
              </div>
            </div>
            <div className="match-score">
              <CircularProgress value={worker.matchPercentage} />
              <span>{worker.matchPercentage.toFixed(0)}% match</span>
            </div>
            <Button onClick={() => assignWorker(worker.id)}>
              Assign
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Payroll Report Generation

```typescript
const PayrollReport = ({ startDate, endDate }) => {
  const { data: workers } = useWorkers(organizationId);
  const { data: attendance } = useQuery({
    queryKey: ['attendance', startDate, endDate],
    queryFn: () => fetchAttendance(startDate, endDate)
  });

  const payrollData = useMemo(() => {
    return workers?.map(worker => {
      const workerAttendance = attendance?.filter(a => a.worker_id === worker.id) || [];
      const daysWorked = workerAttendance.filter(a => a.status === 'present').length;
      const totalHours = workerAttendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);
      const overtimeHours = workerAttendance.reduce((sum, a) => sum + (a.overtime_hours || 0), 0);

      let grossPay = 0;
      if (worker.salary_frequency === 'monthly') {
        grossPay = worker.base_salary || 0;
      } else if (worker.salary_frequency === 'hourly') {
        grossPay = totalHours * (worker.base_salary || 0);
      }

      const allowances = (worker.housing_allowance || 0) +
                        (worker.transport_allowance || 0) +
                        (worker.food_allowance || 0);

      const overtimePay = overtimeHours * (worker.base_salary || 0) * 1.5;
      const totalPay = grossPay + allowances + overtimePay;

      // Simplified tax calculation (would be more complex in reality)
      const taxDeduction = totalPay * 0.15;
      const netPay = totalPay - taxDeduction;

      return {
        worker_id: worker.id,
        worker_name: `${worker.first_name} ${worker.last_name}`,
        days_worked: daysWorked,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        base_pay: grossPay,
        allowances: allowances,
        overtime_pay: overtimePay,
        gross_pay: totalPay,
        tax_deduction: taxDeduction,
        net_pay: netPay
      };
    });
  }, [workers, attendance]);

  return (
    <div className="payroll-report">
      <h2>Payroll Report</h2>
      <p>Period: {formatDate(startDate)} - {formatDate(endDate)}</p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Base Pay</TableHead>
            <TableHead>Allowances</TableHead>
            <TableHead>Overtime</TableHead>
            <TableHead>Gross Pay</TableHead>
            <TableHead>Tax</TableHead>
            <TableHead>Net Pay</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payrollData?.map(row => (
            <TableRow key={row.worker_id}>
              <TableCell>{row.worker_name}</TableCell>
              <TableCell>{row.days_worked}</TableCell>
              <TableCell>{row.total_hours.toFixed(1)}</TableCell>
              <TableCell>{formatCurrency(row.base_pay)}</TableCell>
              <TableCell>{formatCurrency(row.allowances)}</TableCell>
              <TableCell>{formatCurrency(row.overtime_pay)}</TableCell>
              <TableCell>{formatCurrency(row.gross_pay)}</TableCell>
              <TableCell>{formatCurrency(row.tax_deduction)}</TableCell>
              <TableCell className="font-bold">{formatCurrency(row.net_pay)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="actions">
        <Button onClick={() => exportToExcel(payrollData)}>
          Export to Excel
        </Button>
        <Button onClick={() => processPayments(payrollData)}>
          Process Payments
        </Button>
      </div>
    </div>
  );
};
```

## Best Practices

### Worker Management

1. **Complete profiles** - Fill all worker information thoroughly
2. **Document storage** - Upload contracts and certifications
3. **Regular updates** - Keep contact information current
4. **Skill tracking** - Maintain accurate skill profiles
5. **Fair treatment** - Ensure equitable treatment of all workers

### Assignment Strategy

1. **Skill matching** - Assign based on required skills
2. **Workload balance** - Distribute work evenly
3. **Proximity** - Assign to nearby locations when possible
4. **Preferences** - Consider worker preferences and strengths
5. **Team dynamics** - Keep effective teams together

### Compensation Management

1. **Market rates** - Pay competitive wages
2. **Timely payment** - Pay workers on time consistently
3. **Clear structure** - Transparent pay structure
4. **Performance incentives** - Reward good performance
5. **Benefits** - Provide appropriate benefits

### Performance Management

1. **Regular feedback** - Provide ongoing feedback
2. **Objective metrics** - Use measurable performance indicators
3. **Development plans** - Create growth paths for workers
4. **Recognition** - Acknowledge and reward good work
5. **Fair reviews** - Conduct unbiased performance reviews

## Related Features

- [Task Management](./task-management.md) - Assign workers to tasks
- [Accounting](./accounting.md) - Payroll and labor cost tracking
- [Farm Management](./farm-management.md) - Assign workers to farms

## Troubleshooting

### Worker Assignment Conflicts

**Issue:** Cannot assign worker to task due to conflict

**Solutions:**
- Check worker availability on task date
- Review existing assignments for overlaps
- Consider splitting task or using different worker
- Adjust task schedule if possible

### Payroll Calculation Errors

**Issue:** Payroll amounts don't match expectations

**Solutions:**
- Verify attendance records are complete
- Check salary/rate information is correct
- Review overtime calculations
- Ensure all allowances are included
- Check tax calculation formulas

### Missing Attendance Records

**Issue:** Attendance data incomplete

**Solutions:**
- Implement daily attendance recording
- Use mobile check-in/out system
- Regular audits of attendance data
- Train supervisors on attendance recording
- Set up reminders for attendance entry

### Skill Matching Not Working

**Issue:** System doesn't suggest appropriate workers

**Solutions:**
- Verify worker skills are properly entered
- Check task required skills are defined
- Update skill matching algorithm threshold
- Review skill categories and standardization
- Train staff on proper skill data entry
