import { createFileRoute, Link } from '@tanstack/react-router';
import { 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ComplianceChecksList } from '@/components/compliance/ComplianceChecksList';
import { CreateCertificationDialog } from '@/components/compliance/CreateCertificationDialog';

import { useComplianceDashboard } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';

export const Route = createFileRoute('/_authenticated/compliance/')({
  component: ComplianceDashboardPage,
});

function ComplianceDashboardPage() {
  const { currentOrganization } = useAuth();
  const { data: stats, isLoading } = useComplianceDashboard(currentOrganization?.id || null);

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Conformité & Certifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos certifications, audits et contrôles de conformité.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/compliance/certifications">
              Gérer les certifications
            </Link>
          </Button>
          <CreateCertificationDialog />
        </div>
      </div>

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
            <Button className="w-full mt-4" variant="secondary">
              Voir la checklist complète
            </Button>
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
  );
}
