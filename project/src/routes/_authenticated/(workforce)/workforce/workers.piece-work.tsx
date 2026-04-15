import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Filter, Package, Building2 } from 'lucide-react';
import { PieceWorkEntry, PieceWorkList } from '@/components/Workers/PieceWorkEntry';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { PageLoader } from '@/components/ui/loader';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { format, startOfMonth, endOfMonth } from 'date-fns';

function PieceWorkPage() {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();

  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filters = {
    startDate,
    endDate,
    ...(statusFilter !== 'all' && { status: statusFilter }),
  };

  if (!currentOrganization) return <PageLoader />;

  if (!currentFarm) {
    return (
      <>
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
            { icon: Package, label: t('workers.pieceWork.title', 'Travail à la pièce'), isActive: true },
          ]}
          title={t('workers.pieceWork.title', 'Travail à la pièce')}
          subtitle={t('workers.pieceWork.description', 'Suivi du travail par unités (arbres, caisses, kg...)')}
        />
        <div className="p-6">
          <Card className="p-6 text-center">
            <p className="text-gray-500">{t('workers.pieceWork.selectFarm', 'Veuillez sélectionner une ferme pour voir les enregistrements.')}</p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          { icon: Package, label: t('workers.pieceWork.title', 'Travail à la pièce'), isActive: true },
        ]}
        title={t('workers.pieceWork.title', 'Travail à la pièce')}
        subtitle={t('workers.pieceWork.description', 'Suivi du travail par unités (arbres, caisses, kg...)')}
        actions={<PieceWorkEntry />}
      />

      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 space-y-6">
        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{t('common.filters', 'Filtres')} :</span>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">{t('workers.pieceWork.startDate', 'Date début')}</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">{t('workers.pieceWork.endDate', 'Date fin')}</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">{t('workers.pieceWork.paymentStatus', 'Statut paiement')}</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('workers.pieceWork.allStatuses', 'Tous les statuts')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('workers.pieceWork.allStatuses', 'Tous les statuts')}</SelectItem>
                    <SelectItem value="pending">{t('workers.pieceWork.status.pending', 'En attente')}</SelectItem>
                    <SelectItem value="approved">{t('workers.pieceWork.status.approved', 'Approuvé')}</SelectItem>
                    <SelectItem value="paid">{t('workers.pieceWork.status.paid', 'Payé')}</SelectItem>
                    <SelectItem value="disputed">{t('workers.pieceWork.status.disputed', 'Contesté')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
              }}
            >
              <Calendar className="h-4 w-4 mr-1" />
              {t('workers.pieceWork.thisMonth', 'Ce mois')}
            </Button>
          </div>
        </Card>

        {/* List */}
        <PieceWorkList filters={filters} />
      </div>
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/workers/piece-work')({
  component: withRouteProtection(PieceWorkPage, 'read', 'Worker'),
});
