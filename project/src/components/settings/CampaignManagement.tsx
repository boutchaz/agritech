import { useState } from 'react';
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
  TrendingUp,
  Leaf,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_CURRENCY } from '@/utils/currencies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { useTranslation } from 'react-i18next';
import {
  useCampaigns,
  useCampaignSummary,
  useCreateCampaign,
  useUpdateCampaign,
  useFiscalYears,
} from '@/hooks/useAgriculturalAccounting';
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

type CampaignFormData = z.infer<typeof campaignSchema>;

export function CampaignManagement() {
  const { hasRole, currentOrganization } = useAuth();
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AgriculturalCampaign | null>(null);

  const isAdmin = hasRole(['organization_admin', 'system_admin', 'farm_manager']);

  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: campaignSummaries = [] } = useCampaignSummary();
  const { data: fiscalYears = [] } = useFiscalYears();
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();

  const currencySymbol = currentOrganization?.currency_symbol || DEFAULT_CURRENCY;

  const form = useForm<CampaignFormData>({
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

  const onSubmit = async (data: CampaignFormData) => {
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

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('campaigns.loading', 'Loading campaigns...')}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('campaigns.empty', 'No campaigns yet. Create your first agricultural campaign to get started.')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const summary = getSummaryForCampaign(campaign.id);
            return (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <CardDescription>
                        <code className="text-xs bg-muted px-1 rounded">{campaign.code}</code>
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(campaign)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    {getStatusBadge(campaign.status, campaign.is_current)}
                    {getCampaignTypeBadge(campaign.campaign_type)}
                  </div>

                  {summary && (
                    <div className="pt-2 border-t space-y-1">
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
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign
                ? t('campaigns.edit.title', 'Edit Campaign')
                : t('campaigns.create.title', 'Create Campaign')}
            </DialogTitle>
            <DialogDescription>
              {editingCampaign
                ? t('campaigns.edit.description', 'Update campaign details.')
                : t('campaigns.create.description', 'Add a new agricultural campaign for production tracking.')}
            </DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
