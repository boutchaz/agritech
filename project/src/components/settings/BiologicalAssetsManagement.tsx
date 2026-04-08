import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Edit2,
  Leaf,
  TrendingUp,
  AlertCircle,
  TreeDeciduous,
  Beef,

} from 'lucide-react';
import { DEFAULT_CURRENCY } from '@/utils/currencies';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar, ResponsiveList } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import {
  useBiologicalAssets,
  useCreateBiologicalAsset,
  useUpdateBiologicalAsset,
  useBiologicalAssetValuations,
  useCreateBiologicalAssetValuation,
  useBiologicalAssetsSummary,
} from '@/hooks/useAgriculturalAccounting';
import { farmsApi } from '@/lib/api/farms';
import { useQuery } from '@tanstack/react-query';
import type {
  BiologicalAsset,
  BiologicalAssetType,
  BiologicalAssetStatus,
  DepreciationMethod,
  FairValueMethod,
  FairValueLevel,
} from '@/types/agricultural-accounting';

const assetSchema = z.object({
  farm_id: z.string().min(1, 'Farm is required'),
  parcel_id: z.string().optional(),
  asset_type: z.enum(['bearer_plant', 'consumable_plant', 'livestock_bearer', 'livestock_consumable']),
  asset_category: z.string().min(1, 'Category is required'),
  asset_name: z.string().min(1, 'Name is required'),
  asset_code: z.string().min(1, 'Code is required'),
  quantity: z.number().optional(),
  area_ha: z.number().optional(),
  acquisition_date: z.string().min(1, 'Acquisition date is required'),
  maturity_date: z.string().optional(),
  expected_useful_life_years: z.number().optional(),
  initial_cost: z.number().min(0, 'Initial cost must be positive'),
  expected_annual_yield: z.number().optional(),
  expected_yield_unit: z.string().optional(),
  depreciation_method: z.enum(['straight_line', 'declining_balance', 'units_of_production']).default('straight_line'),
  residual_value: z.number().default(0),
  variety_info: z.string().optional(),
  notes: z.string().optional(),
});

const valuationSchema = z.object({
  valuation_date: z.string().min(1, 'Valuation date is required'),
  current_fair_value: z.number().min(0, 'Fair value must be positive'),
  valuation_method: z.enum(['market_price', 'dcf', 'cost_approach']),
  fair_value_level: z.number().min(1).max(3),
  market_price_reference: z.number().optional(),
  discount_rate: z.number().optional(),
  quantity_change: z.number().optional(),
  natural_increase: z.number().optional(),
  harvest_quantity: z.number().optional(),
  harvest_value: z.number().optional(),
  appraiser_name: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormInput = z.input<typeof assetSchema>;
type AssetFormData = z.output<typeof assetSchema>;
type ValuationFormInput = z.input<typeof valuationSchema>;
type ValuationFormData = z.output<typeof valuationSchema>;

const ASSET_TYPES: { value: BiologicalAssetType; label: string; icon: React.ReactNode }[] = [
  { value: 'bearer_plant', label: 'Bearer Plant (Orchard)', icon: <TreeDeciduous className="h-4 w-4" /> },
  { value: 'consumable_plant', label: 'Consumable Plant', icon: <Leaf className="h-4 w-4" /> },
  { value: 'livestock_bearer', label: 'Livestock (Bearer)', icon: <Beef className="h-4 w-4" /> },
  { value: 'livestock_consumable', label: 'Livestock (Consumable)', icon: <Beef className="h-4 w-4" /> },
];

const ASSET_CATEGORIES: Record<BiologicalAssetType, string[]> = {
  bearer_plant: ['Olive Grove', 'Citrus Orchard', 'Date Palm Plantation', 'Almond Orchard', 'Apple Orchard', 'Vineyard', 'Other Orchard'],
  consumable_plant: ['Annual Crops', 'Nursery Stock', 'Forest Plantation'],
  livestock_bearer: ['Dairy Cattle', 'Breeding Sheep', 'Laying Hens', 'Breeding Horses'],
  livestock_consumable: ['Beef Cattle', 'Meat Sheep', 'Broiler Chickens', 'Pigs'],
};

const STATUS_COLORS: Record<BiologicalAssetStatus, string> = {
  immature: 'bg-blue-100 text-blue-800',
  productive: 'bg-green-100 text-green-800',
  declining: 'bg-yellow-100 text-yellow-800',
  disposed: 'bg-gray-100 text-gray-800',
};

export function BiologicalAssetsManagement() {
  const { hasRole } = useAuth();
  const { t } = useTranslation();
  const { data: farms = [] } = useQuery({
    queryKey: ['farms'],
    queryFn: () => farmsApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isValuationDialogOpen, setIsValuationDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<BiologicalAsset | null>(null);
  const [selectedAssetForValuation, setSelectedAssetForValuation] = useState<BiologicalAsset | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<BiologicalAssetType | ''>('');
  const [selectedFarmFilter, setSelectedFarmFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<BiologicalAssetStatus | ''>('');

  const isAdmin = hasRole(['organization_admin', 'system_admin']);
  const canManage = hasRole(['organization_admin', 'system_admin', 'farm_manager']);

  const { data: assets = [], isLoading, isFetching } = useBiologicalAssets({
    farm_id: selectedFarmFilter || undefined,
    asset_type: selectedAssetType || undefined,
  });
  const { data: summary } = useBiologicalAssetsSummary();
  const { data: _valuations = [] } = useBiologicalAssetValuations(selectedAssetForValuation?.id || null);

  const createMutation = useCreateBiologicalAsset();
  const updateMutation = useUpdateBiologicalAsset();
  const createValuationMutation = useCreateBiologicalAssetValuation();

  const assetForm = useForm<AssetFormInput, unknown, AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      farm_id: '',
      asset_type: 'bearer_plant',
      asset_category: '',
      asset_name: '',
      asset_code: '',
      acquisition_date: new Date().toISOString().split('T')[0],
      initial_cost: 0,
      depreciation_method: 'straight_line',
      residual_value: 0,
      expected_yield_unit: 'kg',
    },
  });

  const valuationForm = useForm<ValuationFormInput, unknown, ValuationFormData>({
    resolver: zodResolver(valuationSchema),
    defaultValues: {
      valuation_date: new Date().toISOString().split('T')[0],
      current_fair_value: 0,
      valuation_method: 'market_price',
      fair_value_level: 2,
    },
  });

  const watchedAssetType = assetForm.watch('asset_type');

  const getAssetTypeLabel = (type: BiologicalAssetType) => {
    switch (type) {
      case 'bearer_plant':
        return t('biologicalAssets.assetTypes.bearerPlant', 'Bearer Plant (Orchard)');
      case 'consumable_plant':
        return t('biologicalAssets.assetTypes.consumablePlant', 'Consumable Plant');
      case 'livestock_bearer':
        return t('biologicalAssets.assetTypes.livestockBearer', 'Livestock (Bearer)');
      case 'livestock_consumable':
        return t('biologicalAssets.assetTypes.livestockConsumable', 'Livestock (Consumable)');
      default:
        return type;
    }
  };

  const getAssetStatusLabel = (status: BiologicalAssetStatus) => {
    switch (status) {
      case 'immature':
        return t('biologicalAssets.statuses.immature', 'Immature');
      case 'productive':
        return t('biologicalAssets.statuses.productive', 'Productive');
      case 'declining':
        return t('biologicalAssets.statuses.declining', 'Declining');
      case 'disposed':
        return t('biologicalAssets.statuses.disposed', 'Disposed');
      default:
        return status;
    }
  };

  const getAssetMeasureLabel = (asset: BiologicalAsset) => {
    if (asset.area_ha) {
      return t('biologicalAssets.measure.areaValue', '{{value}} ha', { value: asset.area_ha });
    }

    if (asset.quantity) {
      return t('biologicalAssets.measure.quantityValue', '{{value}} units', { value: asset.quantity });
    }

    return t('common.notAvailable', '-');
  };

  const filteredAssets = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesSearch = !normalizedSearch
        || asset.asset_name.toLowerCase().includes(normalizedSearch)
        || asset.asset_code.toLowerCase().includes(normalizedSearch);
      const matchesStatus = !selectedStatusFilter || asset.status === selectedStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [assets, searchQuery, selectedStatusFilter]);

  const hasActiveFilters = Boolean(searchQuery || selectedAssetType || selectedFarmFilter || selectedStatusFilter);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFarmFilter('');
    setSelectedAssetType('');
    setSelectedStatusFilter('');
  };

  const emptyIcon = selectedAssetType === 'bearer_plant' ? TreeDeciduous : Leaf;

  const renderAssetActions = (asset: BiologicalAsset) => (
    <div className="flex justify-end gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleOpenValuationDialog(asset)}
        title={t('biologicalAssets.recordValuation', 'Record Valuation')}
      >
        <TrendingUp className="h-4 w-4" />
      </Button>
      {isAdmin && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleOpenAssetDialog(asset)}
          title={t('biologicalAssets.edit', 'Edit')}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  const renderAssetCard = (asset: BiologicalAsset) => {
    const farmName = farms.find((farm) => farm.id === asset.farm_id)?.name || t('common.notAvailable', '-');

    return (
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-medium">{asset.asset_name}</div>
              <code className="inline-block rounded bg-muted px-2 py-1 text-xs">{asset.asset_code}</code>
            </div>
            <Badge variant="outline">{getAssetTypeLabel(asset.asset_type)}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">{t('biologicalAssets.table.farm', 'Farm')}</div>
              <div>{farmName}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t('biologicalAssets.table.status', 'Status')}</div>
              <Badge className={STATUS_COLORS[asset.status]}>{getAssetStatusLabel(asset.status)}</Badge>
            </div>
            <div>
              <div className="text-muted-foreground">{t('biologicalAssets.table.area', 'Area/Qty')}</div>
              <div>{getAssetMeasureLabel(asset)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t('biologicalAssets.card.value', 'Value')}</div>
              <div className="font-medium">{formatCurrency(asset.carrying_amount || asset.initial_cost)}</div>
            </div>
          </div>

          <div className="flex justify-end border-t pt-2">{renderAssetActions(asset)}</div>
        </CardContent>
      </Card>
    );
  };

  const handleOpenAssetDialog = (asset?: BiologicalAsset) => {
    if (asset) {
      setEditingAsset(asset);
      assetForm.reset({
        farm_id: asset.farm_id,
        parcel_id: asset.parcel_id || undefined,
        asset_type: asset.asset_type,
        asset_category: asset.asset_category,
        asset_name: asset.asset_name,
        asset_code: asset.asset_code,
        quantity: asset.quantity || undefined,
        area_ha: asset.area_ha || undefined,
        acquisition_date: asset.acquisition_date,
        maturity_date: asset.maturity_date || undefined,
        expected_useful_life_years: asset.expected_useful_life_years || undefined,
        initial_cost: asset.initial_cost,
        expected_annual_yield: asset.expected_annual_yield || undefined,
        expected_yield_unit: asset.expected_yield_unit || 'kg',
        depreciation_method: asset.depreciation_method,
        residual_value: asset.residual_value,
        variety_info: asset.variety_info || undefined,
        notes: asset.notes || undefined,
      });
    } else {
      setEditingAsset(null);
      assetForm.reset({
        farm_id: farms[0]?.id || '',
        asset_type: 'bearer_plant',
        asset_category: '',
        asset_name: '',
        asset_code: '',
        acquisition_date: new Date().toISOString().split('T')[0],
        initial_cost: 0,
        depreciation_method: 'straight_line',
        residual_value: 0,
        expected_yield_unit: 'kg',
      });
    }
    setIsDialogOpen(true);
  };

  const handleOpenValuationDialog = (asset: BiologicalAsset) => {
    setSelectedAssetForValuation(asset);
    valuationForm.reset({
      valuation_date: new Date().toISOString().split('T')[0],
      current_fair_value: asset.fair_value || asset.initial_cost,
      valuation_method: 'market_price',
      fair_value_level: 2,
    });
    setIsValuationDialogOpen(true);
  };

  const handleCloseAssetDialog = () => {
    setIsDialogOpen(false);
    setEditingAsset(null);
    assetForm.reset();
  };

  const handleCloseValuationDialog = () => {
    setIsValuationDialogOpen(false);
    setSelectedAssetForValuation(null);
    valuationForm.reset();
  };

  const onSubmitAsset = async (data: AssetFormData) => {
    try {
      if (editingAsset) {
        await updateMutation.mutateAsync({
          id: editingAsset.id,
          updates: {
            asset_name: data.asset_name,
            quantity: data.quantity,
            area_ha: data.area_ha,
            expected_annual_yield: data.expected_annual_yield,
            notes: data.notes,
          },
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      handleCloseAssetDialog();
    } catch (error) {
      console.error('Failed to save biological asset:', error);
    }
  };

  const onSubmitValuation = async (data: ValuationFormData) => {
    if (!selectedAssetForValuation) return;
    try {
      await createValuationMutation.mutateAsync({
        biological_asset_id: selectedAssetForValuation.id,
        valuation_date: data.valuation_date,
        current_fair_value: data.current_fair_value,
        valuation_method: data.valuation_method as FairValueMethod,
        fair_value_level: data.fair_value_level as FairValueLevel,
        market_price_reference: data.market_price_reference,
        discount_rate: data.discount_rate,
        quantity_change: data.quantity_change,
        natural_increase: data.natural_increase,
        harvest_quantity: data.harvest_quantity,
        harvest_value: data.harvest_value,
        appraiser_name: data.appraiser_name,
        notes: data.notes,
      });
      handleCloseValuationDialog();
    } catch (error) {
      console.error('Failed to record valuation:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: DEFAULT_CURRENCY }).format(amount);
  };

  if (!canManage) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyState
            variant="inline"
            icon={AlertCircle}
            title={t('biologicalAssets.noPermissionTitle', 'Access restricted')}
            description={t('biologicalAssets.noPermission', 'You do not have permission to manage biological assets.')}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('biologicalAssets.title', 'Biological Assets')}
          </h2>
          <p className="text-muted-foreground">
            {t('biologicalAssets.description', 'Manage perennial assets like orchards, vineyards, and livestock under IAS 41.')}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenAssetDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('biologicalAssets.addNew', 'Add Asset')}
          </Button>
        )}
      </div>

      {summary && (
        <div className="grid gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('biologicalAssets.summary.totalAssets', 'Total Assets')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.assets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('biologicalAssets.summary.carryingAmount', 'Carrying Amount')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totals.total_carrying_amount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('biologicalAssets.summary.fairValue', 'Fair Value')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totals.total_fair_value)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('biologicalAssets.summary.unrealizedGainLoss', 'Unrealized Gain/Loss')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.totals.unrealized_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totals.unrealized_gain_loss)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('biologicalAssets.listTitle', 'Asset Register')}</CardTitle>
          <CardDescription>
            {t('biologicalAssets.listDescription', 'IAS 41 compliant biological asset tracking')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t('biologicalAssets.filters.searchPlaceholder', 'Search by asset name or code')}
            filters={[
              {
                key: 'farm',
                value: selectedFarmFilter || 'all',
                onChange: (value) => setSelectedFarmFilter(value === 'all' ? '' : value),
                options: [
                  { value: 'all', label: t('biologicalAssets.filters.allFarms', 'All Farms') },
                  ...farms.map((farm) => ({ value: farm.id, label: farm.name })),
                ],
                className: 'w-full sm:w-48',
              },
              {
                key: 'assetType',
                value: selectedAssetType || 'all',
                onChange: (value) => setSelectedAssetType(value === 'all' ? '' : value as BiologicalAssetType),
                options: [
                  { value: 'all', label: t('biologicalAssets.filters.allTypes', 'All Types') },
                  ...ASSET_TYPES.map((type) => ({ value: type.value, label: getAssetTypeLabel(type.value) })),
                ],
                className: 'w-full sm:w-52',
              },
              {
                key: 'status',
                value: selectedStatusFilter || 'all',
                onChange: (value) => setSelectedStatusFilter(value === 'all' ? '' : value as BiologicalAssetStatus),
                options: [
                  { value: 'all', label: t('biologicalAssets.filters.allStatuses', 'All Statuses') },
                  { value: 'immature', label: getAssetStatusLabel('immature') },
                  { value: 'productive', label: getAssetStatusLabel('productive') },
                  { value: 'declining', label: getAssetStatusLabel('declining') },
                  { value: 'disposed', label: getAssetStatusLabel('disposed') },
                ],
                className: 'w-full sm:w-44',
              },
            ]}
            onClear={clearFilters}
          />

          <ResponsiveList
            items={filteredAssets}
            isLoading={isLoading}
            isFetching={isFetching}
            keyExtractor={(asset) => asset.id}
            renderCard={renderAssetCard}
            renderTableHeader={(
              <TableRow className="border-b">
                <TableHead className="text-left py-3 px-4 font-medium">{t('biologicalAssets.table.code', 'Code')}</TableHead>
                <TableHead className="text-left py-3 px-4 font-medium">{t('biologicalAssets.table.name', 'Name')}</TableHead>
                <TableHead className="text-left py-3 px-4 font-medium">{t('biologicalAssets.table.type', 'Type')}</TableHead>
                <TableHead className="text-left py-3 px-4 font-medium">{t('biologicalAssets.table.farm', 'Farm')}</TableHead>
                <TableHead className="text-left py-3 px-4 font-medium">{t('biologicalAssets.table.area', 'Area/Qty')}</TableHead>
                <TableHead className="text-right py-3 px-4 font-medium">{t('biologicalAssets.table.carryingAmount', 'Carrying Amt')}</TableHead>
                <TableHead className="text-right py-3 px-4 font-medium">{t('biologicalAssets.table.fairValue', 'Fair Value')}</TableHead>
                <TableHead className="text-center py-3 px-4 font-medium">{t('biologicalAssets.table.status', 'Status')}</TableHead>
                <TableHead className="text-right py-3 px-4 font-medium">{t('biologicalAssets.table.actions', 'Actions')}</TableHead>
              </TableRow>
            )}
            renderTable={(asset) => (
              <>
                <TableCell className="py-3 px-4">
                  <code className="text-sm bg-muted px-2 py-1 rounded">{asset.asset_code}</code>
                </TableCell>
                <TableCell className="py-3 px-4">
                  <div className="font-medium">{asset.asset_name}</div>
                  <div className="text-sm text-muted-foreground">{asset.asset_category}</div>
                </TableCell>
                <TableCell className="py-3 px-4">{getAssetTypeLabel(asset.asset_type)}</TableCell>
                <TableCell className="py-3 px-4">
                  {farms.find((farm) => farm.id === asset.farm_id)?.name || t('common.notAvailable', '-')}
                </TableCell>
                <TableCell className="py-3 px-4">{getAssetMeasureLabel(asset)}</TableCell>
                <TableCell className="py-3 px-4 text-right font-mono">
                  {formatCurrency(asset.carrying_amount || asset.initial_cost)}
                </TableCell>
                <TableCell className="py-3 px-4 text-right font-mono">
                  {asset.fair_value ? formatCurrency(asset.fair_value) : t('common.notAvailable', '-')}
                </TableCell>
                <TableCell className="py-3 px-4 text-center">
                  <Badge className={STATUS_COLORS[asset.status]}>{getAssetStatusLabel(asset.status)}</Badge>
                </TableCell>
                <TableCell className="py-3 px-4 text-right">{renderAssetActions(asset)}</TableCell>
              </>
            )}
            emptyIcon={emptyIcon}
            emptyMessage={hasActiveFilters
              ? t('biologicalAssets.emptyFiltered', 'No biological assets match your search or filters.')
              : t('biologicalAssets.empty', 'No biological assets yet. Add orchards, livestock, or other perennial assets.')}
            emptyAction={isAdmin
              ? {
                label: t('biologicalAssets.addNew', 'Add Asset'),
                onClick: () => handleOpenAssetDialog(),
              }
              : undefined}
            emptyExtra={hasActiveFilters ? (
              <EmptyState
                variant="inline"
                icon={emptyIcon}
                description={t('biologicalAssets.emptyFilteredHint', 'Try adjusting or clearing your filters to see more assets.')}
                showCircularContainer={false}
              />
            ) : undefined}
          />
        </CardContent>
      </Card>

      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingAsset
          ? t('biologicalAssets.edit.title', 'Edit Biological Asset')
          : t('biologicalAssets.create.title', 'Add Biological Asset')}
        description={editingAsset
          ? t('biologicalAssets.edit.description', 'Update the asset details.')
          : t('biologicalAssets.create.description', 'Add a perennial biological asset for IAS 41 tracking.')}
        size="lg"
        contentClassName="max-h-[90vh] overflow-y-auto"
      >
          <form onSubmit={assetForm.handleSubmit(onSubmitAsset)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">{t('biologicalAssets.form.tabs.basic', 'Basic')}</TabsTrigger>
                <TabsTrigger value="financial">{t('biologicalAssets.form.tabs.financial', 'Financial')}</TabsTrigger>
                <TabsTrigger value="production">{t('biologicalAssets.form.tabs.production', 'Production')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('biologicalAssets.form.farm', 'Farm')} *</Label>
                    <Select
                      value={assetForm.watch('farm_id')}
                      onValueChange={(v) => assetForm.setValue('farm_id', v)}
                      disabled={!!editingAsset}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('biologicalAssets.form.selectFarm', 'Select farm')} />
                      </SelectTrigger>
                      <SelectContent>
                        {farms.map((farm) => (
                          <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('biologicalAssets.form.assetType', 'Asset Type')} *</Label>
                    <Select
                      value={assetForm.watch('asset_type')}
                      onValueChange={(v) => {
                        assetForm.setValue('asset_type', v as BiologicalAssetType);
                        assetForm.setValue('asset_category', '');
                      }}
                      disabled={!!editingAsset}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              {type.icon}
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('biologicalAssets.form.category', 'Category')} *</Label>
                    <Select
                      value={assetForm.watch('asset_category')}
                      onValueChange={(v) => assetForm.setValue('asset_category', v)}
                      disabled={!!editingAsset}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('biologicalAssets.form.selectCategory', 'Select category')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(ASSET_CATEGORIES[watchedAssetType] || []).map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('biologicalAssets.form.code', 'Asset Code')} *</Label>
                    <Input
                      {...assetForm.register('asset_code')}
                      placeholder="OLV-2020-001"
                      disabled={!!editingAsset}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('biologicalAssets.form.name', 'Asset Name')} *</Label>
                  <Input
                    {...assetForm.register('asset_name')}
                    placeholder={t('biologicalAssets.form.namePlaceholder', 'e.g., North Olive Grove')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('biologicalAssets.form.area', 'Area (ha)')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...assetForm.register('area_ha', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label>{t('biologicalAssets.form.quantity', 'Quantity (units)')}</Label>
                    <Input
                      type="number"
                      {...assetForm.register('quantity', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('biologicalAssets.form.varietyInfo', 'Variety/Breed Information')}</Label>
                  <Input
                    {...assetForm.register('variety_info')}
                    placeholder={t('biologicalAssets.form.varietyPlaceholder', 'e.g., Picholine variety')}
                  />
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('biologicalAssets.form.acquisitionDate', 'Acquisition Date')} *</Label>
                    <Input
                      type="date"
                      {...assetForm.register('acquisition_date')}
                      disabled={!!editingAsset}
                    />
                  </div>
                  <div>
                    <Label>{t('biologicalAssets.form.maturityDate', 'Maturity Date')}</Label>
                    <Input
                      type="date"
                      {...assetForm.register('maturity_date')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('biologicalAssets.form.initialCost', 'Initial Cost (MAD)')} *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...assetForm.register('initial_cost', { valueAsNumber: true })}
                      disabled={!!editingAsset}
                    />
                  </div>
                  <div>
                    <Label>{t('biologicalAssets.form.residualValue', 'Residual Value (MAD)')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...assetForm.register('residual_value', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('biologicalAssets.form.usefulLife', 'Useful Life (years)')}</Label>
                    <Input
                      type="number"
                      {...assetForm.register('expected_useful_life_years', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label>{t('biologicalAssets.form.depreciationMethod', 'Depreciation Method')}</Label>
                    <Select
                      value={assetForm.watch('depreciation_method')}
                      onValueChange={(v) => assetForm.setValue('depreciation_method', v as DepreciationMethod)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight_line">{t('biologicalAssets.form.straightLine', 'Straight Line')}</SelectItem>
                        <SelectItem value="declining_balance">{t('biologicalAssets.form.decliningBalance', 'Declining Balance')}</SelectItem>
                        <SelectItem value="units_of_production">{t('biologicalAssets.form.unitsOfProduction', 'Units of Production')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="production" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('biologicalAssets.form.expectedYield', 'Expected Annual Yield')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...assetForm.register('expected_annual_yield', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label>{t('biologicalAssets.form.yieldUnit', 'Yield Unit')}</Label>
                    <Select
                      value={assetForm.watch('expected_yield_unit') || 'kg'}
                      onValueChange={(v) => assetForm.setValue('expected_yield_unit', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="tonnes">tonnes</SelectItem>
                        <SelectItem value="quintaux">quintaux</SelectItem>
                        <SelectItem value="liters">liters</SelectItem>
                        <SelectItem value="units">units</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>{t('biologicalAssets.form.notes', 'Notes')}</Label>
                  <Textarea
                    {...assetForm.register('notes')}
                    placeholder={t('biologicalAssets.form.notesPlaceholder', 'Additional notes about this asset...')}
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseAssetDialog}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingAsset
                  ? t('biologicalAssets.form.update', 'Update')
                  : t('biologicalAssets.form.create', 'Create')}
              </Button>
            </div>
          </form>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={isValuationDialogOpen}
        onOpenChange={setIsValuationDialogOpen}
        title={t('biologicalAssets.valuation.title', 'Record Fair Value')}
        description={t('biologicalAssets.valuation.description', 'Record a fair value measurement for {{asset}}.', {
          asset: selectedAssetForValuation?.asset_name,
        })}
        size="md"
      >
          <form onSubmit={valuationForm.handleSubmit(onSubmitValuation)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('biologicalAssets.valuation.date', 'Valuation Date')} *</Label>
                <Input
                  type="date"
                  {...valuationForm.register('valuation_date')}
                />
              </div>
              <div>
                <Label>{t('biologicalAssets.valuation.fairValue', 'Fair Value (MAD)')} *</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...valuationForm.register('current_fair_value', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('biologicalAssets.valuation.method', 'Valuation Method')} *</Label>
                <Select
                  value={valuationForm.watch('valuation_method')}
                  onValueChange={(v) => valuationForm.setValue('valuation_method', v as FairValueMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market_price">{t('biologicalAssets.valuation.marketPrice', 'Market Price')}</SelectItem>
                    <SelectItem value="dcf">{t('biologicalAssets.valuation.dcf', 'Discounted Cash Flow')}</SelectItem>
                    <SelectItem value="cost_approach">{t('biologicalAssets.valuation.costApproach', 'Cost Approach')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('biologicalAssets.valuation.level', 'Fair Value Level')} *</Label>
                <Select
                  value={String(valuationForm.watch('fair_value_level'))}
                  onValueChange={(v) => valuationForm.setValue('fair_value_level', Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('biologicalAssets.valuation.level1', 'Level 1 - Quoted prices')}</SelectItem>
                    <SelectItem value="2">{t('biologicalAssets.valuation.level2', 'Level 2 - Observable inputs')}</SelectItem>
                    <SelectItem value="3">{t('biologicalAssets.valuation.level3', 'Level 3 - Unobservable inputs')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('biologicalAssets.valuation.appraiser', 'Appraiser Name')}</Label>
              <Input
                {...valuationForm.register('appraiser_name')}
                placeholder={t('biologicalAssets.valuation.appraiserPlaceholder', 'Name of appraiser or source')}
              />
            </div>

            <div>
              <Label>{t('biologicalAssets.valuation.notes', 'Notes')}</Label>
              <Textarea
                {...valuationForm.register('notes')}
                placeholder={t('biologicalAssets.valuation.notesPlaceholder', 'Valuation assumptions and notes...')}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseValuationDialog}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createValuationMutation.isPending}>
                {t('biologicalAssets.valuation.record', 'Record Valuation')}
              </Button>
            </div>
          </form>
      </ResponsiveDialog>
    </div>
  );
}
