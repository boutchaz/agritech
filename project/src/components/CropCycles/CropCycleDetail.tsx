import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Calendar,
  MapPin,
  Sprout,
  CheckCircle,
  Play,
  Pause,
  TrendingUp,
  Clock,
  Leaf,
  GanttChartSquare,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Calculator,
  MoreVertical
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/radix-select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useCropCycle,
  useCropCycleStages,
  useHarvestEvents,
  useHarvestEventStats,
  useUpdateCropCycle,
  useCompleteCropCycle,
  useUpdateCropCycleStageStatus,
  useGenerateStagesFromTemplate,
  useCreateHarvestEvent,
  useUpdateHarvestEvent,
  useDeleteHarvestEvent,
} from '@/hooks/useAgriculturalAccounting';
import { useCropTemplates } from '@/hooks/useCropTemplates';
import { CropCycleStatus, HarvestEvent } from '@/types/agricultural-accounting';

// Schema for Harvest Event
const harvestEventSchema = z.object({
  harvest_date: z.string().min(1, 'Date is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  quantity_unit: z.string().min(1, 'Unit is required'),
  quality_grade: z.string().optional(),
  quality_notes: z.string().optional(),
});

type HarvestEventFormData = z.infer<typeof harvestEventSchema>;

interface CropCycleDetailProps {
  cycleId: string;
}

export function CropCycleDetail({ cycleId }: CropCycleDetailProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [activeTab, setActiveTab] = useState('overview');
  
  // Queries
  const { data: cycle, isLoading: isCycleLoading } = useCropCycle(cycleId);
  const { data: stages = [], isLoading: isStagesLoading } = useCropCycleStages(cycleId);
  const { data: harvestEvents = [], isLoading: isHarvestsLoading } = useHarvestEvents(cycleId);
  const { data: harvestStats, isLoading: isStatsLoading } = useHarvestEventStats(cycleId);
  const { data: templates = [] } = useCropTemplates();

  // Mutations
  const updateCycleMutation = useUpdateCropCycle();
  const completeCycleMutation = useCompleteCropCycle();
  const updateStageStatusMutation = useUpdateCropCycleStageStatus();
  const generateStagesMutation = useGenerateStagesFromTemplate();
  const createHarvestMutation = useCreateHarvestEvent();
  const updateHarvestMutation = useUpdateHarvestEvent();
  const deleteHarvestMutation = useDeleteHarvestEvent();

  // Harvest Dialog State
  const [isHarvestDialogOpen, setIsHarvestDialogOpen] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<HarvestEvent | null>(null);

  const harvestForm = useForm<HarvestEventFormData>({
    resolver: zodResolver(harvestEventSchema),
    defaultValues: {
      harvest_date: new Date().toISOString().split('T')[0],
      quantity: 0,
      quantity_unit: cycle?.yield_unit || 'kg',
      quality_grade: 'A',
      quality_notes: '',
    },
  });

  // Loading State
  if (isCycleLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">{t('common.notFound', 'Not Found')}</h2>
        <p className="text-muted-foreground mb-6">{t('cropCycles.notFound', 'The requested crop cycle could not be found.')}</p>
        <Button onClick={() => navigate({ to: '/crop-cycles' })}>{t('common.goBack', 'Go Back')}</Button>
      </div>
    );
  }

  // Helper Functions
  const getStatusBadge = (status: CropCycleStatus) => {
    const config: Record<CropCycleStatus, { icon: any; color: string; label: string }> = {
      planned: { icon: Pause, color: 'bg-gray-100 text-gray-800 border-gray-200', label: t('cropCycles.status.planned', 'Planned') },
      land_prep: { icon: Sprout, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: t('cropCycles.status.land_prep', 'Land Prep') },
      growing: { icon: Play, color: 'bg-green-100 text-green-800 border-green-200', label: t('cropCycles.status.growing', 'Growing') },
      harvesting: { icon: TrendingUp, color: 'bg-blue-100 text-blue-800 border-blue-200', label: t('cropCycles.status.harvesting', 'Harvesting') },
      completed: { icon: CheckCircle, color: 'bg-purple-100 text-purple-800 border-purple-200', label: t('cropCycles.status.completed', 'Completed') },
      cancelled: { icon: Pause, color: 'bg-red-100 text-red-800 border-red-200', label: t('cropCycles.status.cancelled', 'Cancelled') },
    };
    const { icon: Icon, color, label } = config[status] || config.planned;
    return (
      <Badge variant="outline" className={`${color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const calculateDates = async () => {
    if (!cycle.template_id || !cycle.planting_date) return;
    
    const template = templates.find(t => t.id === cycle.template_id);
    if (!template || !template.typical_duration_months) return;

    const planting = new Date(cycle.planting_date);
    const harvestStart = new Date(planting);
    harvestStart.setMonth(harvestStart.getMonth() + template.typical_duration_months);
    
    // Default harvest window of 1 month if not specified
    const harvestEnd = new Date(harvestStart);
    harvestEnd.setMonth(harvestEnd.getMonth() + 1);

    try {
      await updateCycleMutation.mutateAsync({
        id: cycle.id,
        expected_harvest_start: harvestStart.toISOString().split('T')[0],
        expected_harvest_end: harvestEnd.toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Failed to calculate dates:', error);
    }
  };

  const handleStageStatusChange = async (stageId: string, status: 'pending' | 'in_progress' | 'completed' | 'skipped') => {
    try {
      await updateStageStatusMutation.mutateAsync({ id: stageId, status });
    } catch (error) {
      console.error('Failed to update stage status:', error);
    }
  };

  const handleGenerateStages = async () => {
    if (!cycle.template_id || !cycle.planting_date) return;
    const template = templates.find(t => t.id === cycle.template_id);
    if (!template || !template.stages) return;

    try {
      await generateStagesMutation.mutateAsync({
        cropCycleId: cycle.id,
        templateStages: template.stages,
        plantingDate: cycle.planting_date
      });
    } catch (error) {
      console.error('Failed to generate stages:', error);
    }
  };

  const handleHarvestSubmit = async (data: HarvestEventFormData) => {
    try {
      if (editingHarvest) {
        await updateHarvestMutation.mutateAsync({
          id: editingHarvest.id,
          ...data,
        });
      } else {
        await createHarvestMutation.mutateAsync({
          crop_cycle_id: cycle.id,
          ...data,
        });
      }
      setIsHarvestDialogOpen(false);
      setEditingHarvest(null);
      harvestForm.reset();
    } catch (error) {
      console.error('Failed to save harvest event:', error);
    }
  };

  const openHarvestDialog = (harvest?: HarvestEvent) => {
    if (harvest) {
      setEditingHarvest(harvest);
      harvestForm.reset({
        harvest_date: harvest.harvest_date.split('T')[0],
        quantity: harvest.quantity || 0,
        quantity_unit: harvest.quantity_unit,
        quality_grade: harvest.quality_grade || 'A',
        quality_notes: harvest.quality_notes || '',
      });
    } else {
      setEditingHarvest(null);
      harvestForm.reset({
        harvest_date: new Date().toISOString().split('T')[0],
        quantity: 0,
        quantity_unit: cycle.yield_unit,
        quality_grade: 'A',
        quality_notes: '',
      });
    }
    setIsHarvestDialogOpen(true);
  };

  const handleDeleteHarvest = async (id: string) => {
    if (confirm(t('common.confirmDelete', 'Are you sure you want to delete this record?'))) {
      try {
        await deleteHarvestMutation.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete harvest:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{cycle.cycle_name || cycle.crop_type}</h1>
            {getStatusBadge(cycle.status)}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <Badge variant="secondary" className="font-mono text-xs">{cycle.cycle_code}</Badge>
            <span>•</span>
            <span className="flex items-center gap-1">
              {cycle.is_perennial ? <Leaf className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {cycle.is_perennial ? t('cropCycles.type.perennial', 'Perennial') : t('cropCycles.type.annual', 'Annual')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cycle.status !== 'completed' && cycle.status !== 'cancelled' && (
             <Button 
               variant="default"
               
               onClick={() => {
                 if (confirm(t('cropCycles.confirmComplete', 'Are you sure you want to mark this cycle as complete?'))) {
                   completeCycleMutation.mutate(cycle.id);
                 }
               }}
               disabled={completeCycleMutation.isPending}
             >
               <CheckCircle className="h-4 w-4 mr-2" />
               {t('cropCycles.complete', 'Complete Cycle')}
             </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate({ to: '/crop-cycles', search: { edit: cycle.id } })}>
                <Edit2 className="h-4 w-4 mr-2" />
                {t('common.edit', 'Edit Details')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                 className="text-red-600"
                 onClick={() => {
                    // Placeholder for delete logic if needed
                    alert('Delete not implemented yet');
                 }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete', 'Delete Cycle')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
          <TabsTrigger value="overview">{t('cropCycles.tabs.overview', 'Overview')}</TabsTrigger>
          <TabsTrigger value="stages">{t('cropCycles.tabs.stages', 'Stages')}</TabsTrigger>
          <TabsTrigger value="harvests">{t('cropCycles.tabs.harvests', 'Harvests')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* General Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-green-600" />
                  {t('cropCycles.sections.details', 'Cycle Details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">{t('cropCycles.form.cropType', 'Crop')}</Label>
                    <div className="font-medium">{cycle.crop_type}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">{t('cropCycles.form.variety', 'Variety')}</Label>
                    <div className="font-medium">{cycle.variety_name || '-'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">{t('cropCycles.form.area', 'Area')}</Label>
                    <div className="font-medium">{cycle.planted_area_ha} ha</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">{t('cropCycles.form.season', 'Season')}</Label>
                    <div className="font-medium capitalize">{cycle.season || '-'}</div>
                  </div>
                </div>
                <Separator />
                <div>
                   <Label className="text-muted-foreground text-xs uppercase">{t('cropCycles.form.notes', 'Notes')}</Label>
                   <p className="text-sm mt-1 text-gray-700">{cycle.notes || t('common.noNotes', 'No notes provided.')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Dates Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  {t('cropCycles.sections.schedule', 'Schedule')}
                </CardTitle>
                {cycle.template_id && !cycle.expected_harvest_start && (
                  <Button variant="ghost" size="sm" onClick={calculateDates} disabled={updateCycleMutation.isPending}>
                    <Calculator className="h-4 w-4 mr-2" />
                    {t('common.calculate', 'Auto-calc')}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('cropCycles.form.plantingDate', 'Planting')}</span>
                    <span className="font-medium">
                      {cycle.planting_date ? format(new Date(cycle.planting_date), 'PPP') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('cropCycles.form.harvestStart', 'Exp. Harvest Start')}</span>
                    <span className="font-medium">
                      {cycle.expected_harvest_start ? format(new Date(cycle.expected_harvest_start), 'PPP') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('cropCycles.form.harvestEnd', 'Exp. Harvest End')}</span>
                    <span className="font-medium">
                      {cycle.expected_harvest_end ? format(new Date(cycle.expected_harvest_end), 'PPP') : '-'}
                    </span>
                  </div>
                </div>
                
                {cycle.planting_date && cycle.expected_harvest_end && (
                  <div className="mt-4">
                     <div className="text-xs text-muted-foreground mb-1 text-right">
                       {Math.ceil((new Date().getTime() - new Date(cycle.planting_date).getTime()) / (1000 * 60 * 60 * 24))} days elapsed
                     </div>
                     <Progress value={Math.min(100, Math.max(0, (new Date().getTime() - new Date(cycle.planting_date).getTime()) / (new Date(cycle.expected_harvest_end).getTime() - new Date(cycle.planting_date).getTime()) * 100))} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financials Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  {t('cropCycles.sections.financials', 'Financials')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 gap-3">
                   <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                     <span className="text-sm font-medium">{t('cropCycles.metrics.totalCosts', 'Total Costs')}</span>
                     <span className="text-lg font-bold">{cycle.total_costs.toLocaleString()} MAD</span>
                   </div>
                   <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                     <span className="text-sm font-medium">{t('cropCycles.metrics.totalRevenue', 'Total Revenue')}</span>
                     <span className="text-lg font-bold">{cycle.total_revenue.toLocaleString()} MAD</span>
                   </div>
                   <div className="flex justify-between items-center p-2 border border-dashed rounded border-gray-300">
                     <span className="text-sm font-medium">{t('cropCycles.metrics.netProfit', 'Net Profit')}</span>
                     <span className={`text-lg font-bold ${cycle.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                       {cycle.net_profit.toLocaleString()} MAD
                     </span>
                   </div>
                 </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stages Tab */}
        <TabsContent value="stages" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('cropCycles.stages.title', 'Growth Stages')}</CardTitle>
                <CardDescription>{t('cropCycles.stages.description', 'Track the phenological stages of your crop.')}</CardDescription>
              </div>
              {stages.length === 0 && cycle.template_id && (
                <Button onClick={handleGenerateStages} disabled={generateStagesMutation.isPending}>
                  <GanttChartSquare className="h-4 w-4 mr-2" />
                  {t('cropCycles.stages.generate', 'Generate from Template')}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isStagesLoading ? (
                <div className="space-y-4">
                   <Skeleton className="h-12 w-full" />
                   <Skeleton className="h-12 w-full" />
                   <Skeleton className="h-12 w-full" />
                </div>
              ) : stages.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  {t('cropCycles.stages.empty', 'No stages defined for this cycle.')}
                </div>
              ) : (
                <div className="space-y-6">
                  {stages.map((stage, index) => (
                    <div key={stage.id} className="relative flex items-start pb-6 last:pb-0 group">
                       {/* Connector Line */}
                       {index !== stages.length - 1 && (
                         <div className="absolute top-8 left-4 -ml-px h-full w-0.5 bg-gray-200 group-last:hidden" aria-hidden="true" />
                       )}
                       
                       {/* Status Icon */}
                       <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border 
                         ${stage.status === 'completed' ? 'border-green-600 bg-green-100 text-green-600' : 
                           stage.status === 'in_progress' ? 'border-blue-600 bg-blue-100 text-blue-600' : 
                           stage.status === 'skipped' ? 'border-yellow-600 bg-yellow-100 text-yellow-600' : 
                           'border-gray-300 bg-white text-gray-400'}`}>
                         {stage.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : 
                          stage.status === 'in_progress' ? <Play className="h-4 w-4" /> : 
                          stage.status === 'skipped' ? <AlertCircle className="h-4 w-4" /> : 
                          <span className="h-2.5 w-2.5 rounded-full bg-transparent" />}
                       </div>

                       <div className="ml-4 flex min-w-0 flex-1 flex-col justify-between sm:flex-row sm:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium leading-6 text-gray-900">{stage.stage_name}</h3>
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">
                                {stage.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {stage.expected_start_date && (
                                <span>Exp: {format(new Date(stage.expected_start_date), 'MMM d')}</span>
                              )}
                              {stage.expected_end_date && (
                                <span> - {format(new Date(stage.expected_end_date), 'MMM d')}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {stage.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => handleStageStatusChange(stage.id, 'in_progress')}>
                                {t('common.start', 'Start')}
                              </Button>
                            )}
                            {stage.status === 'in_progress' && (
                              <Button size="sm" onClick={() => handleStageStatusChange(stage.id, 'completed')}>
                                {t('common.complete', 'Complete')}
                              </Button>
                            )}
                            {stage.status !== 'completed' && stage.status !== 'skipped' && (
                              <Button size="sm" variant="ghost" onClick={() => handleStageStatusChange(stage.id, 'skipped')}>
                                {t('common.skip', 'Skip')}
                              </Button>
                            )}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Harvests Tab */}
        <TabsContent value="harvests" className="mt-6">
          <div className="grid gap-6 md:grid-cols-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{harvestStats?.total_harvests || 0}</div>
                <p className="text-xs text-muted-foreground uppercase font-medium">{t('cropCycles.harvests.count', 'Harvest Events')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{harvestStats?.total_quantity.toLocaleString() || 0} {cycle.yield_unit}</div>
                <p className="text-xs text-muted-foreground uppercase font-medium">{t('cropCycles.harvests.totalQuantity', 'Total Harvested')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{cycle.expected_total_yield?.toLocaleString() || '-'} {cycle.yield_unit}</div>
                <p className="text-xs text-muted-foreground uppercase font-medium">{t('cropCycles.harvests.expected', 'Expected Yield')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                 {/* Progress towards expected yield */}
                 <div className="text-2xl font-bold">
                    {cycle.expected_total_yield 
                      ? Math.round(((harvestStats?.total_quantity || 0) / cycle.expected_total_yield) * 100) 
                      : 0}%
                 </div>
                 <p className="text-xs text-muted-foreground uppercase font-medium">{t('cropCycles.harvests.progress', 'Yield Progress')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('cropCycles.harvests.events', 'Harvest Events')}</CardTitle>
                <CardDescription>{t('cropCycles.harvests.eventsDesc', 'Log of all harvest operations for this cycle.')}</CardDescription>
              </div>
              <Button onClick={() => openHarvestDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t('cropCycles.harvests.add', 'Add Harvest')}
              </Button>
            </CardHeader>
            <CardContent>
              {isHarvestsLoading ? (
                 <div className="space-y-4">
                   <Skeleton className="h-12 w-full" />
                   <Skeleton className="h-12 w-full" />
                 </div>
              ) : harvestEvents.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                   {t('cropCycles.harvests.empty', 'No harvests recorded yet.')}
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="grid grid-cols-6 gap-4 p-4 font-medium text-sm bg-muted/50 border-b">
                     <div className="col-span-1">{t('common.date', 'Date')}</div>
                     <div className="col-span-1">{t('common.quantity', 'Quantity')}</div>
                     <div className="col-span-1">{t('common.unit', 'Unit')}</div>
                     <div className="col-span-1">{t('common.grade', 'Grade')}</div>
                     <div className="col-span-1">{t('common.notes', 'Notes')}</div>
                     <div className="col-span-1 text-right">{t('common.actions', 'Actions')}</div>
                  </div>
                  <div className="divide-y">
                     {harvestEvents.map((harvest) => (
                       <div key={harvest.id} className="grid grid-cols-6 gap-4 p-4 text-sm items-center hover:bg-muted/20 transition-colors">
                          <div className="col-span-1 font-medium">{format(new Date(harvest.harvest_date), 'PPP')}</div>
                          <div className="col-span-1">{harvest.quantity?.toLocaleString()}</div>
                          <div className="col-span-1 text-muted-foreground">{harvest.quantity_unit}</div>
                          <div className="col-span-1">
                             <Badge variant="secondary" className={
                                harvest.quality_grade === 'A' ? 'bg-green-100 text-green-700' :
                                harvest.quality_grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                             }>
                               {harvest.quality_grade || '-'}
                             </Badge>
                          </div>
                          <div className="col-span-1 text-muted-foreground truncate" title={harvest.quality_notes || ''}>
                             {harvest.quality_notes || '-'}
                          </div>
                          <div className="col-span-1 text-right flex justify-end gap-2">
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHarvestDialog(harvest)}>
                               <Edit2 className="h-3.5 w-3.5" />
                             </Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteHarvest(harvest.id)}>
                               <Trash2 className="h-3.5 w-3.5" />
                             </Button>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Harvest Dialog */}
      <Dialog open={isHarvestDialogOpen} onOpenChange={setIsHarvestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
           <DialogHeader>
             <DialogTitle>{editingHarvest ? t('cropCycles.harvests.edit', 'Edit Harvest') : t('cropCycles.harvests.new', 'Record Harvest')}</DialogTitle>
             <DialogDescription>{t('cropCycles.harvests.dialogDesc', 'Enter the details of the harvest operation.')}</DialogDescription>
           </DialogHeader>
           
           <form onSubmit={harvestForm.handleSubmit(handleHarvestSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label htmlFor="harvest_date">{t('common.date', 'Date')} *</Label>
                   <Input id="harvest_date" type="date" {...harvestForm.register('harvest_date')} />
                   {harvestForm.formState.errors.harvest_date && (
                     <p className="text-xs text-destructive">{harvestForm.formState.errors.harvest_date.message}</p>
                   )}
                </div>
                <div className="space-y-2">
                   <Label htmlFor="quality_grade">{t('common.grade', 'Quality Grade')}</Label>
                   <Select 
                      value={harvestForm.watch('quality_grade')} 
                      onValueChange={(val) => harvestForm.setValue('quality_grade', val)}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="A">Grade A (Premium)</SelectItem>
                       <SelectItem value="B">Grade B (Standard)</SelectItem>
                       <SelectItem value="C">Grade C (Processing)</SelectItem>
                       <SelectItem value="D">Grade D (Waste/Feed)</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="quantity">{t('common.quantity', 'Quantity')} *</Label>
                    <Input id="quantity" type="number" step="0.01" {...harvestForm.register('quantity')} />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="quantity_unit">{t('common.unit', 'Unit')}</Label>
                    <Select 
                       value={harvestForm.watch('quantity_unit')} 
                       onValueChange={(val) => harvestForm.setValue('quantity_unit', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="tonnes">tonnes</SelectItem>
                        <SelectItem value="quintaux">quintaux</SelectItem>
                        <SelectItem value="units">units</SelectItem>
                        <SelectItem value="boxes">boxes</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
              </div>

              <div className="space-y-2">
                 <Label htmlFor="quality_notes">{t('common.notes', 'Quality Notes')}</Label>
                 <Textarea 
                    id="quality_notes" 
                    placeholder="Describe quality, defects, or destination..." 
                    {...harvestForm.register('quality_notes')} 
                 />
              </div>

              <DialogFooter>
                 <Button type="button" variant="outline" onClick={() => setIsHarvestDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                 <Button type="submit" disabled={createHarvestMutation.isPending || updateHarvestMutation.isPending}>
                   {editingHarvest ? t('common.save', 'Save Changes') : t('common.create', 'Record Harvest')}
                 </Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
}
