import { useTranslation } from 'react-i18next';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RefreshCw,
  Building2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ComplianceChecksList } from '@/components/compliance/ComplianceChecksList';
import { CreateCertificationDialog } from '@/components/compliance/CreateCertificationDialog';
import { ComplianceChecklistDialog } from '@/components/compliance/ComplianceChecklistDialog';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLayout } from '@/components/PageLayout';

import { useComplianceDashboard, useCorrectiveActionStats } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import { CertificationType } from '@/lib/api/compliance';

export const Route = createFileRoute('/_authenticated/compliance/')({
  component: ComplianceDashboardPage,
});

function ComplianceDashboardPage() {
  const { t } = useTranslation('compliance');
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  const { data: stats, isLoading } = useComplianceDashboard(orgId);
  const { data: capStats } = useCorrectiveActionStats(orgId);

  return (
    <PageLayout
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization?.name || '', path: '/dashboard' },
            { icon: ShieldCheck, label: t('breadcrumb.complianceCertifications'), isActive: true },
          ]}
          title={t('dashboard.title')}
          subtitle={t('dashboard.subtitle')}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/compliance/certifications">
                  {t('dashboard.manageCertifications')}
                </Link>
              </Button>
              <CreateCertificationDialog />
            </div>
          }
        />
      }
    >
    <div className="container mx-auto px-4 py-6 space-y-8">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.globalScore')}
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.checks.average_score ? Math.round(stats.checks.average_score) : 0}%
            </div>
            <Progress 
              value={stats?.checks.average_score || 0} 
              className="h-2 mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t('dashboard.averageRecentChecks')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.activeCertifications')}
            </CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.certifications.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.outOfTotal', { total: stats?.certifications.total || 0 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.expiringSoon')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.certifications.expiring_soon || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.inNext30Days')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.nonCompliances')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.checks.non_compliant_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.pointsNeedingAttention')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Checks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">{t('dashboard.recentChecks')}</h2>
          <Button variant="ghost" size="sm" className="gap-1" asChild>
            <Link to="/compliance/checks">
              {t('dashboard.viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <ComplianceChecksList 
          checks={stats?.checks.recent || []} 
          isLoading={isLoading} 
        />
      </div>

      {/* Corrective Actions Summary */}
      {capStats && capStats.total > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg">{t('dashboard.correctiveActions')}</CardTitle>
                <Badge variant="secondary">{capStats.total}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="gap-1" asChild>
                <Link to="/compliance/corrective-actions">
                  {t('dashboard.viewAll')} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-lg font-bold">{capStats.open}</div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.open')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-lg font-bold">{capStats.in_progress}</div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.inProgress')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-lg font-bold text-red-600">{capStats.overdue}</div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.overdue')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-lg font-bold">{Math.round(capStats.resolution_rate)}%</div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.resolutionRate')}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions / Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.auditPreparation')}</CardTitle>
            <CardDescription>
              {t('dashboard.auditPreparationDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{t('dashboard.phytosanitaryRegister')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{t('dashboard.waterAnalysis')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>{t('dashboard.workerSafetyTraining')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{t('dashboard.wasteManagementPlan')}</span>
              </div>
            </div>
            <div className="mt-4">
              <ComplianceChecklistDialog defaultCertificationType={CertificationType.GLOBALGAP} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">{t('dashboard.needHelp')}</CardTitle>
            <CardDescription>
              {t('dashboard.needHelpDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.needHelpDetails')}
            </p>
            <Button>{t('dashboard.contactExpert')}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </PageLayout>
  );
}
