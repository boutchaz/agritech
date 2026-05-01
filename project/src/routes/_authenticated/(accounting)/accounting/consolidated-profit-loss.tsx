import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import {
  useOrganizationGroups,
  useConsolidatedProfitLoss,
} from '@/hooks/useOrganizationGroups';
import type {
  ConsolidatedProfitLossReport,
  ConsolidatedProfitLossRow,
} from '@/lib/api/financial-reports';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/loader';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Layers, ChevronDown, ChevronRight } from 'lucide-react';

const formatCurrency = (amount: number, symbol: string = 'MAD') =>
  `${symbol} ${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function ConsolidatedProfitLossPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [groupId, setGroupId] = useState<string>('');
  const [start, setStart] = useState<string>(monthStart);
  const [end, setEnd] = useState<string>(today);
  const [basis, setBasis] = useState<'accrual' | 'cash'>('accrual');
  const [includeZero, setIncludeZero] = useState(false);
  const [includeElim, setIncludeElim] = useState(true);
  const [showElim, setShowElim] = useState(false);

  const { data: groups = [] } = useOrganizationGroups();

  const { data, isLoading, isError, error } = useConsolidatedProfitLoss(
    groupId || null,
    start,
    end,
    {
      basis,
      include_zero_balances: includeZero,
      include_eliminations: includeElim,
    },
  );

  const symbol = data?.group_base_currency || currentOrganization?.currency_code || 'MAD';

  const renderRow = (r: ConsolidatedProfitLossRow) => (
    <TableRow key={`${r.section}-${r.account_id}`}>
      <TableCell className="font-mono text-xs">{r.account_code}</TableCell>
      <TableCell>{r.account_name}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {(r.by_org || []).map((o) => (
            <Badge key={o.organization_id} variant="secondary" className="text-xs">
              {o.organization_name}: {formatCurrency(o.amount, symbol)}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatCurrency(r.display_amount, symbol)}
      </TableCell>
    </TableRow>
  );

  const renderSection = (
    label: string,
    rows: ConsolidatedProfitLossRow[],
    total: number,
  ) => (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-4">{label}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">{t('common.code', 'Code')}</TableHead>
            <TableHead>{t('common.account', 'Account')}</TableHead>
            <TableHead>{t('consolidatedPL.byOrg', 'By organization')}</TableHead>
            <TableHead className="text-right">{t('common.amount', 'Amount')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-gray-500">
                {t('common.empty', 'No data')}
              </TableCell>
            </TableRow>
          ) : (
            rows.map(renderRow)
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="font-semibold">
              {t('common.total', 'Total')}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {formatCurrency(total, symbol)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Layers className="h-5 w-5" />
          {t('consolidatedPL.title', 'Consolidated Profit & Loss')}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t(
            'consolidatedPL.subtitle',
            'Aggregate P&L across an organization group, translated to the group base currency, with optional intercompany eliminations.',
          )}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              {t('consolidatedPL.group', 'Group')}
            </label>
            <NativeSelect value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">{t('common.select', 'Select...')}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.base_currency})
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('common.startDate', 'Start')}
            </label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('common.endDate', 'End')}
            </label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('profitLoss.basis', 'Basis')}
            </label>
            <NativeSelect
              value={basis}
              onChange={(e) => setBasis(e.target.value as 'accrual' | 'cash')}
            >
              <option value="accrual">{t('profitLoss.accrual', 'Accrual')}</option>
              <option value="cash">{t('profitLoss.cash', 'Cash')}</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Switch checked={includeElim} onCheckedChange={setIncludeElim} />
              {t('consolidatedPL.eliminations', 'Eliminations')}
            </label>
            <label className="text-sm font-medium flex items-center gap-2">
              <Switch checked={includeZero} onCheckedChange={setIncludeZero} />
              {t('profitLoss.includeZero', 'Include zero balances')}
            </label>
          </div>
        </CardContent>
      </Card>

      {!groupId ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-gray-500">
            {t('consolidatedPL.selectGroup', 'Select a group to consolidate.')}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <PageLoader />
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-500">
            {(error as any)?.message ||
              t('common.error', 'An error occurred while loading data.')}
          </CardContent>
        </Card>
      ) : data ? (
        <ConsolidatedReport
          data={data}
          symbol={symbol}
          showElim={showElim}
          setShowElim={setShowElim}
          renderSection={renderSection}
        />
      ) : null}
    </div>
  );
}

function ConsolidatedReport({
  data,
  symbol,
  showElim,
  setShowElim,
  renderSection,
}: {
  data: ConsolidatedProfitLossReport;
  symbol: string;
  showElim: boolean;
  setShowElim: (v: boolean) => void;
  renderSection: (
    label: string,
    rows: ConsolidatedProfitLossRow[],
    total: number,
  ) => React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
            <span>
              {data.group_name} — {data.start_date} → {data.end_date}
            </span>
            <span className="text-xs font-normal text-gray-500">
              {t('consolidatedPL.baseCurrency', 'Base currency')}: {data.group_base_currency}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.member_organizations.map((m) => (
              <Badge key={m.id} variant="outline">
                {m.name} · {m.currency} @ {m.rate_used.toFixed(4)}
              </Badge>
            ))}
            {data.member_organizations.length === 0 && (
              <span className="text-sm text-gray-500">
                {t('consolidatedPL.noMembers', 'No member organizations')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          {renderSection(
            t('profitLoss.directIncome', 'Direct Income'),
            data.direct_income,
            data.totals.total_direct_income,
          )}
          {renderSection(
            t('profitLoss.cogs', 'Cost of Goods Sold'),
            data.cogs,
            data.totals.total_cogs,
          )}
          <div className="flex justify-between border-t pt-2 mt-2 font-semibold">
            <span>{t('profitLoss.grossProfit', 'Gross Profit')}</span>
            <span className="tabular-nums">
              {`${symbol} ${data.totals.gross_profit.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            </span>
          </div>

          {renderSection(
            t('profitLoss.indirectExpenses', 'Indirect Expenses'),
            data.indirect_expenses,
            data.totals.total_indirect_expenses,
          )}
          <div className="flex justify-between border-t pt-2 mt-2 font-semibold">
            <span>{t('profitLoss.operatingProfit', 'Operating Profit')}</span>
            <span className="tabular-nums">
              {`${symbol} ${data.totals.operating_profit.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            </span>
          </div>

          {renderSection(
            t('profitLoss.otherIncome', 'Other Income'),
            data.other_income,
            data.totals.total_other_income,
          )}
          {renderSection(
            t('profitLoss.otherExpenses', 'Other Expenses'),
            data.other_expenses,
            data.totals.total_other_expenses,
          )}

          <div className="flex justify-between border-t pt-3 mt-3 text-lg font-bold">
            <span>{t('profitLoss.netIncome', 'Net Income')}</span>
            <span className="tabular-nums">
              {`${symbol} ${data.totals.net_income.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {data.eliminations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <button
                type="button"
                onClick={() => setShowElim(!showElim)}
                className="inline-flex items-center gap-2 hover:underline"
              >
                {showElim ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {t('consolidatedPL.eliminationsTitle', 'Intercompany Eliminations')} (
                {data.eliminations.length})
              </button>
            </CardTitle>
          </CardHeader>
          {showElim && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.code', 'Account Code')}</TableHead>
                    <TableHead className="text-right">
                      {t('consolidatedPL.eliminatedAmount', 'Eliminated Amount')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.eliminations.map((e) => (
                    <TableRow key={e.account_code}>
                      <TableCell className="font-mono text-xs">{e.account_code}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {`${symbol} ${e.amount.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}
    </>
  );
}

export const Route = createFileRoute(
  '/_authenticated/(accounting)/accounting/consolidated-profit-loss',
)({
  component: withRouteProtection(ConsolidatedProfitLossPage, 'read', 'JournalEntry'),
});
