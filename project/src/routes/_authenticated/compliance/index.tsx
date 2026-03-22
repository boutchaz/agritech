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
            { icon: ShieldCheck, label: 'Conformité & Certifications', isActive: true },
          ]}
          title="Conformité & Certifications"
          subtitle="Gérez vos certifications, audits et contrôles de conformité."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/compliance/certifications">
                  Gérer les certifications
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
              Score Global
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
              Moyenne des derniers contrôles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Certifications Actives
            </CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.certifications.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              Sur {stats?.certifications.total || 0} certifications totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expirent Bientôt
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.certifications.expiring_soon || 0}</div>
            <p className="text-xs text-muted-foreground">
              Dans les 30 prochains jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Non-conformités
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.checks.non_compliant_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Points nécessitant attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Checks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Derniers Contrôles</h2>
          <Button variant="ghost" size="sm" className="gap-1">
            Voir tout <ArrowRight className="h-4 w-4" />
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
                <CardTitle className="text-lg">Actions Correctives</CardTitle>
                <Badge variant="secondary">{capStats.total}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="gap-1" asChild>
                <Link to="/compliance/corrective-actions">
                  Voir tout <ArrowRight className="h-4 w-4" />
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
                  <div className="text-xs text-muted-foreground">Ouvertes</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-lg font-bold">{capStats.in_progress}</div>
                  <div className="text-xs text-muted-foreground">En cours</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-lg font-bold text-red-600">{capStats.overdue}</div>
                  <div className="text-xs text-muted-foreground">En retard</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-lg font-bold">{Math.round(capStats.resolution_rate)}%</div>
                  <div className="text-xs text-muted-foreground">Taux de résolution</div>
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
            <CardTitle>Préparation Audit</CardTitle>
            <CardDescription>
              Liste des documents requis pour votre prochain audit GlobalGAP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Registre phytosanitaire à jour</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Analyses d'eau (moins de 6 mois)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>Formation sécurité des travailleurs</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Plan de gestion des déchets</span>
              </div>
            </div>
            <div className="mt-4">
              <ComplianceChecklistDialog defaultCertificationType={CertificationType.GLOBALGAP} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Besoin d'aide ?</CardTitle>
            <CardDescription>
              Nos experts peuvent vous accompagner dans vos démarches de certification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Obtenez un pré-audit blanc ou une assistance pour la mise en conformité de vos parcelles.
            </p>
            <Button>Contacter un expert</Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </PageLayout>
  );
}
