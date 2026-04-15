import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute, Link } from '@tanstack/react-router';
import { format, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import { ar, enUS, fr, type Locale } from 'date-fns/locale';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RefreshCw,
  Building2,
  Calendar,
  Mail,
  MessageCircle,
  ChevronRight,
  FileText,
  ListChecks,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreateCertificationDialog } from '@/components/compliance/CreateCertificationDialog';
import { ComplianceChecklistDialog } from '@/components/compliance/ComplianceChecklistDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, StatCardSkeleton } from '@/components/ui/skeleton';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLayout } from '@/components/PageLayout';

import {
  useComplianceDashboard,
  useCorrectiveActionStats,
  useCertifications,
} from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import {
  CertificationType,
  CertificationStatus,
  type CertificationResponseDto,
  type ComplianceCheckResponseDto,
} from '@/lib/api/compliance';

import { ModuleGate } from '@/components/authorization/ModuleGate';

function ComplianceDashboardGuarded() {
  return (
    <ModuleGate moduleSlug="compliance" moduleName="Conformité & Certifications">
      <ComplianceDashboardPage />
    </ModuleGate>
  );
}

export const Route = createFileRoute('/_authenticated/compliance/')({
  component: ComplianceDashboardGuarded,
});

const dateLocales: Record<string, Locale> = { fr, en: enUS, ar };

function ComplianceDashboardPage() {
  const { t, i18n } = useTranslation('compliance');
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  const { data: stats, isLoading } = useComplianceDashboard(orgId);
  const { data: capStats, isLoading: isLoadingCaps } = useCorrectiveActionStats(orgId);
  const { data: certifications } = useCertifications(orgId);

  const locale = dateLocales[i18n.language.split('-')[0]] || enUS;

  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);

  // Compute expiring certifications for "Next 30 days" strip
  const expiringCerts = useMemo(() => {
    if (!certifications) return [];
    return certifications
      .filter((c) => {
        const expiry = new Date(c.expiry_date);
        return (
          c.status === CertificationStatus.ACTIVE &&
          isAfter(expiry, now) &&
          isBefore(expiry, thirtyDaysFromNow)
        );
      })
      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
  }, [certifications, now, thirtyDaysFromNow]);

  // Compute upcoming audits from certifications with audit_schedule
  const upcomingAudits = useMemo(() => {
    if (!certifications) return [];
    return certifications
      .filter((c) => {
        const auditDate = c.audit_schedule?.next_audit_date;
        if (!auditDate) return false;
        const d = new Date(auditDate);
        return isAfter(d, now) && isBefore(d, thirtyDaysFromNow);
      })
      .sort(
        (a, b) =>
          new Date(a.audit_schedule!.next_audit_date!).getTime() -
          new Date(b.audit_schedule!.next_audit_date!).getTime()
      );
  }, [certifications, now, thirtyDaysFromNow]);

  const hasAnyCertifications = stats ? stats.certifications.total > 0 : undefined;
  const hasAttentionItems =
    (stats?.certifications.expiring_soon || 0) > 0 ||
    (stats?.checks.non_compliant_count || 0) > 0 ||
    (capStats?.overdue || 0) > 0;

  // ---------- FULL-PAGE ONBOARDING EMPTY STATE ----------
  if (!isLoading && hasAnyCertifications === false) {
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
          />
        }
      >
        <div className="container mx-auto px-4 py-12">
          <EmptyState
            variant="full-page"
            icon={ShieldCheck}
            title={t('dashboard.emptyTitle', 'Bienvenue dans la conformité')}
            description={t(
              'dashboard.emptyDesc',
              'Commencez par ajouter votre première certification (GLOBALG.A.P, BIO, ISO...) pour suivre vos audits, contrôles et actions correctives.'
            )}
          />
          <div className="flex justify-center mt-4">
            <CreateCertificationDialog />
          </div>
        </div>
      </PageLayout>
    );
  }

  // ---------- LOADING STATE ----------
  if (isLoading) {
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
          />
        }
      >
        <div className="container mx-auto px-4 py-6 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </PageLayout>
    );
  }

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
        {/* ========== ATTENTION NOW ========== */}
        {hasAttentionItems && (
          <AttentionNowSection
            expiringCount={stats?.certifications.expiring_soon || 0}
            nonCompliantCount={stats?.checks.non_compliant_count || 0}
            overdueCount={capStats?.overdue || 0}
            t={t}
          />
        )}

        {/* ========== KPI CARDS (clickable) ========== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/compliance/certifications" className="block group">
            <KpiCard
              title={t('dashboard.globalScore')}
              icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
              value={`${stats?.checks.average_score ? Math.round(stats.checks.average_score) : 0}%`}
              subtitle={t('dashboard.averageRecentChecks')}
              progress={stats?.checks.average_score || 0}
            />
          </Link>

          <Link to="/compliance/certifications" className="block group">
            <KpiCard
              title={t('dashboard.activeCertifications')}
              icon={<Award className="h-4 w-4 text-green-600" />}
              value={String(stats?.certifications.active || 0)}
              subtitle={t('dashboard.outOfTotal', { total: stats?.certifications.total || 0 })}
            />
          </Link>

          <Link to="/compliance/certifications" className="block group">
            <KpiCard
              title={t('dashboard.expiringSoon')}
              icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />}
              value={String(stats?.certifications.expiring_soon || 0)}
              subtitle={t('dashboard.inNext30Days')}
              alert={!!stats?.certifications.expiring_soon}
            />
          </Link>

          <Link to="/compliance/corrective-actions" className="block group">
            <KpiCard
              title={t('dashboard.nonCompliances')}
              icon={<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />}
              value={String(stats?.checks.non_compliant_count || 0)}
              subtitle={t('dashboard.pointsNeedingAttention')}
              alert={!!stats?.checks.non_compliant_count}
            />
          </Link>
        </div>

        {/* ========== NEXT 30 DAYS STRIP ========== */}
        <Next30DaysStrip
          expiringCerts={expiringCerts}
          upcomingAudits={upcomingAudits}
          locale={locale}
          t={t}
        />

        {/* ========== RECENT CHECKS ========== */}
        <RecentChecksSection checks={stats?.checks.recent || []} locale={locale} t={t} />

        {/* ========== CORRECTIVE ACTIONS SUMMARY (always visible) ========== */}
        <CorrectiveActionsSummary capStats={capStats || null} isLoading={isLoadingCaps} t={t} />

        {/* ========== BOTTOM GRID: Audit Prep + Contact Expert ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AuditPreparationCard t={t} />
          <ContactExpertCard t={t} />
        </div>
      </div>
    </PageLayout>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Attention Now — red/orange alert zone at top */
function AttentionNowSection({
  expiringCount,
  nonCompliantCount,
  overdueCount,
  t,
}: {
  expiringCount: number;
  nonCompliantCount: number;
  overdueCount: number;
  t: ReturnType<typeof useTranslation<'compliance'>>['t'];
}) {
  const items: { icon: typeof AlertTriangle; label: string; count: number; to: string; color: string }[] = [];

  if (overdueCount > 0) {
    items.push({
      icon: AlertCircle,
      label: t('dashboard.overdueActions', '{{count}} actions correctives en retard'),
      count: overdueCount,
      to: '/compliance/corrective-actions',
      color: 'text-red-600 dark:text-red-400',
    });
  }
  if (expiringCount > 0) {
    items.push({
      icon: Clock,
      label: t('dashboard.expiringCerts', '{{count}} certifications expirent bientôt'),
      count: expiringCount,
      to: '/compliance/certifications',
      color: 'text-yellow-600 dark:text-yellow-400',
    });
  }
  if (nonCompliantCount > 0) {
    items.push({
      icon: ShieldAlert,
      label: t('dashboard.nonCompliantChecks', '{{count}} contrôles non conformes'),
      count: nonCompliantCount,
      to: '/compliance/certifications',
      color: 'text-orange-600 dark:text-orange-400',
    });
  }

  return (
    <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <CardTitle className="text-lg">{t('dashboard.attentionNow', 'Attention requise')}</CardTitle>
        </div>
        <CardDescription>
          {t('dashboard.attentionNowDesc', 'Certifications, actions et contrôles nécessitant votre intervention immédiate')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.to + item.label}
              to={item.to}
              className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-sm font-medium">
                  {item.label.replace('{{count}}', String(item.count))}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** KPI Card — used inside Link */
function KpiCard({
  title,
  icon,
  value,
  subtitle,
  progress,
  alert,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  subtitle: string;
  progress?: number;
  alert?: boolean;
}) {
  return (
    <Card className="group-hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${alert ? 'text-red-600 dark:text-red-400' : ''}`}>
          {value}
        </div>
        {progress !== undefined && (
          <Progress
            value={progress}
            className="h-2 mt-2"
            aria-label={`${title}: ${value}`}
          />
        )}
        <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

/** Next 30 days timeline strip */
function Next30DaysStrip({
  expiringCerts,
  upcomingAudits,
  locale,
  t,
}: {
  expiringCerts: CertificationResponseDto[];
  upcomingAudits: CertificationResponseDto[];
  locale: Locale;
  t: ReturnType<typeof useTranslation<'compliance'>>['t'];
}) {
  const hasItems = expiringCerts.length > 0 || upcomingAudits.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('dashboard.next30Days', 'Prochains 30 jours')}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <p className="text-sm text-muted-foreground py-2">
            {t('dashboard.noUpcoming', 'Aucun audit ou renouvellement prévu dans les 30 prochains jours.')}
          </p>
        ) : (
          <div className="space-y-3">
            {expiringCerts.map((cert) => {
              const daysLeft = differenceInDays(new Date(cert.expiry_date), new Date());
              return (
                <Link
                  key={cert.id}
                  to="/compliance/certifications/$certId"
                  params={{ certId: cert.id }}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                      <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cert.certification_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('dashboard.expiresOnDate', 'Expire le {{date}}').replace(
                          '{{date}}',
                          format(new Date(cert.expiry_date), 'dd MMM yyyy', { locale })
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      daysLeft <= 7
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700'
                    }
                  >
                    {daysLeft}j
                  </Badge>
                </Link>
              );
            })}
            {upcomingAudits.map((cert) => {
              const auditDate = new Date(cert.audit_schedule!.next_audit_date!);
              const daysUntil = differenceInDays(auditDate, new Date());
              return (
                <Link
                  key={`audit-${cert.id}`}
                  to="/compliance/certifications/$certId"
                  params={{ certId: cert.id }}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t('dashboard.auditFor', 'Audit {{type}}').replace('{{type}}', cert.certification_type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(auditDate, 'dd MMM yyyy', { locale })}
                        {cert.audit_schedule?.auditor_name && ` — ${cert.audit_schedule.auditor_name}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700">
                    {daysUntil}j
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Recent checks — simplified inline display (no filter bar) */
function RecentChecksSection({
  checks,
  locale,
  t,
}: {
  checks: ComplianceCheckResponseDto[];
  locale: Locale;
  t: ReturnType<typeof useTranslation<'compliance'>>['t'];
}) {
  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      compliant: {
        className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700',
        label: t('status.compliant'),
      },
      non_compliant: {
        className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700',
        label: t('status.nonCompliant'),
      },
      needs_review: {
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700',
        label: t('status.needsReview'),
      },
      in_progress: {
        className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700',
        label: t('status.inProgress'),
      },
    };
    const c = config[status] || { className: '', label: status };
    return (
      <Badge variant="outline" className={`whitespace-nowrap ${c.className}`}>
        {c.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{t('dashboard.recentChecks')}</h2>
        <Button variant="ghost" size="sm" className="gap-1" asChild>
          <Link to="/compliance/certifications">
            {t('dashboard.viewAll')} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {checks.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            {t('dashboard.noRecentChecks', 'Aucun contrôle récent. Les contrôles des 30 derniers jours apparaîtront ici.')}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {checks.slice(0, 5).map((check) => (
            <Card key={check.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(check.check_date), 'dd MMM', { locale })}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate capitalize">
                      {check.check_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {(check as { certification?: { certification_type?: string } }).certification?.certification_type || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {check.score != null && (
                    <span className={`text-sm font-medium ${check.score >= 80 ? 'text-green-600 dark:text-green-400' : check.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {check.score}%
                    </span>
                  )}
                  {getStatusBadge(check.status)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Corrective Actions Summary — always visible, with empty state */
function CorrectiveActionsSummary({
  capStats,
  isLoading,
  t,
}: {
  capStats: { total: number; open: number; in_progress: number; overdue: number; resolution_rate: number } | null;
  isLoading: boolean;
  t: ReturnType<typeof useTranslation<'compliance'>>['t'];
}) {
  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }

  const hasActions = capStats && capStats.total > 0;

  return (
    <Card className={hasActions ? 'border-orange-200 dark:border-orange-800' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500 dark:text-orange-400" />
            <CardTitle className="text-lg">{t('dashboard.correctiveActions')}</CardTitle>
            {hasActions && <Badge variant="secondary">{capStats.total}</Badge>}
          </div>
          {hasActions && (
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link to="/compliance/corrective-actions">
                {t('dashboard.viewAll')} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasActions ? (
          <div className="flex items-center gap-3 py-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">
                {t('dashboard.capEmptyTitle', 'Aucune action corrective')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  'dashboard.capEmptyDesc',
                  "Les actions correctives apparaîtront ici après un contrôle de conformité. C'est bon signe !"
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <div>
                <div className="text-lg font-bold">{capStats!.open}</div>
                <div className="text-xs text-muted-foreground">{t('dashboard.open')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              <div>
                <div className="text-lg font-bold">{capStats!.in_progress}</div>
                <div className="text-xs text-muted-foreground">{t('dashboard.inProgress')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
              <div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{capStats!.overdue}</div>
                <div className="text-xs text-muted-foreground">{t('dashboard.overdue')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
              <div>
                <div className="text-lg font-bold">{Math.round(capStats!.resolution_rate)}%</div>
                <div className="text-xs text-muted-foreground">{t('dashboard.resolutionRate')}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Audit Preparation card — wired to checklist with "example" label */
function AuditPreparationCard({ t }: { t: ReturnType<typeof useTranslation<'compliance'>>['t'] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <CardTitle>{t('dashboard.auditPreparation')}</CardTitle>
        </div>
        <CardDescription>
          {t('dashboard.auditPreparationDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {t('dashboard.exampleChecklist', 'Exemple — GLOBALG.A.P')}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span>{t('dashboard.phytosanitaryRegister')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span>{t('dashboard.waterAnalysis')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-500 dark:text-yellow-400 shrink-0" />
            <span>{t('dashboard.workerSafetyTraining')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{t('dashboard.wasteManagementPlan')}</span>
          </div>
        </div>
        <div className="mt-4">
          <ComplianceChecklistDialog defaultCertificationType={CertificationType.GLOBALGAP} />
        </div>
      </CardContent>
    </Card>
  );
}

/** Contact Expert card — with channel choice */
function ContactExpertCard({ t }: { t: ReturnType<typeof useTranslation<'compliance'>>['t'] }) {
  return (
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
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={() => window.open('https://wa.me/212600000000', '_blank')}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open('mailto:experts@agrogina.ma?subject=Demande%20accompagnement%20certification', '_blank')}
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t('dashboard.contactExpectedResponse', 'Réponse sous 24h ouvrées')}
        </p>
      </CardContent>
    </Card>
  );
}
