# HR Module — Production Readiness Plan

> **Status**: Draft — Awaiting CEO Validation  
> **Date**: 2026-04-30  
> **Scope**: Transform the current workforce management into a production-grade HR module  
> **Reference**: Frappe HR feature comparison  
> **Validation Required**: New tables, schema changes, CASL permission changes → CEO sign-off before implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Inventory](#2-current-state-inventory)
3. [Phase 0 — Fix Broken Foundation](#3-phase-0--fix-broken-foundation)
4. [Phase 1 — Core HR (Configurable Compliance)](#4-phase-1--core-hr-configurable-compliance)
   - [1.0 HR Compliance Settings](#40-hr-compliance-settings-the-configuration-layer)
   - [1A Leave Management](#41-leave-management)
   - [1B Payroll Processing](#42-payroll-processing)
   - [1C Enhanced Worker Profile](#43-enhanced-worker-profile)
5. [Phase 2 — Operational HR](#5-phase-2--operational-hr)
6. [Phase 3 — Administrative HR](#6-phase-3--administrative-hr)
7. [Phase 4 — Agricultural Differentiators](#7-phase-4--agricultural-differentiators)
8. [Phase 5 — Advanced HR](#8-phase-5--advanced-hr)
9. [Dependency Graph](#9-dependency-graph)
10. [Compliance Presets Reference](#10-compliance-presets-reference)
11. [Implementation Conventions](#11-implementation-conventions)

---

## 1. Executive Summary

### What We Have Today
AgroGina's HR module covers **workforce management** — workers (3 types), attendance (broken), payments (basic), piece-work, metayage, and task assignments. This is sufficient for tracking **who works on what farm and how much they're owed**.

### What We Need for Production
A production HR module where **each organization configures its own compliance level**. A 50ha farm may run without any statutory deductions. A 500ha cooperative needs full Moroccan compliance (CNSS + AMO + IR + legal leave). The `hr_compliance_settings` table controls everything — every payroll calculation, leave entitlement, and tax deduction reads from it. No compliance rule is hardcoded.

### Phased Approach

| Phase | Focus | Est. Features | Depends On |
|-------|-------|--------------|------------|
| **P0** | Fix broken attendance tables | 2 tables | — |
| **P1** | Compliance Settings + Core HR + Payroll + Leave | 15 tables, 5 modules | P0 |
| **P2** | Shift/Roster + Worker Profiles + Onboarding | 6 tables, 3 modules | P1 |
| **P3** | Expense Claims + Recruitment + Performance | 8 tables, 3 modules | P2 |
| **P4** | Agro-specific features | 4 tables, 3 modules | P2 |
| **P5** | Advanced (Grievances, Training, Analytics) | 5 tables, 3 modules | P3 |

---

## 2. Current State Inventory

### 2.1 Database Tables (Existing)

| Table | Status | Notes |
|-------|--------|-------|
| `workers` | ✅ Complete | Types: fixed_salary, daily_worker, metayage. Has CNSS fields. |
| `work_units` | ✅ Complete | Configurable units for piece-work |
| `work_records` | ✅ Complete | Daily work logs with piece-work fields |
| `metayage_settlements` | ✅ Complete | Production-sharing settlements |
| `payment_records` | ✅ Complete | Payment lifecycle with approval flow |
| `payment_advances` | ✅ Complete | Advance requests with deduction plans |
| `payment_bonuses` | ✅ Complete | Bonus tracking per payment |
| `payment_deductions` | ✅ Complete | Deduction types: cnss, tax, advance_repayment, equipment_damage |
| `piece_work_records` | ✅ Complete | Piece-rate entries with quality rating |
| `task_assignments` | ✅ Complete | Task-to-worker assignment |
| `task_time_logs` | ✅ Complete | Time tracking per task |
| `attendance_records` | ❌ Referenced but MISSING | attendance.service.ts queries this table |
| `farm_geofences` | ❌ Referenced but MISSING | attendance.service.ts queries this table |

### 2.2 Backend Modules (Existing)

| Module | Endpoints | Notes |
|--------|-----------|-------|
| `workers` | CRUD + worker-me | Worker management |
| `attendance` | Check-in/out, geofence | **Broken** — tables don't exist |
| `payments` | Process, approve | Payment workflow |
| `payment-records` | CRUD, summary | Payment history |
| `piece-work` | CRUD | Piece-rate entries |
| `work-units` | CRUD | Configurable units |
| `tasks` | CRUD | Task management |
| `task-assignments` | CRUD | Worker-task assignment |
| `task-templates` | CRUD | Reusable templates |
| `organization-users` | CRUD | User-role mapping |

### 2.3 Frontend Pages (Existing)

| Route | Purpose |
|-------|---------|
| `(workforce)/workers.tsx` | Worker list/hub |
| `(workforce)/workers.$workerId.tsx` | Worker detail |
| `(workforce)/workforce/attendance.tsx` | Attendance |
| `(workforce)/workforce/payments.tsx` | Payments |
| `(workforce)/workforce/employees.tsx` | Fixed-salary employees |
| `(workforce)/workforce/day-laborers.tsx` | Day laborers |
| `(workforce)/workforce/workers.piece-work.tsx` | Piece-work |
| `(workforce)/workforce/tasks.calendar.tsx` | Task calendar |
| `(workforce)/tasks/*` | Task CRUD + kanban + calendar |

### 2.4 Enums (Existing)

```sql
worker_type: 'fixed_salary' | 'daily_worker' | 'metayage'
payment_frequency: 'monthly' | 'daily' | 'per_task' | 'per_unit' | 'harvest_share'
metayage_type: 'khammass' | 'rebaa' | 'tholth' | 'custom'
calculation_basis: 'net_revenue' | 'gross_revenue'
```

### 2.5 CASL Roles (Existing)

```
system_admin (100) > organization_admin (80) > farm_manager (60) > farm_worker (40) > day_laborer (20)
```

---

## 3. Phase 0 — Fix Broken Foundation

**Goal**: Make attendance functional by creating the missing tables.

### 3.1 New Table: `attendance_records`

```sql
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,

  -- Check-in/Check-out
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('mobile_gps', 'mobile_manual', 'biometric', 'web', 'manual')),
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'half_day', 'late', 'early_exit', 'on_leave', 'holiday')),

  -- Location
  latitude NUMERIC,
  longitude NUMERIC,
  geofence_id UUID REFERENCES farm_geofences(id),
  is_within_geofence BOOLEAN,

  -- Computed
  worked_hours NUMERIC GENERATED ALWAYS AS (
    CASE WHEN check_out IS NOT NULL THEN
      EXTRACT(EPOCH FROM (check_out - check_in)) / 3600
    ELSE NULL END
  ) STORED,
  overtime_hours NUMERIC DEFAULT 0,
  is_late BOOLEAN DEFAULT false,
  is_early_exit BOOLEAN DEFAULT false,

  -- Metadata
  notes TEXT,
  regularized BOOLEAN DEFAULT false,
  regularized_by UUID REFERENCES auth.users(id),
  regularized_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One attendance record per worker per day (prevent duplicates)
  UNIQUE(worker_id, DATE(check_in))
);

CREATE INDEX idx_attendance_records_org ON attendance_records(organization_id);
CREATE INDEX idx_attendance_records_farm ON attendance_records(farm_id);
CREATE INDEX idx_attendance_records_worker ON attendance_records(worker_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(DATE(check_in));
CREATE INDEX idx_attendance_records_status ON attendance_records(status);
```

### 3.2 New Table: `farm_geofences`

```sql
CREATE TABLE IF NOT EXISTS farm_geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Polygon coordinates (GeoJSON)
  boundary JSONB NOT NULL, -- { "type": "Polygon", "coordinates": [[[lng, lat], ...]] }
  center_latitude NUMERIC,
  center_longitude NUMERIC,
  radius_meters NUMERIC, -- For circular geofences

  -- Settings
  is_active BOOLEAN DEFAULT true,
  allowed_check_in_radius NUMERIC DEFAULT 200, -- meters
  require_gps BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, farm_id, name)
);

CREATE INDEX idx_farm_geofences_org ON farm_geofences(organization_id);
CREATE INDEX idx_farm_geofences_farm ON farm_geofences(farm_id);
```

### 3.3 RLS Policies

```sql
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_attendance" ON attendance_records
  FOR ALL USING (is_organization_member(organization_id));

ALTER TABLE farm_geofences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_geofences" ON farm_geofences
  FOR ALL USING (is_organization_member(organization_id));
```

### 3.4 Backend Changes

No new modules needed — just verify `attendance.service.ts` and `attendance.controller.ts` work correctly with the new tables. Existing endpoints:

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/attendance/check-in` | Worker check-in with geolocation |
| POST | `/attendance/check-out/:id` | Worker check-out |
| GET | `/attendance` | List attendance records |
| GET | `/attendance/worker/:workerId` | Worker's attendance history |
| GET | `/attendance/geofences` | List farm geofences |
| POST | `/attendance/geofences` | Create geofence |
| PUT | `/attendance/geofences/:id` | Update geofence |
| GET | `/attendance/stats` | Attendance statistics |

### 3.5 Frontend Changes

No new pages needed. Verify existing `workforce/attendance.tsx` works with real data.

---

## 4. Phase 1 — Core HR (Configurable Compliance)

**Goal**: Add leave management, payroll processing, and enhanced worker profiles — all driven by **per-organization compliance settings**. No compliance rule is hardcoded. Each company decides whether to run with full Moroccan labor law, partial compliance, or no statutory deductions at all.

**Design principle**: Every HR module that touches statutory deductions, leave entitlements, or tax calculations must read from `hr_compliance_settings` first. If a compliance toggle is OFF, that calculation step is skipped entirely.

### 4.0 HR Compliance Settings (The Configuration Layer)

This is the **first table to create** in Phase 1 — all other modules depend on it.

#### 4.0.1 New Table: `hr_compliance_settings`

```sql
-- One row per organization. Controls ALL compliance behavior.
CREATE TABLE IF NOT EXISTS hr_compliance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,

  -- ============================================================
  -- COMPLIANCE COUNTRY / PRESET
  -- ============================================================
  -- Which country's labor law to follow. Used for preset templates.
  -- When a new org is created, a default preset can be applied.
  compliance_country TEXT DEFAULT 'MA', -- ISO 3166-1 alpha-2 (MA = Morocco)
  compliance_preset TEXT DEFAULT 'morocco_standard'
    CHECK (compliance_preset IN (
      'morocco_standard',   -- Full Moroccan compliance (CNSS + IR + AMO)
      'morocco_basic',      -- CNSS only, no IR
      'morocco_none',       -- No statutory deductions (very small farms)
      'custom'              -- Fully manual configuration
    )),

  -- ============================================================
  -- CNSS (Social Security)
  -- ============================================================
  cnss_enabled BOOLEAN DEFAULT false,
  cnss_employee_rate NUMERIC(5,2) DEFAULT 0,     -- % of gross
  cnss_employer_rate NUMERIC(5,2) DEFAULT 0,     -- % of gross
  cnss_salary_cap NUMERIC DEFAULT NULL,           -- monthly cap (plafond), NULL = no cap
  cnss_auto_declare BOOLEAN DEFAULT false,        -- auto-generate CNSS declaration reports
  cnss_declaration_frequency TEXT DEFAULT 'monthly'
    CHECK (cnss_declaration_frequency IS NULL OR cnss_declaration_frequency IN ('monthly', 'quarterly')),

  -- ============================================================
  -- AMO (Health Insurance — Assurance Maladie Obligatoire)
  -- ============================================================
  amo_enabled BOOLEAN DEFAULT false,
  amo_employee_rate NUMERIC(5,2) DEFAULT 0,
  amo_employer_rate NUMERIC(5,2) DEFAULT 0,
  amo_salary_cap NUMERIC DEFAULT NULL,

  -- ============================================================
  -- CIS / RCAR (Pension Fund for agricultural workers)
  -- ============================================================
  cis_enabled BOOLEAN DEFAULT false,
  cis_employee_rate NUMERIC(5,2) DEFAULT 0,
  cis_employer_rate NUMERIC(5,2) DEFAULT 0,
  cis_salary_cap NUMERIC DEFAULT NULL,

  -- ============================================================
  -- INCOME TAX (IR — Impôt sur le Revenu)
  -- ============================================================
  income_tax_enabled BOOLEAN DEFAULT false,
  income_tax_config_id UUID, -- FK to tax_configurations table (brackets + rates)
  professional_expenses_deduction_enabled BOOLEAN DEFAULT false,
  professional_expenses_rate NUMERIC(5,2) DEFAULT 20,  -- % of gross
  professional_expenses_cap NUMERIC DEFAULT NULL,       -- annual cap
  family_deduction_enabled BOOLEAN DEFAULT false,
  family_deduction_per_child NUMERIC DEFAULT 0,         -- annual per child
  family_deduction_max_children INTEGER DEFAULT 0,

  -- ============================================================
  -- LEAVE COMPLIANCE
  -- ============================================================
  leave_compliance_mode TEXT DEFAULT 'custom'
    CHECK (leave_compliance_mode IN (
      'morocco_legal',  -- Enforce Moroccan legal minimums (1.5 days/month etc.)
      'custom'          -- Organization defines its own leave types/allocations
    )),
  -- When 'morocco_legal', the system auto-suggests these defaults:
  enforce_minimum_leave BOOLEAN DEFAULT false,       -- prevent allocating less than legal minimum
  auto_allocate_annual_leave BOOLEAN DEFAULT false,  -- auto-create allocations at year start
  annual_leave_days_per_month NUMERIC DEFAULT 1.5,   -- Moroccan legal default
  sick_leave_days INTEGER DEFAULT 4,                 -- paid sick days before CNSS takes over
  maternity_leave_weeks INTEGER DEFAULT 14,
  paternity_leave_days INTEGER DEFAULT 3,

  -- ============================================================
  -- MINIMUM WAGE
  -- ============================================================
  minimum_wage_check_enabled BOOLEAN DEFAULT false,  -- warn if worker rate < minimum
  minimum_daily_wage NUMERIC DEFAULT NULL,            -- SMAG Morocco: ~88.26 MAD
  minimum_monthly_wage NUMERIC DEFAULT NULL,           -- SMIG Morocco: ~3,111 MAD

  -- ============================================================
  -- PAYROLL BEHAVIOR
  -- ============================================================
  default_pay_frequency TEXT DEFAULT 'monthly'
    CHECK (default_pay_frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  default_currency TEXT DEFAULT 'MAD',
  round_net_pay BOOLEAN DEFAULT true,                -- round to 2 decimals
  auto_generate_slips_on_payroll_run BOOLEAN DEFAULT true,
  password_protect_payslips BOOLEAN DEFAULT false,

  -- ============================================================
  -- OVERTIME
  -- ============================================================
  overtime_enabled BOOLEAN DEFAULT false,
  standard_working_hours NUMERIC DEFAULT 8,
  overtime_rate_multiplier NUMERIC DEFAULT 1.5,       -- 1.5x after standard hours
  overtime_rate_multiplier_weekend NUMERIC DEFAULT 2, -- 2x on weekends/holidays

  -- ============================================================
  -- METADATA
  -- ============================================================
  last_updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hr_compliance_settings_org ON hr_compliance_settings(organization_id);

ALTER TABLE hr_compliance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_hr_compliance" ON hr_compliance_settings
  FOR ALL USING (is_organization_member(organization_id));
```

#### 4.0.2 Compliance Presets (Seeded Data)

When an organization enables compliance, the system offers **presets** that auto-fill the rates. These are NOT stored in the DB — they're a service-layer concept:

```typescript
// payroll/compliance-presets.ts
export const COMPLIANCE_PRESETS = {
  morocco_standard: {
    label: 'Maroc — Conformité complète',
    description: 'CNSS + AMO + IR + congés légaux',
    cnss_enabled: true,
    cnss_employee_rate: 4.48,
    cnss_employer_rate: 8.60,
    cnss_salary_cap: 6000,
    amo_enabled: true,
    amo_employee_rate: 2.52,
    amo_employer_rate: 4.11,
    income_tax_enabled: true,
    professional_expenses_deduction_enabled: true,
    professional_expenses_rate: 20,
    professional_expenses_cap: 30000,
    family_deduction_enabled: true,
    family_deduction_per_child: 300,
    family_deduction_max_children: 3,
    leave_compliance_mode: 'morocco_legal',
    enforce_minimum_leave: true,
    auto_allocate_annual_leave: true,
    annual_leave_days_per_month: 1.5,
    minimum_wage_check_enabled: true,
    minimum_daily_wage: 88.26,
    minimum_monthly_wage: 3111,
    overtime_enabled: true,
  },
  morocco_basic: {
    label: 'Maroc — CNSS uniquement',
    description: 'CNSS + AMO, sans IR (petites exploitations)',
    cnss_enabled: true,
    cnss_employee_rate: 4.48,
    cnss_employer_rate: 8.60,
    cnss_salary_cap: 6000,
    amo_enabled: true,
    amo_employee_rate: 2.52,
    amo_employer_rate: 4.11,
    income_tax_enabled: false,
    leave_compliance_mode: 'custom',
    minimum_wage_check_enabled: false,
  },
  morocco_none: {
    label: 'Maroc — Sans déductions',
    description: 'Aucune déduction légale (très petites exploitations)',
    cnss_enabled: false,
    amo_enabled: false,
    income_tax_enabled: false,
    leave_compliance_mode: 'custom',
    minimum_wage_check_enabled: false,
  },
  custom: {
    label: 'Personnalisé',
    description: 'Configurer manuellement tous les paramètres',
    // All fields left at 0/false — admin fills in manually
  },
};
```

#### 4.0.3 Backend Module: `hr-compliance`

```
agritech-api/src/modules/hr-compliance/
├── hr-compliance.module.ts
├── hr-compliance.controller.ts
├── hr-compliance.service.ts
├── compliance-presets.ts         -- preset definitions (above)
└── dto/
    ├── update-compliance-settings.dto.ts
    └── apply-preset.dto.ts
```

**API Endpoints**:

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/hr-compliance` | org_admin | Get organization's compliance settings |
| PUT | `/hr-compliance` | org_admin | Update settings (individual fields) |
| POST | `/hr-compliance/apply-preset` | org_admin | Apply a compliance preset (fills all fields) |
| GET | `/hr-compliance/presets` | org_admin | List available presets with descriptions |
| GET | `/hr-compliance/summary` | org_admin, farm_manager | Human-readable summary of active compliance |

#### 4.0.4 Frontend: Compliance Settings Page

**New Route**:
```
project/src/routes/_authenticated/(settings)/settings.hr-compliance.tsx
```

**Key Components**:
- `CompliancePresetSelector` — pick a preset, preview what changes
- `ComplianceToggleCard` — toggle CNSS, AMO, IR, CIS on/off individually
- `RateEditor` — edit rates with "reset to preset" option
- `CompliancePreview` — shows "before/after" impact on a sample salary slip
- `MinimumWageAlert` — warns if any worker rates are below configured minimum

**Hook**: `useComplianceSettings.ts`

#### 4.0.5 How Other Modules Use Compliance Settings

Every module that needs compliance reads from `hr_compliance_settings`:

```typescript
// In payroll-runs.service.ts
async generateSalarySlip(worker, period, organizationId) {
  const compliance = await this.getComplianceSettings(organizationId);

  // Step 1: Always — basic salary proration
  const basicSalary = this.calculateBasicSalary(worker, period);

  // Step 2: Conditional — CNSS
  let cnssEmployee = 0, cnssEmployer = 0;
  if (compliance.cnss_enabled) {
    cnssEmployee = Math.min(basicSalary.gross, compliance.cnss_salary_cap ?? Infinity)
                   * (compliance.cnss_employee_rate / 100);
    cnssEmployer = Math.min(basicSalary.gross, compliance.cnss_salary_cap ?? Infinity)
                   * (compliance.cnss_employer_rate / 100);
  }

  // Step 3: Conditional — AMO
  let amoEmployee = 0, amoEmployer = 0;
  if (compliance.amo_enabled) {
    amoEmployee = basicSalary.gross * (compliance.amo_employee_rate / 100);
    amoEmployer = basicSalary.gross * (compliance.amo_employer_rate / 100);
  }

  // Step 4: Conditional — Income Tax (IR)
  let incomeTax = 0;
  if (compliance.income_tax_enabled) {
    const taxable = this.calculateTaxableIncome(basicSalary.gross, cnssEmployee, amoEmployee, compliance);
    incomeTax = this.applyTaxBrackets(taxable, compliance.income_tax_config_id);
  }

  // Step 5: Net
  const netPay = basicSalary.gross - cnssEmployee - amoEmployee - incomeTax - otherDeductions;

  return { gross: basicSalary.gross, cnssEmployee, cnssEmployer, amoEmployee, amoEmployer, incomeTax, netPay, ... };
}
```

The **key insight**: when `cnss_enabled = false`, the CNSS lines don't appear on the salary slip at all. The payslip adapts to show only what's active. This way a farm with no compliance sees `gross = net`, while a fully compliant farm sees the full breakdown.

#### 4.0.6 Salary Slip Adaptation

The salary slip UI dynamically renders based on what's enabled:

| Compliance Setting | Salary Slip Shows |
|---|---|
| Nothing enabled | Gross = Net. No deductions section. |
| CNSS only | Gross → CNSS employee deduction → Net |
| CNSS + AMO | Gross → CNSS → AMO → Net |
| CNSS + AMO + IR | Full Moroccan-style payslip |
| Overtime enabled | Additional "Overtime" earnings section |
| Minimum wage check enabled | Warning banner if rate < SMAG/SMIG |

---

### 4.1 Leave Management

#### 4.1.1 New Tables

```sql
-- Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_fr TEXT,
  name_ar TEXT,
  description TEXT,

  -- Allocation rules
  annual_allocation NUMERIC NOT NULL DEFAULT 0, -- days per year
  is_carry_forward BOOLEAN DEFAULT false,
  maximum_carry_forward_days NUMERIC DEFAULT 0,
  carry_forward_expiry_months INTEGER DEFAULT 3,
  is_encashable BOOLEAN DEFAULT false,
  encashment_amount_per_day NUMERIC,

  -- Applicability
  applicable_worker_types TEXT[] DEFAULT ARRAY['fixed_salary', 'daily_worker', 'metayage'],
  is_paid BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  maximum_consecutive_days INTEGER,
  minimum_advance_notice_days INTEGER DEFAULT 1,

  -- Earned leave config
  is_earned_leave BOOLEAN DEFAULT false,
  earned_leave_frequency TEXT CHECK (earned_leave_frequency IS NULL OR earned_leave_frequency IN ('monthly', 'quarterly', 'biannual', 'annual')),
  earned_leave_days_per_period NUMERIC,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

-- Holiday Lists
CREATE TABLE IF NOT EXISTS holiday_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Morocco National Holidays 2026"
  year INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_list_id UUID NOT NULL REFERENCES holiday_lists(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  name_fr TEXT,
  name_ar TEXT,
  holiday_type TEXT NOT NULL DEFAULT 'public' CHECK (holiday_type IN ('public', 'optional', 'weekly_off')),
  description TEXT,
  UNIQUE(holiday_list_id, date)
);

-- Leave Allocations
CREATE TABLE IF NOT EXISTS leave_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,

  -- Balances
  total_days NUMERIC NOT NULL DEFAULT 0,
  used_days NUMERIC NOT NULL DEFAULT 0,
  expired_days NUMERIC NOT NULL DEFAULT 0,
  carry_forwarded_days NUMERIC NOT NULL DEFAULT 0,
  encashed_days NUMERIC NOT NULL DEFAULT 0,
  remaining_days NUMERIC GENERATED ALWAYS AS (
    total_days - used_days - expired_days - encashed_days
  ) STORED,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(worker_id, leave_type_id, period_start)
);

-- Leave Applications
CREATE TABLE IF NOT EXISTS leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,

  -- Dates
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  total_days NUMERIC NOT NULL,
  half_day BOOLEAN DEFAULT false,
  half_day_period TEXT CHECK (half_day_period IS NULL OR half_day_period IN ('first_half', 'second_half')),

  -- Reason & Documents
  reason TEXT NOT NULL,
  attachment_urls TEXT[],

  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Auto-check
  is_block_day BOOLEAN DEFAULT false, -- flag if overlapping with leave block

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave Block Lists (prevent leave during harvest season etc.)
CREATE TABLE IF NOT EXISTS leave_block_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  reason TEXT NOT NULL,
  applies_to TEXT[] DEFAULT ARRAY['all'], -- 'all' or specific farm_ids
  allowed_approvers UUID[], -- users who can override
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, block_date)
);

-- Leave Encashments
CREATE TABLE IF NOT EXISTS leave_encashments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  leave_allocation_id UUID NOT NULL REFERENCES leave_allocations(id) ON DELETE CASCADE,

  days_encashed NUMERIC NOT NULL,
  amount_per_day NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),

  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.1.2 RLS Policies

```sql
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_leave_types" ON leave_types FOR ALL USING (is_organization_member(organization_id));

ALTER TABLE holiday_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_holiday_lists" ON holiday_lists FOR ALL USING (is_organization_member(organization_id));

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_holidays" ON holidays FOR ALL USING (is_organization_member((SELECT organization_id FROM holiday_lists WHERE id = holiday_list_id)));

ALTER TABLE leave_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_leave_allocations" ON leave_allocations FOR ALL USING (is_organization_member(organization_id));

ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_leave_applications" ON leave_applications FOR ALL USING (is_organization_member(organization_id));

ALTER TABLE leave_block_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_leave_blocks" ON leave_block_dates FOR ALL USING (is_organization_member(organization_id));

ALTER TABLE leave_encashments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_leave_encashments" ON leave_encashments FOR ALL USING (is_organization_member(organization_id));
```

#### 4.1.3 Backend Module: `leave-management`

**Files**:
```
agritech-api/src/modules/leave-management/
├── leave-management.module.ts
├── leave-types/
│   ├── leave-types.controller.ts
│   ├── leave-types.service.ts
│   └── dto/
│       ├── create-leave-type.dto.ts
│       └── update-leave-type.dto.ts
├── leave-allocations/
│   ├── leave-allocations.controller.ts
│   ├── leave-allocations.service.ts
│   └── dto/
│       ├── create-leave-allocation.dto.ts
│       ├── bulk-allocate.dto.ts
│       └── list-leave-allocations.dto.ts
├── leave-applications/
│   ├── leave-applications.controller.ts
│   ├── leave-applications.service.ts
│   └── dto/
│       ├── create-leave-application.dto.ts
│       ├── approve-leave-application.dto.ts
│       └── list-leave-applications.dto.ts
├── holiday-lists/
│   ├── holiday-lists.controller.ts
│   ├── holiday-lists.service.ts
│   └── dto/
│       ├── create-holiday-list.dto.ts
│       └── add-holiday.dto.ts
├── leave-blocks/
│   ├── leave-blocks.controller.ts
│   └── leave-blocks.service.ts
└── leave-encashments/
    ├── leave-encashments.controller.ts
    └── leave-encashments.service.ts
```

**API Endpoints**:

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| | **Leave Types** | | |
| GET | `/leave-types` | org_admin, farm_manager | List leave types |
| POST | `/leave-types` | org_admin | Create leave type |
| PUT | `/leave-types/:id` | org_admin | Update leave type |
| DELETE | `/leave-types/:id` | org_admin | Deactivate leave type |
| | **Holiday Lists** | | |
| GET | `/holidays/lists` | org_admin, farm_manager | List holiday lists |
| POST | `/holidays/lists` | org_admin | Create holiday list |
| POST | `/holidays/lists/:id/holidays` | org_admin | Add holidays to list |
| POST | `/holidays/lists/:id/pull-regional` | org_admin | Auto-pull Morocco holidays |
| | **Leave Allocations** | | |
| GET | `/leave-allocations` | org_admin, farm_manager | List allocations |
| POST | `/leave-allocations` | org_admin | Allocate leave to worker |
| POST | `/leave-allocations/bulk` | org_admin | Bulk allocate to worker group |
| GET | `/leave-allocations/worker/:workerId` | org_admin, farm_manager, self | Worker's leave balances |
| | **Leave Applications** | | |
| GET | `/leave-applications` | org_admin, farm_manager | List applications (filterable) |
| POST | `/leave-applications` | farm_worker+ | Apply for leave |
| PUT | `/leave-applications/:id/approve` | farm_manager+ | Approve application |
| PUT | `/leave-applications/:id/reject` | farm_manager+ | Reject application |
| PUT | `/leave-applications/:id/cancel` | self | Cancel own application |
| GET | `/leave-applications/calendar` | org_admin, farm_manager | Calendar view data |
| | **Leave Blocks** | | |
| GET | `/leave-blocks` | org_admin, farm_manager | List blocked dates |
| POST | `/leave-blocks` | org_admin | Create block date |
| DELETE | `/leave-blocks/:id` | org_admin | Remove block date |
| | **Leave Encashment** | | |
| POST | `/leave-encashments` | org_admin | Request encashment |
| PUT | `/leave-encashments/:id/approve` | org_admin | Approve encashment |

#### 4.1.4 Frontend: Leave Management Pages

**New Routes**:
```
project/src/routes/_authenticated/(workforce)/workforce/
├── leave.tsx                    # Leave dashboard (balances + calendar)
├── leave-applications.tsx       # Leave applications list
├── leave-types.tsx              # Configure leave types (admin)
└── holidays.tsx                 # Holiday list management (admin)
```

**New API Service**: `project/src/lib/api/leave-management.ts`

**New Hooks**:
```
project/src/hooks/
├── useLeaveTypes.ts
├── useLeaveAllocations.ts
├── useLeaveApplications.ts
├── useHolidays.ts
└── useLeaveCalendar.ts
```

**Key Components**:
- `LeaveBalanceCard` — shows remaining days per leave type
- `LeaveCalendar` — team-wide leave calendar (who's off when)
- `LeaveApplicationForm` — apply for leave with date picker + balance display
- `LeaveApprovalQueue` — pending applications for managers
- `HolidayListManager` — CRUD for holidays with Morocco auto-import

#### 4.1.5 i18n Keys Needed

Namespace: `common` (or new `leave` namespace)
- `leave.title`, `leave.types`, `leave.apply`, `leave.applications`
- `leave.balance`, `leave.carryForward`, `leave.encashment`
- `leave.approved`, `leave.rejected`, `leave.pending`
- `leave.blockDates`, `leave.holidays`
- Languages: en, fr, ar

---

### 4.2 Payroll Processing (Compliance-Driven)

> **Architecture Note**: The `tax_configurations` table stores the actual brackets/rates (as data). The `hr_compliance_settings` table controls whether those brackets are *applied* at all. This separation lets an org define brackets for future use without activating them.

#### 4.2.1 New Tables

```sql
-- Salary Structures
CREATE TABLE IF NOT EXISTS salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Applicability
  applicable_worker_types TEXT[] DEFAULT ARRAY['fixed_salary'],
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Currency
  currency TEXT DEFAULT 'MAD',

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Salary Structure Components (earnings and deductions)
CREATE TABLE IF NOT EXISTS salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_structure_id UUID NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  name_fr TEXT,
  name_ar TEXT,
  component_type TEXT NOT NULL CHECK (component_type IN ('earning', 'deduction')),
  category TEXT NOT NULL CHECK (category IN (
    'basic_salary', 'housing_allowance', 'transport_allowance', 'family_allowance',
    'overtime', 'bonus', 'commission', 'other_earning',
    'cnss_employee', 'cnss_employer', 'amo_employee', 'amo_employer',
    'cis_employee', 'cis_employer',
    'income_tax', 'professional_tax',
    'advance_deduction', 'loan_deduction', 'other_deduction'
  )),

  -- Calculation
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('fixed', 'percentage_of_basic', 'formula')),
  amount NUMERIC,
  percentage NUMERIC,
  formula TEXT, -- e.g., "basic_salary * 0.25" for housing allowance (25% in Morocco)

  -- Statutory
  is_statutory BOOLEAN DEFAULT false, -- CNSS, IR, etc.
  is_taxable BOOLEAN DEFAULT true,
  depends_on_payment_days BOOLEAN DEFAULT true, -- prorate if partial month

  condition_formula TEXT, -- optional: only apply if condition met
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Structure Assignments (link worker to structure with their amounts)
CREATE TABLE IF NOT EXISTS salary_structure_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  salary_structure_id UUID NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,

  base_amount NUMERIC NOT NULL, -- monthly basic salary or daily rate
  variable_amount NUMERIC DEFAULT 0,

  -- Cost center allocation
  cost_center_farm_id UUID REFERENCES farms(id), -- allocate to specific farm
  cost_center_split JSONB, -- e.g., [{"farm_id": "...", "percentage": 60}, {"farm_id": "...", "percentage": 40}]

  effective_from DATE NOT NULL,
  effective_to DATE,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(worker_id, effective_from)
);

-- Salary Slips (generated per pay period)
CREATE TABLE IF NOT EXISTS salary_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  salary_structure_assignment_id UUID NOT NULL REFERENCES salary_structure_assignments(id),

  -- Pay period
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('monthly', 'biweekly', 'weekly', 'daily')),

  -- Attendance summary
  working_days INTEGER NOT NULL,
  present_days NUMERIC NOT NULL,
  absent_days NUMERIC NOT NULL,
  leave_days NUMERIC NOT NULL DEFAULT 0,
  holiday_days NUMERIC NOT NULL DEFAULT 0,
  payment_days NUMERIC NOT NULL, -- present + leave + holidays

  -- Earnings
  gross_pay NUMERIC NOT NULL DEFAULT 0,
  earnings JSONB NOT NULL DEFAULT '[]', -- [{name, category, amount}]

  -- Deductions
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  deductions JSONB NOT NULL DEFAULT '[]', -- [{name, category, amount}]

  -- Employer contributions (shown separately)
  employer_contributions JSONB DEFAULT '[]', -- CNSS employer, AMO employer, CIS employer

  -- Net
  net_pay NUMERIC NOT NULL DEFAULT 0,

  -- Tax breakdown (Moroccan IR)
  taxable_income NUMERIC,
  income_tax NUMERIC,
  tax_deduction_amount NUMERIC, -- deduction à la source (DAS)
  tax_regime TEXT CHECK (tax_regime IS NULL OR tax_regime IN ('standard', 'simplified')),

  -- Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'paid', 'cancelled')),
  payroll_run_id UUID, -- link to payroll run

  -- Accounting
  journal_entry_id UUID,
  cost_center JSONB,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(worker_id, pay_period_start, pay_period_end)
);

-- Payroll Runs (batch processing)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Pay period
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_frequency TEXT NOT NULL,
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Filters
  farm_id UUID REFERENCES farms(id), -- null = all farms
  worker_type TEXT, -- null = all types

  -- Summary
  total_workers INTEGER NOT NULL DEFAULT 0,
  total_gross_pay NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  total_net_pay NUMERIC NOT NULL DEFAULT 0,
  total_employer_contributions NUMERIC NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'processing', 'submitted', 'paid', 'cancelled')),

  -- Accounting
  journal_entry_id UUID,
  bank_remittance_id UUID,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, pay_period_start, pay_period_end, COALESCE(farm_id, '00000000-0000-0000-0000-000000000000'))
);

-- Tax Configuration (Moroccan IR brackets)
CREATE TABLE IF NOT EXISTS tax_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "IR Maroc 2026"
  year INTEGER NOT NULL,

  -- Tax brackets (JSONB array of {from, to, rate, deduction_amount})
  brackets JSONB NOT NULL,
  -- Example:
  -- [
  --   {"from": 0, "to": 30000, "rate": 0, "deduction": 0},
  --   {"from": 30001, "to": 50000, "rate": 10, "deduction": 3000},
  --   {"from": 50001, "to": 100000, "rate": 20, "deduction": 8000},
  --   {"from": 100001, "to": "infinity", "rate": 30, "deduction": 18000}
  -- ]

  -- Family deduction
  family_deduction_per_child NUMERIC DEFAULT 0,
  family_deduction_max_children INTEGER DEFAULT 0,

  -- Professional expenses deduction
  professional_expenses_rate NUMERIC DEFAULT 20, -- 20% default in Morocco
  professional_expenses_cap NUMERIC, -- capped amount

  -- CNSS/AMO rates
  cnss_employee_rate NUMERIC NOT NULL DEFAULT 4.48, -- % (Moroccan rate 2025)
  cnss_employer_rate NUMERIC NOT NULL DEFAULT 8.60,
  cnss_salary_cap NUMERIC, -- plafond CNSS
  amo_employee_rate NUMERIC NOT NULL DEFAULT 2.52,
  amo_employer_rate NUMERIC NOT NULL DEFAULT 4.11,
  cis_employee_rate NUMERIC DEFAULT 0, -- RCAR/CIS if applicable
  cis_employer_rate NUMERIC DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, year)
);
```

#### 4.2.2 RLS Policies

```sql
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_salary_structures" ON salary_structures FOR ALL USING (is_organization_member(organization_id));

ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_salary_components" ON salary_components FOR ALL USING (is_organization_member((SELECT organization_id FROM salary_structures WHERE id = salary_structure_id)));

ALTER TABLE salary_structure_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_salary_assignments" ON salary_structure_assignments FOR ALL USING (is_organization_member(organization_id));

ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_salary_slips" ON salary_slips FOR ALL USING (is_organization_member(organization_id));

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_payroll_runs" ON payroll_runs FOR ALL USING (is_organization_member(organization_id));

ALTER TABLE tax_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_tax_configs" ON tax_configurations FOR ALL USING (is_organization_member(organization_id));
```

#### 4.2.3 Backend Module: `payroll`

**Files**:
```
agritech-api/src/modules/payroll/
├── payroll.module.ts
├── salary-structures/
│   ├── salary-structures.controller.ts
│   ├── salary-structures.service.ts
│   └── dto/
│       ├── create-salary-structure.dto.ts
│       ├── add-component.dto.ts
│       └── assign-structure.dto.ts
├── salary-slips/
│   ├── salary-slips.controller.ts
│   ├── salary-slips.service.ts
│   └── dto/
│       ├── generate-salary-slip.dto.ts
│       └── list-salary-slips.dto.ts
├── payroll-runs/
│   ├── payroll-runs.controller.ts
│   ├── payroll-runs.service.ts
│   └── dto/
│       ├── create-payroll-run.dto.ts
│       └── process-payroll-run.dto.ts
├── tax-configurations/
│   ├── tax-configurations.controller.ts
│   ├── tax-configurations.service.ts
│   └── dto/
│       └── create-tax-configuration.dto.ts
└── payroll-reports/
    ├── payroll-reports.controller.ts
    └── payroll-reports.service.ts
```

**API Endpoints**:

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| | **Salary Structures** | | |
| GET | `/salary-structures` | org_admin, farm_manager | List structures |
| POST | `/salary-structures` | org_admin | Create structure |
| PUT | `/salary-structures/:id` | org_admin | Update structure |
| POST | `/salary-structures/:id/components` | org_admin | Add earning/deduction |
| POST | `/salary-structures/:id/assign` | org_admin | Assign to worker(s) |
| POST | `/salary-structures/:id/assign-bulk` | org_admin | Bulk assign |
| | **Salary Slips** | | |
| GET | `/salary-slips` | org_admin, farm_manager | List slips |
| GET | `/salary-slips/:id` | org_admin, farm_manager, self | View slip |
| POST | `/salary-slips/generate` | org_admin | Generate for single worker |
| GET | `/salary-slips/worker/:workerId` | org_admin, self | Worker's slip history |
| | **Payroll Runs** | | |
| GET | `/payroll-runs` | org_admin, farm_manager | List runs |
| POST | `/payroll-runs` | org_admin | Create run |
| POST | `/payroll-runs/:id/process` | org_admin | Process (generate all slips) |
| POST | `/payroll-runs/:id/submit` | org_admin | Submit (lock slips) |
| POST | `/payroll-runs/:id/pay` | org_admin | Mark as paid |
| GET | `/payroll-runs/:id/summary` | org_admin, farm_manager | Run summary |
| | **Tax Config** | | |
| GET | `/tax-configurations` | org_admin | List configs |
| POST | `/tax-configurations` | org_admin | Create config |
| PUT | `/tax-configurations/:id` | org_admin | Update config |
| GET | `/tax-configurations/:id/compute` | org_admin | Compute tax for amount |
| | **Reports** | | |
| GET | `/payroll-reports/salary-register` | org_admin | All slips for period |
| GET | `/payroll-reports/bank-remittance` | org_admin | Bank payment file |
| GET | `/payroll-reports/cnss-report` | org_admin | CNSS declaration report |
| GET | `/payroll-reports/tax-report` | org_admin | IR declaration report |

#### 4.2.4 Frontend: Payroll Pages

**New Routes**:
```
project/src/routes/_authenticated/(workforce)/workforce/
├── payroll.tsx                   # Payroll dashboard
├── payroll.runs.tsx              # Payroll runs list
├── payroll.runs.$runId.tsx       # Run detail (all slips)
├── salary-structures.tsx         # Manage salary structures (admin)
├── salary-slips.tsx              # Salary slips list
└── salary-slips.$slipId.tsx      # Individual salary slip view
```

**New API Service**: `project/src/lib/api/payroll.ts`

**New Hooks**:
```
project/src/hooks/
├── useSalaryStructures.ts
├── useSalarySlips.ts
├── usePayrollRuns.ts
└── useTaxConfigurations.ts
```

**Key Components**:
- `SalarySlipPreview` — full payslip rendering (earnings, deductions, net)
- `PayrollRunWizard` — step-by-step payroll processing
- `SalaryStructureBuilder` — drag-and-drop component builder
- `TaxBracketEditor` — configure IR brackets
- `PayrollDashboard` — summary cards (total payroll, CNSS due, tax due)

#### 4.2.5 Payroll Calculation Logic (Compliance-Driven)

The `payroll-runs.service.ts` reads `hr_compliance_settings` to determine which calculations apply:

```
For each worker in the run:
  1. Load hr_compliance_settings for the organization
  2. Calculate payment_days = present_days + paid_leave + holidays
  3. Prorate basic salary = base_amount * (payment_days / working_days)
  4. Apply custom earnings from salary_components (housing, transport, etc.)
     → These are ALWAYS applied (part of the salary structure, not compliance)
  5. IF compliance.cnss_enabled:
       CNSS_employee = min(gross, cnss_salary_cap) * cnss_employee_rate
       CNSS_employer = min(gross, cnss_salary_cap) * cnss_employer_rate
     ELSE: skip CNSS entirely
  6. IF compliance.amo_enabled:
       AMO_employee = gross * amo_employee_rate
       AMO_employer = gross * amo_employer_rate
     ELSE: skip AMO entirely
  7. IF compliance.income_tax_enabled:
       taxable_income = gross - CNSS_employee - AMO_employee
       IF compliance.professional_expenses_deduction_enabled:
         taxable_income -= min(gross * professional_expenses_rate, professional_expenses_cap)
       Apply brackets from tax_configurations (loaded by income_tax_config_id FK)
       IF compliance.family_deduction_enabled:
         Apply child/spouse deductions
     ELSE: income_tax = 0
  8. IF compliance.overtime_enabled AND worker has overtime hours:
       overtime_amount = overtime_hours * hourly_rate * overtime_rate_multiplier
  9. net_pay = gross + overtime - CNSS_employee - AMO_employee - income_tax - other_deductions
  10. IF compliance.minimum_wage_check_enabled:
       WARN if net_pay/payment_days < minimum_daily_wage
```

**Salary slip rendering adapts automatically**:
- When nothing is enabled → slip shows only: `Gross = Net`
- When CNSS only → slip shows: `Gross → CNSS deduction → Net`
- When full compliance → slip shows: `Gross → CNSS → AMO → Professional expenses → Taxable → IR → Family deductions → Net`
- Employer contributions section only appears when CNSS/AMO/CIS is enabled

This is **NOT** hardcoded to Morocco. If a future client in Senegal or Tunisia uses the platform, they create their own compliance preset with their country's rates.

---

### 4.3 Enhanced Worker Profile

#### 4.3.1 Schema Changes (ALTER existing `workers` table)

```sql
-- Add new columns to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS employment_type TEXT
  CHECK (employment_type IS NULL OR employment_type IN ('full_time', 'part_time', 'intern', 'contract', 'seasonal', 'probation'));
ALTER TABLE workers ADD COLUMN IF NOT EXISTS gender TEXT
  CHECK (gender IS NULL OR gender IN ('male', 'female'));
ALTER TABLE workers ADD COLUMN IF NOT EXISTS marital_status TEXT
  CHECK (marital_status IS NULL OR marital_status IN ('single', 'married', 'divorced', 'widowed'));
ALTER TABLE workers ADD COLUMN IF NOT EXISTS number_of_children INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Moroccan';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS cin_issue_date DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS cin_issue_place TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS health_insurance_provider TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS health_insurance_number TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS probation_end_date DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS confirmation_date DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS reporting_to UUID REFERENCES workers(id);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS personal_email TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS permanent_address TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS current_address TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS educational_qualification TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS previous_work_experience JSONB DEFAULT '[]';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS leave_policy_id UUID; -- FK to leave_policy (Phase 1)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS holiday_list_id UUID; -- FK to holiday_lists (Phase 1)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS salary_structure_assignment_id UUID; -- FK (Phase 1)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS bank_rib TEXT; -- RIB = Relevé d'Identité Bancaire (20 digits Morocco)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS tax_identification_number TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated', 'probation'));
```

#### 4.3.2 New Table: Worker Documents

```sql
CREATE TABLE IF NOT EXISTS worker_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,

  document_type TEXT NOT NULL CHECK (document_type IN (
    'cin', 'passport', 'work_permit', 'contract', 'cnss_card', 'medical_certificate',
    'driving_license', 'pesticide_certification', 'training_certificate',
    'bank_details', 'tax_document', 'photo', 'other'
  )),
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  expiry_date DATE,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(worker_id, document_type) -- one doc per type per worker
);

ALTER TABLE worker_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_worker_documents" ON worker_documents
  FOR ALL USING (is_organization_member(organization_id));
```

#### 4.3.3 Frontend Changes

Enhance existing `workers.$workerId.tsx` with tabs:
- **Personal Info** — expanded with new fields
- **Employment** — contract, reporting to, employment type
- **Documents** — upload/manage worker documents
- **Leave** — leave balances (Phase 1 link)
- **Payroll** — salary structure, slip history (Phase 1 link)
- **Work History** — work_records + piece_work history
- **Attendance** — attendance history with stats

---

## 5. Phase 2 — Operational HR

### 5.1 Shift & Roster Management

#### 5.1.1 New Tables

```sql
-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  grace_period_minutes INTEGER DEFAULT 15,
  working_hours NUMERIC NOT NULL, -- computed

  -- Auto attendance settings
  enable_auto_attendance BOOLEAN DEFAULT false,
  mark_late_after_minutes INTEGER,
  early_exit_before_minutes INTEGER,

  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3B82F6', -- for calendar display
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

-- Shift Assignments (worker-to-shift mapping)
CREATE TABLE IF NOT EXISTS shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,

  -- Date range
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Mon-Fri default

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift Requests (worker asks for shift change)
CREATE TABLE IF NOT EXISTS shift_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  requested_shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  current_shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,

  date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5.1.2 Backend Module: `shifts`

```
agritech-api/src/modules/shifts/
├── shifts.module.ts
├── shifts.controller.ts
├── shifts.service.ts
├── shift-assignments.controller.ts
├── shift-assignments.service.ts
└── dto/
    ├── create-shift.dto.ts
    ├── assign-shift.dto.ts
    └── list-shift-assignments.dto.ts
```

#### 5.1.3 Frontend Pages

```
project/src/routes/_authenticated/(workforce)/workforce/
├── shifts.tsx              # Shift management
└── roster.tsx              # Roster/planning view (calendar drag-drop)
```

### 5.2 Employee Onboarding & Offboarding

#### 5.2.1 New Tables

```sql
-- Onboarding Templates
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  designation TEXT,
  activities JSONB NOT NULL DEFAULT '[]',
  -- activities: [{title, description, role, user_id, begin_on_days, duration_days}]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Onboarding Records (per worker)
CREATE TABLE IF NOT EXISTS onboarding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES onboarding_templates(id),

  status TEXT DEFAULT 'in_progress' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  activities JSONB NOT NULL DEFAULT '[]',
  -- activities: [{title, status, assigned_to, due_date, completed_date}]

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee Separation (offboarding)
CREATE TABLE IF NOT EXISTS separations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,

  separation_type TEXT NOT NULL CHECK (separation_type IN (
    'resignation', 'termination', 'end_of_contract', 'retirement', 'death', 'dismissal'
  )),
  notice_date DATE NOT NULL,
  relieving_date DATE NOT NULL,

  -- Exit details
  exit_interview_conducted BOOLEAN DEFAULT false,
  exit_interview_notes TEXT,
  exit_feedback JSONB,

  -- Full & Final settlement
  fnf_status TEXT DEFAULT 'pending' CHECK (fnf_status IN ('pending', 'processing', 'settled')),
  fnf_payables JSONB DEFAULT '[]',  -- salary dues, leave encashment, gratuity
  fnf_receivables JSONB DEFAULT '[]', -- loans, advances, asset recovery
  fnf_assets JSONB DEFAULT '[]',      -- assets to return/recover
  fnf_total_payable NUMERIC DEFAULT 0,
  fnf_total_receivable NUMERIC DEFAULT 0,
  fnf_net_amount NUMERIC DEFAULT 0,
  fnf_settled_at TIMESTAMPTZ,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'notice_period', 'relieved', 'settled')),

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5.2.2 Backend Module: `employee-lifecycle`

```
agritech-api/src/modules/employee-lifecycle/
├── employee-lifecycle.module.ts
├── onboarding/
│   ├── onboarding.controller.ts
│   ├── onboarding.service.ts
│   └── dto/
└── separations/
    ├── separations.controller.ts
    ├── separations.service.ts
    └── dto/
```

#### 5.2.3 Frontend Pages

```
project/src/routes/_authenticated/(workforce)/workforce/
├── onboarding.tsx              # Onboarding dashboard
├── separations.tsx             # Separation/offboarding list
└── separations.$separationId.tsx  # Separation detail + FnF
```

---

## 6. Phase 3 — Administrative HR

### 6.1 Expense Claims

#### 6.1.1 New Tables

```sql
-- Expense Claim Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Expense Claims
CREATE TABLE IF NOT EXISTS expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id),

  title TEXT NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,

  -- Items
  items JSONB NOT NULL DEFAULT '[]',
  -- items: [{category_id, description, amount, tax_amount, receipt_url, cost_center}]

  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_tax NUMERIC DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,

  -- Advance settlement
  advance_id UUID REFERENCES payment_advances(id),
  advance_amount_allocated NUMERIC DEFAULT 0,

  -- Approval
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'partially_approved', 'rejected', 'paid', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  approval_history JSONB DEFAULT '[]',

  -- Accounting
  journal_entry_id UUID,
  cost_center JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6.1.2 Backend Module: `expense-claims`

Standard CRUD module with approval workflow.

### 6.2 Recruitment

#### 6.2.1 New Tables

```sql
-- Job Openings
CREATE TABLE IF NOT EXISTS job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id),

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'seasonal')),
  worker_type worker_type, -- maps to our worker types

  vacancies INTEGER DEFAULT 1,
  salary_range_min NUMERIC,
  salary_range_max NUMERIC,
  currency TEXT DEFAULT 'MAD',

  publish_date DATE,
  closing_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('draft', 'open', 'on_hold', 'closed', 'cancelled')),

  is_published BOOLEAN DEFAULT false,
  application_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Applicants
CREATE TABLE IF NOT EXISTS job_applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_opening_id UUID NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cin TEXT,
  resume_url TEXT,
  cover_letter_url TEXT,

  source TEXT DEFAULT 'direct' CHECK (source IN ('direct', 'referral', 'website', 'agency', 'other')),
  referred_by_worker_id UUID REFERENCES workers(id),

  status TEXT DEFAULT 'applied'
    CHECK (status IN ('applied', 'screening', 'interview_scheduled', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn')),

  rating INTEGER CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  notes TEXT,
  tags TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES job_applicants(id) ON DELETE CASCADE,
  job_opening_id UUID NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,

  round INTEGER DEFAULT 1,
  interview_type TEXT DEFAULT 'in_person' CHECK (interview_type IN ('phone', 'video', 'in_person')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,

  interviewer_ids UUID[], -- references auth.users

  feedback JSONB DEFAULT '[]', -- [{interviewer_id, rating, notes, recommendation}]
  average_rating NUMERIC,

  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.3 Performance Management

#### 6.3.1 New Tables

```sql
-- Appraisal Cycles
CREATE TABLE IF NOT EXISTS appraisal_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  self_assessment_deadline DATE,
  manager_assessment_deadline DATE,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'self_assessment', 'manager_review', 'calibration', 'completed')),

  applicable_worker_types TEXT[] DEFAULT ARRAY['fixed_salary'],
  applicable_farm_ids UUID[],

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appraisals (per worker per cycle)
CREATE TABLE IF NOT EXISTS appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES appraisal_cycles(id) ON DELETE CASCADE,

  -- Self assessment
  self_rating NUMERIC,
  self_reflections TEXT,

  -- Manager assessment
  manager_id UUID REFERENCES workers(id),
  manager_rating NUMERIC,
  manager_feedback TEXT,

  -- KRA scoring
  kra_scores JSONB DEFAULT '[]', -- [{kra_name, weight, score, weighted_score}]

  -- Goals
  goals JSONB DEFAULT '[]', -- [{title, progress, target, achieved}]

  -- Final
  final_score NUMERIC,
  final_feedback TEXT,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'self_assessment', 'manager_review', 'completed')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(worker_id, cycle_id)
);

-- Performance Feedback (continuous)
CREATE TABLE IF NOT EXISTS performance_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,

  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('peer', 'manager', 'subordinate', 'external')),
  review_period TEXT,

  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  strengths TEXT,
  improvements TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Phase 4 — Agricultural Differentiators

### 7.1 Seasonal Worker Batch Management

```sql
CREATE TABLE IF NOT EXISTS seasonal_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,

  name TEXT NOT NULL, -- e.g., "Récolte Agrumes 2026"
  season_type TEXT NOT NULL CHECK (season_type IN ('planting', 'harvest', 'pruning', 'treatment', 'other')),
  crop_type TEXT,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_worker_count INTEGER,

  -- Budget
  estimated_labor_budget NUMERIC,
  actual_labor_cost NUMERIC DEFAULT 0,

  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'recruiting', 'active', 'completed', 'cancelled')),

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Equipment Qualification Matrix

```sql
CREATE TABLE IF NOT EXISTS worker_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,

  qualification_type TEXT NOT NULL CHECK (qualification_type IN (
    'tractor_operation', 'pesticide_handling', 'first_aid', 'forklift',
    'irrigation_system', 'pruning', 'harvesting_technique', 'food_safety',
    'fire_safety', 'electrical', 'other'
  )),
  qualification_name TEXT NOT NULL,

  -- Validity
  issued_date DATE NOT NULL,
  expiry_date DATE,
  issuing_authority TEXT,
  certificate_url TEXT,

  -- Status
  is_valid BOOLEAN DEFAULT true,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(worker_id, qualification_type)
);
```

### 7.3 Health & Safety Incident Tracking

```sql
CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id),

  incident_date TIMESTAMPTZ NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('injury', 'near_miss', 'chemical_exposure', 'equipment_damage', 'fire', 'environmental', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'serious', 'fatal')),

  -- People involved
  worker_ids UUID[] NOT NULL,
  supervisor_id UUID REFERENCES workers(id),

  -- Details
  description TEXT NOT NULL,
  location_description TEXT,
  root_cause TEXT,
  corrective_actions JSONB DEFAULT '[]', -- [{action, responsible, deadline, status}]
  preventive_measures TEXT,

  -- Reporting
  reported_by UUID REFERENCES auth.users(id),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  cnss_declaration BOOLEAN DEFAULT false,
  cnss_declaration_date DATE,
  cnss_declaration_reference TEXT,

  status TEXT DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'resolved', 'closed')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.4 Worker Transportation

```sql
CREATE TABLE IF NOT EXISTS worker_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  vehicle_id TEXT,
  driver_worker_id UUID REFERENCES workers(id),

  pickup_location TEXT NOT NULL,
  pickup_time TIME NOT NULL,
  destination TEXT NOT NULL,

  worker_ids UUID[] NOT NULL,
  capacity INTEGER,
  actual_count INTEGER,

  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Phase 5 — Advanced HR

### 8.1 Grievance System

```sql
CREATE TABLE IF NOT EXISTS grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  raised_by_worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  against_worker_id UUID REFERENCES workers(id),
  against_department TEXT,

  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  grievance_type TEXT NOT NULL CHECK (grievance_type IN ('workplace', 'colleague', 'department', 'policy', 'harassment', 'safety', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_anonymous BOOLEAN DEFAULT false,

  resolution TEXT,
  resolution_date DATE,
  resolved_by UUID REFERENCES auth.users(id),

  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'acknowledged', 'investigating', 'resolved', 'escalated', 'closed')),

  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.2 Training Management

```sql
CREATE TABLE IF NOT EXISTS training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  training_type TEXT CHECK (training_type IN ('safety', 'technical', 'certification', 'onboarding', 'other')),

  provider TEXT,
  duration_hours NUMERIC,
  cost_per_participant NUMERIC,

  is_mandatory BOOLEAN DEFAULT false,
  recurrence TEXT CHECK (recurrence IS NULL OR recurrence IN ('annual', 'biannual', 'one_time')),
  applicable_worker_types TEXT[],

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,

  enrolled_date DATE NOT NULL,
  completion_date DATE,
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'failed', 'cancelled')),
  score NUMERIC,
  certificate_url TEXT,
  feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, worker_id)
);
```

### 8.3 HR Analytics Views

```sql
-- Workforce Summary
CREATE OR REPLACE VIEW workforce_summary WITH (security_invoker = true) AS
SELECT
  organization_id,
  farm_id,
  COUNT(*) FILTER (WHERE worker_type = 'fixed_salary' AND is_active) AS fixed_salary_count,
  COUNT(*) FILTER (WHERE worker_type = 'daily_worker' AND is_active) AS daily_worker_count,
  COUNT(*) FILTER (WHERE worker_type = 'metayage' AND is_active) AS metayage_count,
  COUNT(*) FILTER (WHERE gender = 'female' AND is_active) AS female_count,
  COUNT(*) FILTER (WHERE is_cnss_declared AND is_active) AS cnss_covered_count,
  AVG(daily_rate) FILTER (WHERE worker_type = 'daily_worker') AS avg_daily_rate,
  AVG(monthly_salary) FILTER (WHERE worker_type = 'fixed_salary') AS avg_monthly_salary
FROM workers
WHERE deleted_at IS NULL
GROUP BY organization_id, farm_id;

-- Attendance Summary (monthly)
CREATE OR REPLACE VIEW monthly_attendance_summary WITH (security_invoker = true) AS
SELECT
  organization_id,
  farm_id,
  worker_id,
  DATE_TRUNC('month', DATE(check_in)) AS month,
  COUNT(*) AS total_records,
  SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_days,
  SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_days,
  SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late_days,
  AVG(worked_hours) AS avg_hours_per_day,
  SUM(overtime_hours) AS total_overtime_hours
FROM attendance_records
GROUP BY organization_id, farm_id, worker_id, DATE_TRUNC('month', DATE(check_in));

-- Leave Balance Summary
CREATE OR REPLACE VIEW leave_balance_summary WITH (security_invoker = true) AS
SELECT
  la.organization_id,
  la.worker_id,
  w.first_name,
  w.last_name,
  lt.name AS leave_type,
  la.total_days,
  la.used_days,
  la.remaining_days,
  la.period_start,
  la.period_end
FROM leave_allocations la
JOIN workers w ON w.id = la.worker_id
JOIN leave_types lt ON lt.id = la.leave_type_id
WHERE la.period_end >= CURRENT_DATE;

-- Payroll Cost Summary
CREATE OR REPLACE VIEW payroll_cost_summary WITH (security_invoker = true) AS
SELECT
  organization_id,
  farm_id,
  DATE_TRUNC('month', pay_period_start) AS month,
  COUNT(DISTINCT worker_id) AS workers_paid,
  SUM(gross_pay) AS total_gross,
  SUM(total_deductions) AS total_deductions,
  SUM(net_pay) AS total_net,
  SUM(
    COALESCE((employer_contributions::jsonb)->>'total', '0')::numeric, 0
  ) AS total_employer_cost
FROM salary_slips
WHERE status != 'cancelled'
GROUP BY organization_id, farm_id, DATE_TRUNC('month', pay_period_start);
```

---

## 9. Dependency Graph

```
Phase 0: Fix attendance tables (attendance_records, farm_geofences)
  │
  ▼
Phase 1: Core HR
  ├── 1.0: HR Compliance Settings ─────┐  ← MUST BE FIRST (all others read from this)
  │     (hr_compliance_settings,        │
  │      compliance-presets.ts)         │
  │                                     │
  ├── 1A: Leave Management ────────────┤  Reads compliance.leave_compliance_mode
  │     (leave_types, allocations,      │  + compliance.enforce_minimum_leave
  │      applications, holidays)        │
  │                                     │
  ├── 1B: Payroll Processing ──────────┤  Reads ALL compliance toggles
  │     (salary_structures, slips,      │  + compliance.cnss/amo/cis/income_tax_enabled
  │      payroll_runs, tax_config)      │
  │                                     │
  └── 1C: Enhanced Worker Profile ─────┘  Reads compliance.minimum_wage_check
        (ALTER workers, worker_documents)
  │
  ▼
Phase 2: Operational HR
  ├── 2A: Shift & Roster ←── uses attendance_records
  ├── 2B: Onboarding/Offboarding ←── uses worker_documents
  │
  ▼
Phase 3: Administrative HR (can start in parallel with Phase 2)
  ├── 3A: Expense Claims ←── uses payment_advances
  ├── 3B: Recruitment
  ├── 3C: Performance Management
  │
  ▼
Phase 4: Agro Differentiators (depends on Phase 2 worker profiles)
  ├── 4A: Seasonal Campaigns
  ├── 4B: Equipment Qualifications
  ├── 4C: Safety Incidents
  ├── 4D: Worker Transport
  │
  ▼
Phase 5: Advanced (depends on Phase 3)
  ├── 5A: Grievances
  ├── 5B: Training Management
  ├── 5C: HR Analytics Views
```

---

## 10. Compliance Presets Reference

> **These are NOT hardcoded values.** They are defaults that get loaded into `hr_compliance_settings` when an admin selects a preset. Every value can be overridden per-organization.

### 10.1 Preset: `morocco_standard` — IR (Impôt sur le Revenu) 2025/2026

| Monthly Taxable Income (MAD) | Rate | Deduction (MAD) |
|------------------------------|------|-----------------|
| 0 – 2,500 | 0% | 0 |
| 2,501 – 5,000 | 10% | 250 |
| 5,001 – 10,000 | 20% | 750 |
| 10,001 – 15,000 | 30% | 1,750 |
| 15,001 – 20,000 | 34% | 2,350 |
| 20,001+ | 38% | 3,150 |

**Family deductions**: 300 MAD/year per dependent child (max 3), 360 MAD/year for spouse.

**Professional expenses**: 20% deduction from gross, capped at 30,000 MAD/year.

### 10.2 Preset: `morocco_standard` — CNSS (Caisse Nationale de Sécurité Sociale)

| Contribution | Employee | Employer | Salary Cap |
|-------------|----------|----------|------------|
| Pension | 4.48% | 8.60% | 6,000 MAD/month (plafond) |
| Family allowances | — | 6.40% | No cap |
| AMO (health) | 2.52% | 4.11% | No cap |
| **Total** | **7.00%** | **19.11%** | |

### 10.3 Preset: `morocco_standard` — Legal Leave Entitlements

> When `leave_compliance_mode = 'morocco_legal'`, the system auto-suggests these defaults when creating leave types. Admin can still override. When `leave_compliance_mode = 'custom'`, no defaults are suggested.

| Leave Type | Annual Days | Notes |
|-----------|-------------|-------|
| Annual paid leave | 1.5 days/month (18/year) | After 6 months of service |
| Sick leave | 4 days (then CNSS takes over) | With medical certificate |
| Maternity | 14 weeks | 100% pay |
| Paternity | 3 days | — |
| Marriage | 3 days | Own marriage |
| Birth | 1 day | Per child |
| Bereavement | 3 days (spouse/parent/child) | — |
| Religious holidays | ~15 days/year | Eid, National holidays |
| Hajj/Umrah | 1 month (once) | — |

### 10.4 Preset: `morocco_standard` — Agricultural Worker Specifics

> These values populate `hr_compliance_settings.minimum_daily_wage` etc. The check is only enforced when `minimum_wage_check_enabled = true`.

- **Minimum wage (SMAG)**: ~88.26 MAD/day (2025)
- **Piece-rate workers**: Must earn at least SMAG equivalent
- **Daily workers**: No formal contract required, but CNSS declaration mandatory after 60 days
- **Seasonal workers**: Fixed-term contracts, CNSS mandatory
- **Metayage workers**: Special rules under Code du Travail agricole

---

## 11. Implementation Conventions

### 11.1 Backend Pattern

Every new module follows existing conventions:

```typescript
// Controller: @ApiTags, @ApiBearerAuth, @UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
// Service: inject DatabaseService, use this.supabaseAdmin.from('table')
// DTOs: class-validator + @ApiProperty
// Extract org: const organizationId = req.headers['x-organization-id']
// All queries MUST filter by organization_id
// Use paginatedResponse() for list endpoints
// Use databaseService.executeInPgTransaction() for multi-table operations
```

### 11.2 Frontend Pattern

```typescript
// Query hooks: useQuery with queryKey: ['feature', organizationId], enabled: !!organizationId
// Mutation hooks: useMutation with queryClient.invalidateQueries
// Forms: react-hook-form + zod with createSchema(t) factory
// UI: shadcn/ui components + lucide-react icons
// i18n: t('key', 'Fallback') in all 3 languages (en, fr, ar)
// Routes: createFileRoute('/_authenticated/(workforce)/path')
```

### 11.3 DB Pattern

```sql
-- All tables: organization_id, created_at, updated_at, RLS policy
-- Use idempotent SQL: CREATE TABLE IF NOT EXISTS
-- Generated columns for computed values
-- JSONB for flexible/extensible data (items, activities, etc.)
-- Indexes on: organization_id, foreign keys, status, date columns
```

### 11.4 New CASL Subjects

```typescript
// Add to casl/resources.ts:
{ key: 'hr_compliance', subject: Subject.HR_COMPLIANCE, displayName: 'HR Compliance Settings' },
{ key: 'leave_management', subject: Subject.LEAVE_MANAGEMENT, displayName: 'Leave Management' },
{ key: 'payroll', subject: Subject.PAYROLL, displayName: 'Payroll' },
{ key: 'shifts', subject: Subject.SHIFTS, displayName: 'Shifts' },
{ key: 'recruitment', subject: Subject.RECRUITMENT, displayName: 'Recruitment' },
{ key: 'performance', subject: Subject.PERFORMANCE, displayName: 'Performance' },
{ key: 'expense_claims', subject: Subject.EXPENSE_CLAIMS, displayName: 'Expense Claims' },
{ key: 'employee_lifecycle', subject: Subject.EMPLOYEE_LIFECYCLE, displayName: 'Employee Lifecycle' },
{ key: 'safety', subject: Subject.SAFETY, displayName: 'Health & Safety' },
```

### 11.5 i18n Namespaces

Consider adding a new `hr` namespace for all HR-related keys:
- `project/src/locales/{en,fr,ar}/hr.json`

This keeps `common.json` from growing too large.

---

## Summary of New Artifacts

### Database Tables (Total: 31 new + 2 fixed + 1 altered)

| Phase | New Tables | Altered Tables |
|-------|-----------|----------------|
| P0 | `attendance_records`, `farm_geofences` | — |
| P1 | `hr_compliance_settings`, `leave_types`, `holiday_lists`, `holidays`, `leave_allocations`, `leave_applications`, `leave_block_dates`, `leave_encashments`, `salary_structures`, `salary_components`, `salary_structure_assignments`, `salary_slips`, `payroll_runs`, `tax_configurations`, `worker_documents` | `workers` (+25 columns) |
| P2 | `shifts`, `shift_assignments`, `shift_requests`, `onboarding_templates`, `onboarding_records`, `separations` | — |
| P3 | `expense_categories`, `expense_claims`, `job_openings`, `job_applicants`, `interviews`, `appraisal_cycles`, `appraisals`, `performance_feedback` | — |
| P4 | `seasonal_campaigns`, `worker_qualifications`, `safety_incidents`, `worker_transport` | — |
| P5 | `grievances`, `training_programs`, `training_enrollments` | — |

### Backend Modules (Total: 11 new)

| Phase | Module |
|-------|--------|
| P1 | `hr-compliance`, `leave-management`, `payroll`, `worker-documents` |
| P2 | `shifts`, `employee-lifecycle` |
| P3 | `expense-claims`, `recruitment`, `performance` |
| P4 | `agro-hr` (qualifications, safety, transport, campaigns) |
| P5 | `grievances`, `training` |

### Frontend Pages (Total: ~21 new routes)

| Phase | Routes |
|-------|--------|
| P1 | `settings.hr-compliance.tsx`, `leave.tsx`, `leave-applications.tsx`, `leave-types.tsx`, `holidays.tsx`, `payroll.tsx`, `payroll.runs.tsx`, `payroll.runs.$runId.tsx`, `salary-structures.tsx`, `salary-slips.tsx`, `salary-slips.$slipId.tsx` |
| P2 | `shifts.tsx`, `roster.tsx`, `onboarding.tsx`, `separations.tsx`, `separations.$separationId.tsx` |
| P3 | `expenses.tsx`, `recruitment.tsx`, `recruitment.$openingId.tsx`, `performance.tsx` |
| P4 | `qualifications.tsx`, `safety.tsx`, `seasonal-campaigns.tsx` |

---

> **⚠️ CEO VALIDATION REQUIRED**: This plan creates **31 new database tables**, alters the `workers` table with 25+ columns, adds **11 new backend modules**, and creates **~21 new frontend pages**. Each phase should be validated individually before implementation begins. Schema changes require CEO sign-off per project conventions.
>
> **Key architectural decision**: Compliance is **per-organization configurable**, not hardcoded. The `hr_compliance_settings` table is the control plane — every HR module reads from it. Moroccan labor law is a *preset*, not the architecture.
