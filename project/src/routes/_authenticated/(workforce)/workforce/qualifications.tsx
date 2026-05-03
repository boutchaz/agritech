import { useMemo, useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useWorkers } from '@/hooks/useWorkers';
import {
  useCreateQualification,
  useDeleteQualification,
  useQualifications,
  useUpdateQualification,
  useVerifyQualification,
} from '@/hooks/useAgroHr';
import type {
  CreateQualificationInput,
  QualificationType,
  WorkerQualification,
} from '@/lib/api/agro-hr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/qualifications')({
  component: withRouteProtection(QualificationsPage, 'manage', 'WorkerQualification'),
});

const TYPES: QualificationType[] = [
  'tractor_operation', 'pesticide_handling', 'first_aid', 'forklift',
  'irrigation_system', 'pruning', 'harvesting_technique', 'food_safety',
  'fire_safety', 'electrical', 'other',
];

function QualificationsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<WorkerQualification | null>(null);
  const [expiringFilter, setExpiringFilter] = useState<number | undefined>(undefined);

  const workers = useWorkers(orgId);
  const query = useQualifications(orgId, expiringFilter ? { expiring_within_days: expiringFilter } : {});
  const create = useCreateQualification();
  const update = useUpdateQualification();
  const verify = useVerifyQualification();
  const remove = useDeleteQualification();

  if (!orgId) return null;

  const items = query.data ?? [];
  const workerList = (workers.data ?? []).map((w) => ({ id: w.id, name: `${w.first_name} ${w.last_name}` }));

  return (
    <>
      <div className="flex justify-end mb-2">{<>
            <Select
              value={expiringFilter ? String(expiringFilter) : 'all'}
              onValueChange={(v) => setExpiringFilter(v === 'all' ? undefined : Number(v))}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                <SelectItem value="30">{t('qualifications.expiring30', 'Expiring ≤ 30d')}</SelectItem>
                <SelectItem value="90">{t('qualifications.expiring90', 'Expiring ≤ 90d')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setCreating(true)} disabled={!workerList.length}>
              <Plus className="w-4 h-4 mr-2" />
              {t('common.create', 'Create')}
            </Button>
          </>}</div>
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">

      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !items.length ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('qualifications.empty', 'No qualifications recorded yet.')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((q) => (
            <QualificationRow
              key={q.id}
              q={q}
              onEdit={() => setEditing(q)}
              onVerify={() =>
                verify.mutate(
                  { orgId, id: q.id },
                  { onSuccess: () => toast.success(t('qualifications.verified', 'Verified')) },
                )
              }
              onDelete={() => {
                if (!confirm(t('qualifications.confirmDelete', 'Delete?'))) return;
                remove.mutate(
                  { orgId, id: q.id },
                  { onSuccess: () => toast.success(t('common.deleted', 'Deleted')) },
                );
              }}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <FormDialog
          workers={workerList}
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={async (data) => {
            if (editing) {
              await update.mutateAsync({ orgId, id: editing.id, data });
              toast.success(t('common.saved', 'Saved'));
            } else {
              await create.mutateAsync({ orgId, data });
              toast.success(t('common.created', 'Created'));
            }
          }}
        />
      )}
      </div>
    </>
  );
}

function QualificationRow({
  q,
  onEdit,
  onVerify,
  onDelete,
}: {
  q: WorkerQualification;
  onEdit: () => void;
  onVerify: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const expiry = useMemo(() => {
    if (!q.expiry_date) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.floor((new Date(q.expiry_date).getTime() - today.getTime()) / 86400000);
    return { days, expired: days < 0, soon: days >= 0 && days <= 30 };
  }, [q.expiry_date]);

  return (
    <Card>
      <CardContent className="py-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {q.worker?.first_name} {q.worker?.last_name}
            </span>
            <span className="text-gray-400">·</span>
            <span>{q.qualification_name}</span>
            <Badge variant="secondary">{q.qualification_type}</Badge>
            {q.verified_at && (
              <Badge>
                <ShieldCheck className="w-3 h-3 mr-1" />
                {t('qualifications.verified', 'Verified')}
              </Badge>
            )}
            {expiry?.expired && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {t('qualifications.expired', 'Expired')}
              </Badge>
            )}
            {expiry?.soon && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {t('qualifications.expiringSoon', 'Expiring soon')}
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('qualifications.issued', 'Issued')} {q.issued_date}
            {q.expiry_date && ` · ${t('qualifications.expires', 'Expires')} ${q.expiry_date}`}
            {q.issuing_authority && ` · ${q.issuing_authority}`}
          </div>
        </div>
        <div className="flex gap-1">
          {!q.verified_at && (
            <Button variant="ghost" size="sm" onClick={onVerify}>
              <ShieldCheck className="w-3 h-3 mr-1" />
              {t('qualifications.verify', 'Verify')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FormDialog({
  workers,
  initial,
  onClose,
  onSubmit,
}: {
  workers: Array<{ id: string; name: string }>;
  initial: WorkerQualification | null;
  onClose: () => void;
  onSubmit: (data: CreateQualificationInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<CreateQualificationInput>(() =>
    initial
      ? {
          worker_id: initial.worker_id,
          qualification_type: initial.qualification_type,
          qualification_name: initial.qualification_name,
          issued_date: initial.issued_date,
          expiry_date: initial.expiry_date ?? undefined,
          issuing_authority: initial.issuing_authority ?? undefined,
          certificate_url: initial.certificate_url ?? undefined,
          notes: initial.notes ?? undefined,
        }
      : {
          worker_id: '',
          qualification_type: 'tractor_operation',
          qualification_name: '',
          issued_date: today,
        },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateQualificationInput>(k: K, v: CreateQualificationInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSubmit = async () => {
    if (!draft.worker_id || !draft.qualification_name.trim()) {
      toast.error(t('validation.allRequired', 'All fields required'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(draft);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={initial ? t('qualifications.edit', 'Edit qualification') : t('qualifications.create', 'New qualification')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save', 'Save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('qualifications.worker', 'Worker')}>
            <Select value={draft.worker_id} onValueChange={(v) => set('worker_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.select', 'Select')} />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('qualifications.type', 'Type')}>
            <Select
              value={draft.qualification_type}
              onValueChange={(v) => set('qualification_type', v as QualificationType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label={t('qualifications.name', 'Certificate name')}>
          <Input
            value={draft.qualification_name}
            onChange={(e) => set('qualification_name', e.target.value)}
            placeholder="Permis tracteur cat. B"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('qualifications.issued', 'Issued')}>
            <Input
              type="date"
              value={draft.issued_date}
              onChange={(e) => set('issued_date', e.target.value)}
            />
          </Field>
          <Field label={t('qualifications.expiry', 'Expiry')}>
            <Input
              type="date"
              value={draft.expiry_date ?? ''}
              onChange={(e) => set('expiry_date', e.target.value || undefined)}
            />
          </Field>
        </div>
        <Field label={t('qualifications.authority', 'Issuing authority')}>
          <Input
            value={draft.issuing_authority ?? ''}
            onChange={(e) => set('issuing_authority', e.target.value || undefined)}
          />
        </Field>
        <Field label={t('qualifications.certificateUrl', 'Certificate URL')}>
          <Input
            value={draft.certificate_url ?? ''}
            onChange={(e) => set('certificate_url', e.target.value || undefined)}
            placeholder="https://..."
          />
        </Field>
        <Field label={t('common.notes', 'Notes')}>
          <Input
            value={draft.notes ?? ''}
            onChange={(e) => set('notes', e.target.value || undefined)}
          />
        </Field>
      </div>
    </ResponsiveDialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
