# International Chart of Accounts

This directory contains chart of accounts templates for different countries.

## Supported Countries

- 🇲🇦 **Morocco** (MAD) - Plan Comptable Marocain (CGNC)
- 🇫🇷 **France** (EUR) - Plan Comptable Général (PCG)
- 🇺🇸 **USA** (USD) - GAAP Standard Chart
- 🇬🇧 **UK** (GBP) - UK GAAP
- 🇩🇪 **Germany** (EUR) - HGB Chart of Accounts

## How to Use

### 1. Automatic Seeding (Recommended)

When creating a new organization, the system automatically seeds the chart based on:
- Organization's country setting
- Organization's currency

### 2. Manual Seeding

```sql
-- Run the appropriate seed file for your country
\i chart-of-accounts/morocco-mad.sql
-- or
\i chart-of-accounts/france-eur.sql
```

### 3. Programmatic Seeding

```typescript
import { seedChartOfAccounts } from '@/lib/seed-chart-of-accounts';

await seedChartOfAccounts(organizationId, 'MAR', 'MAD');
```

## Account Structure

All charts follow this structure:

```
Class 1: Assets
Class 2: Liabilities
Class 3: Equity
Class 4: Third-Party Accounts (Receivables/Payables)
Class 5: Financial Accounts (Cash, Bank)
Class 6: Expenses
Class 7: Revenues
Class 8: Special Accounts (varies by country)
```

## Customization

Each organization can:
- Add custom accounts to the standard chart
- Disable unused accounts
- Modify account names (preserves code)
- Add sub-accounts
