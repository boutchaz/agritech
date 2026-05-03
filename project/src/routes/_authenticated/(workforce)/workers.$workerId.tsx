import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DetailPageSkeleton } from '@/components/ui/page-skeletons';
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
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
  Loader2,
  MessageSquare,
  FileText,
  Upload,
  Trash2,
  BadgeCheck,
  Clock,
  ExternalLink,
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
import TaskForm from "@/components/Tasks/TaskForm";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import {
  useCreateApplication,
  useLeaveTypes,
} from "@/hooks/useLeaveManagement";
import { useSendMessage } from "@/hooks/useChat";
import {
  useWorkerDocuments,
  useCreateWorkerDocument,
  useVerifyWorkerDocument,
  useDeleteWorkerDocument,
} from "@/hooks/useWorkerDocuments";
import type { DocumentType } from "@/lib/api/worker-documents";
import type { PaymentType, PaymentRecord } from "@/types/payments";
import type { MetayageSettlement as MetayageSettlementType, WorkRecord } from "@/types/workers";
import type { CreateApplicationInput } from "@/lib/api/leave-management";
import { cn } from "@/lib/utils";

// ---------- Schema ----------

const leaveApplicationSchema = z.object({
  worker_id: z.string().uuid({ message: 'Worker is required' }),
  leave_type_id: z.string().uuid({ message: 'Leave type is required' }),
  from_date: z.string().min(10, 'From date is required'),
  to_date: z.string().min(10, 'To date is required'),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters'),
  half_day: z.boolean().optional(),
  half_day_period: z.enum(['first_half', 'second_half']).optional(),
});

// ---------- Stats helpers ----------

function trendLabel(current: number, previous: number, unit = '%'): { text: string | null; positive: boolean } {
  if (previous === 0 && current === 0) return { text: null, positive: true };
  if (previous === 0) return { text: `+${current}`, positive: true };
  const change = Math.round(((current - previous) / previous) * 100);
  const sign = change > 0 ? '+' : '';
  return { text: `${sign}${change}${unit} vs. mois préc.`, positive: change >= 0 };
}

function StatCard({ label, value, unit, trend }: {
  label: string;
  value: number | string;
  unit?: string;
  trend?: { text: string | null; positive: boolean };
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
        {value}
        {unit && <span className="text-sm font-normal text-gray-400 ms-1">{unit}</span>}
      </p>
      {trend?.text && (
        <p className={cn('text-xs mt-1', trend.positive ? 'text-emerald-600' : 'text-red-500')}>
          {trend.text}
        </p>
      )}
    </div>
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

function LeaveApplicationQuickDialog({
  orgId,
  workerId,
  workerName,
  onClose,
  onSuccess,
}: {
  orgId: string;
  workerId: string;
  workerName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const typesQuery = useLeaveTypes(orgId);
  const create = useCreateApplication();
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<CreateApplicationInput>({
    worker_id: workerId,
    leave_type_id: '',
    from_date: new Date().toISOString().slice(0, 10),
    to_date: new Date().toISOString().slice(0, 10),
    reason: '',
  });

  const set = <K extends keyof CreateApplicationInput>(key: K, v: CreateApplicationInput[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const totalDays = useMemo(() => {
    if (!draft.from_date || !draft.to_date) return 0;
    const ms = new Date(draft.to_date).getTime() - new Date(draft.from_date).getTime();
    if (ms < 0) return 0;
    const days = Math.floor(ms / 86_400_000) + 1;
    return draft.half_day && days === 1 ? 0.5 : days;
  }, [draft.from_date, draft.to_date, draft.half_day]);

  const handleSubmit = async () => {
    const result = leaveApplicationSchema.safeParse(draft);
    if (!result.success) {
      const first = result.error.issues[0];
      toast.error(first?.message ?? t('validation.allFieldsRequired', 'All fields are required'));
      return;
    }
    if (totalDays <= 0) {
      toast.error(t('leaveApplications.invalidRange', 'To-date must be on or after from-date'));
      return;
    }
    setSubmitting(true);
    try {
      await create.mutateAsync({ orgId, data: result.data as CreateApplicationInput });
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.errorOccurred', 'An error occurred');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={t('workers.detail.quickActions.markLeave', 'Marquer un congé') + ` — ${workerName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.submit', 'Enregistrer')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label>{t('leaveTypes.title', 'Type de congé')}</Label>
          <Select value={draft.leave_type_id} onValueChange={(v) => set('leave_type_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder={t('common.select', 'Sélectionner')} />
            </SelectTrigger>
            <SelectContent>
              {(typesQuery.data?.data ?? []).map((lt) => (
                <SelectItem key={lt.id} value={lt.id}>
                  {lt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('common.from', 'Du')}</Label>
            <Input
              type="date"
              value={draft.from_date}
              onChange={(e) => set('from_date', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t('common.to', 'Au')}</Label>
            <Input
              type="date"
              value={draft.to_date}
              onChange={(e) => set('to_date', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">{t('leaveApplications.halfDay', 'Demi-journée')}</Label>
          <Switch
            checked={!!draft.half_day}
            onCheckedChange={(v) => set('half_day', v)}
            disabled={draft.from_date !== draft.to_date}
          />
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('leaveApplications.totalDays', 'Total jours')}: <strong>{totalDays}</strong>
        </div>

        <div className="space-y-1">
          <Label>{t('common.reason', 'Raison')}</Label>
          <Input value={draft.reason} onChange={(e) => set('reason', e.target.value)} />
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function SendMessageQuickDialog({
  workerName,
  onClose,
  onSend,
}: {
  workerName: string;
  onClose: () => void;
  onSend: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const sendMessage = useSendMessage();

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error(t('validation.required', 'Le message est requis'));
      return;
    }
    setSending(true);
    try {
      await sendMessage.mutateAsync({
        query: `[Message pour ${workerName}] ${message}`,
        language: 'fr',
        save_history: true,
      });
      toast.success(t('workers.detail.quickActions.messageSent', 'Message envoyé'));
      onSend(message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('common.errorOccurred', 'An error occurred');
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title={t('workers.detail.quickActions.sendMessage', 'Envoyer un message') + ` — ${workerName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button onClick={handleSend} disabled={!message.trim() || sending}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="h-4 w-4 me-2" />}
            {t('common.send', 'Envoyer')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('workers.detail.quickActions.messageContext', 'Ce message sera envoyé via AgromindIA.')}
        </p>
        <textarea
          className="w-full min-h-[120px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder={t('workers.detail.quickActions.messagePlaceholder', 'Écrire un message...')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          autoFocus
        />
      </div>
    </ResponsiveDialog>
  );
}

type TimelineItem = { id: string; date: string; title: string; subtitle: string; kind: 'work' | 'payment' | 'irrigation' };

function WorkHistoryDialog({
  workerName,
  items,
  onClose,
}: {
  workerName: string;
  items: TimelineItem[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'work' | 'payment'>('all');
  const filtered = filter === 'all' ? items : items.filter((i) => i.kind === filter);

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={t('workers.detail.workHistory', 'Historique des travaux') + ` — ${workerName}`}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['all', 'work', 'payment'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                filter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              )}
            >
              {f === 'all' ? t('common.all', 'Tout')
                : f === 'work' ? t('workers.detail.workFilter', 'Travaux')
                : t('workers.detail.paymentFilter', 'Paiements')}
              <span className="ml-1 opacity-70">
                ({(f === 'all' ? items : items.filter((i) => i.kind === f)).length})
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            {t('workers.detail.noRecentActivity', 'Aucune activité récente')}
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <ol className="relative ms-2">
              <span className="absolute start-2 top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" aria-hidden />
              {filtered.map((item) => {
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
                    <span className={cn('absolute start-0 top-1 h-4 w-4 rounded-full flex items-center justify-center', dotColor)}>
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
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}

// ---------- Document helpers ----------

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; labelKey: string }[] = [
  { value: 'cin', labelKey: 'workerDocuments.types.cin' },
  { value: 'passport', labelKey: 'workerDocuments.types.passport' },
  { value: 'work_permit', labelKey: 'workerDocuments.types.work_permit' },
  { value: 'contract', labelKey: 'workerDocuments.types.contract' },
  { value: 'cnss_card', labelKey: 'workerDocuments.types.cnss_card' },
  { value: 'medical_certificate', labelKey: 'workerDocuments.types.medical_certificate' },
  { value: 'driving_license', labelKey: 'workerDocuments.types.driving_license' },
  { value: 'pesticide_certification', labelKey: 'workerDocuments.types.pesticide_certification' },
  { value: 'training_certificate', labelKey: 'workerDocuments.types.training_certificate' },
  { value: 'bank_details', labelKey: 'workerDocuments.types.bank_details' },
  { value: 'tax_document', labelKey: 'workerDocuments.types.tax_document' },
  { value: 'photo', labelKey: 'workerDocuments.types.photo' },
  { value: 'other', labelKey: 'workerDocuments.types.other' },
];

function DocumentDialog({
  orgId,
  workerId,
  editing,
  onClose,
  onSuccess,
}: {
  orgId: string;
  workerId: string;
  editing: { id: string; document_type: DocumentType; document_name: string; expiry_date: string; notes: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [docType, setDocType] = useState<DocumentType>(editing?.document_type ?? 'cin');
  const [docName, setDocName] = useState(editing?.document_name ?? '');
  const [fileUrl, setFileUrl] = useState('');
  const [expiryDate, setExpiryDate] = useState(editing?.expiry_date ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const createMutation = useCreateWorkerDocument();

  const handleSubmit = async () => {
    if (!docName.trim()) {
      toast.error(t('workerDocuments.nameRequired', 'Document name is required'));
      return;
    }
    if (!editing && !fileUrl.trim()) {
      toast.error(t('workerDocuments.fileRequired', 'File URL is required'));
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        onSuccess();
      } else {
        await createMutation.mutateAsync({
          orgId,
          data: {
            worker_id: workerId,
            document_type: docType,
            document_name: docName.trim(),
            file_url: fileUrl.trim(),
            expiry_date: expiryDate || undefined,
            notes: notes.trim() || undefined,
          },
        });
        onSuccess();
      }
    } catch {
      // swallow — submit failures surface via mutation toasts
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="md"
      title={editing
        ? t('workerDocuments.editTitle', 'Edit Document')
        : t('workerDocuments.addTitle', 'Add Document')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="h-4 w-4 me-2" />}
            {editing ? t('common.save', 'Save') : t('workerDocuments.upload', 'Upload')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label>{t('workerDocuments.type', 'Document Type')}</Label>
          <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey, opt.value.replace(/_/g, ' '))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t('workerDocuments.name', 'Document Name')}</Label>
          <Input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder={t('workerDocuments.namePlaceholder', 'e.g., CIN scan, Contract 2024')}
          />
        </div>

        {!editing && (
          <div className="space-y-1">
            <Label>{t('workerDocuments.fileUrl', 'File URL')}</Label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder={t('workerDocuments.fileUrlPlaceholder', 'Paste file URL or upload path')}
            />
          </div>
        )}

        <div className="space-y-1">
          <Label>{t('workerDocuments.expiryDate', 'Expiry Date')}</Label>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>{t('workerDocuments.notes', 'Notes')}</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workerDocuments.notesPlaceholder', 'Optional notes')}
          />
        </div>
      </div>
    </ResponsiveDialog>
  );
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
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showCnssDialog, setShowCnssDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showWorkHistory, setShowWorkHistory] = useState(false);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<{ id: string; document_type: DocumentType; document_name: string; expiry_date: string; notes: string } | null>(null);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  const { data: worker, isLoading: workerLoading } = useWorker(currentOrganization?.id || null, workerId);
  const { data: farms = [] } = useFarms(currentOrganization?.id || "");
  const { data: stats } = useWorkerStats(currentOrganization?.id || null, workerId);
  const { data: payments = [] } = useWorkerPayments(currentOrganization?.id || "", workerId);
  const { data: workRecords = [] } = useWorkRecords(currentOrganization?.id || null, workerId);
  const { data: settlements = [] } = useMetayageSettlements(currentOrganization?.id || null, workerId);
  const { data: documents = [] } = useWorkerDocuments(
    currentOrganization?.id || null,
    { worker_id: workerId },
  );
  const verifyDoc = useVerifyWorkerDocument();
  const deleteDoc = useDeleteWorkerDocument();

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

  // Build full activity timeline (no limit)
  const fullTimeline = useMemo(() => {
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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workRecords, payments, formatCurrency, t]);

  // Card shows only the 5 most recent
  const timeline = fullTimeline.slice(0, 5);

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

  const monthly = stats?.monthly ?? { thisMonth: { days: 0, tasks: 0, attendance: 0 }, prevMonth: { days: 0, tasks: 0, attendance: 0 }, workingDaysSoFar: 0 };

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
                onClick={() => setShowTaskForm(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-start">{t('workers.detail.quickActions.assignTask', 'Assigner une tâche')}</span>
              </button>
              <button
                onClick={() => setShowLeaveDialog(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-start">{t('workers.detail.quickActions.markLeave', 'Marquer un congé')}</span>
              </button>
              <button
                onClick={() => setShowCnssDialog(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 transition-colors"
              >
                <Shield className="h-4 w-4" />
                <span className="text-start">{t('workers.detail.quickActions.declareCnss', 'Déclarer à la CNSS')}</span>
              </button>
              <button
                onClick={() => setShowMessageDialog(true)}
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
            <StatCard
              label={t('workers.stats.daysWorked', 'Jours travaillés')}
              value={monthly.thisMonth.days}
              unit={monthly.workingDaysSoFar > 0 ? `/${monthly.workingDaysSoFar}j` : undefined}
              trend={trendLabel(monthly.thisMonth.days, monthly.prevMonth.days)}
            />
            <StatCard
              label={t('workers.stats.tasks', 'Tâches')}
              value={monthly.thisMonth.tasks}
              unit={t('workers.stats.thisMonth', 'ce mois')}
              trend={trendLabel(monthly.thisMonth.tasks, monthly.prevMonth.tasks)}
            />
            <StatCard
              label={t('workers.stats.attendance', 'Présence')}
              value={monthly.thisMonth.attendance}
              unit="%"
              trend={trendLabel(monthly.thisMonth.attendance, monthly.prevMonth.attendance, 'pt')}
            />
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
                onClick={() => setShowWorkHistory(true)}
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

          {/* Documents */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t('workerDocuments.title', 'Documents')}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditingDoc(null); setShowDocDialog(true); }}
              >
                <Upload className="h-4 w-4 me-2" />
                {t('workerDocuments.add', 'Add')}
              </Button>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                {t('workerDocuments.empty', 'No documents uploaded')}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {documents.map((doc) => {
                  const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                  const isExpiringSoon = doc.expiry_date && !isExpired &&
                    differenceInCalendarDays(new Date(doc.expiry_date), new Date()) <= 30;
                  return (
                    <li key={doc.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText className={cn(
                          "h-5 w-5 shrink-0 mt-0.5",
                          isExpired ? "text-red-500" : isExpiringSoon ? "text-amber-500" : "text-gray-400",
                        )} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {doc.document_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{t(`workerDocuments.types.${doc.document_type}`, doc.document_type.replace(/_/g, ' '))}</span>
                            {doc.expiry_date && (
                              <span className={cn(
                                "inline-flex items-center gap-1",
                                isExpired && "text-red-600 dark:text-red-400",
                                isExpiringSoon && "text-amber-600 dark:text-amber-400",
                              )}>
                                <Clock className="h-3 w-3" />
                                {isExpired
                                  ? t('workerDocuments.expired', 'Expired')
                                  : isExpiringSoon
                                    ? t('workerDocuments.expiringSoon', 'Expiring soon')
                                    : format(new Date(doc.expiry_date), 'd MMM yyyy', { locale: fr })}
                              </span>
                            )}
                            {doc.is_verified && (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <BadgeCheck className="h-3 w-3" />
                                {t('workerDocuments.verified', 'Verified')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        {!doc.is_verified && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600"
                            onClick={() => verifyDoc.mutate({ orgId: currentOrganization.id, id: doc.id })}
                            disabled={verifyDoc.isPending}
                          >
                            <BadgeCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => setDocToDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
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

      {/* Task Form Dialog */}
      {worker && showTaskForm && (
        <TaskForm
          organizationId={currentOrganization.id}
          farms={farms.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name }))}
          onClose={() => setShowTaskForm(false)}
          initialWorkerId={worker.id}
          onSuccess={() => {
            setShowTaskForm(false);
            toast.success(t('workers.detail.quickActions.taskAssigned', 'Tâche créée et assignée'));
          }}
        />
      )}

      {/* Leave Application Dialog */}
      {worker && showLeaveDialog && (
        <LeaveApplicationQuickDialog
          orgId={currentOrganization.id}
          workerId={worker.id}
          workerName={`${worker.first_name} ${worker.last_name}`}
          onClose={() => setShowLeaveDialog(false)}
          onSuccess={() => {
            setShowLeaveDialog(false);
            toast.success(t('workers.detail.quickActions.leaveMarked', 'Congé enregistré'));
          }}
        />
      )}

      {/* CNSS Declaration Dialog */}
      {worker && showCnssDialog && (
        <WorkerForm
          open={showCnssDialog}
          worker={worker}
          organizationId={currentOrganization.id}
          farms={farms.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name }))}
          onClose={() => setShowCnssDialog(false)}
          onSuccess={() => {
            setShowCnssDialog(false);
            queryClient.invalidateQueries({ queryKey: ["worker", currentOrganization.id, workerId] });
            toast.success(t('workers.detail.quickActions.cnssDeclared', 'CNSS mise à jour'));
          }}
        />
      )}

      {/* Send Message Dialog */}
      {worker && showMessageDialog && (
        <SendMessageQuickDialog
          workerName={`${worker.first_name} ${worker.last_name}`}
          onClose={() => setShowMessageDialog(false)}
          onSend={() => setShowMessageDialog(false)}
        />
      )}

      {/* Work History Dialog */}
      {worker && showWorkHistory && (
        <WorkHistoryDialog
          workerName={`${worker.first_name} ${worker.last_name}`}
          items={fullTimeline}
          onClose={() => setShowWorkHistory(false)}
        />
      )}

      {/* Document Upload/Edit Dialog */}
      {worker && showDocDialog && (
        <DocumentDialog
          orgId={currentOrganization.id}
          workerId={worker.id}
          editing={editingDoc}
          onClose={() => { setShowDocDialog(false); setEditingDoc(null); }}
          onSuccess={() => { setShowDocDialog(false); setEditingDoc(null); }}
        />
      )}

      {/* Document Delete Confirmation */}
      {docToDelete && (
        <ResponsiveDialog
          open
          onOpenChange={() => setDocToDelete(null)}
          size="sm"
          title={t('workerDocuments.deleteTitle', 'Delete Document')}
          footer={
            <>
              <Button variant="outline" onClick={() => setDocToDelete(null)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteDoc.mutate(
                    { orgId: currentOrganization.id, id: docToDelete },
                    { onSettled: () => setDocToDelete(null) },
                  );
                }}
                disabled={deleteDoc.isPending}
              >
                {deleteDoc.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.delete', 'Delete')}
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('workerDocuments.deleteConfirm', 'Are you sure you want to delete this document? This action cannot be undone.')}
          </p>
        </ResponsiveDialog>
      )}
    </div>
  );
}

export const Route = createFileRoute(
  "/_authenticated/(workforce)/workers/$workerId",
)({
  component: withLicensedRouteProtection(WorkerDetailPage, "read", "Worker"),
});
