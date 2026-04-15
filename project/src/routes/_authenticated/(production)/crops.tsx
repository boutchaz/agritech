import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useCrops, useCreateCrop } from '@/hooks/useCrops';
import { useFarms } from '@/hooks/useParcelsQuery';
import { useParcelsByFarm } from '@/hooks/useParcelsQuery';
import { useVarieties } from '@/hooks/useReferenceData';
import type { Crop } from '@/lib/api/crops';
import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLoader, SectionLoader } from '@/components/ui/loader';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  ListPageLayout,
  ListPageHeader,
  FilterBar,
  ResponsiveList,
  DataTablePagination,
  useServerTableState,
} from '@/components/ui/data-table';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Label } from '@/components/ui/label';
import { Sprout, Plus, Building2, Calendar, MapPin } from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { format } from 'date-fns';
import { toast } from 'sonner';

function CropsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  const [showForm, setShowForm] = useState(false);
  const [filterFarm, setFilterFarm] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: crops = [], isLoading } = useCrops(
    filterFarm !== 'all' ? { farmId: filterFarm } : undefined,
  );
  const { data: farms = [] } = useFarms(organizationId);
  const farmsArray = Array.isArray(farms) ? farms : [];

  const tableState = useServerTableState({
    defaultPageSize: 12,
    defaultSort: { key: 'planting_date', direction: 'desc' },
  });

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = [...crops];
    if (filterStatus !== 'all') {
      result = result.filter((c) => c.status === filterStatus);
    }
    if (tableState.search) {
      const q = tableState.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.farm_name?.toLowerCase().includes(q) ||
          c.parcel_name?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [crops, filterStatus, tableState.search]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / tableState.pageSize);
  const paginatedItems = useMemo(() => {
    const start = (tableState.page - 1) * tableState.pageSize;
    return filtered.slice(start, start + tableState.pageSize);
  }, [filtered, tableState.page, tableState.pageSize]);

  // Stats
  const stats = useMemo(() => {
    if (!crops.length) return null;
    const totalArea = crops.reduce((s, c) => s + (c.planted_area || 0), 0);
    const statuses: Record<string, number> = {};
    for (const c of crops) {
      const st = c.status || 'unknown';
      statuses[st] = (statuses[st] || 0) + 1;
    }
    return { total: crops.length, totalArea: totalArea.toFixed(1), statuses };
  }, [crops]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'planted': return 'bg-blue-100 text-blue-800';
      case 'growing': return 'bg-green-100 text-green-800';
      case 'harvested': return 'bg-amber-100 text-amber-800';
      case 'dormant': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentOrganization) return <PageLoader />;

  return (
    <>
      <ModernPageHeader
        breadcrumbs={[
          { icon: Building2, label: currentOrganization.name, path: '/dashboard' },
          { icon: Sprout, label: t('crops.pageTitle', 'Cultures'), isActive: true },
        ]}
        title={t('crops.pageTitle', 'Cultures')}
        subtitle={t('crops.description', 'Gérez vos plantations et suivez la croissance.')}
      />

      <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        <ListPageLayout
          header={
            <ListPageHeader
              variant="shell"
              actions={
                <Button variant="green" onClick={() => setShowForm(true)} className="w-full sm:w-auto justify-center">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('crops.addCrop', 'Nouvelle culture')}
                </Button>
              }
            />
          }
          stats={stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('crops.stats.total', 'Total cultures')}</CardTitle>
                  <Sprout className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('crops.stats.area', 'Surface plantée')}</CardTitle>
                  <MapPin className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.totalArea} ha</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('crops.stats.growing', 'En croissance')}</CardTitle>
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.statuses['growing'] || 0}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{t('crops.stats.harvested', 'Récoltées')}</CardTitle>
                  <Sprout className="w-4 h-4 text-amber-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{stats.statuses['harvested'] || 0}</div></CardContent>
              </Card>
            </div>
          ) : undefined}
          filters={
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
              <div className="space-y-3">
                <FilterBar
                  searchValue={tableState.search}
                  onSearchChange={tableState.setSearch}
                  searchPlaceholder={t('crops.search', 'Rechercher par nom, ferme, parcelle...')}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select value={filterFarm} onValueChange={setFilterFarm}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('crops.allFarms', 'Toutes les fermes')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('crops.allFarms', 'Toutes les fermes')}</SelectItem>
                      {farmsArray.map((f: { id: string; name: string }) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('crops.allStatuses', 'Tous les statuts')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('crops.allStatuses', 'Tous les statuts')}</SelectItem>
                      <SelectItem value="planted">{t('crops.status.planted', 'Planté')}</SelectItem>
                      <SelectItem value="growing">{t('crops.status.growing', 'En croissance')}</SelectItem>
                      <SelectItem value="harvested">{t('crops.status.harvested', 'Récolté')}</SelectItem>
                      <SelectItem value="dormant">{t('crops.status.dormant', 'Dormant')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          }
          pagination={totalItems > tableState.pageSize ? (
            <DataTablePagination
              page={tableState.page}
              pageSize={tableState.pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={tableState.setPage}
              onPageSizeChange={tableState.setPageSize}
            />
          ) : undefined}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
            {isLoading ? (
              <SectionLoader />
            ) : paginatedItems.length === 0 ? (
              <EmptyState
                variant="card"
                icon={Sprout}
                title={tableState.search ? t('crops.noResults', 'Aucun résultat') : t('crops.noCrops', 'Aucune culture enregistrée')}
                description={tableState.search
                  ? t('crops.noResultsDescription', 'Essayez d\'ajuster vos critères de recherche.')
                  : t('crops.noCropsDescription', 'Enregistrez vos plantations pour suivre la croissance et planifier les récoltes.')}
                action={!tableState.search ? { label: t('crops.addCrop', 'Nouvelle culture'), onClick: () => setShowForm(true) } : undefined}
              />
            ) : (
              <ResponsiveList
                items={paginatedItems}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyIcon={Sprout}
                emptyTitle={t('crops.noCrops', 'Aucune culture')}
                emptyMessage={t('crops.noCropsDescription', '')}
                className="p-3 lg:p-0"
                renderCard={(crop: Crop) => (
                  <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{crop.name}</p>
                        {crop.farm_name && <p className="text-xs text-gray-500">{crop.farm_name}</p>}
                      </div>
                      {crop.status && <Badge className={getStatusColor(crop.status)}>{t(`crops.status.${crop.status}`, crop.status)}</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">{t('crops.parcel', 'Parcelle')}</p>
                        <p className="font-medium truncate">{crop.parcel_name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('crops.area', 'Surface')}</p>
                        <p className="font-medium">{crop.planted_area ? `${crop.planted_area} ha` : '—'}</p>
                      </div>
                      {crop.planting_date && (
                        <div>
                          <p className="text-xs text-gray-500">{t('crops.plantingDate', 'Planté')}</p>
                          <p className="font-medium">{format(new Date(crop.planting_date), 'dd/MM/yyyy')}</p>
                        </div>
                      )}
                      {crop.expected_harvest_date && (
                        <div>
                          <p className="text-xs text-gray-500">{t('crops.expectedHarvest', 'Récolte prévue')}</p>
                          <p className="font-medium">{format(new Date(crop.expected_harvest_date), 'dd/MM/yyyy')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                renderTableHeader={
                  <TableRow>
                    <TableHead>{t('crops.name', 'Nom')}</TableHead>
                    <TableHead>{t('crops.farm', 'Ferme')}</TableHead>
                    <TableHead>{t('crops.parcel', 'Parcelle')}</TableHead>
                    <TableHead>{t('crops.area', 'Surface')}</TableHead>
                    <TableHead>{t('crops.plantingDate', 'Date plantation')}</TableHead>
                    <TableHead>{t('crops.expectedHarvest', 'Récolte prévue')}</TableHead>
                    <TableHead>{t('crops.status.label', 'Statut')}</TableHead>
                  </TableRow>
                }
                renderTable={(crop: Crop) => (
                  <>
                    <TableCell className="font-medium">{crop.name}</TableCell>
                    <TableCell>{crop.farm_name || '—'}</TableCell>
                    <TableCell>{crop.parcel_name || '—'}</TableCell>
                    <TableCell>{crop.planted_area ? `${crop.planted_area} ha` : '—'}</TableCell>
                    <TableCell>{crop.planting_date ? format(new Date(crop.planting_date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell>{crop.expected_harvest_date ? format(new Date(crop.expected_harvest_date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell>
                      {crop.status ? <Badge className={getStatusColor(crop.status)}>{t(`crops.status.${crop.status}`, crop.status)}</Badge> : '—'}
                    </TableCell>
                  </>
                )}
              />
            )}
          </div>
        </ListPageLayout>
      </div>

      <CropFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        farms={farmsArray}
        defaultFarmId={filterFarm !== 'all' ? filterFarm : undefined}
      />
    </>
  );
}

// ── Form Dialog ──

function CropFormDialog({
  open,
  onOpenChange,
  farms,
  defaultFarmId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farms: { id: string; name: string }[];
  defaultFarmId?: string;
}) {
  const { t } = useTranslation();
  const createCrop = useCreateCrop();

  const [farmId, setFarmId] = useState(defaultFarmId || '');
  const { data: parcels = [] } = useParcelsByFarm(farmId || undefined);
  const { data: varieties = [] } = useVarieties();

  const schema = useMemo(() => z.object({
    farm_id: z.string().min(1, t('validation.required', 'Requis')),
    variety_id: z.string().min(1, t('validation.required', 'Requis')),
    name: z.string().min(1, t('validation.required', 'Requis')),
    parcel_id: z.string().optional(),
    planting_date: z.string().optional(),
    expected_harvest_date: z.string().optional(),
    planted_area: z.coerce.number().optional(),
    notes: z.string().optional(),
  }), [t]);

  type FormData = z.input<typeof schema>;
  type SubmitData = z.output<typeof schema>;

  const form = useForm<FormData, unknown, SubmitData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      farm_id: defaultFarmId || '',
      variety_id: '',
      name: '',
      parcel_id: '',
      planting_date: '',
      expected_harvest_date: '',
      planted_area: undefined,
      notes: '',
    },
  });

  const watchedFarmId = form.watch('farm_id');
  if (watchedFarmId !== farmId) setFarmId(watchedFarmId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: any) => {
    try {
      await createCrop.mutateAsync({
        farm_id: data.farm_id,
        variety_id: data.variety_id,
        name: data.name,
        parcel_id: data.parcel_id || undefined,
        planting_date: data.planting_date || undefined,
        expected_harvest_date: data.expected_harvest_date || undefined,
        planted_area: data.planted_area,
        notes: data.notes || undefined,
      });
      toast.success(t('crops.createSuccess', 'Culture créée avec succès'));
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error(t('crops.createError', 'Échec de la création de la culture'));
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('crops.addCrop', 'Nouvelle culture')}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Annuler')}
          </Button>
          <Button type="submit" form="crop-form" variant="green" disabled={createCrop.isPending}>
            {createCrop.isPending ? t('common.creating', 'Création...') : t('common.create', 'Créer')}
          </Button>
        </>
      }
    >
      <form id="crop-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('crops.farm', 'Ferme')} *</Label>
            <Select value={form.watch('farm_id')} onValueChange={(v) => { form.setValue('farm_id', v); form.trigger('farm_id'); }}>
              <SelectTrigger className={form.formState.errors.farm_id ? 'border-red-400' : ''}>
                <SelectValue placeholder={t('crops.selectFarm', 'Sélectionner une ferme')} />
              </SelectTrigger>
              <SelectContent>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.farm_id && <p className="text-sm text-red-500">{form.formState.errors.farm_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('crops.variety', 'Variété')} *</Label>
            <Select value={form.watch('variety_id')} onValueChange={(v) => { form.setValue('variety_id', v); form.trigger('variety_id'); }}>
              <SelectTrigger className={form.formState.errors.variety_id ? 'border-red-400' : ''}>
                <SelectValue placeholder={t('crops.selectVariety', 'Sélectionner une variété')} />
              </SelectTrigger>
              <SelectContent>
                {(varieties || []).map((v) => (
                  <SelectItem key={String((v as Record<string, unknown>).id)} value={String((v as Record<string, unknown>).id)}>{String((v as Record<string, unknown>).name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.variety_id && <p className="text-sm text-red-500">{form.formState.errors.variety_id.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('crops.cropName', 'Nom de la culture')} *</Label>
          <Input {...form.register('name')} placeholder={t('crops.cropNamePlaceholder', 'Ex: Oliviers parcelle B3')} className={form.formState.errors.name ? 'border-red-400' : ''} />
          {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t('crops.parcel', 'Parcelle')}</Label>
          <Select value={form.watch('parcel_id') || '__none__'} onValueChange={(v) => form.setValue('parcel_id', v === '__none__' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder={t('crops.selectParcel', 'Sélectionner une parcelle')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t('crops.noParcel', 'Aucune parcelle')}</SelectItem>
              {(parcels || []).map((p: { id: string; name: string }) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('crops.plantingDate', 'Date de plantation')}</Label>
            <Input {...form.register('planting_date')} type="date" />
          </div>
          <div className="space-y-2">
            <Label>{t('crops.expectedHarvest', 'Date de récolte prévue')}</Label>
            <Input {...form.register('expected_harvest_date')} type="date" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('crops.plantedArea', 'Surface plantée (ha)')}</Label>
          <Input {...form.register('planted_area')} type="number" step="0.01" placeholder="0.00" />
        </div>

        <div className="space-y-2">
          <Label>{t('crops.notes', 'Notes')}</Label>
          <Textarea {...form.register('notes')} placeholder={t('crops.notesPlaceholder', 'Observations...')} />
        </div>
      </form>
    </ResponsiveDialog>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/crops')({
  component: withRouteProtection(CropsPage, 'read', 'CropCycle'),
});
