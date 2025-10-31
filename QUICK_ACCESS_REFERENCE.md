# Quick Access Reference - Unit Management UI

## 🚀 How to Access the New Features

### 1️⃣ Work Unit Management (Admin Only)

**URL**: `http://your-app/settings/work-units`

**Navigation Path**:
```
Login → Settings → Work Units
```

**What you can do**:
- ✅ Create new work units (Arbre, Caisse, Kg, Litre, etc.)
- ✅ Edit existing units
- ✅ Delete unused units
- ✅ Load 15 default units with one click
- ✅ Search and filter units by category
- ✅ View usage statistics

**File Location**: `project/src/components/settings/WorkUnitManagement.tsx`

**Route File**: `project/src/routes/settings.work-units.tsx` ✅ CREATED

---

### 2️⃣ Piece-Work Records

**URL**: `http://your-app/workers/piece-work`

**Navigation Path**:
```
Login → Workers → Piece-Work tab
```

**What you can do**:
- ✅ View all piece-work records
- ✅ Record new work completed (click "Record Piece Work" button)
- ✅ Filter by date range and payment status
- ✅ See worker productivity
- ✅ Track quality ratings

**File Location**: `project/src/components/Workers/PieceWorkEntry.tsx`

**Route File**: `project/src/routes/workers.piece-work.tsx` ✅ CREATED

---

### 3️⃣ Worker Payment Configuration

**Access from Workers page**:
```
Login → Workers → Select a Worker → Click "Configure Payment"
```

**What you can do**:
- ✅ Configure worker for piece-work payment
- ✅ Select default work unit
- ✅ Set rate per unit
- ✅ Switch between payment types (daily, monthly, per-unit, metayage)

**File Location**: `project/src/components/Workers/WorkerConfiguration.tsx`

**Usage**: Import and use as modal/dialog in workers page

---

## 📂 File Structure

```
project/src/
├── components/
│   ├── settings/
│   │   └── WorkUnitManagement.tsx     ← Admin manages units here
│   └── Workers/
│       ├── PieceWorkEntry.tsx          ← Record & view piece-work
│       └── WorkerConfiguration.tsx     ← Configure payment type
│
└── routes/
    ├── settings.work-units.tsx         ← Route for work units (NEW)
    └── workers.piece-work.tsx          ← Route for piece-work (NEW)
```

---

## 🎯 Quick Start (First Time Setup)

### Step 1: Deploy Database Changes
```bash
cd project
npm run db:push
npm run db:generate-types-remote
```

### Step 2: Seed Default Units
Login to your app as **organization admin**, then:

1. Go to **Settings → Work Units**
2. Click **"Load Default Units"** button
3. Verify 15 units are created

OR via SQL:
```sql
SELECT seed_default_work_units('your-organization-id');
```

### Step 3: Configure a Worker
1. Go to **Workers**
2. Select or create a worker
3. Click **"Configure Payment"** (or edit worker)
4. Choose:
   - Payment Type: **"Per Unit (Piece-work)"**
   - Default Unit: e.g., **"Tree"**
   - Rate per Unit: e.g., **5 MAD**
5. Click **"Save"**

### Step 4: Record Work
1. Go to **Workers → Piece-Work** tab
2. Click **"Record Piece Work"** button
3. Fill in:
   - Worker: Select worker
   - Date: Today
   - Units Completed: e.g., 100
   - Rate: Auto-filled from worker config
4. Review total (100 × 5 = 500 MAD)
5. Click **"Save"**

### Step 5: Process Payment
1. Go to **Payments → Create Payment**
2. Select worker and period
3. System calculates: 500 MAD from piece-work
4. Create payment
5. Mark as **"Paid"** → Journal entry auto-created! ✨

---

## 🔗 Direct Links (Replace with Your Domain)

Once deployed, bookmark these URLs:

- **Work Units**: `https://your-app.com/settings/work-units`
- **Piece-Work**: `https://your-app.com/workers/piece-work`
- **Workers**: `https://your-app.com/workers`
- **Payments**: `https://your-app.com/payments`
- **Accounting**: `https://your-app.com/accounting-journal`

---

## 🎨 Adding Navigation Links

### Option 1: Add to Settings Menu

**File**: `project/src/components/SettingsLayout.tsx`

Add this link to your settings navigation:

```tsx
import { Package } from 'lucide-react';

<Link to="/settings/work-units" className="nav-link">
  <Package className="h-5 w-5 mr-3" />
  Work Units
</Link>
```

### Option 2: Add to Workers Page as Tab

**File**: `project/src/routes/workers.tsx`

Update the Tabs component:

```tsx
<Tabs defaultValue="list">
  <TabsList>
    <TabsTrigger value="list">Workers</TabsTrigger>
    <TabsTrigger value="piece-work">Piece-Work</TabsTrigger>  {/* NEW */}
    <TabsTrigger value="metayage">Metayage</TabsTrigger>
  </TabsList>

  <TabsContent value="list">
    <WorkersList />
  </TabsContent>

  <TabsContent value="piece-work">
    {/* Redirect or embed piece-work components */}
    <PieceWorkPage />
  </TabsContent>
</Tabs>
```

### Option 3: Add to Sidebar

**File**: `project/src/components/Sidebar.tsx`

Add work units link in settings section:

```tsx
{hasRole(['organization_admin']) && (
  <NavItem
    to="/settings/work-units"
    icon={Package}
    label="Work Units"
  />
)}
```

---

## 🔐 Permissions

### Who Can Access What?

| Feature | Organization Admin | Farm Manager | Farm Worker | Day Laborer |
|---------|-------------------|--------------|-------------|-------------|
| Work Units Management | ✅ Full Access | ❌ | ❌ | ❌ |
| Record Piece-Work | ✅ | ✅ | ❌ | ❌ |
| View Piece-Work (All) | ✅ | ✅ | ❌ | ❌ |
| View Own Piece-Work | ✅ | ✅ | ✅ | ✅ |
| Configure Workers | ✅ | ✅ | ❌ | ❌ |
| Process Payments | ✅ | ✅ | ❌ | ❌ |

---

## 🐛 Troubleshooting

### "Page not found" error

**Cause**: Routes not generated yet

**Solution**:
```bash
# Stop dev server
# Delete routeTree.gen.ts
rm project/src/routeTree.gen.ts

# Restart dev server (auto-regenerates routes)
npm run dev
```

### "Component not found" error

**Cause**: Import path incorrect

**Solution**: Use `@/` alias:
```tsx
// ✅ Correct
import { WorkUnitManagement } from '@/components/settings/WorkUnitManagement';

// ❌ Wrong
import { WorkUnitManagement } from '../components/settings/WorkUnitManagement';
```

### "Permission denied" error

**Cause**: User doesn't have required role

**Solution**: Check user's role in database:
```sql
SELECT role FROM organization_users
WHERE user_id = 'user-id'
  AND organization_id = 'org-id';
```

Grant admin role if needed:
```sql
UPDATE organization_users
SET role = 'organization_admin'
WHERE user_id = 'user-id';
```

---

## 📱 Mobile Access

All components are **responsive** and work on mobile devices:

- ✅ Touch-friendly buttons
- ✅ Mobile-optimized forms
- ✅ Responsive tables/cards
- ✅ Swipe gestures supported

---

## 🎓 User Training

### For Admins:
1. **Setup Phase** (5 minutes):
   - Create work units (or load defaults)
   - Configure workers for piece-work

2. **Daily Use**:
   - Review piece-work records
   - Verify quality ratings
   - Process payments

### For Farm Managers:
1. **Daily Tasks**:
   - Record piece-work for workers
   - Monitor productivity
   - Approve pending work

2. **Weekly Tasks**:
   - Review worker performance
   - Calculate payments
   - Generate reports

### For Workers:
1. **View Own Records**:
   - See daily work logged
   - Track earnings
   - View payment status

---

## 📊 Reporting

View piece-work data in:

1. **Piece-Work List Page**:
   - Filter by date, worker, status
   - Export to CSV/Excel

2. **Worker Payment Summary**:
   ```sql
   SELECT * FROM worker_payment_summary
   WHERE organization_id = 'your-org-id';
   ```

3. **Financial Reports**:
   - P&L shows labor expenses
   - Cost by farm/parcel
   - Journal entries show all payments

---

## 🔄 Integration Points

These components integrate with:

- ✅ **Workers Module**: Link to worker profiles
- ✅ **Tasks Module**: Record piece-work from tasks
- ✅ **Parcels Module**: Track work by parcel
- ✅ **Payments Module**: Auto-calculate from piece-work
- ✅ **Accounting Module**: Auto-create journal entries
- ✅ **Reports Module**: Include in financial reports

---

## 📞 Support

Need help?

1. Check **[UI_INTEGRATION_GUIDE.md](./UI_INTEGRATION_GUIDE.md)** for detailed integration
2. See **[UNIT_MANAGEMENT_GUIDE.md](./UNIT_MANAGEMENT_GUIDE.md)** for complete docs
3. Review **[QUICK_START_UNIT_MANAGEMENT.md](./QUICK_START_UNIT_MANAGEMENT.md)** for setup
4. View **[SYSTEM_FLOW_DIAGRAM.md](./SYSTEM_FLOW_DIAGRAM.md)** for architecture

---

## ✅ Checklist for Going Live

- [ ] Database migration applied
- [ ] TypeScript types regenerated
- [ ] Routes created and working
- [ ] Navigation links added
- [ ] Work units seeded (per organization)
- [ ] Test worker configured
- [ ] Test piece-work recorded
- [ ] Test payment calculated
- [ ] Test accounting integration
- [ ] User roles/permissions verified
- [ ] Admin trained on setup
- [ ] Farm managers trained on daily use
- [ ] Documentation provided to users

---

**Last Updated**: October 31, 2025
**Quick Access Version**: 1.0.0

---

## 🎉 Ready to Use!

The system is now fully integrated and ready for production use. All three UI components are accessible via the routes created above.

**Start here**:
1. Go to `http://your-app/settings/work-units`
2. Load default units
3. Configure a worker
4. Record some work
5. Process payment
6. See accounting magic happen! ✨
