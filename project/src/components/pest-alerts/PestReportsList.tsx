import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Bug } from 'lucide-react';
import { PestAlertCard } from './PestAlertCard';
import { FilterBar, ResponsiveList, type StatusFilterOption } from '@/components/ui/data-table';
import type { PestReportResponseDto, PestReportStatus } from '@/lib/api/pest-alerts';

interface PestReportsListProps {
  reports: PestReportResponseDto[];
  isLoading: boolean;
  searchValue?: string;
  statusFilter?: PestReportStatus | 'all';
  onSearchChange?: (value: string) => void;
  onStatusFilter?: (status: PestReportStatus | 'all') => void;
}

const STATUS_LABELS: Record<PestReportStatus, string> = {
  pending: 'En attente',
  verified: 'Vérifié',
  treated: 'Traité',
  resolved: 'Résolu',
  dismissed: 'Rejeté',
};

const SEVERITY_LABELS = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
  critical: 'Critique',
} as const;

export const PestReportsList = ({
  reports,
  isLoading,
  searchValue,
  statusFilter,
  onSearchChange,
  onStatusFilter,
}: PestReportsListProps) => {
  const { t } = useTranslation();
  const [internalSearch, setInternalSearch] = useState('');
  const [internalStatus, setInternalStatus] = useState<PestReportStatus | 'all'>('all');

  const currentSearch = searchValue ?? internalSearch;
  const currentStatus = statusFilter ?? internalStatus;

  const handleSearchChange = (value: string) => {
    onSearchChange?.(value);
    if (searchValue === undefined) {
      setInternalSearch(value);
    }
  };

  const handleStatusChange = (status: string) => {
    const nextStatus = status as PestReportStatus | 'all';

    onStatusFilter?.(nextStatus);
    if (statusFilter === undefined) {
      setInternalStatus(nextStatus);
    }
  };

  const visibleReports = useMemo(() => {
    const normalizedSearch = currentSearch.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        report.pest_disease?.name?.toLowerCase().includes(normalizedSearch) ||
        report.notes?.toLowerCase().includes(normalizedSearch) ||
        report.farm?.name?.toLowerCase().includes(normalizedSearch) ||
        report.parcel?.name?.toLowerCase().includes(normalizedSearch);

      const matchesStatus = currentStatus === 'all' || report.status === currentStatus;

      return matchesSearch && matchesStatus;
    });
  }, [currentSearch, currentStatus, reports]);

  const statusFilters: StatusFilterOption[] = [
    { value: 'all', label: t('pestAlerts.filters.status.all', 'Tous') },
    { value: 'pending', label: t('pestAlerts.status.pending', 'En attente') },
    { value: 'verified', label: t('pestAlerts.status.verified', 'Vérifié') },
    { value: 'treated', label: t('pestAlerts.status.treated', 'Traité') },
    { value: 'resolved', label: t('pestAlerts.status.resolved', 'Résolu') },
    { value: 'dismissed', label: t('pestAlerts.status.dismissed', 'Rejeté') },
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={currentSearch}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t(
          'pestAlerts.filters.searchPlaceholder',
          'Rechercher par ravageur, maladie, ferme ou parcelle...',
        )}
        statusFilters={statusFilters}
        activeStatus={currentStatus}
        onStatusChange={handleStatusChange}
      />

      <ResponsiveList
        items={visibleReports}
        isLoading={isLoading}
        keyExtractor={(report) => report.id}
        emptyIcon={Bug}
        emptyTitle={t('pestAlerts.list.emptyTitle', 'Aucun signalement')}
        emptyMessage={t(
          'pestAlerts.list.emptyDescription',
          "Il n'y a pas encore de signalements de ravageurs ou maladies pour cette période.",
        )}
        renderCard={(report) => <PestAlertCard report={report} />}
        renderTableHeader={
          <tr>
            <th className="px-4 xl:px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('pestAlerts.table.severity', 'Sévérité')}
            </th>
            <th className="px-4 xl:px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('pestAlerts.table.name', 'Ravageur / maladie')}
            </th>
            <th className="px-4 xl:px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('pestAlerts.table.status', 'Statut')}
            </th>
            <th className="px-4 xl:px-6 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('pestAlerts.table.date', 'Date')}
            </th>
          </tr>
        }
        renderTable={(report) => (
          <>
            <td className="px-4 xl:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {SEVERITY_LABELS[report.severity]}
            </td>
            <td className="px-4 xl:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
              {report.pest_disease?.name ?? t('pestAlerts.table.unknownPest', 'Ravageur non identifié')}
            </td>
            <td className="px-4 xl:px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {STATUS_LABELS[report.status]}
            </td>
            <td className="px-4 xl:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(report.created_at), 'dd MMM yyyy', { locale: fr })}
            </td>
          </>
        )}
      />
    </div>
  );
};
