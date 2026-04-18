
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Bug, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  FlaskConical
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PestReportResponseDto, PestReportSeverity, PestReportStatus } from '@/lib/api/pest-alerts';
import { Link } from '@tanstack/react-router';

interface PestAlertCardProps {
  report: PestReportResponseDto;
}

const severityColors: Record<PestReportSeverity, "default" | "secondary" | "destructive" | "outline"> = {
  low: 'secondary',
  medium: 'outline', // Yellowish usually, but using outline for now or custom class
  high: 'default', // Orange-ish
  critical: 'destructive',
};

const severityLabels: Record<PestReportSeverity, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
  critical: 'Critique',
};

const statusLabels: Record<PestReportStatus, string> = {
  pending: 'En attente',
  verified: 'Vérifié',
  treated: 'Traité',
  resolved: 'Résolu',
  dismissed: 'Rejeté',
};

const statusColors: Record<PestReportStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  verified: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  treated: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  dismissed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export const PestAlertCard = ({ report }: PestAlertCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow border-l-4" style={{
      borderLeftColor: report.severity === 'critical' ? '#ef4444' : 
                       report.severity === 'high' ? '#f97316' : 
                       report.severity === 'medium' ? '#eab308' : '#3b82f6'
    }}>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Badge variant={severityColors[report.severity]} className="capitalize">
              {severityLabels[report.severity]}
            </Badge>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[report.status]}`}>
              {statusLabels[report.status]}
            </span>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(report.created_at), 'dd MMM yyyy', { locale: fr })}
          </span>
        </div>
        <h3 className="font-semibold text-lg mt-2 flex items-center gap-2">
          {report.pest_disease?.type === 'disease' ? (
            <FlaskConical className="h-5 w-5 text-purple-500" />
          ) : (
            <Bug className="h-5 w-5 text-amber-600" />
          )}
          {report.pest_disease?.name || 'Ravageur non identifié'}
        </h3>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            {report.farm?.name} • {report.parcel?.name}
          </span>
        </div>
        
        {report.notes && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {report.notes}
          </p>
        )}

        {report.photo_urls && report.photo_urls.length > 0 && (
          <div className="flex gap-2 mt-2 overflow-hidden">
            {report.photo_urls.slice(0, 3).map((url) => (
              <div key={url} className="h-12 w-12 rounded-md overflow-hidden bg-gray-100 border">
                <img src={url} alt="Preuve" className="h-full w-full object-cover" />
              </div>
            ))}
            {report.photo_urls.length > 3 && (
              <div className="h-12 w-12 rounded-md bg-gray-100 border flex items-center justify-center text-xs text-gray-500 font-medium">
                +{report.photo_urls.length - 3}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 bg-gray-50/50 dark:bg-gray-900/20 flex justify-end">
        <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
          <Link to={`/pest-alerts/${report.id}`}>
            Voir détails <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
