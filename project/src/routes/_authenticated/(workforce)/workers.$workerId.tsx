import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DetailPageSkeleton } from '@/components/ui/page-skeletons';
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Banknote,
  Edit,
  AlertCircle,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Wallet,
  Droplet,
} from "lucide-react";
import {
  useWorker,
  useWorkerStats,
  useWorkRecords,
  useMetayageSettlements,
} from "@/hooks/useWorkers";
import { useWorkerPayments } from "@/hooks/usePayments";
import { useFarms } from "@/hooks/useParcelsQuery";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { withLicensedRouteProtection } from "@/components/authorization/withLicensedRouteProtection";
import { useCurrency } from "@/hooks/useCurrency";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import WorkerForm from "@/components/Workers/WorkerForm";
import WorkerPaymentDialog from "@/components/Workers/WorkerPaymentDialog";
import type { PaymentType, PaymentRecord } from "@/types/payments";
import type { MetayageSettlement as MetayageSettlementType, WorkRecord } from "@/types/workers";
import { cn } from "@/lib/utils";

// ---------- Inline visual components ----------

// Deterministic seed from string
function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Sparkline (line/area) — TODO: real time-series
function Sparkline({ id, color }: { id: string; color: string }) {
  const s = seed(id);
  const points = Array.from({ length: 12 }, (_, i) => {
    const y = 15 + Math.sin((i + s % 7) * 0.7) * 8 + Math.cos((i + s % 5) * 0.4) * 4;
    return `${(i / 11) * 100},${Math.max(2, Math.min(28, y))}`;
  });
  const path = points.join(" ");
  const areaPath = `0,30 ${path} 100,30`;
  return (
    <svg viewBox="0 0 100 30" className="w-full h-8" preserveAspectRatio="none">
      <polyline points={areaPath} fill={color} fillOpacity="0.15" stroke="none" />
      <polyline points={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Mini bar chart — TODO: real time-series
function MiniBarChart({ id, color }: { id: string; color: string }) {
  const s = seed(id);
  const bars = Array.from({ length: 10 }, (_, i) => {
    const h = 6 + ((s >> (i % 10)) & 0xff) / 255 * 22;
    return { x: i * 10 + 1, y: 30 - h, h };
  });
  return (
    <svg viewBox="0 0 100 30" className="w-full h-8" preserveAspectRatio="none">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={8} height={b.h} fill={color} rx={1} />
      ))}
    </svg>
  );
}

// ---------- helpers ----------

function getInitials(first?: string, last?: string) {
  const f = (first || '').trim()[0] || '';
  const l = (last || '').trim()[0] || '';
  return (f + l).toUpperCase() || '?';
}

function relativeFr(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const diff = differenceInCalendarDays(today, d);
    if (diff <= 0) return `Aujourd'hui · ${format(d, 'HH:mm')}`;
    if (diff === 1) return `Hier · ${format(d, 'HH:mm')}`;
    if (diff < 7) return `il y a ${diff}j`;
    return format(d, 'd MMM', { locale: fr });
  } catch {
    return dateStr;
  }
}

function WorkerDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { workerId } = Route.useParams();
  const { currentOrganization } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentPeriod, setPaymentPeriod] = useState<{ start: string; end: string } | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);

  const { data: worker, isLoading: workerLoading } = useWorker(currentOrganization?.id || null, workerId);
  const { data: farms = [] } = useFarms(currentOrganization?.id || "");
  const { data: stats } = useWorkerStats(currentOrganization?.id || null, workerId);
  const { data: payments = [] } = useWorkerPayments(currentOrganization?.id || "", workerId);
  const { data: workRecords = [] } = useWorkRecords(currentOrganization?.id || null, workerId);
  const { data: settlements = [] } = useMetayageSettlements(currentOrganization?.id || null, workerId);

  const handleSettlementPayment = (settlement: MetayageSettlementType) => {
    if (!settlement?.period_start || !settlement?.period_end) return;
    setPaymentPeriod({ start: settlement.period_start, end: settlement.period_end });
    setPaymentType("metayage_share");
    setShowPaymentDialog(true);
  };

  // Compute pending payment data
  const pendingPayments = useMemo(
    () => (payments as PaymentRecord[]).filter((p) => p.status === 'pending'),
    [payments]
  );
  const pendingTotal = useMemo(
    () => pendingPayments.reduce((sum, p) => sum + (p.net_amount || p.base_amount || 0), 0),
    [pendingPayments]
  );
  const hasPending = pendingPayments.length > 0;

  // Build activity timeline
  const timeline = useMemo(() => {
    type Item = { id: string; date: string; title: string; subtitle: string; kind: 'work' | 'payment' | 'irrigation' };
    const items: Item[] = [];
    (workRecords as WorkRecord[]).forEach((r) => {
      items.push({
        id: 'w-' + r.id,
        date: r.work_date,
        title: r.task_description || 'Travail enregistré',
        subtitle: [r.parcel_name, r.hours_worked ? `${r.hours_worked}h` : null].filter(Boolean).join(' · ') || '—',
        kind: 'work',
      });
    });
    (payments as PaymentRecord[]).forEach((p) => {
      items.push({
        id: 'p-' + p.id,
        date: p.payment_date || p.created_at || new Date().toISOString(),
        title: 'Paiement enregistré',
        subtitle: [
          formatCurrency(p.net_amount || p.base_amount || 0),
          p.payment_method ? t(`workers.paymentMethods.${p.payment_method}`, p.payment_method) : null,
        ].filter(Boolean).join(' · '),
        kind: 'payment',
      });
    });
    return items
      .filter((i) => i.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [workRecords, payments, formatCurrency, t]);

  const paidHistory = useMemo(
    () =>
      (payments as PaymentRecord[])
        .filter((p) => p.status === 'paid')
        .sort((a, b) => new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime())
        .slice(0, 6),
    [payments]
  );

  if (!currentOrganization || workerLoading) {
    return <DetailPageSkeleton />;
  }

  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-gray-600 dark:text-gray-400">{t("workers.detail.notFound")}</p>
        <Button onClick={() => navigate({ to: "/workers" })}>
          <ArrowLeft className="h-4 w-4 me-2" />
          {t("workers.detail.backToList")}
        </Button>
      </div>
    );
  }

  const workerTypeLabel = t(`workers.workerTypes.${worker.worker_type}`,
    worker.worker_type === 'fixed_salary' ? 'Salaire fixe' :
    worker.worker_type === 'daily_worker' ? 'Journalier' :
    worker.worker_type === 'metayage' ? 'Métayage' : worker.worker_type
  );

  // Stat values
  const daysWorked = stats?.totalDaysWorked ?? worker.total_days_worked ?? 0;
  const tasksDone = stats?.totalTasksCompleted ?? worker.total_tasks_completed ?? 0;
  const attendancePct = 96; // TODO: real attendance metric

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/workers" })} className="text-gray-600 dark:text-gray-300">
          <ArrowLeft className="h-4 w-4 me-2" />
          {t("workers.detail.backToList", "Retour aux ouvriers")}
        </Button>
        <Button variant="outline" onClick={() => setShowEditForm(true)}>
          <Edit className="h-4 w-4 me-2" />
          {t("workers.actions.edit", "Modifier")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          {/* Green hero card */}
          <div className="relative rounded-2xl p-6 text-white bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-sm">
            <div className="h-16 w-16 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-2xl font-bold">
              {getInitials(worker.first_name, worker.last_name)}
            </div>
            <h1 className="mt-4 text-2xl lg:text-3xl font-bold">
              {worker.first_name} {worker.last_name}
            </h1>
            <p className="text-emerald-100">
              {worker.position || t("workers.detail.noPosition", "Sans poste")}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-white/15 text-white border border-white/30">
                {workerTypeLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white/15 text-white border border-white/30">
                <span className={cn("h-1.5 w-1.5 rounded-full", worker.is_active ? "bg-lime-300" : "bg-rose-300")} />
                {worker.is_active ? t("workers.status.active", "Actif") : t("workers.status.inactive", "Inactif")}
              </span>
            </div>

            <div className="my-4 border-t border-white/20" />

            <div className="space-y-3 text-sm">
              {worker.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{worker.phone}</span>
                </div>
              )}
              {(worker.farm_name || worker.address) && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{worker.farm_name || worker.address}</span>
                </div>
              )}
              {worker.hire_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    {t('workers.detail.hiredOn', 'Embauché')}{' '}
                    {format(new Date(worker.hire_date), 'd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions card */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('workers.detail.quickActions.title', 'Actions rapides')}
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => setShowPaymentDialog(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                <Banknote className="h-4 w-4" />
                <span className="text-start">{t('workers.detail.quickActions.recordPayment', 'Enregistrer un paiement')}</span>
              </button>
              <button
                onClick={() => toast.info(t('common.comingSoon', 'Bientôt'))}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-start">{t('workers.detail.quickActions.assignTask', 'Assigner une tâche')}</span>
              </button>
              <button
                onClick={() => toast.info(t('common.comingSoon', 'Bientôt'))}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-start">{t('workers.detail.quickActions.markLeave', 'Marquer un congé')}</span>
              </button>
              <button
                onClick={() => toast.info(t('common.comingSoon', 'Bientôt'))}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 transition-colors"
              >
                <Shield className="h-4 w-4" />
                <span className="text-start">{t('workers.detail.quickActions.declareCnss', 'Déclarer à la CNSS')}</span>
              </button>
              <button
                onClick={() => toast.info(t('common.comingSoon', 'Bientôt'))}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span className="text-start">{t('workers.detail.quickActions.sendMessage', 'Envoyer un message')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top metrics + pending payment */}
          <div className={cn("grid gap-4", hasPending ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3")}>
            {/* Days worked */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('workers.stats.daysWorked', 'Jours travaillés')}</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                {daysWorked}
                <span className="text-sm font-normal text-gray-400 ms-1">/30j</span>
              </p>
              <Sparkline id={worker.id + 'days'} color="#10b981" />
              <p className="text-xs text-emerald-600 mt-1">+8% vs. période préc.</p>
            </div>
            {/* Tasks */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('workers.stats.tasks', 'Tâches')}</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                {tasksDone}
                <span className="text-sm font-normal text-gray-400 ms-1">ce mois</span>
              </p>
              <MiniBarChart id={worker.id + 'tasks'} color="#3b82f6" />
              <p className="text-xs text-emerald-600 mt-1">+12% vs. période préc.</p>
            </div>
            {/* Attendance */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('workers.stats.attendance', 'Présence')}</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                {attendancePct}
                <span className="text-sm font-normal text-gray-400 ms-1">%</span>
              </p>
              <Sparkline id={worker.id + 'att'} color="#f59e0b" />
              <p className="text-xs text-emerald-600 mt-1">+1pt vs. période préc.</p>
            </div>
            {/* Pending payment card */}
            {hasPending && (
              <div className="rounded-2xl p-6 text-white bg-gradient-to-br from-red-500 to-red-600 shadow-sm flex flex-col">
                <p className="text-xs uppercase tracking-wide opacity-90">
                  {t('workers.detail.pendingPayment', 'Paiement en attente')}
                </p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(pendingTotal)}</p>
                <p className="text-xs text-white/80 mt-1">
                  {t('workers.detail.dueEndOfMonth', 'Échéance : fin du mois')}
                </p>
                <button
                  onClick={() => setShowPaymentDialog(true)}
                  className="mt-auto pt-3"
                >
                  <span className="inline-flex w-full items-center justify-center px-3 py-2 rounded-lg bg-white text-red-600 text-sm font-semibold hover:bg-red-50">
                    {t('workers.detail.payNow', 'Régler maintenant')}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Travaux récents */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t('workers.detail.recentWork', 'Travaux récents')}
              </h3>
              <button
                onClick={() => toast.info(t('common.comingSoon', 'Bientôt'))}
                className="text-sm text-emerald-600 hover:underline"
              >
                {t('common.viewAll', 'Tout voir')} →
              </button>
            </div>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                {t('workers.detail.noRecentActivity', 'Aucune activité récente')}
              </p>
            ) : (
              <ol className="relative ms-2">
                <span className="absolute start-2 top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" aria-hidden />
                {timeline.map((item) => {
                  const dotColor =
                    item.kind === 'payment' ? 'bg-blue-500'
                    : item.kind === 'irrigation' ? 'bg-orange-500'
                    : 'bg-emerald-500';
                  const Icon =
                    item.kind === 'payment' ? Banknote
                    : item.kind === 'irrigation' ? Droplet
                    : CheckCircle2;
                  return (
                    <li key={item.id} className="relative ps-8 pb-4 last:pb-0">
                      <span className={cn("absolute start-0 top-1 h-4 w-4 rounded-full flex items-center justify-center", dotColor)}>
                        <Icon className="h-2.5 w-2.5 text-white" />
                      </span>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.subtitle}</p>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                          {relativeFr(item.date)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Compensation */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              {t('workers.detail.compensation', 'Compensation')}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <Banknote className="h-4 w-4 text-gray-400" />
                  <span>
                    {worker.worker_type === 'fixed_salary' ? t('workers.fields.monthlySalary', 'Salaire mensuel')
                    : worker.worker_type === 'daily_worker' ? t('workers.fields.dailyRate', 'Taux journalier')
                    : t('workers.fields.metayagePercentage', '% de partage')}
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {worker.worker_type === 'fixed_salary' && worker.monthly_salary
                    ? formatCurrency(worker.monthly_salary)
                  : worker.worker_type === 'daily_worker' && worker.daily_rate
                    ? `${formatCurrency(worker.daily_rate)} / ${t('workers.perDay', 'jour')}`
                  : worker.worker_type === 'metayage' && worker.metayage_percentage
                    ? `${worker.metayage_percentage}%`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <Wallet className="h-4 w-4 text-gray-400" />
                  <span>{t('workers.fields.paymentMethod', 'Mode')}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {worker.payment_method
                    ? t(`workers.paymentMethods.${worker.payment_method}`, worker.payment_method)
                    : t('common.notDefined', 'Non défini')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <ShieldCheck className="h-4 w-4 text-gray-400" />
                  <span>CNSS</span>
                </div>
                <span className={cn("font-semibold", worker.is_cnss_declared ? "text-emerald-600" : "text-gray-400")}>
                  {worker.is_cnss_declared
                    ? t('workers.fields.cnssDeclared', 'Déclaré')
                    : t('workers.fields.cnssNotDeclared', 'Non déclaré')}
                </span>
              </div>
            </div>
          </div>

          {/* Historique de paie */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t('workers.detail.paymentHistory', 'Historique de paie')}
              </h3>
              <span className="text-xs text-gray-400">{t('workers.detail.sixMonths', '6 mois')}</span>
            </div>
            {paidHistory.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">
                {t('workers.detail.noPayments', 'Aucun paiement')}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {paidHistory.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {p.payment_date ? format(new Date(p.payment_date), 'MMM yy', { locale: fr }) : '—'}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(p.net_amount || p.base_amount || 0)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {t('workers.paymentStatuses.paid', 'Payé')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Métayage settlements (only for metayage with settlements) */}
          {worker.worker_type === 'metayage' && settlements.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                {t('workers.detail.metayageSettlements', 'Décomptes Métayage')}
              </h3>
              <div className="space-y-2">
                {settlements.map((s: MetayageSettlementType) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {s.period_start && s.period_end
                        ? `${format(new Date(s.period_start), 'dd/MM/yy')} – ${format(new Date(s.period_end), 'dd/MM/yy')}`
                        : '—'}
                    </span>
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(s.worker_share_amount || 0)}
                    </span>
                    {s.payment_status === 'pending' && (
                      <Button variant="outline" size="sm" onClick={() => handleSettlementPayment(s)}>
                        {t('workers.settlements.createPayment', 'Régler')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {worker && (
        <WorkerPaymentDialog
          open={showPaymentDialog}
          worker={worker}
          organizationId={currentOrganization.id}
          initialPeriodStart={paymentPeriod?.start}
          initialPeriodEnd={paymentPeriod?.end}
          initialPaymentType={paymentType || undefined}
          onClose={() => {
            setShowPaymentDialog(false);
            setPaymentPeriod(null);
            setPaymentType(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["worker-payments", workerId] });
            queryClient.invalidateQueries({ queryKey: ["worker-payment-history", workerId] });
            queryClient.invalidateQueries({ queryKey: ["metayage-settlements", currentOrganization.id, workerId] });
          }}
        />
      )}

      {worker && (
        <WorkerForm
          open={showEditForm}
          worker={worker}
          organizationId={currentOrganization.id}
          farms={farms.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name }))}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            queryClient.invalidateQueries({ queryKey: ["worker", currentOrganization.id, workerId] });
          }}
        />
      )}
    </div>
  );
}

export const Route = createFileRoute(
  "/_authenticated/(workforce)/workers/$workerId",
)({
  component: withLicensedRouteProtection(WorkerDetailPage, "read", "Worker"),
});
