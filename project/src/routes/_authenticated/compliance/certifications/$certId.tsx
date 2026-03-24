import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { 
  ArrowLeft, 
  Calendar, 
  Award, 
  Building, 
  FileText, 
  Trash2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComplianceChecksList } from '@/components/compliance/ComplianceChecksList';
import { EditCertificationDialog } from '@/components/compliance/EditCertificationDialog';
import { CreateComplianceCheckDialog } from '@/components/compliance/CreateComplianceCheckDialog';
import { AddDocumentDialog } from '@/components/compliance/AddDocumentDialog';
import { ScheduleAuditDialog } from '@/components/compliance/ScheduleAuditDialog';
import { CorrectiveActionsList } from '@/components/compliance/CorrectiveActionsList';
import { CreateCorrectiveActionDialog } from '@/components/compliance/CreateCorrectiveActionDialog';
import { UpdateActionStatusDialog } from '@/components/compliance/UpdateActionStatusDialog';

import {
  useCertification,
  useComplianceChecks,
  useDeleteCertification,
  useCorrectiveActions,
  useDeleteCorrectiveAction,
} from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { CertificationStatus, type CorrectiveActionPlanResponseDto } from '@/lib/api/compliance';

export const Route = createFileRoute('/_authenticated/compliance/certifications/$certId')({
  component: CertificationDetailPage,
});

function CertificationDetailPage() {
  const { t } = useTranslation('compliance');
  const { certId } = Route.useParams();
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  const { data: certification, isLoading: isLoadingCert } = useCertification(orgId, certId);
  const { data: checks, isLoading: isLoadingChecks } = useComplianceChecks(orgId);
  const { data: correctiveActions, isLoading: isLoadingActions } = useCorrectiveActions(orgId, { certification_id: certId });
  const deleteCertification = useDeleteCertification();
  const deleteCorrectiveAction = useDeleteCorrectiveAction();

  const [selectedAction, setSelectedAction] = useState<CorrectiveActionPlanResponseDto | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  const certificationChecks = checks?.filter(check => check.certification_id === certId) || [];
  const certCorrectiveActions = correctiveActions || [];

  if (isLoadingCert) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main content skeleton */}
          <div className="md:col-span-2 space-y-6">
            {/* Details card */}
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div>
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              </div>
            </div>
            {/* Checks table skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-44" />
              <div className="rounded-md border">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6 space-y-4">
              <Skeleton className="h-6 w-36" />
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-900/20 p-6 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-full rounded-md mt-2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!certification) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <h2 className="text-xl font-bold">{t('certifications.certificationNotFound')}</h2>
        <Button asChild className="mt-4">
          <Link to="/compliance/certifications">{t('certifications.backToList')}</Link>
        </Button>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm(t('certifications.deleteCertificationConfirm'))) {
      if (!currentOrganization) return;
      deleteCertification.mutate(
        { organizationId: currentOrganization.id, certificationId: certId },
        {
          onSuccess: () => {
            navigate({ to: '/compliance/certifications' });
          }
        }
      );
    }
  };

  const handleDownloadDocument = (url: string) => {
    window.open(url, '_blank');
  };

  const getStatusVariant = (status: CertificationStatus) => {
    switch (status) {
      case CertificationStatus.ACTIVE:
        return 'default';
      case CertificationStatus.EXPIRED:
        return 'destructive';
      case CertificationStatus.PENDING_RENEWAL:
        return 'secondary';
      case CertificationStatus.SUSPENDED:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: CertificationStatus) => {
    switch (status) {
      case CertificationStatus.ACTIVE:
        return t('status.active');
      case CertificationStatus.EXPIRED:
        return t('status.expired');
      case CertificationStatus.PENDING_RENEWAL:
        return t('status.pendingRenewal');
      case CertificationStatus.SUSPENDED:
        return t('status.suspended');
      default:
        return status;
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
              <Badge variant={getStatusVariant(certification.status)}>
                {getStatusLabel(certification.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {certification.certification_number}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleDelete} 
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={deleteCertification.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('certifications.delete')}
          </Button>
          <EditCertificationDialog certification={certification} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('certifications.certificationDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t('certifications.issuingBody')}</p>
                    <p className="text-sm text-muted-foreground">{certification.issuing_body}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t('certifications.validityPeriod')}</p>
                    <p className="text-sm text-muted-foreground">
                      Du {format(new Date(certification.issued_date), 'dd MMM yyyy', { locale: fr })} au {format(new Date(certification.expiry_date), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:col-span-2">
                  <Award className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t('certifications.scope')}</p>
                    <p className="text-sm text-muted-foreground">{certification.scope || t('certifications.notSpecified')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('certifications.complianceChecks')}</h2>
              <CreateComplianceCheckDialog certificationId={certId} />
            </div>
            <ComplianceChecksList checks={certificationChecks} isLoading={isLoadingChecks} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
                <h2 className="text-xl font-semibold">{t('correctiveActions.title')}</h2>
                {certCorrectiveActions.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {certCorrectiveActions.length}
                  </Badge>
                )}
              </div>
              {certificationChecks.length > 0 && (
                <CreateCorrectiveActionDialog
                  certificationId={certId}
                  complianceCheckId={certificationChecks[0].id}
                />
              )}
            </div>
            <CorrectiveActionsList
              actions={certCorrectiveActions}
              isLoading={isLoadingActions}
              onUpdateStatus={(action) => {
                setSelectedAction(action);
                setShowUpdateDialog(true);
              }}
              onDelete={(action) => {
                if (!currentOrganization) return;
                if (confirm(t('correctiveActions.deleteShortConfirm'))) {
                  deleteCorrectiveAction.mutate({
                    organizationId: currentOrganization.id,
                    actionId: action.id,
                  });
                }
              }}
            />
          </div>

          {selectedAction && (
            <UpdateActionStatusDialog
              action={selectedAction}
              open={showUpdateDialog}
              onOpenChange={(open) => {
                setShowUpdateDialog(open);
                if (!open) setSelectedAction(null);
              }}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('certifications.documentsAndEvidence')}</CardTitle>
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleDownloadDocument(doc.url)}
                        title={t('certifications.openDocument')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-md">
                  {t('certifications.noDocuments')}
                </div>
              )}
              <div className="mt-4">
                <AddDocumentDialog certification={certification} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-800 dark:text-blue-300 text-sm">{t('certifications.nextAudit')}</CardTitle>
            </CardHeader>
            <CardContent>
              {certification.audit_schedule?.next_audit_date ? (
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {format(new Date(certification.audit_schedule.next_audit_date), 'dd MMM yyyy', { locale: fr })}
                  </div>
                  {certification.audit_schedule.auditor_name && (
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      {t('certifications.auditor') + ':'} {certification.audit_schedule.auditor_name}
                    </p>
                  )}
                  {certification.audit_schedule.audit_frequency && (
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      {t('certifications.frequency') + ':'} {certification.audit_schedule.audit_frequency}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {t('certifications.noAuditScheduled')}
                </p>
              )}
              <div className="mt-4">
                <ScheduleAuditDialog certification={certification} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
