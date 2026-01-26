import { createFileRoute, Link } from '@tanstack/react-router';
import { 
  ArrowLeft, 
  Calendar, 
  Award, 
  Building, 
  FileText, 
  Download,
  Trash2,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComplianceChecksList } from '@/components/compliance/ComplianceChecksList';

import { useCertification, useComplianceChecks, useDeleteCertification } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { CertificationStatus } from '@/lib/api/compliance';

export const Route = createFileRoute('/_authenticated/compliance/certifications/$certId')({
  component: CertificationDetailPage,
});

function CertificationDetailPage() {
  const { certId } = Route.useParams();
  const { currentOrganization } = useAuth();
  const { data: certification, isLoading: isLoadingCert } = useCertification(currentOrganization?.id || null, certId);
  const { data: checks, isLoading: isLoadingChecks } = useComplianceChecks(currentOrganization?.id || null);
  const deleteCertification = useDeleteCertification();

  // Filter checks for this certification
  const certificationChecks = checks?.filter(check => check.certification_id === certId) || [];

  if (isLoadingCert) {
    return <div className="container mx-auto px-4 py-6">Chargement...</div>;
  }

  if (!certification) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <h2 className="text-xl font-bold">Certification introuvable</h2>
        <Button asChild className="mt-4">
          <Link to="/compliance/certifications">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette certification ?')) {
      if (!currentOrganization) return;
      deleteCertification.mutate(
        { organizationId: currentOrganization.id, certificationId: certId },
        {
          onSuccess: () => {
            window.history.back();
          }
        }
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/compliance/certifications">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {certification.certification_type}
              </h1>
              <Badge variant={certification.status === CertificationStatus.ACTIVE ? 'default' : 'secondary'}>
                {certification.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {certification.certification_number}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Détails de la certification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Organisme certificateur</p>
                    <p className="text-sm text-muted-foreground">{certification.issuing_body}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Période de validité</p>
                    <p className="text-sm text-muted-foreground">
                      Du {format(new Date(certification.issued_date), 'dd MMM yyyy', { locale: fr })} au {format(new Date(certification.expiry_date), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Portée (Scope)</p>
                    <p className="text-sm text-muted-foreground">{certification.scope || 'Non spécifié'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Contrôles de conformité</h2>
              <Button variant="outline" size="sm">
                Nouveau contrôle
              </Button>
            </div>
            <ComplianceChecksList checks={certificationChecks} isLoading={isLoadingChecks} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documents & Preuves</CardTitle>
            </CardHeader>
            <CardContent>
              {certification.documents && certification.documents.length > 0 ? (
                <div className="space-y-2">
                  {certification.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm truncate">{doc.type}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-md">
                  Aucun document associé
                </div>
              )}
              <Button variant="outline" className="w-full mt-4">
                Ajouter un document
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-800 dark:text-blue-300 text-sm">Prochain Audit</CardTitle>
            </CardHeader>
            <CardContent>
              {certification.audit_schedule?.next_audit_date ? (
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {format(new Date(certification.audit_schedule.next_audit_date), 'dd MMM', { locale: fr })}
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Auditeur: {certification.audit_schedule.auditor_name || 'Non assigné'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Aucun audit planifié
                </p>
              )}
              <Button size="sm" className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white border-none">
                Planifier
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
