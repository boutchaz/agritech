import { useState, type ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, MapPin, Building2, CircleDot } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useFarms } from '@/hooks/useParcelsQuery';
import {
  useGeofences,
  useCreateGeofence,
  useUpdateGeofence,
  useDeleteGeofence,
} from '@/hooks/useAttendance';
import type { FarmGeofence, UpsertGeofenceInput } from '@/lib/api/attendance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/geofences')({
  component: withRouteProtection(GeofencesPage, 'read', 'Attendance'),
});

function GeofencesPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;
  const { data: farms = [] } = useFarms(orgId ?? undefined);

  const [farmFilter, setFarmFilter] = useState<string>('all');
  const [editing, setEditing] = useState<FarmGeofence | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useGeofences(farmFilter === 'all' ? undefined : farmFilter);
  const createMut = useCreateGeofence();
  const updateMut = useUpdateGeofence();
  const deleteMut = useDeleteGeofence();

  if (!orgId) return null;

  const geofences = query.data ?? [];

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('common.create', 'Create')}
        </Button>
      </div>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Select value={farmFilter} onValueChange={setFarmFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={t('geofences.filterByFarm', 'Filter by farm')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('geofences.allFarms', 'All farms')}
              </SelectItem>
              {farms.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : geofences.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-gray-500">
              {t(
                'geofences.empty',
                'No geofences yet — create one to enable location-based attendance.',
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {geofences.map((g) => {
              const farm = farms.find((f) => f.id === g.farm_id);
              return (
                <Card key={g.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{g.name}</CardTitle>
                      {g.is_active ? (
                        <Badge>{t('common.active', 'Active')}</Badge>
                      ) : (
                        <Badge variant="secondary">
                          {t('common.inactive', 'Inactive')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <Row
                      label={
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {t('geofences.farm', 'Farm')}
                        </span>
                      }
                      value={farm?.name ?? t('geofences.orgWide', 'Org-wide')}
                    />
                    <Row
                      label={
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {t('geofences.coordinates', 'Coordinates')}
                        </span>
                      }
                      value={`${g.lat.toFixed(6)}, ${g.lng.toFixed(6)}`}
                    />
                    <Row
                      label={
                        <span className="flex items-center gap-1">
                          <CircleDot className="w-3 h-3" />
                          {t('geofences.radius', 'Radius')}
                        </span>
                      }
                      value={
                        g.radius_m >= 1000
                          ? `${(g.radius_m / 1000).toFixed(1)} km`
                          : `${g.radius_m} m`
                      }
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(g)}>
                        <Pencil className="w-3 h-3 mr-1" />
                        {t('common.edit', 'Edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            !confirm(
                              t('geofences.confirmDelete', 'Delete this geofence?'),
                            )
                          )
                            return;
                          deleteMut.mutate(g.id, {
                            onSuccess: () =>
                              toast.success(t('common.deleted', 'Deleted')),
                          });
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
          <GeofenceFormDialog
            initial={editing}
            farms={farms}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSubmit={async (data) => {
              if (editing) {
                await updateMut.mutateAsync({ id: editing.id, updates: data });
                toast.success(t('common.saved', 'Saved'));
              } else {
                await createMut.mutateAsync(data);
                toast.success(t('common.created', 'Created'));
              }
            }}
          />
        )}
      </div>
    </>
  );
}

function GeofenceFormDialog({
  initial,
  farms,
  onClose,
  onSubmit,
}: {
  initial: FarmGeofence | null;
  farms: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (data: UpsertGeofenceInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<UpsertGeofenceInput>(() =>
    initial
      ? {
          farm_id: initial.farm_id ?? undefined,
          name: initial.name,
          lat: initial.lat,
          lng: initial.lng,
          radius_m: initial.radius_m,
          is_active: initial.is_active,
        }
      : {
          name: '',
          lat: 33.9716,
          lng: -6.8498,
          radius_m: 250,
          is_active: true,
        },
  );
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof UpsertGeofenceInput>(
    key: K,
    value: UpsertGeofenceInput[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSubmit = async () => {
    if (!draft.name.trim()) {
      toast.error(t('validation.nameRequired', 'Name is required'));
      return;
    }
    if (draft.lat === undefined || draft.lng === undefined) {
      toast.error(t('geofences.coordsRequired', 'Coordinates are required'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(draft);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? t('common.errorOccurred', 'An error occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={
        initial ? t('geofences.edit', 'Edit geofence') : t('geofences.create', 'Create geofence')
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t('common.save', 'Save')
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={t('common.name', 'Name')}>
            <Input
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t('geofences.namePlaceholder', 'Farm HQ, Field entrance...')}
            />
          </Field>
          <Field label={t('geofences.farm', 'Farm')}>
            <Select
              value={draft.farm_id ?? '_none'}
              onValueChange={(v) => set('farm_id', v === '_none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('geofences.orgWide', 'Org-wide')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">
                  {t('geofences.orgWide', 'Org-wide')}
                </SelectItem>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('geofences.latitude', 'Latitude')}>
            <Input
              type="number"
              step="0.000001"
              min={-90}
              max={90}
              value={draft.lat}
              onChange={(e) => set('lat', parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label={t('geofences.longitude', 'Longitude')}>
            <Input
              type="number"
              step="0.000001"
              min={-180}
              max={180}
              value={draft.lng}
              onChange={(e) => set('lng', parseFloat(e.target.value) || 0)}
            />
          </Field>
        </div>

        <Field
          label={`${t('geofences.radius', 'Radius')} (${t('geofences.meters', 'meters')})`}
        >
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={10}
              max={5000}
              value={draft.radius_m ?? 250}
              onChange={(e) => set('radius_m', Math.min(5000, Math.max(10, Number(e.target.value))))}
              className="w-28"
            />
            <input
              type="range"
              min={10}
              max={5000}
              step={10}
              value={draft.radius_m ?? 250}
              onChange={(e) => set('radius_m', Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-20 text-right">
              {(draft.radius_m ?? 250) >= 1000
                ? `${((draft.radius_m ?? 250) / 1000).toFixed(1)} km`
                : `${draft.radius_m ?? 250} m`}
            </span>
          </div>
        </Field>

        <ToggleRow
          label={t('common.active', 'Active')}
          checked={!!draft.is_active}
          onChange={(v) => set('is_active', v)}
        />
      </div>
    </ResponsiveDialog>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span>{value}</span>
    </div>
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

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="cursor-pointer flex-1">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
