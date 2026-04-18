
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Banknote } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLoader } from '@/components/ui/loader';
import { FilterBar, ResponsiveList } from '@/components/ui/data-table';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { formatCurrency, getPaymentTypeLabel, getPaymentStatusLabel } from '@/types/payments';
import type { PaymentRecord } from '@/types/payments';
import { format } from 'date-fns';

interface WorkersPaymentsListProps {
  organizationId: string;
}

type PaymentRow = PaymentRecord & { period_start?: string; period_end?: string };

const WorkersPaymentsList = ({ organizationId }: WorkersPaymentsListProps) => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const { data: payments = [], isLoading, isFetching } = usePayments(organizationId);
  const language = i18n.language.startsWith('fr') ? 'fr' : 'en';

  const filteredPayments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return payments;
    }

    return payments.filter((payment: PaymentRow) => {
      const workerName = payment.worker_name?.toLowerCase() ?? '';
      const paymentType = payment.payment_type?.toLowerCase() ?? '';
      const paymentTypeLabel = payment.payment_type
        ? getPaymentTypeLabel(payment.payment_type, language).toLowerCase()
        : '';

      return workerName.includes(normalizedSearch)
        || paymentType.includes(normalizedSearch)
        || paymentTypeLabel.includes(normalizedSearch);
    });
  }, [language, payments, search]);

  const formatPaymentDate = (payment: PaymentRow) => (
    payment.payment_date
      ? format(new Date(payment.payment_date), 'dd/MM/yyyy')
      : payment.period_end
        ? format(new Date(payment.period_end), 'dd/MM/yyyy')
        : '-'
  );

  const formatPaymentPeriod = (payment: PaymentRow) => (
    payment.period_start && payment.period_end
      ? `${format(new Date(payment.period_start), 'dd/MM/yy')} - ${format(new Date(payment.period_end), 'dd/MM/yy')}`
      : '-'
  );

  const renderWorker = (payment: PaymentRow) => {
    const workerName = payment.worker_name || t('workers.payments.unknownWorker');

    if (!payment.worker_id) {
      return workerName;
    }

    return (
      <Link
        to="/workers/$workerId"
        params={{ workerId: payment.worker_id }}
        className="text-emerald-600 hover:underline"
      >
        {workerName}
      </Link>
    );
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        variant="card"
        icon={Banknote}
        title={t('workers.payments.overviewTitle')}
        description={t('workers.payments.empty')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('workers.payments.searchPlaceholder', 'Search by worker or payment type...')}
      />

      <ResponsiveList
        items={filteredPayments}
        isLoading={false}
        isFetching={isFetching}
        keyExtractor={(payment) => payment.id}
        emptyIcon={Banknote}
        emptyTitle={t('workers.payments.emptyFilteredTitle', 'No matching payments')}
        emptyMessage={t('workers.payments.emptyFiltered', 'No payments match your search.')}
        renderCard={(payment: PaymentRow) => (
          <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {renderWorker(payment)}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formatPaymentDate(payment)}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {payment.payment_type ? getPaymentTypeLabel(payment.payment_type, language) : '-'}
              </Badge>
            </div>

            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between gap-3">
                <span>{t('workers.payments.period')}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatPaymentPeriod(payment)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{t('workers.payments.amount')}</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(payment.net_amount || 0)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Badge className={getStatusColor(payment.status)}>
                {payment.status ? getPaymentStatusLabel(payment.status, language) : '-'}
              </Badge>
            </div>
          </div>
        )}
        renderTableHeader={
          <TableRow className="border-b border-gray-200 dark:border-gray-700">
            <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
              {t('workers.payments.date')}
            </TableHead>
            <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
              {t('workers.payments.worker')}
            </TableHead>
            <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
              {t('workers.payments.type')}
            </TableHead>
            <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
              {t('workers.payments.period')}
            </TableHead>
            <TableHead className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
              {t('workers.payments.amount')}
            </TableHead>
            <TableHead className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">
              {t('workers.payments.status')}
            </TableHead>
          </TableRow>
        }
        renderTable={(payment: PaymentRow) => (
          <>
            <TableCell className="py-3 px-4 text-gray-900 dark:text-white">
              {formatPaymentDate(payment)}
            </TableCell>
            <TableCell className="py-3 px-4 text-gray-600 dark:text-gray-300">
              {renderWorker(payment)}
            </TableCell>
            <TableCell className="py-3 px-4 text-gray-600 dark:text-gray-300">
              {payment.payment_type ? getPaymentTypeLabel(payment.payment_type, language) : '-'}
            </TableCell>
            <TableCell className="py-3 px-4 text-gray-600 dark:text-gray-300">
              {formatPaymentPeriod(payment)}
            </TableCell>
            <TableCell className="py-3 px-4 text-right text-gray-900 dark:text-white">
              {formatCurrency(payment.net_amount || 0)}
            </TableCell>
            <TableCell className="py-3 px-4">
              <Badge className={getStatusColor(payment.status)}>
                {payment.status ? getPaymentStatusLabel(payment.status, language) : '-'}
              </Badge>
            </TableCell>
          </>
        )}
      />
    </div>
  );
};

export default WorkersPaymentsList;
