import { useMemo, useState, type ReactNode } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import {
  useSeparation,
  useUpdateFnf,
  useUpdateSeparation,
} from '@/hooks/useEmployeeLifecycle';
import type {
  FnfAsset,
  FnfLineItem,
  FnfStatus,
  Separation,
  SeparationStatus,
  UpdateFnfInput,
} from '@/lib/api/employee-lifecycle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';

export const Route = createFileRoute(
  '/_authenticated/(workforce)/workforce/separations/$separationId',
)({
  component: withRouteProtection(SeparationDetailPage, 'manage', 'Separation'),
});

const STATUSES: SeparationStatus[] = ['pending', 'notice_period', 'relieved', 'settled'];
const FNF_STATUSES: FnfStatus[] = ['pending', 'processing', 'settled'];

function SeparationDetailPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;
  const { separationId } = Route.useParams();

  const query = useSeparation(orgId, separationId);
  const updateSep = useUpdateSeparation();
  const updateFnf = useUpdateFnf();

  if (!orgId) return null;

  if (query.isLoading || !query.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const sep = query.data;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <Link
          to="/workforce/separations"
          className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          {t('separations.backToList', 'Back to separations')}
        </Link>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {sep.worker?.first_name} {sep.worker?.last_name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t(`separations.type.${sep.separation_type}`, sep.separation_type)}
            {sep.worker?.cin && ` · CIN ${sep.worker.cin}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge>{t(`separations.status.${sep.status}`, sep.status)}</Badge>
          <Badge variant="outline">FnF: {sep.fnf_status}</Badge>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('separations.timeline', 'Timeline')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t('separations.noticeDate', 'Notice date')} value={sep.notice_date} />
            <Row label={t('separations.relievingDate', 'Relieving date')} value={sep.relieving_date} />
            <Row label={t('common.created', 'Created')} value={new Date(sep.created_at).toLocaleDateString()} />
            {sep.fnf_settled_at && (
              <Row
                label={t('separations.fnfSettledAt', 'FnF settled')}
                value={new Date(sep.fnf_settled_at).toLocaleDateString()}
              />
            )}
            <div className="pt-3">
              <Label className="text-xs">{t('separations.changeStatus', 'Change status')}</Label>
              <Select
                value={sep.status}
                onValueChange={(v) =>
                  updateSep.mutate(
                    { orgId: orgId!, id: sep.id, data: { status: v as SeparationStatus } },
                    { onSuccess: () => toast.success(t('common.saved', 'Saved')) },
                  )
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`separations.status.${s}`, s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('separations.exitInterview', 'Exit interview')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label={t('separations.conducted', 'Conducted')}
              value={sep.exit_interview_conducted ? t('common.yes', 'Yes') : t('common.no', 'No')}
            />
            {sep.exit_interview_notes && (
              <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap pt-2 border-t">
                {sep.exit_interview_notes}
              </div>
            )}
            {!sep.exit_interview_conducted && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() =>
                  updateSep.mutate(
                    { orgId: orgId!, id: sep.id, data: { exit_interview_conducted: true } },
                    { onSuccess: () => toast.success(t('common.saved', 'Saved')) },
                  )
                }
              >
                {t('separations.markConducted', 'Mark as conducted')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <FnfSection key={sep.id} sep={sep} orgId={orgId!} onSave={updateFnf} />
    </div>
  );
}

function FnfSection({
  sep,
  orgId,
  onSave,
}: {
  sep: Separation;
  orgId: string;
  onSave: ReturnType<typeof useUpdateFnf>;
}) {
  const { t } = useTranslation();
  const [payables, setPayables] = useState<FnfLineItem[]>(sep.fnf_payables);
  const [receivables, setReceivables] = useState<FnfLineItem[]>(sep.fnf_receivables);
  const [assets, setAssets] = useState<FnfAsset[]>(sep.fnf_assets);
  const [status, setStatus] = useState<FnfStatus>(sep.fnf_status);

  const totalPayable = useMemo(
    () => payables.reduce((acc, l) => acc + Number(l.amount || 0), 0),
    [payables],
  );
  const totalReceivable = useMemo(
    () => receivables.reduce((acc, l) => acc + Number(l.amount || 0), 0),
    [receivables],
  );
  const net = totalPayable - totalReceivable;

  const save = () => {
    const data: UpdateFnfInput = {
      fnf_payables: payables,
      fnf_receivables: receivables,
      fnf_assets: assets,
      fnf_total_payable: totalPayable,
      fnf_total_receivable: totalReceivable,
      fnf_status: status,
    };
    onSave.mutate(
      { orgId, id: sep.id, data },
      { onSuccess: () => toast.success(t('common.saved', 'Saved')) },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {t('separations.fnf', 'Full & Final Settlement')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as FnfStatus)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FNF_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={save} disabled={onSave.isPending}>
              {onSave.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save', 'Save')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <LineItemList
          title={t('separations.payables', 'Payables (salary, leave encashment, gratuity…)')}
          items={payables}
          onChange={setPayables}
        />
        <LineItemList
          title={t('separations.receivables', 'Receivables (loans, advances, asset damage…)')}
          items={receivables}
          onChange={setReceivables}
        />
        <AssetList items={assets} onChange={setAssets} />

        <div className="grid grid-cols-3 gap-3 text-sm border-t pt-4">
          <Total label={t('separations.totalPayable', 'Total payable')} value={totalPayable} />
          <Total label={t('separations.totalReceivable', 'Total receivable')} value={totalReceivable} />
          <Total label={t('separations.netAmount', 'Net amount')} value={net} highlight />
        </div>
      </CardContent>
    </Card>
  );
}

function LineItemList({
  title,
  items,
  onChange,
}: {
  title: string;
  items: FnfLineItem[];
  onChange: (next: FnfLineItem[]) => void;
}) {
  const { t } = useTranslation();
  const update = (i: number, patch: Partial<FnfLineItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { label: '', amount: 0 }]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{title}</Label>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-3 h-3 mr-1" />
          {t('common.add', 'Add')}
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder={t('separations.label', 'Label')}
              value={it.label}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <Input
              className="w-32"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={it.amount}
              onChange={(e) => update(i, { amount: Number(e.target.value) })}
            />
            <Button variant="ghost" size="sm" onClick={() => remove(i)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        {!items.length && (
          <p className="text-xs text-gray-500">{t('separations.noLines', 'None.')}</p>
        )}
      </div>
    </div>
  );
}

function AssetList({
  items,
  onChange,
}: {
  items: FnfAsset[];
  onChange: (next: FnfAsset[]) => void;
}) {
  const { t } = useTranslation();
  const update = (i: number, patch: Partial<FnfAsset>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { asset: '', status: 'pending' }]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{t('separations.assets', 'Assets to recover')}</Label>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-3 h-3 mr-1" />
          {t('common.add', 'Add')}
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder={t('separations.assetLabel', 'Asset (e.g. Laptop, Uniform)')}
              value={it.asset}
              onChange={(e) => update(i, { asset: e.target.value })}
            />
            <Select
              value={it.status}
              onValueChange={(v) => update(i, { status: v as FnfAsset['status'] })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="returned">returned</SelectItem>
                <SelectItem value="damaged">damaged</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => remove(i)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        {!items.length && (
          <p className="text-xs text-gray-500">{t('separations.noLines', 'None.')}</p>
        )}
      </div>
    </div>
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

function Total({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-md border ${
        highlight ? 'bg-primary/5 border-primary/30' : ''
      }`}
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold ${highlight ? 'text-primary' : ''}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
