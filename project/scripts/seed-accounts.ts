#!/usr/bin/env tsx
/**
 * Seed Default Chart of Accounts
 *
 * Usage: npx tsx scripts/seed-accounts.ts <organization_id>
 *
 * This script creates a standard chart of accounts for an organization,
 * including Assets, Liabilities, Equity, Revenue, and Expenses.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database.types';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

interface AccountDefinition {
  code: string;
  name: string;
  account_type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  account_subtype?: string;
  is_group: boolean;
  parent_code?: string;
  description?: string;
}

const defaultAccounts: AccountDefinition[] = [
  // =====================================================
  // ASSETS
  // =====================================================
  {
    code: '1000',
    name: 'Assets',
    account_type: 'Asset',
    is_group: true,
    description: 'All asset accounts',
  },

  // Current Assets
  {
    code: '1100',
    name: 'Current Assets',
    account_type: 'Asset',
    account_subtype: 'Current Asset',
    is_group: true,
    parent_code: '1000',
    description: 'Assets that can be converted to cash within one year',
  },
  {
    code: '1110',
    name: 'Cash and Bank',
    account_type: 'Asset',
    account_subtype: 'Cash',
    is_group: false,
    parent_code: '1100',
    description: 'Cash on hand and bank accounts',
  },
  {
    code: '1111',
    name: 'Cash in Hand',
    account_type: 'Asset',
    account_subtype: 'Cash',
    is_group: false,
    parent_code: '1100',
    description: 'Physical cash',
  },
  {
    code: '1120',
    name: 'Accounts Receivable',
    account_type: 'Asset',
    account_subtype: 'Receivable',
    is_group: false,
    parent_code: '1100',
    description: 'Money owed by customers',
  },
  {
    code: '1130',
    name: 'Inventory',
    account_type: 'Asset',
    account_subtype: 'Stock',
    is_group: false,
    parent_code: '1100',
    description: 'Stock of goods for sale',
  },
  {
    code: '1140',
    name: 'Prepaid Expenses',
    account_type: 'Asset',
    account_subtype: 'Current Asset',
    is_group: false,
    parent_code: '1100',
    description: 'Expenses paid in advance',
  },

  // Fixed Assets
  {
    code: '1200',
    name: 'Fixed Assets',
    account_type: 'Asset',
    account_subtype: 'Fixed Asset',
    is_group: true,
    parent_code: '1000',
    description: 'Long-term tangible assets',
  },
  {
    code: '1210',
    name: 'Equipment',
    account_type: 'Asset',
    account_subtype: 'Fixed Asset',
    is_group: false,
    parent_code: '1200',
    description: 'Farm equipment and machinery',
  },
  {
    code: '1220',
    name: 'Vehicles',
    account_type: 'Asset',
    account_subtype: 'Fixed Asset',
    is_group: false,
    parent_code: '1200',
    description: 'Farm vehicles',
  },
  {
    code: '1230',
    name: 'Buildings',
    account_type: 'Asset',
    account_subtype: 'Fixed Asset',
    is_group: false,
    parent_code: '1200',
    description: 'Farm buildings and structures',
  },
  {
    code: '1240',
    name: 'Land',
    account_type: 'Asset',
    account_subtype: 'Fixed Asset',
    is_group: false,
    parent_code: '1200',
    description: 'Agricultural land',
  },
  {
    code: '1250',
    name: 'Accumulated Depreciation',
    account_type: 'Asset',
    account_subtype: 'Accumulated Depreciation',
    is_group: false,
    parent_code: '1200',
    description: 'Contra-asset account for depreciation',
  },

  // =====================================================
  // LIABILITIES
  // =====================================================
  {
    code: '2000',
    name: 'Liabilities',
    account_type: 'Liability',
    is_group: true,
    description: 'All liability accounts',
  },

  // Current Liabilities
  {
    code: '2100',
    name: 'Current Liabilities',
    account_type: 'Liability',
    account_subtype: 'Current Liability',
    is_group: true,
    parent_code: '2000',
    description: 'Obligations due within one year',
  },
  {
    code: '2110',
    name: 'Accounts Payable',
    account_type: 'Liability',
    account_subtype: 'Payable',
    is_group: false,
    parent_code: '2100',
    description: 'Money owed to suppliers',
  },
  {
    code: '2120',
    name: 'Accrued Expenses',
    account_type: 'Liability',
    account_subtype: 'Current Liability',
    is_group: false,
    parent_code: '2100',
    description: 'Expenses incurred but not yet paid',
  },
  {
    code: '2130',
    name: 'Tax Payable',
    account_type: 'Liability',
    account_subtype: 'Current Liability',
    is_group: false,
    parent_code: '2100',
    description: 'Taxes owed to government',
  },
  {
    code: '2140',
    name: 'Wages Payable',
    account_type: 'Liability',
    account_subtype: 'Current Liability',
    is_group: false,
    parent_code: '2100',
    description: 'Unpaid wages to workers',
  },

  // Long-term Liabilities
  {
    code: '2200',
    name: 'Long-term Liabilities',
    account_type: 'Liability',
    account_subtype: 'Long-term Liability',
    is_group: true,
    parent_code: '2000',
    description: 'Obligations due beyond one year',
  },
  {
    code: '2210',
    name: 'Loans Payable',
    account_type: 'Liability',
    account_subtype: 'Long-term Liability',
    is_group: false,
    parent_code: '2200',
    description: 'Long-term bank loans',
  },
  {
    code: '2220',
    name: 'Mortgage Payable',
    account_type: 'Liability',
    account_subtype: 'Long-term Liability',
    is_group: false,
    parent_code: '2200',
    description: 'Property mortgages',
  },

  // =====================================================
  // EQUITY
  // =====================================================
  {
    code: '3000',
    name: 'Equity',
    account_type: 'Equity',
    is_group: true,
    description: 'Owner equity accounts',
  },
  {
    code: '3100',
    name: "Owner's Equity",
    account_type: 'Equity',
    account_subtype: 'Capital',
    is_group: false,
    parent_code: '3000',
    description: 'Owner capital contributions',
  },
  {
    code: '3200',
    name: 'Retained Earnings',
    account_type: 'Equity',
    account_subtype: 'Retained Earnings',
    is_group: false,
    parent_code: '3000',
    description: 'Accumulated profits',
  },
  {
    code: '3300',
    name: 'Current Year Earnings',
    account_type: 'Equity',
    account_subtype: 'Current Year Earnings',
    is_group: false,
    parent_code: '3000',
    description: 'Profit for current fiscal year',
  },

  // =====================================================
  // REVENUE
  // =====================================================
  {
    code: '4000',
    name: 'Revenue',
    account_type: 'Revenue',
    is_group: true,
    description: 'All revenue accounts',
  },
  {
    code: '4100',
    name: 'Harvest Sales',
    account_type: 'Revenue',
    account_subtype: 'Product Sales',
    is_group: false,
    parent_code: '4000',
    description: 'Revenue from crop sales',
  },
  {
    code: '4200',
    name: 'Service Revenue',
    account_type: 'Revenue',
    account_subtype: 'Service Income',
    is_group: false,
    parent_code: '4000',
    description: 'Revenue from services',
  },
  {
    code: '4300',
    name: 'Other Revenue',
    account_type: 'Revenue',
    account_subtype: 'Other Income',
    is_group: false,
    parent_code: '4000',
    description: 'Miscellaneous income',
  },

  // =====================================================
  // EXPENSES
  // =====================================================
  {
    code: '5000',
    name: 'Expenses',
    account_type: 'Expense',
    is_group: true,
    description: 'All expense accounts',
  },

  // Cost of Goods Sold
  {
    code: '5100',
    name: 'Cost of Goods Sold',
    account_type: 'Expense',
    account_subtype: 'COGS',
    is_group: true,
    parent_code: '5000',
    description: 'Direct costs of production',
  },
  {
    code: '5110',
    name: 'Direct Materials',
    account_type: 'Expense',
    account_subtype: 'COGS',
    is_group: false,
    parent_code: '5100',
    description: 'Seeds, fertilizers, pesticides',
  },
  {
    code: '5120',
    name: 'Direct Labor',
    account_type: 'Expense',
    account_subtype: 'COGS',
    is_group: false,
    parent_code: '5100',
    description: 'Labor directly involved in production',
  },

  // Operating Expenses
  {
    code: '5200',
    name: 'Operating Expenses',
    account_type: 'Expense',
    account_subtype: 'Operating Expense',
    is_group: true,
    parent_code: '5000',
    description: 'Day-to-day operational costs',
  },
  {
    code: '5210',
    name: 'Labor Costs',
    account_type: 'Expense',
    account_subtype: 'Operating Expense',
    is_group: false,
    parent_code: '5200',
    description: 'Wages and salaries',
  },
  {
    code: '5220',
    name: 'Materials and Supplies',
    account_type: 'Expense',
    account_subtype: 'Operating Expense',
    is_group: false,
    parent_code: '5200',
    description: 'General farm supplies',
  },
  {
    code: '5230',
    name: 'Utilities',
    account_type: 'Expense',
    account_subtype: 'Operating Expense',
    is_group: false,
    parent_code: '5200',
    description: 'Water, electricity, fuel',
  },
  {
    code: '5240',
    name: 'Depreciation Expense',
    account_type: 'Expense',
    account_subtype: 'Depreciation',
    is_group: false,
    parent_code: '5200',
    description: 'Depreciation of fixed assets',
  },
  {
    code: '5250',
    name: 'Maintenance and Repairs',
    account_type: 'Expense',
    account_subtype: 'Operating Expense',
    is_group: false,
    parent_code: '5200',
    description: 'Equipment and facility maintenance',
  },
  {
    code: '5260',
    name: 'Insurance',
    account_type: 'Expense',
    account_subtype: 'Operating Expense',
    is_group: false,
    parent_code: '5200',
    description: 'Insurance premiums',
  },
  {
    code: '5270',
    name: 'Transportation',
    account_type: 'Expense',
    account_subtype: 'Operating Expense',
    is_group: false,
    parent_code: '5200',
    description: 'Transportation and logistics',
  },

  // Administrative Expenses
  {
    code: '5300',
    name: 'Administrative Expenses',
    account_type: 'Expense',
    account_subtype: 'Administrative Expense',
    is_group: true,
    parent_code: '5000',
    description: 'Administrative and office costs',
  },
  {
    code: '5310',
    name: 'Office Supplies',
    account_type: 'Expense',
    account_subtype: 'Administrative Expense',
    is_group: false,
    parent_code: '5300',
    description: 'Office materials and supplies',
  },
  {
    code: '5320',
    name: 'Professional Fees',
    account_type: 'Expense',
    account_subtype: 'Administrative Expense',
    is_group: false,
    parent_code: '5300',
    description: 'Legal, accounting, consulting fees',
  },
  {
    code: '5330',
    name: 'Bank Charges',
    account_type: 'Expense',
    account_subtype: 'Administrative Expense',
    is_group: false,
    parent_code: '5300',
    description: 'Bank fees and charges',
  },
  {
    code: '5340',
    name: 'Interest Expense',
    account_type: 'Expense',
    account_subtype: 'Financial Expense',
    is_group: false,
    parent_code: '5300',
    description: 'Interest on loans and debt',
  },
];

async function seedAccounts(organizationId: string) {
  console.log(`\n🌱 Seeding Chart of Accounts for organization: ${organizationId}\n`);

  const accountMap = new Map<string, string>();
  let successCount = 0;
  let errorCount = 0;

  for (const account of defaultAccounts) {
    const { parent_code, ...accountData } = account;
    const parent_id = parent_code ? accountMap.get(parent_code) : null;

    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          ...accountData,
          organization_id: organizationId,
          parent_id,
        })
        .select('id, code, name')
        .single();

      if (error) {
        console.error(`❌ Failed to create account ${account.code}: ${error.message}`);
        errorCount++;
      } else {
        accountMap.set(data.code, data.id);
        const indent = account.is_group ? '' : '  ';
        console.log(`${indent}✓ ${data.code} - ${data.name}`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Error creating account ${account.code}:`, err);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✓ Created: ${successCount} accounts`);
  if (errorCount > 0) {
    console.log(`   ❌ Failed: ${errorCount} accounts`);
  }
  console.log(`\n✅ Chart of Accounts seeded successfully!\n`);
}

// Main execution
const organizationId = process.argv[2];

if (!organizationId) {
  console.error('\n❌ Error: Organization ID is required\n');
  console.log('Usage: npx tsx scripts/seed-accounts.ts <organization_id>\n');
  console.log('Example: npx tsx scripts/seed-accounts.ts 123e4567-e89b-12d3-a456-426614174000\n');
  process.exit(1);
}

// Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(organizationId)) {
  console.error('\n❌ Error: Invalid organization ID format (must be a valid UUID)\n');
  process.exit(1);
}

seedAccounts(organizationId)
  .then(() => {
    console.log('Done! You can now use these accounts for invoices, payments, and journal entries.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
