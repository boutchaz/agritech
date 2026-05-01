import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Building2, Users, Sprout } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import ModernPageHeader from '@/components/ModernPageHeader';
import { useFarms } from '@/hooks/useParcelsQuery';
import {
  useCreateSeasonalCampaign,
  useDeleteSeasonalCampaign,
  useSeasonalCampaigns,
  useUpdateSeasonalCampaign,
} from '@/hooks/useAgroHr';
import type {
  CampaignStatus,
  CreateSeasonalCampaignInput,
  SeasonType,
  SeasonalCampaign,
} from '@/lib/api/agro-hr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export const Route = createFileRoute(
  '/_authenticated/(workforce)/workforce/seasonal-campaigns',
)({
  component: withRouteProtection(SeasonalCampaignsPage, 'manage', 'SeasonalCampaign'),
});

const SEASONS: SeasonType[] = ['planting', 'harvest', 'pruning', 'treatment', 'other'];
const STATUSES: CampaignStatus[] = ['planning', 'recruiting', 'active', 'completed', 'cancelled'];

function SeasonalCampaignsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SeasonalCampaign | null>(null);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');

  const farms = useFarms(orgId ?? undefined);
  const query = useSeasonalCampaigns(orgId, statusFilter === 'all' ? {} : { status: statusFilter });
  const create = useCreateSeasonalCampaign();
  const update = useUpdateSeasonalCampaign();
  const remove = useDeleteSeasonalCampaign();

  if (!orgId) return null;

  const items = query.data ?? [];
  const farmList = (farms.data ?? []).map((f) => ({ id: f.id, name: f.name }));
  const farmName = (id: string) => farmList.find((f) => f.id === id)?.name ?? '—';

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization?.name ?? '', path: '/dashboard' },
          { icon: Users, label: t('nav.workforce', 'Workforce'), path: '/workforce/employees' },
          { icon: Sprout, label: t('seasonalCampaigns.title', 'Seasonal Campaigns'), isActive: true },
        ]}
        title={t('seasonalCampaigns.title', 'Seasonal Campaigns')}
        subtitle={t(
          'seasonalCampaigns.subtitle',
          'Plan harvest, planting and treatment campaigns. Track labour budget vs actual.',
        )}
        actions={
          <>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setCreating(true)} disabled={!farmList.length}>
              <Plus className="w-4 h-4 mr-2" />
              {t('common.create', 'Create')}
            </Button>
          </>
        }
      />
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {query.isLoading ? (
        <Loading />
      ) : !items.length ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {t('seasonalCampaigns.empty', 'No campaigns yet.')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const budgetUtil =
              c.estimated_labor_budget && c.estimated_labor_budget > 0
                ? Math.round((c.actual_labor_cost / c.estimated_labor_budget) * 100)
                : null;
            return (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">{c.name}</CardTitle>
                    <Badge>{c.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Row label={t('seasonalCampaigns.farm', 'Farm')} value={farmName(c.farm_id)} />
                  <Row label={t('seasonalCampaigns.seasonType', 'Type')} value={c.season_type} />
                  {c.crop_type && <Row label={t('seasonalCampaigns.crop', 'Crop')} value={c.crop_type} />}
                  <Row label={t('seasonalCampaigns.dates', 'Dates')} value={`${c.start_date} → ${c.end_date}`} />
                  {c.target_worker_count != null && (
                    <Row label={t('seasonalCampaigns.target', 'Target workers')} value={c.target_worker_count} />
                  )}
                  {c.estimated_labor_budget != null && (
                    <Row
                      label={t('seasonalCampaigns.budget', 'Budget')}
                      value={`${c.actual_labor_cost.toLocaleString()} / ${c.estimated_labor_budget.toLocaleString()}${budgetUtil != null ? ` (${budgetUtil}%)` : ''}`}
                    />
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      {t('common.edit', 'Edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!confirm(t('seasonalCampaigns.confirmDelete', 'Delete?'))) return;
                        remove.mutate(
                          { orgId, id: c.id },
                          { onSuccess: () => toast.success(t('common.deleted', 'Deleted')) },
                        );
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {t('common.delete', 'Delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <FormDialog
          farms={farmList}
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

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );
}

function FormDialog({
  farms,
  initial,
  onClose,
  onSubmit,
}: {
  farms: Array<{ id: string; name: string }>;
  initial: SeasonalCampaign | null;
  onClose: () => void;
  onSubmit: (data: CreateSeasonalCampaignInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<CreateSeasonalCampaignInput>(() =>
    initial
      ? {
          farm_id: initial.farm_id,
          name: initial.name,
          season_type: initial.season_type,
          crop_type: initial.crop_type ?? undefined,
          start_date: initial.start_date,
          end_date: initial.end_date,
          target_worker_count: initial.target_worker_count ?? undefined,
          estimated_labor_budget: initial.estimated_labor_budget ?? undefined,
          status: initial.status,
        }
      : {
          farm_id: farms[0]?.id ?? '',
          name: '',
          season_type: 'harvest',
          start_date: today,
          end_date: today,
          status: 'planning',
        },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof CreateSeasonalCampaignInput>(
    k: K,
    v: CreateSeasonalCampaignInput[K],
  ) => setDraft((d) => ({ ...d, [k]: v }));

  const handleSubmit = async () => {
    if (!draft.name.trim() || !draft.farm_id) {
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
      title={initial ? t('seasonalCampaigns.edit', 'Edit campaign') : t('seasonalCampaigns.create', 'New campaign')}
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
        <Field label={t('common.name', 'Name')}>
          <Input
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Récolte Agrumes 2026"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('seasonalCampaigns.farm', 'Farm')}>
            <Select value={draft.farm_id} onValueChange={(v) => set('farm_id', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('seasonalCampaigns.seasonType', 'Type')}>
            <Select value={draft.season_type} onValueChange={(v) => set('season_type', v as SeasonType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEASONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label={t('seasonalCampaigns.crop', 'Crop type')}>
          <Input
            value={draft.crop_type ?? ''}
            onChange={(e) => set('crop_type', e.target.value || undefined)}
            placeholder="Citrus, Olive..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('seasonalCampaigns.startDate', 'Start date')}>
            <Input type="date" value={draft.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </Field>
          <Field label={t('seasonalCampaigns.endDate', 'End date')}>
            <Input type="date" value={draft.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('seasonalCampaigns.target', 'Target workers')}>
            <Input
              type="number"
              min="0"
              value={draft.target_worker_count ?? ''}
              onChange={(e) =>
                set('target_worker_count', e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
          </Field>
          <Field label={t('seasonalCampaigns.estimatedBudget', 'Estimated budget')}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={draft.estimated_labor_budget ?? ''}
              onChange={(e) =>
                set('estimated_labor_budget', e.target.value === '' ? undefined : Number(e.target.value))
              }
            />
          </Field>
        </div>
        <Field label={t('common.status', 'Status')}>
          <Select value={draft.status ?? 'planning'} onValueChange={(v) => set('status', v as CampaignStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
