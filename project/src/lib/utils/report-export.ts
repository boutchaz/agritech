interface CsvColumn {
  header: string;
  key: string;
  format?: (value: unknown) => string;
}

function formatCurrencyValue(amount: number): string {
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map(c => escapeCsvValue(c.header)).join(',');
  const body = rows.map(row =>
    columns.map(col => {
      const raw = row[col.key];
      const value = col.format ? col.format(raw) : String(raw ?? '');
      return escapeCsvValue(value);
    }).join(',')
  ).join('\n');
  return `${header}\n${body}`;
}

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface TrialBalanceExportRow {
  account_code: string;
  account_name: string;
  account_type: string;
  debit_balance: number;
  credit_balance: number;
}

export function exportTrialBalanceCsv(
  accounts: TrialBalanceExportRow[],
  asOfDate: string,
  currencySymbol: string
): void {
  const columns: CsvColumn[] = [
    { header: 'Account Code', key: 'account_code' },
    { header: 'Account Name', key: 'account_name' },
    { header: 'Account Type', key: 'account_type' },
    { header: `Debit (${currencySymbol})`, key: 'debit_balance', format: (v) => formatCurrencyValue(Number(v)) },
    { header: `Credit (${currencySymbol})`, key: 'credit_balance', format: (v) => formatCurrencyValue(Number(v)) },
  ];
  const csv = toCsv(columns, accounts as unknown as Record<string, unknown>[]);
  downloadBlob(csv, `trial-balance-${asOfDate}.csv`, 'text/csv;charset=utf-8;');
}

interface BalanceSheetExportRow {
  section: string;
  account_code: string;
  account_name: string;
  display_balance: number;
}

export function exportBalanceSheetCsv(
  assets: BalanceSheetExportRow[],
  liabilities: BalanceSheetExportRow[],
  equity: BalanceSheetExportRow[],
  asOfDate: string,
  currencySymbol: string
): void {
  const columns: CsvColumn[] = [
    { header: 'Section', key: 'section' },
    { header: 'Account Code', key: 'account_code' },
    { header: 'Account Name', key: 'account_name' },
    { header: `Balance (${currencySymbol})`, key: 'display_balance', format: (v) => formatCurrencyValue(Number(v)) },
  ];
  const allRows = [
    ...assets.map(a => ({ ...a, section: 'Assets' })),
    ...liabilities.map(a => ({ ...a, section: 'Liabilities' })),
    ...equity.map(a => ({ ...a, section: 'Equity' })),
  ];
  const csv = toCsv(columns, allRows as unknown as Record<string, unknown>[]);
  downloadBlob(csv, `balance-sheet-${asOfDate}.csv`, 'text/csv;charset=utf-8;');
}

interface ProfitLossExportRow {
  section: string;
  account_code: string;
  account_name: string;
  display_amount: number;
}

export function exportProfitLossCsv(
  revenue: ProfitLossExportRow[],
  expenses: ProfitLossExportRow[],
  startDate: string,
  endDate: string,
  currencySymbol: string
): void {
  const columns: CsvColumn[] = [
    { header: 'Section', key: 'section' },
    { header: 'Account Code', key: 'account_code' },
    { header: 'Account Name', key: 'account_name' },
    { header: `Amount (${currencySymbol})`, key: 'display_amount', format: (v) => formatCurrencyValue(Number(v)) },
  ];
  const allRows = [
    ...revenue.map(r => ({ ...r, section: 'Revenue' })),
    ...expenses.map(e => ({ ...e, section: 'Expenses' })),
  ];
  const csv = toCsv(columns, allRows as unknown as Record<string, unknown>[]);
  downloadBlob(csv, `profit-loss-${startDate}-to-${endDate}.csv`, 'text/csv;charset=utf-8;');
}

interface GeneralLedgerExportRow {
  entry_date: string;
  entry_number: string;
  description: string;
  reference_type: string | null;
  reference_number: string | null;
  debit: number;
  credit: number;
  running_balance: number;
}

export function exportGeneralLedgerCsv(
  accountName: string,
  entries: GeneralLedgerExportRow[],
  startDate: string,
  endDate: string,
  currencySymbol: string
): void {
  const columns: CsvColumn[] = [
    { header: 'Date', key: 'entry_date' },
    { header: 'Entry #', key: 'entry_number' },
    { header: 'Description', key: 'description' },
    { header: 'Reference', key: 'reference', format: (v) => String(v ?? '') },
    { header: `Debit (${currencySymbol})`, key: 'debit', format: (v) => formatCurrencyValue(Number(v)) },
    { header: `Credit (${currencySymbol})`, key: 'credit', format: (v) => formatCurrencyValue(Number(v)) },
    { header: `Balance (${currencySymbol})`, key: 'running_balance', format: (v) => formatCurrencyValue(Number(v)) },
  ];
  const rows = entries.map(e => ({
    ...e,
    reference: e.reference_number ? `${e.reference_type || ''}:${e.reference_number}` : '',
  }));
  const csv = toCsv(columns, rows as unknown as Record<string, unknown>[]);
  const safeName = accountName.replace(/[^a-zA-Z0-9]/g, '-');
  downloadBlob(csv, `general-ledger-${safeName}-${startDate}-to-${endDate}.csv`, 'text/csv;charset=utf-8;');
}

interface AgedReportParty {
  party_name: string;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90: number;
  total: number;
}

export function exportAgedReportCsv(
  type: 'receivables' | 'payables',
  parties: AgedReportParty[],
  asOfDate: string,
  currencySymbol: string
): void {
  const partyLabel = type === 'receivables' ? 'Customer' : 'Supplier';
  const columns: CsvColumn[] = [
    { header: partyLabel, key: 'party_name' },
    { header: `Current (${currencySymbol})`, key: 'current', format: (v) => formatCurrencyValue(Number(v)) },
    { header: `1-30 Days (${currencySymbol})`, key: 'days_1_30', format: (v) => formatCurrencyValue(Number(v)) },
    { header: `31-60 Days (${currencySymbol})`, key: 'days_31_60', format: (v) => formatCurrencyValue(Number(v)) },
    { header: `61-90 Days (${currencySymbol})`, key: 'days_61_90', format: (v) => formatCurrencyValue(Number(v)) },
    { header: `90+ Days (${currencySymbol})`, key: 'over_90', format: (v) => formatCurrencyValue(Number(v)) },
    { header: `Total (${currencySymbol})`, key: 'total', format: (v) => formatCurrencyValue(Number(v)) },
  ];
  const csv = toCsv(columns, parties as unknown as Record<string, unknown>[]);
  downloadBlob(csv, `aged-${type}-${asOfDate}.csv`, 'text/csv;charset=utf-8;');
}
