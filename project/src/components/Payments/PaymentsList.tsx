import {  useState  } from "react";
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Download,
} from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import type { PaymentFilters, PaymentStatus } from '../../types/payments';
import {
  getPaymentStatusLabel,
  getPaymentTypeLabel,
  formatCurrency,
  PAYMENT_STATUS_COLORS,
} from '../../types/payments';
import { format } from 'date-fns';
import { SectionLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PaymentsListProps {
  organizationId: string;
  onSelectPayment?: (paymentId: string) => void;
}

const PaymentsList = ({
  organizationId,
  onSelectPayment,
}: PaymentsListProps) => {
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: payments = [], isLoading } = usePayments(organizationId, filters);

  const filteredPayments = payments.filter(payment =>
    payment.worker_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusFilter = (status: PaymentStatus | 'all') => {
    setFilters(prev => ({
      ...prev,
      status: status === 'all' ? undefined : status,
    }));
  };

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

  const totalPaid = filteredPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.net_amount, 0);

  const totalPending = filteredPayments
    .filter(p => p.status === 'pending' || p.status === 'approved')
    .reduce((sum, p) => sum + p.net_amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestion des Paiements
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filteredPayments.length} paiement{filteredPayments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="secondary">
          <Download className="w-5 h-5" />
          Exporter
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">Total payé</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">En attente</p>
          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Ce mois</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {filteredPayments.filter(p => 
              new Date(p.period_end).getMonth() === new Date().getMonth()
            ).length}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Travailleurs</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {new Set(filteredPayments.map(p => p.worker_id)).size}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par travailleur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          <Button variant="blue"
            onClick={() => handleStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${ !filters.status ? '' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            Tous
          </Button>
          {(['pending', 'approved', 'paid'] as PaymentStatus[]).map(status => (
            <Button variant="blue"
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${ filters.status === status ? '' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              {getPaymentStatusLabel(status, 'fr')}
            </Button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <SectionLoader />
      ) : filteredPayments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Aucun paiement trouvé</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-gray-50 dark:bg-gray-900">
                <TableRow>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Travailleur
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Période
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Montant brut
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Déductions
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Montant net
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Statut
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPayments.map((payment) => (
                  <TableRow
                    key={payment.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => onSelectPayment?.(payment.id)}
                  >
                    <TableCell className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {payment.worker_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {payment.farm_name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {getPaymentTypeLabel(payment.payment_type, 'fr')}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(payment.period_start), 'dd/MM')} -{' '}
                      {format(new Date(payment.period_end), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(payment.base_amount + payment.bonuses + payment.overtime_amount)}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right text-sm text-red-600 dark:text-red-400">
                      -{formatCurrency(payment.deductions + payment.advance_deduction)}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(payment.net_amount)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payment.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${PAYMENT_STATUS_COLORS[payment.status]}`}>
                          {getPaymentStatusLabel(payment.status, 'fr')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button variant="link" className="text-blue-600 dark:text-blue-400 p-0 h-auto">
                        Voir détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsList;
