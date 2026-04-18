import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { usePestReports } from '@/hooks/usePestAlerts';
import { useAuth } from '@/hooks/useAuth';
import { PestReportsList } from '@/components/pest-alerts/PestReportsList';
import { CreatePestReportDialog } from '@/components/pest-alerts/CreatePestReportDialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/radix-select';
import { FilterBar, ListPageHeader, ListPageLayout } from '@/components/ui/data-table';
import { Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_authenticated/pest-alerts/')({
  component: PestAlertsPage,
});

function PestAlertsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { data: reports, isLoading } = usePestReports(currentOrganization?.id || null);
  
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredReports = reports?.filter(report => {
    const matchesSearch = 
      report.pest_disease?.name.toLowerCase().includes(search.toLowerCase()) ||
      report.notes?.toLowerCase().includes(search.toLowerCase()) ||
      report.farm?.name.toLowerCase().includes(search.toLowerCase()) ||
      report.parcel?.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesStatus;
  }) || [];

  const activeAlertsCount = reports?.filter(r => r.status === 'pending' || r.status === 'verified').length || 0;
  const criticalAlertsCount = reports?.filter(r => r.severity === 'critical' && (r.status === 'pending' || r.status === 'verified')).length || 0;
  const resolvedCount = reports?.filter(r => r.status === 'resolved').length || 0;

  return (
    <div className="container mx-auto py-6 space-y-8">
      <ListPageLayout
        header={
          <ListPageHeader
            variant="shell"
            actions={<CreatePestReportDialog />}
          />
        }
        stats={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-300">
                  {t('ai.pestAlerts.activeAlerts', 'Alertes Actives')}
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{activeAlertsCount}</div>
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  {t('ai.pestAlerts.needAttention', 'Nécessitent une attention')}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">
                  {t('ai.pestAlerts.critical', 'Critiques')}
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">{criticalAlertsCount}</div>
                <p className="text-xs text-red-700 dark:text-red-400">
                  {t('ai.pestAlerts.immediatePriority', 'Priorité immédiate')}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300">
                  {t('ai.pestAlerts.resolved30d', 'Résolus (30j)')}
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">{resolvedCount}</div>
                <p className="text-xs text-green-700 dark:text-green-400">
                  {t('ai.pestAlerts.treatedSuccessfully', 'Traités avec succès')}
                </p>
              </CardContent>
            </Card>
          </div>
        }
        filters={
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <FilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder={t('ai.pestAlerts.searchPlaceholder', 'Rechercher par ravageur, ferme, parcelle...')}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder={t('ai.pestAlerts.severity', 'Sévérité')} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('ai.pestAlerts.allSeverities', 'Toutes sévérités')}</SelectItem>
                  <SelectItem value="low">{t('ai.pestAlerts.low', 'Faible')}</SelectItem>
                  <SelectItem value="medium">{t('ai.pestAlerts.medium', 'Moyenne')}</SelectItem>
                  <SelectItem value="high">{t('ai.pestAlerts.high', 'Élevée')}</SelectItem>
                  <SelectItem value="critical">{t('ai.pestAlerts.criticalSeverity', 'Critique')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('ai.pestAlerts.status', 'Statut')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('ai.pestAlerts.allStatuses', 'Tous statuts')}</SelectItem>
                  <SelectItem value="pending">{t('ai.pestAlerts.pending', 'En attente')}</SelectItem>
                  <SelectItem value="verified">{t('ai.pestAlerts.verified', 'Vérifié')}</SelectItem>
                  <SelectItem value="treated">{t('ai.pestAlerts.treated', 'Traité')}</SelectItem>
                  <SelectItem value="resolved">{t('ai.pestAlerts.resolved', 'Résolu')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      >
        <PestReportsList reports={filteredReports} isLoading={isLoading} />
      </ListPageLayout>
    </div>
  );
}
