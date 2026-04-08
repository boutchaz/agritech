import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Edit2,
  Calendar,
  Play,
  CheckCircle,
  Pause,
  AlertCircle,
  Leaf,
  Trash2,
  XCircle,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_CURRENCY } from '@/utils/currencies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar, ResponsiveList } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { useTranslation } from 'react-i18next';
import {
  useCampaigns,
  useCampaignSummary,
  useCreateCampaign,
  useUpdateCampaign,
  useUpdateCampaignStatus,
  useDeleteCampaign,
  useFiscalYears,
} from '@/hooks/useAgriculturalAccounting';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useNavigate } from '@tanstack/react-router';
import type { AgriculturalCampaign, CampaignStatus, CampaignType } from '@/types/agricultural-accounting';

const campaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(20),
  description: z.string().max(500).optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  campaign_type: z.enum(['general', 'rainfed', 'irrigated', 'greenhouse']).default('general'),
  is_current: z.boolean().default(false),
  primary_fiscal_year_id: z.string().optional(),
  secondary_fiscal_year_id: z.string().optional(),
});

type CampaignFormData = z.input<typeof campaignSchema>;
type CampaignFormValues = z.output<typeof campaignSchema>;

export function CampaignManagement() {
  const { hasRole, currentOrganization } = useAuth();
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AgriculturalCampaign | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const isAdmin = hasRole(['organization_admin', 'system_admin', 'farm_manager']);

  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: campaignSummaries = [] } = useCampaignSummary();
  const { data: fiscalYears = [] } = useFiscalYears();
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();
  const statusMutation = useUpdateCampaignStatus();
  const deleteMutation = useDeleteCampaign();
  const navigate = useNavigate();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; description?: string; variant?: 'destructive' | 'default'; onConfirm: () => void }>({ title: '', onConfirm: () => {} });

  const currencySymbol = currentOrganization?.currency_symbol || DEFAULT_CURRENCY;

  const form = useForm<CampaignFormData, unknown, CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      start_date: '',
      end_date: '',
      campaign_type: 'general',
      is_current: false,
    },
  });

  const handleOpenDialog = (campaign?: AgriculturalCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      form.reset({
        name: campaign.name,
        code: campaign.code,
        description: campaign.description || '',
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        campaign_type: campaign.campaign_type,
        is_current: campaign.is_current,
        primary_fiscal_year_id: campaign.primary_fiscal_year_id || undefined,
        secondary_fiscal_year_id: campaign.secondary_fiscal_year_id || undefined,
      });
    } else {
      setEditingCampaign(null);
      const currentYear = new Date().getFullYear();
      form.reset({
        name: `Campagne Agricole ${currentYear}/${currentYear + 1}`,
        code: `CA${currentYear}-${String(currentYear + 1).slice(-2)}`,
        description: '',
        start_date: `${currentYear}-09-01`,
        end_date: `${currentYear + 1}-08-31`,
        campaign_type: 'general',
        is_current: campaigns.length === 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCampaign(null);
    form.reset();
  };

  const onSubmit = async (data: CampaignFormValues) => {
    try {
      if (editingCampaign) {
        await updateMutation.mutateAsync({
          id: editingCampaign.id,
          name: data.name,
          description: data.description,
          is_current: data.is_current,
        });
      } else {
        await createMutation.mutateAsync({
          ...data,
          description: data.description || undefined,
          primary_fiscal_year_id: data.primary_fiscal_year_id || undefined,
          secondary_fiscal_year_id: data.secondary_fiscal_year_id || undefined,
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save campaign:', error);
    }
  };

  const getStatusBadge = (status: CampaignStatus, isCurrent: boolean) => {
    if (status === 'completed') {
      return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" /> {t('campaigns.status.completed', 'Completed')}</Badge>;
    }
    if (status === 'active' || isCurrent) {
      return <Badge variant="default" className="bg-green-600"><Play className="h-3 w-3 mr-1" /> {t('campaigns.status.active', 'Active')}</Badge>;
    }
    if (status === 'planned') {
      return <Badge variant="outline"><Pause className="h-3 w-3 mr-1" /> {t('campaigns.status.planned', 'Planned')}</Badge>;
    }
    return <Badge variant="destructive">{t('campaigns.status.cancelled', 'Cancelled')}</Badge>;
  };

  const getCampaignTypeBadge = (type: CampaignType) => {
    const colors: Record<CampaignType, string> = {
      general: 'bg-gray-100 text-gray-800',
      rainfed: 'bg-blue-100 text-blue-800',
      irrigated: 'bg-cyan-100 text-cyan-800',
      greenhouse: 'bg-green-100 text-green-800',
    };
    return (
      <Badge variant="outline" className={colors[type]}>
        {t(`campaigns.type.${type}`, type)}
      </Badge>
    );
  };

  const getSummaryForCampaign = (campaignId: string) => {
    return campaignSummaries.find(s => s.id === campaignId);
  };

  const filteredCampaigns = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesSearch = !normalizedSearch || [campaign.name, campaign.code, campaign.description ?? '']
        .some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesStatus = selectedStatusFilter === 'all' || campaign.status === selectedStatusFilter;
      const matchesType = selectedTypeFilter === 'all' || campaign.campaign_type === selectedTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [campaigns, searchQuery, selectedStatusFilter, selectedTypeFilter]);

  const hasActiveFilters = !!searchQuery.trim() || selectedStatusFilter !== 'all' || selectedTypeFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatusFilter('all');
    setSelectedTypeFilter('all');
  };

  const renderCampaignActions = (campaign: AgriculturalCampaign) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => handleOpenDialog(campaign)}>
          <Edit2 className="h-4 w-4 mr-2" />
          {t('common.edit', 'Edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: '/crop-cycles', search: { campaign_id: campaign.id } })}>
          <ExternalLink className="h-4 w-4 mr-2" />
          {t('campaigns.actions.openCycles', 'Open cycles')}
        </DropdownMenuItem>
        {campaign.status === 'planned' && (
          <DropdownMenuItem onClick={() => statusMutation.mutate({ id: campaign.id, status: 'active' })}>
            <Play className="h-4 w-4 mr-2" />
            {t('campaigns.actions.activate', 'Activate')}
          </DropdownMenuItem>
        )}
        {campaign.status === 'active' && (
          <DropdownMenuItem onClick={() => statusMutation.mutate({ id: campaign.id, status: 'completed' })}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {t('campaigns.actions.complete', 'Complete')}
          </DropdownMenuItem>
        )}
        {(campaign.status === 'planned' || campaign.status === 'active') && (
          <DropdownMenuItem onClick={() => {
            setConfirmAction({
              title: t('campaigns.actions.cancelConfirm', 'Cancel this campaign?'),
              description: t('campaigns.actions.cancelDescription', 'This will mark the campaign as cancelled.'),
              onConfirm: () => statusMutation.mutate({ id: campaign.id, status: 'cancelled' }),
            });
            setConfirmOpen(true);
          }}>
            <XCircle className="h-4 w-4 mr-2" />
            {t('campaigns.actions.cancel', 'Cancel')}
          </DropdownMenuItem>
        )}
        {campaign.status !== 'active' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setConfirmAction({
                  title: t('campaigns.actions.deleteConfirm', 'Delete this campaign?'),
                  description: t('campaigns.actions.deleteDescription', 'This action cannot be undone.'),
                  variant: 'destructive',
                  onConfirm: () => deleteMutation.mutate(campaign.id),
                });
                setConfirmOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete', 'Delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderCampaignCard = (campaign: AgriculturalCampaign) => {
    const summary = getSummaryForCampaign(campaign.id);

    return (
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => navigate({ to: '/crop-cycles', search: { campaign_id: campaign.id } })}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-1 text-lg">
                {campaign.name}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                <code className="rounded bg-muted px-1 text-xs">{campaign.code}</code>
              </CardDescription>
            </div>
            {renderCampaignActions(campaign)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
          </div>

          <div className="flex flex-wrap gap-2">
            {getStatusBadge(campaign.status, campaign.is_current)}
            {getCampaignTypeBadge(campaign.campaign_type)}
          </div>

          {summary && (
            <div className="space-y-1 border-t pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('campaigns.cycles', 'Cycles')}</span>
                <span className="font-medium">{summary.total_cycles}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('campaigns.area', 'Area')}</span>
                <span className="font-medium">{summary.total_planted_area?.toFixed(1) || 0} ha</span>
              </div>
              {summary.net_profit !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('campaigns.profit', 'Net Profit')}</span>
                  <span className={`font-medium ${(summary.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currencySymbol} {(summary.net_profit || 0).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <AlertCircle className="h-10 w-10 mx-auto mb-4 text-yellow-500" />
          {t('campaigns.noPermission', 'You do not have permission to manage campaigns.')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Leaf className="h-6 w-6 text-green-600" />
            {t('campaigns.title', 'Agricultural Campaigns')}
          </h2>
          <p className="text-muted-foreground">
            {t('campaigns.description', 'Manage agricultural campaigns (Campagne Agricole) for production planning.')}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('campaigns.addNew', 'New Campaign')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('campaigns.listTitle', 'Campaign List')}</CardTitle>
          <CardDescription>
            {t('campaigns.listDescription', 'Total: {{count}} campaigns', { count: filteredCampaigns.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t('campaigns.filters.searchPlaceholder', 'Search by name, code, or description')}
            filters={[
              {
                key: 'status',
                value: selectedStatusFilter,
                onChange: setSelectedStatusFilter,
                options: [
                  { value: 'all', label: t('campaigns.filters.allStatuses', 'All statuses') },
                  { value: 'planned', label: t('campaigns.status.planned', 'Planned') },
                  { value: 'active', label: t('campaigns.status.active', 'Active') },
                  { value: 'completed', label: t('campaigns.status.completed', 'Completed') },
                  { value: 'cancelled', label: t('campaigns.status.cancelled', 'Cancelled') },
                ],
                className: 'w-full sm:w-44',
              },
              {
                key: 'type',
                value: selectedTypeFilter,
                onChange: setSelectedTypeFilter,
                options: [
                  { value: 'all', label: t('campaigns.filters.allTypes', 'All types') },
                  { value: 'general', label: t('campaigns.type.general', 'General') },
                  { value: 'rainfed', label: t('campaigns.type.rainfed', 'Rainfed') },
                  { value: 'irrigated', label: t('campaigns.type.irrigated', 'Irrigated') },
                  { value: 'greenhouse', label: t('campaigns.type.greenhouse', 'Greenhouse') },
                ],
                className: 'w-full sm:w-44',
              },
            ]}
            onClear={clearFilters}
          />

          <ResponsiveList
            items={filteredCampaigns}
            isLoading={isLoading}
            keyExtractor={(campaign) => campaign.id}
            renderCard={renderCampaignCard}
            renderTableHeader={(
              <TableRow className="border-b">
                <TableHead className="px-4 py-3 text-left font-medium">{t('campaigns.table.code', 'Code')}</TableHead>
                <TableHead className="px-4 py-3 text-left font-medium">{t('campaigns.table.name', 'Name')}</TableHead>
                <TableHead className="px-4 py-3 text-left font-medium">{t('campaigns.table.period', 'Period')}</TableHead>
                <TableHead className="px-4 py-3 text-left font-medium">{t('campaigns.table.type', 'Type')}</TableHead>
                <TableHead className="px-4 py-3 text-center font-medium">{t('campaigns.table.status', 'Status')}</TableHead>
                <TableHead className="px-4 py-3 text-left font-medium">{t('campaigns.table.summary', 'Summary')}</TableHead>
                <TableHead className="px-4 py-3 text-right font-medium">{t('campaigns.table.actions', 'Actions')}</TableHead>
              </TableRow>
            )}
            renderTable={(campaign) => {
              const summary = getSummaryForCampaign(campaign.id);

              return (
                <>
                  <TableCell className="px-4 py-3 align-top">
                    <code className="rounded bg-muted px-2 py-1 text-sm">{campaign.code}</code>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top">
                    <div className="font-medium">{campaign.name}</div>
                    {campaign.description && (
                      <div className="max-w-md truncate text-sm text-muted-foreground">{campaign.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-sm text-muted-foreground">
                    {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top">{getCampaignTypeBadge(campaign.campaign_type)}</TableCell>
                  <TableCell className="px-4 py-3 align-top text-center">{getStatusBadge(campaign.status, campaign.is_current)}</TableCell>
                  <TableCell className="px-4 py-3 align-top text-sm">
                    {summary ? (
                      <div className="space-y-1">
                        <div>
                          <span className="text-muted-foreground">{t('campaigns.cycles', 'Cycles')}:</span>{' '}
                          <span className="font-medium">{summary.total_cycles}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('campaigns.area', 'Area')}:</span>{' '}
                          <span className="font-medium">{summary.total_planted_area?.toFixed(1) || 0} ha</span>
                        </div>
                        {summary.net_profit !== null && (
                          <div>
                            <span className="text-muted-foreground">{t('campaigns.profit', 'Net Profit')}:</span>{' '}
                            <span className={`font-medium ${(summary.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {currencySymbol} {(summary.net_profit || 0).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{t('common.notAvailable', '-')}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate({ to: '/crop-cycles', search: { campaign_id: campaign.id } })}
                        title={t('campaigns.actions.openCycles', 'Open cycles')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {renderCampaignActions(campaign)}
                    </div>
                  </TableCell>
                </>
              );
            }}
            emptyIcon={Leaf}
            emptyMessage={hasActiveFilters
              ? t('campaigns.emptyFiltered', 'No campaigns match your search or filters.')
              : t('campaigns.empty', 'No campaigns yet. Create your first agricultural campaign to get started.')}
            emptyAction={hasActiveFilters
              ? {
                label: t('common.clearFilters', 'Clear filters'),
                onClick: clearFilters,
                variant: 'outline',
              }
              : {
                label: t('campaigns.addNew', 'New Campaign'),
                onClick: () => handleOpenDialog(),
              }}
            emptyExtra={hasActiveFilters ? (
              <EmptyState
                variant="inline"
                icon={Leaf}
                description={t('campaigns.emptyFilteredHint', 'Try adjusting or clearing your filters to see more campaigns.')}
                showCircularContainer={false}
              />
            ) : undefined}
          />
        </CardContent>
      </Card>

      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingCampaign
          ? t('campaigns.edit.title', 'Edit Campaign')
          : t('campaigns.create.title', 'Create Campaign')}
        description={editingCampaign
          ? t('campaigns.edit.description', 'Update campaign details.')
          : t('campaigns.create.description', 'Add a new agricultural campaign for production tracking.')}
        size="lg"
      >
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">{t('campaigns.form.code', 'Code')} *</Label>
                <Input
                  id="code"
                  {...form.register('code')}
                  placeholder="CA2024-25"
                  disabled={!!editingCampaign}
                />
              </div>
              <div>
                <Label htmlFor="name">{t('campaigns.form.name', 'Name')} *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Campagne Agricole 2024/2025"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">{t('campaigns.form.description', 'Description')}</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder={t('campaigns.form.descriptionPlaceholder', 'Campaign notes...')}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">{t('campaigns.form.startDate', 'Start Date')} *</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...form.register('start_date')}
                  disabled={!!editingCampaign}
                />
              </div>
              <div>
                <Label htmlFor="end_date">{t('campaigns.form.endDate', 'End Date')} *</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...form.register('end_date')}
                  disabled={!!editingCampaign}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('campaigns.form.campaignType', 'Campaign Type')}</Label>
                <Select
                  value={form.watch('campaign_type')}
                  onValueChange={(value: CampaignType) => form.setValue('campaign_type', value)}
                  disabled={!!editingCampaign}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('campaigns.type.general', 'General')}</SelectItem>
                    <SelectItem value="rainfed">{t('campaigns.type.rainfed', 'Rainfed')}</SelectItem>
                    <SelectItem value="irrigated">{t('campaigns.type.irrigated', 'Irrigated')}</SelectItem>
                    <SelectItem value="greenhouse">{t('campaigns.type.greenhouse', 'Greenhouse')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('campaigns.form.primaryFiscalYear', 'Primary Fiscal Year')}</Label>
                <Select
                  value={form.watch('primary_fiscal_year_id') || '__none__'}
                  onValueChange={(value) => form.setValue('primary_fiscal_year_id', value === '__none__' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('campaigns.form.selectFiscalYear', 'Select...')} />
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

            <div className="flex items-center space-x-2">
              <Switch
                id="is_current"
                checked={form.watch('is_current')}
                onCheckedChange={(checked) => form.setValue('is_current', checked)}
              />
              <Label htmlFor="is_current" className="cursor-pointer">
                {t('campaigns.form.setCurrent', 'Set as current campaign')}
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCampaign
                  ? t('campaigns.form.update', 'Update')
                  : t('campaigns.form.create', 'Create')}
              </Button>
            </div>
          </form>
      </ResponsiveDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={() => {
          confirmAction.onConfirm();
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
