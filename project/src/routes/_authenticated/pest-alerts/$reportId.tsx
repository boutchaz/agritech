import React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { usePestReport, useUpdatePestReport, useEscalatePestReport } from '@/hooks/usePestAlerts';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  AlertTriangle, 
  FlaskConical, 
  Bug,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { PestReportStatus, PestReportSeverity } from '@/lib/api/pest-alerts';

export const Route = createFileRoute('/_authenticated/pest-alerts/$reportId')({
  component: PestReportDetailPage,
});

const severityColors: Record<PestReportSeverity, "default" | "secondary" | "destructive" | "outline"> = {
  low: 'secondary',
  medium: 'outline',
  high: 'default',
  critical: 'destructive',
};

const statusColors: Record<PestReportStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  verified: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  treated: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  dismissed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function PestReportDetailPage() {
  const params = Route.useParams() as { reportId: string };
  const { reportId } = params;
  const { currentOrganization } = useAuth();
  const { data: report, isLoading } = usePestReport(currentOrganization?.id || null, reportId);
  const { mutate: updateReport, isPending: isUpdating } = useUpdatePestReport();
  const { mutate: escalateReport, isPending: isEscalating } = useEscalatePestReport();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-semibold">Rapport non trouvé</h3>
          <Button variant="link" asChild className="mt-4">
            <Link to="/pest-alerts">Retour à la liste</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleStatusChange = (newStatus: string) => {
    if (!currentOrganization?.id) return;
    updateReport({
      organizationId: currentOrganization.id,
      reportId,
      data: { status: newStatus as PestReportStatus },
    });
  };

  const handleEscalate = () => {
    if (!currentOrganization?.id) return;
    escalateReport({
      organizationId: currentOrganization.id,
      reportId,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/pest-alerts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {report.pest_disease?.name || 'Ravageur non identifié'}
            <Badge variant={severityColors[report.severity]} className="ml-2 capitalize">
              {report.severity}
            </Badge>
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
              {report.status}
            </span>
            <span>•</span>
            <span>Signalé le {format(new Date(report.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Select 
            value={report.status} 
            onValueChange={handleStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Changer le statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="verified">Vérifié</SelectItem>
              <SelectItem value="treated">Traité</SelectItem>
              <SelectItem value="resolved">Résolu</SelectItem>
              <SelectItem value="dismissed">Rejeté</SelectItem>
            </SelectContent>
          </Select>

          {report.severity !== 'critical' && report.status !== 'resolved' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isEscalating}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Escalader
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Escalader en alerte critique ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action va créer une alerte de performance critique pour toute l'organisation et notifier les administrateurs.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEscalate} className="bg-red-600 hover:bg-red-700">
                    {isEscalating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirmer l'escalade
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Détails du signalement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Ferme</span>
                  <div className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {report.farm?.name}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Parcelle</span>
                  <div className="font-medium">{report.parcel?.name}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Méthode de détection</span>
                  <div className="font-medium capitalize">{report.detection_method?.replace('_', ' ')}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Surface affectée</span>
                  <div className="font-medium">{report.affected_area_percentage ? `${report.affected_area_percentage}%` : 'Non spécifié'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Signalé par</span>
                  <div className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {report.reporter?.first_name} {report.reporter?.last_name}
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Notes / Observations</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {report.notes || 'Aucune note'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle>Photos ({report.photo_urls?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {report.photo_urls && report.photo_urls.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {report.photo_urls.map((url, idx) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border bg-gray-100">
                      <img src={url} alt={`Preuve ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Aucune photo jointe
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {report.pest_disease && (
            <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  {report.pest_disease.type === 'disease' ? <FlaskConical className="h-5 w-5" /> : <Bug className="h-5 w-5" />}
                  Info {report.pest_disease.type === 'disease' ? 'Maladie' : 'Ravageur'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <span className="font-semibold text-blue-900 dark:text-blue-200">Symptômes:</span>
                  <p className="text-blue-800 dark:text-blue-300 mt-1">{report.pest_disease.symptoms}</p>
                </div>
                <div>
                  <span className="font-semibold text-blue-900 dark:text-blue-200">Traitement recommandé:</span>
                  <p className="text-blue-800 dark:text-blue-300 mt-1">{report.pest_disease.treatment}</p>
                </div>
                <div>
                  <span className="font-semibold text-blue-900 dark:text-blue-200">Prévention:</span>
                  <p className="text-blue-800 dark:text-blue-300 mt-1">{report.pest_disease.prevention}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <p className="text-sm font-medium">Signalement créé</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(report.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</p>
                </div>
                {report.verified_at && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-blue-500" />
                    <p className="text-sm font-medium">Vérifié par {report.verifier?.first_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(report.verified_at), 'dd MMM yyyy HH:mm', { locale: fr })}</p>
                  </div>
                )}
                {report.treatment_date && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-green-500" />
                    <p className="text-sm font-medium">Traitement appliqué</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(report.treatment_date), 'dd MMM yyyy HH:mm', { locale: fr })}</p>
                    <p className="text-xs text-gray-600 mt-1">{report.treatment_applied}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
