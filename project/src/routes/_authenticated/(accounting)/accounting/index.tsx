import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAutoStartTour } from '@/contexts/TourContext';
import { PageLayout } from '@/components/PageLayout';
import ModernPageHeader from '@/components/ModernPageHeader';
import {
  Building2,
  BookOpen,
  Receipt,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  PlusCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useInvoices } from '@/hooks/useInvoices';
import { useAccountingPayments } from '@/hooks/useAccountingPayments';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useAccountMappings } from '@/hooks/useAccountMappings';
import { useFiscalYears } from '@/hooks/useAgriculturalAccounting';
import { PageLoader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

type InvoiceLike = {
  id: string;
  invoice_number: string;
  invoice_type: 'sales' | 'purchase';
  party_name: string;
  invoice_date: string;
  due_date: string;
  grand_total: number | string;
  outstanding_amount: number | string;
  currency_code: string | null;
  status: string;
  created_at: string;
};

type PaymentLike = {
  id: string;
  payment_number: string | null;
  party_name: string;
  amount: number | string;
  payment_date: string;
  payment_type: string;
  status: string | null;
  created_at: string;
};

const ACTIVE_AR_STATUSES = new Set(['submitted', 'partially_paid', 'overdue']);
const POSTED_STATUSES = new Set(['submitted', 'partially_paid', 'overdue', 'paid']);

const formatMoney = (value: number, currency: string) =>
  `${currency} ${value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const daysBetween = (a: Date, b: Date) =>
  Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

const AppContent = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();

  useAutoStartTour('accounting', 1500);

  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = useAccountingPayments();
  const { data: bankAccounts = [] } = useBankAccounts({ is_active: true });
  const { data: mappings = [] } = useAccountMappings();
  const { data: fiscalYears = [] } = useFiscalYears();

  const currencySymbol =
    currentOrganization?.currency_symbol || currentOrganization?.currency || 'MAD';

  const metrics = React.useMemo(() => {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonth = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    let outstandingAR = 0;
    let outstandingAP = 0;
    let arInvoiceCount = 0;
    let apInvoiceCount = 0;
    let thisMonthRevenue = 0;
    let thisMonthExpense = 0;
    let lastMonthRevenue = 0;
    let lastMonthExpense = 0;

    for (const inv of invoices as InvoiceLike[]) {
      const outstanding = Number(inv.outstanding_amount) || 0;
      const grand = Number(inv.grand_total) || 0;
      const invDate = new Date(inv.invoice_date);
      const status = inv.status;

      if (inv.invoice_type === 'sales') {
        if (ACTIVE_AR_STATUSES.has(status)) {
          outstandingAR += outstanding;
          arInvoiceCount += 1;
        }
        if (POSTED_STATUSES.has(status)) {
          if (invDate >= thisMonth) thisMonthRevenue += grand;
          else if (invDate >= lastMonth && invDate < thisMonth) lastMonthRevenue += grand;
        }
      } else if (inv.invoice_type === 'purchase') {
        if (ACTIVE_AR_STATUSES.has(status)) {
          outstandingAP += outstanding;
          apInvoiceCount += 1;
        }
        if (POSTED_STATUSES.has(status)) {
          if (invDate >= thisMonth) thisMonthExpense += grand;
          else if (invDate >= lastMonth && invDate < thisMonth) lastMonthExpense += grand;
        }
      }
    }

    const cashPosition = bankAccounts.reduce(
      (s: number, b: { current_balance: number | string | null }) =>
        s + (Number(b.current_balance) || 0),
      0,
    );

    const thisMonthNet = thisMonthRevenue - thisMonthExpense;
    const lastMonthNet = lastMonthRevenue - lastMonthExpense;
    const netDelta = thisMonthNet - lastMonthNet;

    return {
      outstandingAR,
      outstandingAP,
      arInvoiceCount,
      apInvoiceCount,
      cashPosition,
      thisMonthRevenue,
      thisMonthExpense,
      thisMonthNet,
      netDelta,
    };
  }, [invoices, bankAccounts]);

  const aging = React.useMemo(() => {
    const now = new Date();
    const buckets = {
      ar: { current: 0, d30: 0, d60: 0, d90: 0 },
      ap: { current: 0, d30: 0, d60: 0, d90: 0 },
    };
    for (const inv of invoices as InvoiceLike[]) {
      if (!ACTIVE_AR_STATUSES.has(inv.status)) continue;
      const outstanding = Number(inv.outstanding_amount) || 0;
      if (outstanding === 0) continue;
      const due = new Date(inv.due_date);
      const daysOverdue = daysBetween(due, now);
      const target = inv.invoice_type === 'sales' ? buckets.ar : buckets.ap;
      if (daysOverdue <= 0) target.current += outstanding;
      else if (daysOverdue <= 30) target.d30 += outstanding;
      else if (daysOverdue <= 60) target.d60 += outstanding;
      else target.d90 += outstanding;
    }
    return buckets;
  }, [invoices]);

  const attention = React.useMemo(() => {
    const now = new Date();
    const overdueCount = (invoices as InvoiceLike[]).filter((i) => {
      if (!ACTIVE_AR_STATUSES.has(i.status)) return false;
      return new Date(i.due_date) < now;
    }).length;
    const draftCount = (invoices as InvoiceLike[]).filter((i) => i.status === 'draft').length;
    const unallocatedCount = (payments as PaymentLike[]).filter(
      (p) => (p.status ?? 'draft') === 'draft',
    ).length;
    const mappingsMissing = mappings.length === 0;
    return { overdueCount, draftCount, unallocatedCount, mappingsMissing };
  }, [invoices, payments, mappings]);

  const currentFY = React.useMemo(() => {
    const now = new Date();
    return (
      fiscalYears.find((fy) => fy.is_current) ||
      fiscalYears.find(
        (fy) => new Date(fy.start_date) <= now && new Date(fy.end_date) >= now,
      ) ||
      null
    );
  }, [fiscalYears]);

  const fyWarning = React.useMemo(() => {
    if (!currentFY) return null;
    const now = new Date();
    const end = new Date(currentFY.end_date);
    const daysUntilClose = daysBetween(now, end);
    if (currentFY.status === 'closed') {
      return { kind: 'closed' as const, label: 'Fiscal year is CLOSED' };
    }
    if (daysUntilClose <= 30 && daysUntilClose >= 0) {
      return { kind: 'closing' as const, label: `${daysUntilClose} day${daysUntilClose === 1 ? '' : 's'} until ${currentFY.name} closes` };
    }
    return null;
  }, [currentFY]);

  const trendData = React.useMemo(() => {
    const now = new Date();
    const buckets: Array<{ key: string; label: string; revenue: number; expense: number }> = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({
        key,
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue: 0,
        expense: 0,
      });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const inv of invoices as InvoiceLike[]) {
      if (!POSTED_STATUSES.has(inv.status)) continue;
      const d = new Date(inv.invoice_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b = byKey.get(key);
      if (!b) continue;
      const amt = Number(inv.grand_total) || 0;
      if (inv.invoice_type === 'sales') b.revenue += amt;
      else b.expense += amt;
    }
    return buckets;
  }, [invoices]);

  const recentActivity = React.useMemo(() => {
    type Item = {
      id: string;
      kind: 'sales' | 'purchase' | 'receive' | 'pay';
      title: string;
      subtitle: string;
      amount: string;
      status: string;
      date: Date;
      onClick: () => void;
    };
    const items: Item[] = [];
    for (const inv of (invoices as InvoiceLike[]).slice(0, 6)) {
      items.push({
        id: `inv-${inv.id}`,
        kind: inv.invoice_type,
        title: `${inv.invoice_type === 'sales' ? 'Sales' : 'Purchase'} ${inv.invoice_number}`,
        subtitle: inv.party_name,
        amount: formatMoney(Number(inv.grand_total) || 0, inv.currency_code || currencySymbol),
        status: inv.status,
        date: new Date(inv.created_at),
        onClick: () => navigate({ to: '/accounting/invoices' }),
      });
    }
    for (const pay of (payments as PaymentLike[]).slice(0, 6)) {
      const kind = pay.payment_type === 'receive' ? 'receive' : 'pay';
      items.push({
        id: `pay-${pay.id}`,
        kind,
        title: `${kind === 'receive' ? 'Payment received' : 'Payment made'}${pay.payment_number ? ` ${pay.payment_number}` : ''}`,
        subtitle: pay.party_name,
        amount: formatMoney(Number(pay.amount) || 0, currencySymbol),
        status: pay.status ?? 'draft',
        date: new Date(pay.created_at),
        onClick: () => navigate({ to: '/accounting/payments' }),
      });
    }
    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);
  }, [invoices, payments, currencySymbol, navigate]);

  const gsState = React.useMemo(() => {
    const hasInvoice = invoices.length > 0;
    const hasPayment = payments.length > 0;
    const hasAccounts = mappings.length > 0;
    const hasMultiPosted =
      (invoices as InvoiceLike[]).filter((i) => POSTED_STATUSES.has(i.status)).length >= 2;
    return { hasAccounts, hasInvoice, hasPayment, hasMultiPosted };
  }, [invoices, payments, mappings]);

  const gsAllDone =
    gsState.hasAccounts && gsState.hasInvoice && gsState.hasPayment && gsState.hasMultiPosted;

  if (!currentOrganization) return <PageLoader />;

  return (
    <PageLayout
      activeModule="accounting"
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            {
              icon: BookOpen,
              label: t('accountingModule.dashboard.title', 'Accounting Dashboard'),
              isActive: true,
            },
          ]}
          title={t('accountingModule.dashboard.title', 'Accounting Dashboard')}
          subtitle={t(
            'accountingModule.dashboard.subtitle',
            'Cash position, outstanding balances, and what needs your attention',
          )}
          actions={
            currentFY ? (
              <Badge
                variant={fyWarning?.kind === 'closed' ? 'destructive' : 'outline'}
                className="gap-1.5"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {currentFY.name}
                {fyWarning ? <span className="font-normal">· {fyWarning.label}</span> : null}
              </Badge>
            ) : null
          }
        />
      }
    >
      <div className="p-6 space-y-6" data-tour="accounting-overview">
        {/* Money metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MoneyMetric
            title="Outstanding A/R"
            value={formatMoney(metrics.outstandingAR, currencySymbol)}
            sub={`${metrics.arInvoiceCount} sales invoice${metrics.arInvoiceCount === 1 ? '' : 's'} unpaid`}
            icon={Receipt}
            color="text-emerald-600 dark:text-emerald-400"
            bg="bg-emerald-50 dark:bg-emerald-900/20"
            onClick={() =>
              navigate({ to: '/accounting/aged-receivables' })
            }
            alert={aging.ar.d90 > 0 ? 'Overdue > 60 days' : null}
          />
          <MoneyMetric
            title="Outstanding A/P"
            value={formatMoney(metrics.outstandingAP, currencySymbol)}
            sub={`${metrics.apInvoiceCount} purchase invoice${metrics.apInvoiceCount === 1 ? '' : 's'} unpaid`}
            icon={FileClock}
            color="text-amber-600 dark:text-amber-400"
            bg="bg-amber-50 dark:bg-amber-900/20"
            onClick={() => navigate({ to: '/accounting/aged-payables' })}
            alert={aging.ap.d90 > 0 ? 'Overdue > 60 days' : null}
          />
          <MoneyMetric
            title="Cash Position"
            value={formatMoney(metrics.cashPosition, currencySymbol)}
            sub={`${bankAccounts.length} bank account${bankAccounts.length === 1 ? '' : 's'}`}
            icon={Wallet}
            color="text-blue-600 dark:text-blue-400"
            bg="bg-blue-50 dark:bg-blue-900/20"
            onClick={() => navigate({ to: '/accounting/bank-accounts' })}
          />
          <MoneyMetric
            title="This Month Net"
            value={formatMoney(metrics.thisMonthNet, currencySymbol)}
            sub={
              metrics.netDelta === 0
                ? 'Flat vs last month'
                : `${metrics.netDelta > 0 ? '+' : ''}${formatMoney(metrics.netDelta, currencySymbol)} vs last month`
            }
            icon={metrics.thisMonthNet >= 0 ? TrendingUp : TrendingDown}
            color={
              metrics.thisMonthNet >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }
            bg={
              metrics.thisMonthNet >= 0
                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }
            onClick={() => navigate({ to: '/accounting/profit-loss' })}
          />
        </div>

        {/* Needs Attention + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NeedsAttentionCard
            overdueCount={attention.overdueCount}
            draftCount={attention.draftCount}
            unallocatedCount={attention.unallocatedCount}
            mappingsMissing={attention.mappingsMissing}
            fyWarning={fyWarning}
            navigate={navigate}
          />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest invoices and payments</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/accounting/journal' })}>
                View journal <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  No activity yet — create an invoice to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((a) => (
                    <button
                      key={a.id}
                      onClick={a.onClick}
                      className="w-full text-left flex items-center justify-between rounded-md px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ActivityIcon kind={a.kind} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {a.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {a.subtitle} · {a.date.toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusPill status={a.status} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {a.amount}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trend chart + Aging summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>6-Month Revenue vs Expenses</CardTitle>
              <CardDescription>
                Posted invoices grouped by month ({currencySymbol})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 6, fontSize: 12 }}
                      formatter={(v) => formatMoney(Number(v) || 0, currencySymbol)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aging Summary</CardTitle>
              <CardDescription>Unpaid balances by age</CardDescription>
            </CardHeader>
            <CardContent>
              <AgingTable aging={aging} currency={currencySymbol} navigate={navigate} />
            </CardContent>
          </Card>
        </div>

        {/* Getting Started — only when not fully set up */}
        {!gsAllDone && (
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Complete these steps to get full value from accounting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <GettingStartedRow
                done={gsState.hasAccounts}
                label="Configure Chart of Accounts and mappings"
                action="Open account mappings"
                onAction={() => navigate({ to: '/accounting/account-mappings' })}
              />
              <GettingStartedRow
                done={gsState.hasInvoice}
                label="Create your first sales or purchase invoice"
                action="New invoice"
                onAction={() => navigate({ to: '/accounting/invoices' })}
              />
              <GettingStartedRow
                done={gsState.hasPayment}
                label="Record a payment and allocate it to invoices"
                action="Record payment"
                onAction={() => navigate({ to: '/accounting/payments' })}
              />
              <GettingStartedRow
                done={gsState.hasMultiPosted}
                label="Post at least 2 invoices to see trends and reports"
                action="View P&L"
                onAction={() => navigate({ to: '/accounting/profit-loss' })}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

const MoneyMetric = ({
  title,
  value,
  sub,
  icon: Icon,
  color,
  bg,
  onClick,
  alert,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  onClick: () => void;
  alert?: string | null;
}) => (
  <button
    onClick={onClick}
    className="text-left w-full group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
  >
    <Card className="transition-shadow group-hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-lg', bg)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
        {alert ? (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {alert}
          </p>
        ) : null}
      </CardContent>
    </Card>
  </button>
);

const NeedsAttentionCard = ({
  overdueCount,
  draftCount,
  unallocatedCount,
  mappingsMissing,
  fyWarning,
  navigate,
}: {
  overdueCount: number;
  draftCount: number;
  unallocatedCount: number;
  mappingsMissing: boolean;
  fyWarning: { kind: 'closed' | 'closing'; label: string } | null;
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const items: Array<{
    key: string;
    severity: 'critical' | 'warning' | 'info';
    label: string;
    cta: string;
    onClick: () => void;
  }> = [];

  if (mappingsMissing) {
    items.push({
      key: 'mappings',
      severity: 'critical',
      label: 'No account mappings configured — invoice posting will fail',
      cta: 'Set up mappings',
      onClick: () => navigate({ to: '/accounting/account-mappings' }),
    });
  }
  if (fyWarning?.kind === 'closed') {
    items.push({
      key: 'fy-closed',
      severity: 'critical',
      label: fyWarning.label,
      cta: 'Open fiscal years',
      onClick: () => navigate({ to: '/accounting/fiscal-years' }),
    });
  }
  if (overdueCount > 0) {
    items.push({
      key: 'overdue',
      severity: 'warning',
      label: `${overdueCount} overdue invoice${overdueCount === 1 ? '' : 's'}`,
      cta: 'Review',
      onClick: () => navigate({ to: '/accounting/aged-receivables' }),
    });
  }
  if (draftCount > 0) {
    items.push({
      key: 'drafts',
      severity: 'info',
      label: `${draftCount} draft invoice${draftCount === 1 ? '' : 's'} not posted`,
      cta: 'Review',
      onClick: () => navigate({ to: '/accounting/invoices' }),
    });
  }
  if (unallocatedCount > 0) {
    items.push({
      key: 'unallocated',
      severity: 'info',
      label: `${unallocatedCount} unallocated payment${unallocatedCount === 1 ? '' : 's'}`,
      cta: 'Allocate',
      onClick: () => navigate({ to: '/accounting/payments' }),
    });
  }
  if (fyWarning?.kind === 'closing') {
    items.push({
      key: 'fy-closing',
      severity: 'warning',
      label: fyWarning.label,
      cta: 'View fiscal year',
      onClick: () => navigate({ to: '/accounting/fiscal-years' }),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Needs Attention
        </CardTitle>
        <CardDescription>Items that require action</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-4">
            <CheckCircle2 className="h-4 w-4" />
            All clear — nothing needs attention right now.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.key}
                onClick={item.onClick}
                className={cn(
                  'w-full text-left flex items-center justify-between gap-3 rounded-md p-3 border transition-colors',
                  item.severity === 'critical' &&
                    'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:hover:bg-red-900/30',
                  item.severity === 'warning' &&
                    'border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-900/20 dark:hover:bg-amber-900/30',
                  item.severity === 'info' &&
                    'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700',
                )}
              >
                <span
                  className={cn(
                    'text-sm',
                    item.severity === 'critical' && 'text-red-800 dark:text-red-200',
                    item.severity === 'warning' && 'text-amber-800 dark:text-amber-200',
                    item.severity === 'info' && 'text-gray-800 dark:text-gray-200',
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium flex items-center gap-1 flex-shrink-0',
                    item.severity === 'critical' && 'text-red-700 dark:text-red-300',
                    item.severity === 'warning' && 'text-amber-700 dark:text-amber-300',
                    item.severity === 'info' && 'text-gray-600 dark:text-gray-300',
                  )}
                >
                  {item.cta} <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const classes: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    partially_paid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500 line-through',
    reconciled: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  };
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        classes[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
};

const ActivityIcon = ({ kind }: { kind: 'sales' | 'purchase' | 'receive' | 'pay' }) => {
  if (kind === 'sales')
    return (
      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
        <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  if (kind === 'purchase')
    return (
      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
        <FileClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
    );
  if (kind === 'receive')
    return (
      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
        <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>
    );
  return (
    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 flex-shrink-0">
      <CreditCard className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    </div>
  );
};

const AgingTable = ({
  aging,
  currency,
  navigate,
}: {
  aging: { ar: Record<string, number>; ap: Record<string, number> };
  currency: string;
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const row = (label: string, buckets: Record<string, number>, href: string) => {
    const total = buckets.current + buckets.d30 + buckets.d60 + buckets.d90;
    return (
      <button
        onClick={() => navigate({ to: href })}
        className="w-full grid grid-cols-6 gap-2 items-center text-sm py-2 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-right text-gray-900 dark:text-white">
          {formatMoney(buckets.current, currency)}
        </span>
        <span className="text-right text-amber-700 dark:text-amber-400">
          {formatMoney(buckets.d30, currency)}
        </span>
        <span className="text-right text-orange-700 dark:text-orange-400">
          {formatMoney(buckets.d60, currency)}
        </span>
        <span className="text-right text-red-700 dark:text-red-400">
          {formatMoney(buckets.d90, currency)}
        </span>
        <span className="text-right font-semibold text-gray-900 dark:text-white">
          {formatMoney(total, currency)}
        </span>
      </button>
    );
  };
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-6 gap-2 text-xs text-gray-500 dark:text-gray-400 px-2 pb-1 border-b border-gray-200 dark:border-gray-700">
        <span></span>
        <span className="text-right">Current</span>
        <span className="text-right">1–30d</span>
        <span className="text-right">31–60d</span>
        <span className="text-right">60+</span>
        <span className="text-right font-medium">Total</span>
      </div>
      {row('Receivables', aging.ar, '/accounting/aged-receivables')}
      {row('Payables', aging.ap, '/accounting/aged-payables')}
    </div>
  );
};

const GettingStartedRow = ({
  done,
  label,
  action,
  onAction,
}: {
  done: boolean;
  label: string;
  action: string;
  onAction: () => void;
}) => (
  <div className="flex items-center gap-3">
    <div
      className={cn(
        'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
        done
          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
          : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
      )}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-3.5 w-3.5" />}
    </div>
    <p
      className={cn(
        'text-sm flex-1',
        done
          ? 'text-gray-500 dark:text-gray-400 line-through'
          : 'text-gray-900 dark:text-gray-100',
      )}
    >
      {label}
    </p>
    {!done && (
      <Button size="sm" variant="outline" onClick={onAction}>
        <PlusCircle className="h-3.5 w-3.5 mr-1" />
        {action}
      </Button>
    )}
  </div>
);

export const Route = createFileRoute('/_authenticated/(accounting)/accounting/')({
  component: withRouteProtection(AppContent, 'read', 'Invoice'),
});
