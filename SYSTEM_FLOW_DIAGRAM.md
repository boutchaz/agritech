# System Flow Diagram: Unit Management & Piece-Work Payment

## Visual Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGRITECH PIECE-WORK SYSTEM                          │
│                                                                             │
│  "Manage workers paid by units completed (trees, boxes, kg, etc.)"         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                        📊 STEP 1: SETUP (ONE-TIME)                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  Organization   │
    │   Admin         │
    └────────┬────────┘
             │
             ├─────────────────────────────────────────────┐
             │                                             │
             ▼                                             ▼
    ┌─────────────────────┐                      ┌─────────────────────┐
    │  Create Work Units  │                      │  Configure Worker   │
    │                     │                      │  Payment Type       │
    │  • Tree (Arbre)     │                      │                     │
    │  • Box (Caisse)     │                      │  Worker: Ahmed      │
    │  • Kg               │                      │  Type: Piece-work   │
    │  • Liter            │                      │  Unit: Tree         │
    │  • Custom units     │                      │  Rate: 5 MAD/tree   │
    └──────────┬──────────┘                      └──────────┬──────────┘
               │                                            │
               ▼                                            ▼
    ┌─────────────────────┐                      ┌─────────────────────┐
    │   work_units        │                      │   workers           │
    │   Table             │                      │   Table             │
    │                     │                      │                     │
    │  id, code, name     │                      │  payment_frequency  │
    │  unit_category      │                      │  rate_per_unit      │
    │  is_active          │                      │  default_unit_id    │
    └─────────────────────┘                      └─────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                   🌳 STEP 2: RECORD WORK (DAILY)                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  Farm Manager   │
    │  or Supervisor  │
    └────────┬────────┘
             │
             │  Records work completed
             │
             ▼
    ┌─────────────────────────────────────────────┐
    │     Piece-Work Entry Form                   │
    │                                             │
    │  Worker: Ahmed                              │
    │  Date: 2025-10-31                           │
    │  Unit: Tree (Arbre)                         │
    │  Units Completed: 100 trees                 │
    │  Rate: 5 MAD per tree                       │
    │  ─────────────────────────────────          │
    │  Total: 500 MAD  ← Auto-calculated         │
    │                                             │
    │  Quality: ⭐⭐⭐⭐⭐ (5/5)                  │
    │  Notes: "Planted in parcel A3"              │
    └──────────────────┬──────────────────────────┘
                       │
                       │  Saves record
                       │
                       ▼
    ┌─────────────────────────────────────────────┐
    │     piece_work_records Table                │
    │                                             │
    │  id: rec-123                                │
    │  worker_id: ahmed-uuid                      │
    │  work_unit_id: tree-uuid                    │
    │  units_completed: 100                       │
    │  rate_per_unit: 5.00                        │
    │  total_amount: 500.00  ← Generated          │
    │  payment_status: pending                    │
    │  quality_rating: 5                          │
    └─────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│              💰 STEP 3: CALCULATE PAYMENT (WEEKLY/MONTHLY)                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  HR Manager or  │
    │  System (Auto)  │
    └────────┬────────┘
             │
             │  Initiates payment calculation
             │
             ▼
    ┌────────────────────────────────────────────────────────┐
    │  calculate_worker_payment(worker_id, start, end)       │
    │                                                        │
    │  SQL Function queries:                                 │
    │  • All pending piece_work_records                      │
    │  • Sums units_completed                                │
    │  • Sums total_amount                                   │
    │  • Returns piece_work_ids array                        │
    └──────────────────┬─────────────────────────────────────┘
                       │
                       │  Returns calculation
                       │
                       ▼
    ┌─────────────────────────────────────────────┐
    │     Payment Calculation Result              │
    │                                             │
    │  payment_type: 'piece_work'                 │
    │  base_amount: 500.00 MAD                    │
    │  units_completed: 100                       │
    │  piece_work_count: 1                        │
    │  piece_work_ids: [rec-123]                  │
    └──────────────────┬──────────────────────────┘
                       │
                       │  Creates payment record
                       │
                       ▼
    ┌─────────────────────────────────────────────┐
    │     payment_records Table                   │
    │                                             │
    │  id: pay-456                                │
    │  worker_id: ahmed-uuid                      │
    │  payment_type: piece_work                   │
    │  base_amount: 500.00                        │
    │  units_completed: 100                       │
    │  piece_work_ids: [rec-123]                  │
    │  status: pending → approved → paid          │
    │  payment_method: bank_transfer              │
    └─────────────────────────────────────────────┘
                       │
                       │  Links piece-work to payment
                       │
                       ▼
    ┌─────────────────────────────────────────────┐
    │  UPDATE piece_work_records                  │
    │  SET payment_record_id = pay-456            │
    │      payment_status = 'approved'            │
    │  WHERE id = rec-123                         │
    └─────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│               📒 STEP 4: ACCOUNTING INTEGRATION (AUTOMATIC)                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  Payment marked │
    │  as "PAID"      │
    └────────┬────────┘
             │
             │  Trigger fires: payment_record_journal_trigger
             │
             ▼
    ┌────────────────────────────────────────────────────────┐
    │  create_payment_journal_entry(payment_id)              │
    │                                                        │
    │  Automatic function:                                   │
    │  1. Looks up Labor Expense account                     │
    │  2. Looks up Cash/Bank account (based on method)       │
    │  3. Gets farm cost center                              │
    │  4. Creates journal entry                              │
    │  5. Creates debit/credit lines                         │
    └──────────────────┬─────────────────────────────────────┘
                       │
                       │  Creates journal entry
                       │
                       ▼
    ┌─────────────────────────────────────────────────────────┐
    │     journal_entries Table                               │
    │                                                         │
    │  id: je-789                                             │
    │  entry_date: 2025-10-31                                 │
    │  entry_type: payment                                    │
    │  reference: PAY-456                                     │
    │  description: "Labor payment - piece_work"              │
    │  source_document_type: payment_record                   │
    │  source_document_id: pay-456                            │
    │  status: posted                                         │
    └──────────────────┬──────────────────────────────────────┘
                       │
                       │  Creates journal lines
                       │
                       ▼
    ┌─────────────────────────────────────────────────────────┐
    │     journal_items Table                                 │
    │                                                         │
    │  ┌───────────────────────────────────────────────────┐ │
    │  │  Line 1: DEBIT                                    │ │
    │  │  account: Labor Expense (6200)                    │ │
    │  │  debit: 500.00 MAD                                │ │
    │  │  credit: 0                                        │ │
    │  │  cost_center: Olive Farm                          │ │
    │  └───────────────────────────────────────────────────┘ │
    │                                                         │
    │  ┌───────────────────────────────────────────────────┐ │
    │  │  Line 2: CREDIT                                   │ │
    │  │  account: Bank Account (1020)                     │ │
    │  │  debit: 0                                         │ │
    │  │  credit: 500.00 MAD                               │ │
    │  │  description: "Payment via bank transfer"         │ │
    │  └───────────────────────────────────────────────────┘ │
    └─────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                    📈 STEP 5: REPORTING & ANALYSIS                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  View Reports   │
    └────────┬────────┘
             │
             ├──────────────────────────────────────────────┐
             │                                              │
             ▼                                              ▼
    ┌─────────────────────┐                      ┌─────────────────────┐
    │  Worker Payment     │                      │  Financial Reports  │
    │  Summary            │                      │                     │
    │                     │                      │  • P&L Statement    │
    │  Ahmed:             │                      │  • Balance Sheet    │
    │  • Entries: 1       │                      │  • Cost by Farm     │
    │  • Units: 100       │                      │  • Labor Expenses   │
    │  • Earnings: 500    │                      │                     │
    │  • Paid: 500        │                      │  Labor Expense:     │
    │  • Pending: 0       │                      │  • 500 MAD (Ahmed)  │
    └─────────────────────┘                      └─────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                           🔄 DATA FLOW SUMMARY                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    work_units  ──────┐
                      │
    workers     ──────┤
                      │
                      ├──→  piece_work_records  ───┐
                      │                            │
                      │                            ▼
                      │                    calculate_payment()
                      │                            │
                      │                            ▼
                      └──────────────→    payment_records
                                                   │
                                                   │ status = 'paid'
                                                   │
                                                   ▼
                                        trigger fires automatically
                                                   │
                                                   ▼
                                          journal_entries
                                                   │
                                                   ▼
                                          journal_items
                                          (Debit + Credit)


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                        🎯 KEY INTEGRATION POINTS                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
    │  Worker          │         │  Task            │         │  Parcel          │
    │  Management      │◄────────┤  Management      │◄────────┤  Management      │
    └────────┬─────────┘         └──────────────────┘         └──────────────────┘
             │
             │  Links to
             │
             ▼
    ┌──────────────────┐
    │  Piece-Work      │
    │  Records         │
    └────────┬─────────┘
             │
             │  Generates
             │
             ▼
    ┌──────────────────┐
    │  Payment         │
    │  Records         │
    └────────┬─────────┘
             │
             │  Creates
             │
             ▼
    ┌──────────────────┐         ┌──────────────────┐
    │  Journal         │────────►│  Financial       │
    │  Entries         │         │  Reports         │
    └──────────────────┘         └──────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                          🔐 SECURITY & ACCESS                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │  Row Level Security (RLS) - All tables protected                    │
    ├─────────────────────────────────────────────────────────────────────┤
    │                                                                     │
    │  work_units:                                                        │
    │  • SELECT: Users in organization                                    │
    │  • INSERT/UPDATE/DELETE: Org admins only                            │
    │                                                                     │
    │  piece_work_records:                                                │
    │  • SELECT: Users in organization + Workers (own records)            │
    │  • INSERT/UPDATE/DELETE: Farm managers and admins                   │
    │                                                                     │
    │  payment_records:                                                   │
    │  • SELECT: Users in organization + Workers (own payments)           │
    │  • INSERT/UPDATE: Org admins and farm managers                      │
    │  • DELETE: Org admins only                                          │
    │                                                                     │
    │  journal_entries/journal_items:                                     │
    │  • SELECT: Users in organization                                    │
    │  • INSERT: System (auto-triggered) or org admins                    │
    │  • UPDATE/DELETE: Org admins only (with restrictions)               │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                        ⚡ PERFORMANCE OPTIMIZATIONS                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │  Database Indexes                                                   │
    ├─────────────────────────────────────────────────────────────────────┤
    │  • work_units: organization_id, unit_category, is_active            │
    │  • piece_work_records: organization_id, farm_id, worker_id,         │
    │    work_date, payment_status, payment_record_id                     │
    │  • payment_records: organization_id, worker_id, status              │
    │  • journal_entries: organization_id, entry_date, status             │
    └─────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │  Generated Columns (Auto-calculated)                                │
    ├─────────────────────────────────────────────────────────────────────┤
    │  • piece_work_records.total_amount = units × rate                   │
    │  • payment_records.net_amount = base + bonuses - deductions         │
    └─────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │  Views (Pre-calculated summaries)                                   │
    ├─────────────────────────────────────────────────────────────────────┤
    │  • worker_payment_summary: Aggregate stats per worker               │
    └─────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                          📱 UI COMPONENT TREE                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    App
    │
    ├── Settings
    │   └── WorkUnitManagement
    │       ├── UnitList (with search/filter)
    │       └── UnitDialog (create/edit)
    │
    ├── Workers
    │   ├── WorkerList
    │   ├── WorkerConfiguration
    │   │   └── PaymentTypeSelector
    │   │       ├── PerUnitForm
    │   │       ├── DailyWageForm
    │   │       ├── MonthlySalaryForm
    │   │       └── MetayageForm
    │   │
    │   └── PieceWorkEntry
    │       └── PieceWorkForm
    │           ├── WorkerSelect
    │           ├── UnitSelect
    │           ├── AmountCalculator
    │           └── QualityRating
    │
    └── Payments
        ├── PaymentList
        └── CreatePayment
            ├── PeriodSelector
            ├── PaymentCalculator (calls SQL function)
            └── PaymentForm


┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                           ✅ SUCCESS INDICATORS                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

    System Working Correctly When:

    ✓ Work units can be created and edited
    ✓ Workers can be configured for piece-work payment
    ✓ Piece-work records can be created with auto-calculated totals
    ✓ Payment calculation returns accurate amounts
    ✓ Payment records link to piece-work records
    ✓ Journal entries auto-create when payment marked as paid
    ✓ Financial reports show labor expenses correctly
    ✓ RLS prevents unauthorized access
    ✓ Multi-organization isolation works
    ✓ All UI components render without errors


═══════════════════════════════════════════════════════════════════════════════
                            END OF SYSTEM FLOW
═══════════════════════════════════════════════════════════════════════════════
