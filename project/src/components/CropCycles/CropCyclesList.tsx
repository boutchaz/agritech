import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Edit2,
  Eye,
  Calendar,
  MapPin,
  Sprout,
  CheckCircle,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  Filter,
  MoreHorizontal,
} from 'lucide-react';

import { useAuth } from '@/components/MultiTenantAuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import {
  useCropCycles,
  useCropCyclePnL,
  useCreateCropCycle,
  useUpdateCropCycle,
  useCompleteCropCycle,
  useCampaigns,
  useFiscalYears,
} from '@/hooks/useAgriculturalAccounting';
import { useFarms } from '@/hooks/useMultiTenantData';
import { useParcelsByFarm } from '@/hooks/useParcelsQuery';
import type {
  CropCycle,
  CropCycleStatus,
  Season,
  CreateCropCycleInput,
} from '@/types/agricultural-accounting';
import { generateCycleCode, MOROCCO_CROP_TEMPLATES } from '@/types/agricultural-accounting';

const cropCycleSchema = z.object({
  farm_id: z.string().min(1, 'Farm is required'),
  parcel_id: z.string().optional(),
  crop_type: z.string().min(1, 'Crop type is required'),
  variety_name: z.string().optional(),
  cycle_code: z.string().min(1, 'Cycle code is required'),
  cycle_name: z.string().optional(),
  campaign_id: z.string().optional(),
  fiscal_year_id: z.string().optional(),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']).optional(),
  planting_date: z.string().optional(),
  expected_harvest_start: z.string().optional(),
  expected_harvest_end: z.string().optional(),
  planted_area_ha: z.coerce.number().positive().optional(),
  expected_yield_per_ha: z.coerce.number().positive().optional(),
  yield_unit: z.string().default('kg'),
  notes: z.string().optional(),
});

type CropCycleFormData = z.infer<typeof cropCycleSchema>;

export function CropCyclesList() {
  const { hasRole, currentOrganization } = useAuth();
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<CropCycle | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [filterCampaignId, setFilterCampaignId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const canManage = hasRole(['organization_admin', 'system_admin', 'farm_manager', 'farm_worker']);
  const currencySymbol = currentOrganization?.currency_symbol || 'MAD';

  const { data: cropCycles = [], isLoading } = useCropCycles({
    campaign_id: filterCampaignId || undefined,
    status: (filterStatus as CropCycleStatus) || undefined,
  });
  const { data: pnlData = [] } = useCropCyclePnL({
    campaign_id: filterCampaignId || undefined,
  });
  const { data: campaigns = [] } = useCampaigns();
  const { data: fiscalYears = [] } = useFiscalYears();
  const { data: farms = [] } = useFarms();
  const { data: parcels = [] } = useParcelsByFarm(selectedFarmId || undefined);

  const createMutation = useCreateCropCycle();
  const updateMutation = useUpdateCropCycle();
  const completeMutation = useCompleteCropCycle();

  const form = useForm<CropCycleFormData>({
    resolver: zodResolver(cropCycleSchema),
    defaultValues: {
      farm_id: '',
      parcel_id: '',
      crop_type: '',
      variety_name: '',
      cycle_code: '',
      cycle_name: '',
      campaign_id: '',
      fiscal_year_id: '',
      yield_unit: 'kg',
      notes: '',
    },
  });

  const watchedFarmId = form.watch('farm_id');
  const watchedCropType = form.watch('crop_type');

  if (watchedFarmId && watchedFarmId !== selectedFarmId) {
    setSelectedFarmId(watchedFarmId);
  }

  const handleOpenDialog = (cycle?: CropCycle) => {
    if (cycle) {
      setEditingCycle(cycle);
      setSelectedFarmId(cycle.farm_id);
      form.reset({
        farm_id: cycle.farm_id,
        parcel_id: cycle.parcel_id || '',
        crop_type: cycle.crop_type,
        variety_name: cycle.variety_name || '',
        cycle_code: cycle.cycle_code,
        cycle_name: cycle.cycle_name || '',
        campaign_id: cycle.campaign_id || '',
        fiscal_year_id: cycle.fiscal_year_id || '',
        season: cycle.season || undefined,
        planting_date: cycle.planting_date || '',
        expected_harvest_start: cycle.expected_harvest_start || '',
        expected_harvest_end: cycle.expected_harvest_end || '',
        planted_area_ha: cycle.planted_area_ha || undefined,
        expected_yield_per_ha: cycle.expected_yield_per_ha || undefined,
        yield_unit: cycle.yield_unit,
        notes: cycle.notes || '',
      });
    } else {
      setEditingCycle(null);
      const currentCampaign = campaigns.find(c => c.is_current);
      const currentFiscalYear = fiscalYears.find(fy => fy.is_current);
      form.reset({
        farm_id: farms[0]?.id || '',
        parcel_id: '',
        crop_type: '',
        variety_name: '',
        cycle_code: '',
        cycle_name: '',
        campaign_id: currentCampaign?.id || '',
        fiscal_year_id: currentFiscalYear?.id || '',
        yield_unit: 'kg',
        notes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCycle(null);
    form.reset();
  };

  const generateCode = () => {
    const cropType = form.getValues('crop_type');
    const parcelId = form.getValues('parcel_id');
    const parcel = parcels.find(p => p.id === parcelId);
    const template = Object.values(MOROCCO_CROP_TEMPLATES).find(
      t => t.name.toLowerCase().includes(cropType.toLowerCase())
    );
    const prefix = template?.code_prefix || cropType.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const parcelCode = parcel?.code || parcel?.name?.substring(0, 3).toUpperCase() || 'P01';
    const code = generateCycleCode(prefix, year, parcelCode);
    form.setValue('cycle_code', code);
  };

  const onSubmit = async (data: CropCycleFormData) => {
    try {
      if (editingCycle) {
        await updateMutation.mutateAsync({
          id: editingCycle.id,
          status: editingCycle.status,
          actual_harvest_start: data.expected_harvest_start,
          actual_harvest_end: data.expected_harvest_end,
          notes: data.notes,
        });
      } else {
        await createMutation.mutateAsync({
          ...data,
          parcel_id: data.parcel_id || undefined,
          variety_name: data.variety_name || undefined,
          cycle_name: data.cycle_name || undefined,
          campaign_id: data.campaign_id || undefined,
          fiscal_year_id: data.fiscal_year_id || undefined,
          season: data.season,
          planting_date: data.planting_date || undefined,
          expected_harvest_start: data.expected_harvest_start || undefined,
          expected_harvest_end: data.expected_harvest_end || undefined,
          planted_area_ha: data.planted_area_ha,
          expected_yield_per_ha: data.expected_yield_per_ha,
          expected_total_yield: data.planted_area_ha && data.expected_yield_per_ha
            ? data.planted_area_ha * data.expected_yield_per_ha
            : undefined,
          notes: data.notes || undefined,
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save crop cycle:', error);
    }
  };

  const handleComplete = async (cycleId: string) => {
    try {
      await completeMutation.mutateAsync(cycleId);
    } catch (error) {
      console.error('Failed to complete cycle:', error);
    }
  };

  const getStatusBadge = (status: CropCycleStatus) => {
    const config: Record<CropCycleStatus, { icon: typeof Play; color: string; label: string }> = {
      planned: { icon: Pause, color: 'bg-gray-100 text-gray-800', label: t('cropCycles.status.planned', 'Planned') },
      land_prep: { icon: Sprout, color: 'bg-yellow-100 text-yellow-800', label: t('cropCycles.status.land_prep', 'Land Prep') },
      growing: { icon: Play, color: 'bg-green-100 text-green-800', label: t('cropCycles.status.growing', 'Growing') },
      harvesting: { icon: TrendingUp, color: 'bg-blue-100 text-blue-800', label: t('cropCycles.status.harvesting', 'Harvesting') },
      completed: { icon: CheckCircle, color: 'bg-purple-100 text-purple-800', label: t('cropCycles.status.completed', 'Completed') },
      cancelled: { icon: Pause, color: 'bg-red-100 text-red-800', label: t('cropCycles.status.cancelled', 'Cancelled') },
    };
    const { icon: Icon, color, label } = config[status];
    return (
      <Badge variant="outline" className={color}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getPnLForCycle = (cycleId: string) => pnlData.find(p => p.id === cycleId);

  const totals = cropCycles.reduce(
    (acc, c) => ({
      area: acc.area + (c.planted_area_ha || 0),
      costs: acc.costs + c.total_costs,
      revenue: acc.revenue + c.total_revenue,
      profit: acc.profit + c.net_profit,
    }),
    { area: 0, costs: 0, revenue: 0, profit: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sprout className="h-6 w-6 text-green-600" />
            {t('cropCycles.title', 'Crop Cycles')}
          </h2>
          <p className="text-muted-foreground">
            {t('cropCycles.description', 'Track production cycles from planting to harvest with full cost attribution.')}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('cropCycles.addNew', 'New Cycle')}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('cropCycles.metrics.totalArea', 'Total Area')}</CardDescription>
            <CardTitle className="text-2xl">{totals.area.toFixed(1)} ha</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('cropCycles.metrics.totalCosts', 'Total Costs')}</CardDescription>
            <CardTitle className="text-2xl">{currencySymbol} {totals.costs.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('cropCycles.metrics.totalRevenue', 'Total Revenue')}</CardDescription>
            <CardTitle className="text-2xl">{currencySymbol} {totals.revenue.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('cropCycles.metrics.netProfit', 'Net Profit')}</CardDescription>
            <CardTitle className={`text-2xl ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currencySymbol} {totals.profit.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={filterCampaignId || '__all__'} onValueChange={(v) => setFilterCampaignId(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t('cropCycles.filter.campaign', 'All Campaigns')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('cropCycles.filter.allCampaigns', 'All Campaigns')}</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus || '__all__'} onValueChange={(v) => setFilterStatus(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('cropCycles.filter.status', 'All Statuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('cropCycles.filter.allStatuses', 'All Statuses')}</SelectItem>
            <SelectItem value="planned">{t('cropCycles.status.planned', 'Planned')}</SelectItem>
            <SelectItem value="growing">{t('cropCycles.status.growing', 'Growing')}</SelectItem>
            <SelectItem value="harvesting">{t('cropCycles.status.harvesting', 'Harvesting')}</SelectItem>
            <SelectItem value="completed">{t('cropCycles.status.completed', 'Completed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('cropCycles.loading', 'Loading crop cycles...')}
        </div>
      ) : cropCycles.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('cropCycles.empty', 'No crop cycles found. Create your first cycle to start tracking production.')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cropCycles.map((cycle) => {
            const pnl = getPnLForCycle(cycle.id);
            return (
              <Card key={cycle.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{cycle.cycle_name || cycle.crop_type}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1 rounded">{cycle.cycle_code}</code>
                        {getStatusBadge(cycle.status)}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(cycle)}>
                          <Edit2 className="h-4 w-4 mr-2" /> {t('common.edit', 'Edit')}
                        </DropdownMenuItem>
                        {cycle.status !== 'completed' && cycle.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={() => handleComplete(cycle.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" /> {t('cropCycles.complete', 'Mark Complete')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {pnl?.farm_name || 'Unknown Farm'}
                    {pnl?.parcel_name && ` / ${pnl.parcel_name}`}
                  </div>

                  {cycle.planting_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(cycle.planting_date).toLocaleDateString()}
                      {cycle.expected_harvest_end && (
                        <> → {new Date(cycle.expected_harvest_end).toLocaleDateString()}</>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('cropCycles.area', 'Area')}: </span>
                      <span className="font-medium">{cycle.planted_area_ha?.toFixed(1) || '-'} ha</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('cropCycles.yield', 'Yield')}: </span>
                      <span className="font-medium">
                        {cycle.actual_total_yield?.toLocaleString() || cycle.expected_total_yield?.toLocaleString() || '-'} {cycle.yield_unit}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('cropCycles.costs', 'Costs')}</span>
                      <span className="font-medium">{currencySymbol} {cycle.total_costs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('cropCycles.revenue', 'Revenue')}</span>
                      <span className="font-medium">{currencySymbol} {cycle.total_revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>{t('cropCycles.profit', 'Profit')}</span>
                      <span className={cycle.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {cycle.net_profit >= 0 ? <TrendingUp className="h-4 w-4 inline mr-1" /> : <TrendingDown className="h-4 w-4 inline mr-1" />}
                        {currencySymbol} {cycle.net_profit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCycle
                ? t('cropCycles.edit.title', 'Edit Crop Cycle')
                : t('cropCycles.create.title', 'Create Crop Cycle')}
            </DialogTitle>
            <DialogDescription>
              {editingCycle
                ? t('cropCycles.edit.description', 'Update crop cycle details.')
                : t('cropCycles.create.description', 'Start tracking a new production cycle.')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('cropCycles.form.farm', 'Farm')} *</Label>
                <Select
                  value={form.watch('farm_id')}
                  onValueChange={(value) => form.setValue('farm_id', value)}
                  disabled={!!editingCycle}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('cropCycles.form.selectFarm', 'Select farm...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {farms.map((farm) => (
                      <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('cropCycles.form.parcel', 'Parcel')}</Label>
                <Select
                  value={form.watch('parcel_id') || '__none__'}
                  onValueChange={(value) => form.setValue('parcel_id', value === '__none__' ? '' : value)}
                  disabled={!selectedFarmId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('cropCycles.form.selectParcel', 'Select parcel...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('common.none', 'None')}</SelectItem>
                    {parcels.map((parcel) => (
                      <SelectItem key={parcel.id} value={parcel.id}>{parcel.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crop_type">{t('cropCycles.form.cropType', 'Crop Type')} *</Label>
                <Input
                  id="crop_type"
                  {...form.register('crop_type')}
                  placeholder={t('cropCycles.form.cropTypePlaceholder', 'e.g., Wheat, Olive, Tomato')}
                />
              </div>
              <div>
                <Label htmlFor="variety_name">{t('cropCycles.form.variety', 'Variety')}</Label>
                <Input
                  id="variety_name"
                  {...form.register('variety_name')}
                  placeholder={t('cropCycles.form.varietyPlaceholder', 'e.g., Picholine, Roma')}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="cycle_code">{t('cropCycles.form.cycleCode', 'Cycle Code')} *</Label>
                <div className="flex gap-2">
                  <Input
                    id="cycle_code"
                    {...form.register('cycle_code')}
                    placeholder="WHT-2024-P01"
                    disabled={!!editingCycle}
                  />
                  {!editingCycle && (
                    <Button type="button" variant="outline" onClick={generateCode}>
                      {t('cropCycles.form.generate', 'Generate')}
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>{t('cropCycles.form.season', 'Season')}</Label>
                <Select
                  value={form.watch('season') || ''}
                  onValueChange={(value: Season) => form.setValue('season', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('cropCycles.form.selectSeason', 'Select...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spring">{t('seasons.spring', 'Spring')}</SelectItem>
                    <SelectItem value="summer">{t('seasons.summer', 'Summer')}</SelectItem>
                    <SelectItem value="autumn">{t('seasons.autumn', 'Autumn')}</SelectItem>
                    <SelectItem value="winter">{t('seasons.winter', 'Winter')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('cropCycles.form.campaign', 'Campaign')}</Label>
                <Select
                  value={form.watch('campaign_id') || '__none__'}
                  onValueChange={(value) => form.setValue('campaign_id', value === '__none__' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('cropCycles.form.selectCampaign', 'Select...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('common.none', 'None')}</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('cropCycles.form.fiscalYear', 'Fiscal Year')}</Label>
                <Select
                  value={form.watch('fiscal_year_id') || '__none__'}
                  onValueChange={(value) => form.setValue('fiscal_year_id', value === '__none__' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('cropCycles.form.selectFiscalYear', 'Select...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('common.none', 'None')}</SelectItem>
                    {fiscalYears.map((fy) => (
                      <SelectItem key={fy.id} value={fy.id}>{fy.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="planting_date">{t('cropCycles.form.plantingDate', 'Planting Date')}</Label>
                <Input
                  id="planting_date"
                  type="date"
                  {...form.register('planting_date')}
                />
              </div>
              <div>
                <Label htmlFor="expected_harvest_start">{t('cropCycles.form.harvestStart', 'Harvest Start')}</Label>
                <Input
                  id="expected_harvest_start"
                  type="date"
                  {...form.register('expected_harvest_start')}
                />
              </div>
              <div>
                <Label htmlFor="expected_harvest_end">{t('cropCycles.form.harvestEnd', 'Harvest End')}</Label>
                <Input
                  id="expected_harvest_end"
                  type="date"
                  {...form.register('expected_harvest_end')}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="planted_area_ha">{t('cropCycles.form.area', 'Area (ha)')}</Label>
                <Input
                  id="planted_area_ha"
                  type="number"
                  step="0.1"
                  {...form.register('planted_area_ha')}
                />
              </div>
              <div>
                <Label htmlFor="expected_yield_per_ha">{t('cropCycles.form.yieldPerHa', 'Expected Yield/ha')}</Label>
                <Input
                  id="expected_yield_per_ha"
                  type="number"
                  step="0.1"
                  {...form.register('expected_yield_per_ha')}
                />
              </div>
              <div>
                <Label htmlFor="yield_unit">{t('cropCycles.form.yieldUnit', 'Unit')}</Label>
                <Select
                  value={form.watch('yield_unit')}
                  onValueChange={(value) => form.setValue('yield_unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="tonnes">tonnes</SelectItem>
                    <SelectItem value="quintaux">quintaux</SelectItem>
                    <SelectItem value="units">units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">{t('cropCycles.form.notes', 'Notes')}</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder={t('cropCycles.form.notesPlaceholder', 'Additional notes...')}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCycle
                  ? t('cropCycles.form.update', 'Update')
                  : t('cropCycles.form.create', 'Create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
