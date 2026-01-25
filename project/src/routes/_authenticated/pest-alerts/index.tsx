import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { usePestReports } from '@/hooks/usePestAlerts';
import { useAuth } from '@/hooks/useAuth';
import { PestReportsList } from '@/components/pest-alerts/PestReportsList';
import { CreatePestReportDialog } from '@/components/pest-alerts/CreatePestReportDialog';
import { Input } from '@/components/ui/Input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/radix-select';
import { Search, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_authenticated/pest-alerts/')({
  component: PestAlertsPage,
});

function PestAlertsPage() {
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Alertes Ravageurs & Maladies
          </h1>
          <p className="text-muted-foreground mt-1">
            Surveillez et gérez les menaces sanitaires de vos cultures.
          </p>
        </div>
        <CreatePestReportDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-300">
              Alertes Actives
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{activeAlertsCount}</div>
            <p className="text-xs text-orange-700 dark:text-orange-400">
              Nécessitent une attention
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">
              Critiques
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900 dark:text-red-100">{criticalAlertsCount}</div>
            <p className="text-xs text-red-700 dark:text-red-400">
              Priorité immédiate
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300">
              Résolus (30j)
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{resolvedCount}</div>
            <p className="text-xs text-green-700 dark:text-green-400">
              Traités avec succès
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par ravageur, ferme, parcelle..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Sévérité" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes sévérités</SelectItem>
              <SelectItem value="low">Faible</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="high">Élevée</SelectItem>
              <SelectItem value="critical">Critique</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="verified">Vérifié</SelectItem>
              <SelectItem value="treated">Traité</SelectItem>
              <SelectItem value="resolved">Résolu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      <PestReportsList reports={filteredReports} isLoading={isLoading} />
    </div>
  );
}
