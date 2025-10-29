// Edge Function: generate-financial-report
// Generates financial reports (Balance Sheet, P&L, Trial Balance)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ReportType = 'balance_sheet' | 'profit_loss' | 'trial_balance' | 'general_ledger';

interface GenerateReportRequest {
  report_type: ReportType;
  start_date?: string;
  end_date: string;
  account_id?: string; // For general ledger
  cost_center_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const reportRequest: GenerateReportRequest = await req.json();
    const organizationId = req.headers.get('x-organization-id');

    if (!organizationId) {
      throw new Error('Missing organization ID');
    }

    let reportData: any;

    switch (reportRequest.report_type) {
      case 'balance_sheet':
        reportData = await generateBalanceSheet(supabaseClient, organizationId, reportRequest);
        break;
      case 'profit_loss':
        reportData = await generateProfitLoss(supabaseClient, organizationId, reportRequest);
        break;
      case 'trial_balance':
        reportData = await generateTrialBalance(supabaseClient, organizationId, reportRequest);
        break;
      case 'general_ledger':
        reportData = await generateGeneralLedger(supabaseClient, organizationId, reportRequest);
        break;
      default:
        throw new Error('Invalid report type');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: reportData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function generateBalanceSheet(
  supabase: any,
  organizationId: string,
  request: GenerateReportRequest
) {
  // Fetch all accounts with their balances
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .in('account_type', ['Asset', 'Liability', 'Equity'])
    .order('code');

  if (error) {
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }

  // Calculate balances for each account up to end_date
  const accountBalances = await Promise.all(
    accounts.map(async (account: any) => {
      const { data: balance } = await supabase.rpc('get_account_balance', {
        p_account_id: account.id,
        p_end_date: request.end_date,
      });

      return {
        ...account,
        balance: balance || 0,
      };
    })
  );

  // Group by account type
  const assets = accountBalances.filter((a) => a.account_type === 'Asset');
  const liabilities = accountBalances.filter((a) => a.account_type === 'Liability');
  const equity = accountBalances.filter((a) => a.account_type === 'Equity');

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);

  return {
    report_type: 'Balance Sheet',
    as_of_date: request.end_date,
    assets: {
      accounts: buildHierarchy(assets),
      total: totalAssets,
    },
    liabilities: {
      accounts: buildHierarchy(liabilities),
      total: totalLiabilities,
    },
    equity: {
      accounts: buildHierarchy(equity),
      total: totalEquity,
    },
    total_liabilities_equity: totalLiabilities + totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}

async function generateProfitLoss(
  supabase: any,
  organizationId: string,
  request: GenerateReportRequest
) {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .in('account_type', ['Revenue', 'Expense'])
    .order('code');

  if (error) {
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }

  const accountBalances = await Promise.all(
    accounts.map(async (account: any) => {
      const { data: balance } = await supabase.rpc('get_account_balance_period', {
        p_account_id: account.id,
        p_start_date: request.start_date,
        p_end_date: request.end_date,
      });

      return {
        ...account,
        balance: balance || 0,
      };
    })
  );

  const revenue = accountBalances.filter((a) => a.account_type === 'Revenue');
  const expenses = accountBalances.filter((a) => a.account_type === 'Expense');

  const totalRevenue = revenue.reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const totalExpenses = expenses.reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const netProfit = totalRevenue - totalExpenses;

  return {
    report_type: 'Profit & Loss Statement',
    period: {
      start_date: request.start_date,
      end_date: request.end_date,
    },
    revenue: {
      accounts: buildHierarchy(revenue),
      total: totalRevenue,
    },
    expenses: {
      accounts: buildHierarchy(expenses),
      total: totalExpenses,
    },
    net_profit: netProfit,
    profit_margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
  };
}

async function generateTrialBalance(
  supabase: any,
  organizationId: string,
  request: GenerateReportRequest
) {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_group', false)
    .order('code');

  if (error) {
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }

  const accountBalances = await Promise.all(
    accounts.map(async (account: any) => {
      const { data: balance } = await supabase.rpc('get_account_balance', {
        p_account_id: account.id,
        p_end_date: request.end_date,
      });

      const absBalance = Math.abs(balance || 0);
      const isDebit = ['Asset', 'Expense'].includes(account.account_type);

      return {
        code: account.code,
        name: account.name,
        account_type: account.account_type,
        debit: isDebit ? absBalance : 0,
        credit: !isDebit ? absBalance : 0,
      };
    })
  );

  const totalDebit = accountBalances.reduce((sum, a) => sum + a.debit, 0);
  const totalCredit = accountBalances.reduce((sum, a) => sum + a.credit, 0);

  return {
    report_type: 'Trial Balance',
    as_of_date: request.end_date,
    accounts: accountBalances,
    total_debit: totalDebit,
    total_credit: totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}

async function generateGeneralLedger(
  supabase: any,
  organizationId: string,
  request: GenerateReportRequest
) {
  if (!request.account_id) {
    throw new Error('account_id is required for general ledger report');
  }

  // Fetch account details
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', request.account_id)
    .eq('organization_id', organizationId)
    .single();

  if (accountError || !account) {
    throw new Error('Account not found');
  }

  // Fetch journal entry lines for this account
  const { data: entries, error: entriesError } = await supabase
    .from('journal_entry_lines')
    .select(
      `
      *,
      journal_entry:journal_entries(*)
    `
    )
    .eq('account_id', request.account_id)
    .gte('journal_entry.posting_date', request.start_date || '1900-01-01')
    .lte('journal_entry.posting_date', request.end_date)
    .eq('journal_entry.status', 'posted')
    .order('journal_entry.posting_date');

  if (entriesError) {
    throw new Error(`Failed to fetch entries: ${entriesError.message}`);
  }

  let runningBalance = 0;
  const transactions = entries.map((entry: any) => {
    const movement = entry.debit - entry.credit;
    runningBalance += movement;

    return {
      date: entry.journal_entry.posting_date,
      entry_number: entry.journal_entry.entry_number,
      reference: entry.journal_entry.reference_number,
      remarks: entry.remarks,
      debit: entry.debit,
      credit: entry.credit,
      balance: runningBalance,
    };
  });

  return {
    report_type: 'General Ledger',
    account: {
      code: account.code,
      name: account.name,
      type: account.account_type,
    },
    period: {
      start_date: request.start_date,
      end_date: request.end_date,
    },
    transactions,
    opening_balance: 0, // Would need to calculate from previous periods
    closing_balance: runningBalance,
  };
}

function buildHierarchy(accounts: any[]) {
  const accountMap = new Map(accounts.map((a) => [a.id, { ...a, children: [] }]));
  const roots: any[] = [];

  accounts.forEach((account) => {
    const node = accountMap.get(account.id);
    if (account.parent_id) {
      const parent = accountMap.get(account.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}
