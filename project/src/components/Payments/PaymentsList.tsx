import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  DataTablePagination,
  FilterBar,
  ListPageHeader,
  ListPageLayout,
  ResponsiveList,
  SortableHeader,
  useServerTableState,
} from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { BulkProcessPaymentDialog } from './BulkProcessPaymentDialog';
import { Wallet } from 'lucide-react';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import {
  usePaginatedPaymentRecords,
  usePayments,
} from '../../hooks/usePayments';
import type { PaymentStatus, PaymentSummary } from '../../types/payments';
import {
  formatCurrency,
  getPaymentStatusLabel,
  getPaymentTypeLabel,
  PAYMENT_STATUS_COLORS,
} from '../../types/payments';

interface PaymentsListProps {
  organizationId: string;
  onSelectPayment?: (paymentId: string) => void;
}

const STATUS_FILTERS: Array<{ value: PaymentStatus | 'all'; status?: PaymentStatus }> = [
  { value: 'all' },
  { value: 'pending', status: 'pending' },
  { value: 'approved', status: 'approved' },
  { value: 'paid', status: 'paid' },
];

const PaymentsList = ({
  organizationId,
  onSelectPayment,
}: PaymentsListProps) => {
  const { t, i18n } = useTranslation();
  const [activeStatus, setActiveStatus] = useState<PaymentStatus | 'all'>('all');
  const [bulkOpen, setBulkOpen] = useState(false);

  const tableState = useServerTableState({
    defaultPageSize: 10,
    defaultSort: { key: 'period_end', direction: 'desc' },
  });

  const paymentLabelLanguage = i18n.language.startsWith('en') ? 'en' : 'fr';

  const { data: paginatedData, isLoading, isFetching } = usePaginatedPaymentRecords(
    organizationId,
    {
      ...tableState.queryParams,
      status: activeStatus !== 'all' ? activeStatus : undefined,
    },
  );

  const { data: allPayments = [] } = usePayments(organizationId, {
    status: activeStatus !== 'all' ? activeStatus : undefined,
  });

  const payments = paginatedData?.data ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 0;

  const statsPayments = useMemo(() => {
    const search = tableState.search.trim().toLowerCase();
    if (!search) return allPayments;

    return allPayments.filter((payment) =>
      payment.worker_name?.toLowerCase().includes(search),
    );
  }, [allPayments, tableState.search]);

  const totalPaid = statsPayments
    .filter((payment) => payment.status === 'paid')
    .reduce((sum, payment) => sum + payment.net_amount, 0);

  const totalPending = statsPayments
    .filter((payment) => payment.status === 'pending' || payment.status === 'approved')
    .reduce((sum, payment) => sum + payment.net_amount, 0);

  const paymentsThisMonth = statsPayments.filter(
    (payment) => new Date(payment.period_end).getMonth() === new Date().getMonth(),
  ).length;

  const uniqueWorkers = new Set(statsPayments.map((payment) => payment.worker_id)).size;

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'approved':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'disputed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatPeriod = (payment: PaymentSummary) => (
    `${format(new Date(payment.period_start), 'dd/MM')} - ${format(new Date(payment.period_end), 'dd/MM/yyyy')}`
  );

  const renderStatus = (payment: PaymentSummary) => (
    <div className="flex items-center gap-2">
      {getStatusIcon(payment.status)}
      <span
        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${PAYMENT_STATUS_COLORS[payment.status]}`}
      >
        {getPaymentStatusLabel(payment.status, paymentLabelLanguage)}
      </span>
    </div>
  );

  const statusFilters = STATUS_FILTERS.map((filter) => ({
    value: filter.value,
    label:
      filter.value === 'all'
        ? t('payments.list.filters.status.all', 'Tous')
        : getPaymentStatusLabel(filter.status!, paymentLabelLanguage),
  }));

  return (
    <ListPageLayout
      header={
        <ListPageHeader
          variant="shell"
          actions={
            <div className="flex gap-2">
              <Button variant="default" onClick={() => setBulkOpen(true)}>
                <Wallet className="w-5 h-5" />
                {t('payments.list.actions.bulkPay', 'Paiement groupé')}
              </Button>
              <Button variant="secondary">
                <Download className="w-5 h-5" />
                {t('payments.list.actions.export', 'Exporter')}
              </Button>
            </div>
          }
        />
      }
      stats={
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-400 mb-1">
              {t('payments.list.stats.totalPaid', 'Total payé')}
            </p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">
              {t('payments.list.stats.pending', 'En attente')}
            </p>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {formatCurrency(totalPending)}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
              {t('payments.list.stats.thisMonth', 'Ce mois')}
            </p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {paymentsThisMonth}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">
              {t('payments.list.stats.workers', 'Travailleurs')}
            </p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {uniqueWorkers}
            </p>
          </div>
        </div>
      }
      filters={
        <FilterBar
          searchValue={tableState.search}
          onSearchChange={tableState.setSearch}
          searchPlaceholder={t(
            'payments.list.searchPlaceholder',
            'Rechercher par travailleur...',
          )}
          isSearching={isFetching}
          statusFilters={statusFilters}
          activeStatus={activeStatus}
          onStatusChange={(status) => {
            setActiveStatus(status as PaymentStatus | 'all');
            tableState.setPage(1);
          }}
        />
      }
      pagination={
        <DataTablePagination
          page={tableState.page}
          totalPages={totalPages}
          pageSize={tableState.pageSize}
          totalItems={totalItems}
          onPageChange={tableState.setPage}
          onPageSizeChange={tableState.setPageSize}
        />
      }
    >
      <ResponsiveList
        items={payments}
        isLoading={isLoading}
        isFetching={isFetching}
        keyExtractor={(payment) => payment.id}
        emptyIcon={DollarSign}
        emptyTitle={t('payments.list.emptyTitle', 'Aucun paiement trouvé')}
        emptyMessage={t('payments.list.emptyMessage', 'Aucun paiement trouvé')}
        renderCard={(payment) => (
          <button
            type="button"
            onClick={() => onSelectPayment?.(payment.id)}
            className="w-full rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-4 text-left shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {payment.worker_name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {payment.farm_name}
                </p>
              </div>
              {renderStatus(payment)}
            </div>

            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between gap-3">
                <span>{t('payments.list.columns.type', 'Type')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {getPaymentTypeLabel(payment.payment_type, paymentLabelLanguage)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{t('payments.list.columns.period', 'Période')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatPeriod(payment)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{t('payments.list.columns.netAmount', 'Montant net')}</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(payment.net_amount)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <Button variant="link" className="p-0 h-auto text-blue-600 dark:text-blue-400">
                {t('payments.list.actions.viewDetails', 'Voir détails')}
              </Button>
            </div>
          </button>
        )}
        renderTableHeader={
          <TableRow>
            <SortableHeader
              label={t('payments.list.columns.worker', 'Travailleur')}
              sortKey={'worker_name'}
              currentSort={tableState.sortConfig as never}
              onSort={(key) => tableState.handleSort(String(key))}
            />
            <SortableHeader
              label={t('payments.list.columns.type', 'Type')}
              sortKey={'payment_type'}
              currentSort={tableState.sortConfig as never}
              onSort={(key) => tableState.handleSort(String(key))}
            />
            <SortableHeader
              label={t('payments.list.columns.period', 'Période')}
              sortKey={'period_end'}
              currentSort={tableState.sortConfig as never}
              onSort={(key) => tableState.handleSort(String(key))}
            />
            <SortableHeader
              label={t('payments.list.columns.grossAmount', 'Montant brut')}
              sortKey={'base_amount'}
              currentSort={tableState.sortConfig as never}
              onSort={(key) => tableState.handleSort(String(key))}
              align="right"
            />
            <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('payments.list.columns.deductions', 'Déductions')}
            </TableHead>
            <SortableHeader
              label={t('payments.list.columns.netAmount', 'Montant net')}
              sortKey={'net_amount'}
              currentSort={tableState.sortConfig as never}
              onSort={(key) => tableState.handleSort(String(key))}
              align="right"
            />
            <SortableHeader
              label={t('payments.list.columns.status', 'Statut')}
              sortKey={'status'}
              currentSort={tableState.sortConfig as never}
              onSort={(key) => tableState.handleSort(String(key))}
            />
            <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('payments.list.columns.actions', 'Actions')}
            </TableHead>
          </TableRow>
        }
        renderTable={(payment) => (
          <>
            <TableCell
              className="px-6 py-4 cursor-pointer"
              onClick={() => onSelectPayment?.(payment.id)}
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {payment.worker_name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {payment.farm_name}
                </p>
              </div>
            </TableCell>
            <TableCell
              className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
              onClick={() => onSelectPayment?.(payment.id)}
            >
              {getPaymentTypeLabel(payment.payment_type, paymentLabelLanguage)}
            </TableCell>
            <TableCell
              className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
              onClick={() => onSelectPayment?.(payment.id)}
            >
              {formatPeriod(payment)}
            </TableCell>
            <TableCell
              className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              onClick={() => onSelectPayment?.(payment.id)}
            >
              {formatCurrency(
                payment.base_amount + payment.bonuses + payment.overtime_amount,
              )}
            </TableCell>
            <TableCell
              className="px-6 py-4 text-right text-sm text-red-600 dark:text-red-400 cursor-pointer"
              onClick={() => onSelectPayment?.(payment.id)}
            >
              -{formatCurrency(payment.deductions + payment.advance_deduction)}
            </TableCell>
            <TableCell
              className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white cursor-pointer"
              onClick={() => onSelectPayment?.(payment.id)}
            >
              {formatCurrency(payment.net_amount)}
            </TableCell>
            <TableCell className="px-6 py-4 cursor-pointer" onClick={() => onSelectPayment?.(payment.id)}>
              {renderStatus(payment)}
            </TableCell>
            <TableCell className="px-6 py-4 text-right">
              <Button
                variant="link"
                className="text-blue-600 dark:text-blue-400 p-0 h-auto"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectPayment?.(payment.id);
                }}
              >
                {t('payments.list.actions.viewDetails', 'Voir détails')}
              </Button>
            </TableCell>
          </>
        )}
      />
      <BulkProcessPaymentDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        payments={allPayments as PaymentSummary[]}
      />
    </ListPageLayout>
  );
};

export default PaymentsList;
