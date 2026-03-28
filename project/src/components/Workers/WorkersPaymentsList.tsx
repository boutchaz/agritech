import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Loader2, Banknote } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, getPaymentTypeLabel, getPaymentStatusLabel } from '@/types/payments';
import { format } from 'date-fns';

interface WorkersPaymentsListProps {
  organizationId: string;
}

const WorkersPaymentsList: React.FC<WorkersPaymentsListProps> = ({ organizationId }) => {
  const { t, i18n } = useTranslation();
  const { data: payments = [], isLoading } = usePayments(organizationId);
  const language = i18n.language.startsWith('fr') ? 'fr' : 'en';

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Banknote className="w-5 h-5 text-emerald-600" />
          {t('workers.payments.overviewTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>{t('workers.payments.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
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
              </TableHeader>
              <TableBody>
                {payments.map((payment: any) => (
                  <TableRow key={payment.id} className="border-b border-gray-100 dark:border-gray-800">
                    <TableCell className="py-3 px-4 text-gray-900 dark:text-white">
                      {payment.payment_date
                        ? format(new Date(payment.payment_date), 'dd/MM/yyyy')
                        : payment.period_end
                          ? format(new Date(payment.period_end), 'dd/MM/yyyy')
                          : '-'}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {payment.worker_id ? (
                        <Link
                          to="/workers/$workerId"
                          params={{ workerId: payment.worker_id }}
                          className="text-emerald-600 hover:underline"
                        >
                          {payment.worker_name || t('workers.payments.unknownWorker')}
                        </Link>
                      ) : (
                        payment.worker_name || t('workers.payments.unknownWorker')
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {payment.payment_type ? getPaymentTypeLabel(payment.payment_type, language) : '-'}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {payment.period_start && payment.period_end
                        ? `${format(new Date(payment.period_start), 'dd/MM/yy')} - ${format(new Date(payment.period_end), 'dd/MM/yy')}`
                        : '-'}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right text-gray-900 dark:text-white">
                      {formatCurrency(payment.net_amount || 0)}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status ? getPaymentStatusLabel(payment.status, language) : '-'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkersPaymentsList;
