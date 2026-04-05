import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  fiscalYearsApi,
  campaignsApi,
  cropCyclesApi,
  cropCycleStagesApi,
  harvestEventsApi,
  biologicalAssetsApi,
  reportingApi,
} from '@/lib/api/agricultural-accounting';
import type {
  CreateFiscalYearInput,
  UpdateFiscalYearInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  CreateCropCycleInput,
  UpdateCropCycleInput,
  CreateBiologicalAssetInput,
  CreateBiologicalAssetValuationInput,
  CreateCropCycleAllocationInput,
  CreateCropCycleStageInput,
  UpdateCropCycleStageInput,
  CreateHarvestEventInput,
  UpdateHarvestEventInput,
  CropCycleStage,
  CropCycleStatus,
  CampaignStatus,
  BiologicalAsset,
} from '@/types/agricultural-accounting';
import { toast } from 'sonner';

export function useFiscalYears() {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['fiscal-years', organizationId],
    queryFn: () => fiscalYearsApi.getAll(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrentFiscalYear() {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['fiscal-years', 'current', organizationId],
    queryFn: () => fiscalYearsApi.getCurrent(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFiscalPeriods(fiscalYearId: string | null) {
  return useQuery({
    queryKey: ['fiscal-periods', fiscalYearId],
    queryFn: () => fiscalYearsApi.getPeriods(fiscalYearId!),
    enabled: !!fiscalYearId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateFiscalYear() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (input: CreateFiscalYearInput) =>
      fiscalYearsApi.create(currentOrganization!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success('Fiscal year created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create fiscal year: ${error.message}`);
    },
  });
}

export function useUpdateFiscalYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateFiscalYearInput) => fiscalYearsApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success('Fiscal year updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update fiscal year: ${error.message}`);
    },
  });
}

export function useCloseFiscalYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, closingNotes }: { id: string; closingNotes?: string }) =>
      fiscalYearsApi.close(id, closingNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success('Fiscal year closed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to close fiscal year: ${error.message}`);
    },
  });
}

export function useCampaigns() {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['campaigns', organizationId],
    queryFn: () => campaignsApi.getAll(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrentCampaign() {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['campaigns', 'current', organizationId],
    queryFn: () => campaignsApi.getCurrent(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCampaignSummary() {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['campaign-summary', organizationId],
    queryFn: () => campaignsApi.getSummary(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (input: CreateCampaignInput) =>
      campaignsApi.create(currentOrganization!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-summary'] });
      toast.success('Campaign created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCampaignInput) => campaignsApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-summary'] });
      toast.success('Campaign updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update campaign: ${error.message}`);
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) =>
      campaignsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-summary'] });
      toast.success('Campaign status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-summary'] });
      toast.success('Campaign deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete campaign: ${error.message}`);
    },
  });
}

export function useCropCycles(filters?: {
  campaign_id?: string;
  fiscal_year_id?: string;
  farm_id?: string;
  parcel_id?: string;
  status?: CropCycleStatus;
  crop_type?: string;
}) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['crop-cycles', organizationId, filters],
    queryFn: () => cropCyclesApi.getAll(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCropCycle(id: string | null) {
  return useQuery({
    queryKey: ['crop-cycles', id],
    queryFn: () => cropCyclesApi.getById(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCropCyclePnL(filters?: {
  campaign_id?: string;
  fiscal_year_id?: string;
  farm_id?: string;
}) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['crop-cycle-pnl', organizationId, filters],
    queryFn: () => cropCyclesApi.getPnL(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCropCycle() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (input: CreateCropCycleInput) =>
      cropCyclesApi.create(currentOrganization!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crop-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['crop-cycle-pnl'] });
      toast.success('Crop cycle created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create crop cycle: ${error.message}`);
    },
  });
}

export function useUpdateCropCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCropCycleInput) => cropCyclesApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crop-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['crop-cycle-pnl'] });
      toast.success('Crop cycle updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update crop cycle: ${error.message}`);
    },
  });
}

export function useCompleteCropCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cropCyclesApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crop-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['crop-cycle-pnl'] });
      toast.success('Crop cycle completed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete crop cycle: ${error.message}`);
    },
  });
}

export function useCropCycleAllocations(cropCycleId: string | null) {
  return useQuery({
    queryKey: ['crop-cycle-allocations', cropCycleId],
    queryFn: () => cropCyclesApi.getAllocations(cropCycleId!),
    enabled: !!cropCycleId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCropCycleAllocation() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (input: CreateCropCycleAllocationInput) =>
      cropCyclesApi.createAllocation(currentOrganization!.id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crop-cycle-allocations', variables.crop_cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['crop-cycles'] });
      toast.success('Cost allocation created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create allocation: ${error.message}`);
    },
  });
}

export function useCropCycleStages(cropCycleId: string | null) {
  return useQuery({
    queryKey: ['crop-cycle-stages', cropCycleId],
    queryFn: () => cropCycleStagesApi.getByCropCycle(cropCycleId!),
    enabled: !!cropCycleId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCropCycleStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCropCycleStageInput) =>
      cropCycleStagesApi.create(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crop-cycle-stages', variables.crop_cycle_id] });
      toast.success('Stage created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create stage: ${error.message}`);
    },
  });
}

export function useUpdateCropCycleStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCropCycleStageInput) =>
      cropCycleStagesApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crop-cycle-stages'] });
      toast.success('Stage updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update stage: ${error.message}`);
    },
  });
}

export function useUpdateCropCycleStageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CropCycleStage['status'] }) =>
      cropCycleStagesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crop-cycle-stages'] });
      toast.success('Stage status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update stage status: ${error.message}`);
    },
  });
}

export function useDeleteCropCycleStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cropCycleStagesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crop-cycle-stages'] });
      toast.success('Stage deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete stage: ${error.message}`);
    },
  });
}

export function useGenerateStagesFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cropCycleId,
      templateStages,
      plantingDate,
    }: {
      cropCycleId: string;
      templateStages: { name: string; order: number; duration_days: number }[];
      plantingDate: string;
    }) => cropCycleStagesApi.generateFromTemplate(cropCycleId, templateStages, plantingDate),
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['crop-cycle-stages', data[0].crop_cycle_id] });
      }
      toast.success(`${data.length} stages generated from template`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate stages: ${error.message}`);
    },
  });
}

export function useHarvestEvents(cropCycleId: string | null) {
  return useQuery({
    queryKey: ['harvest-events', cropCycleId],
    queryFn: () => harvestEventsApi.getByCropCycle(cropCycleId!),
    enabled: !!cropCycleId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useHarvestEventStats(cropCycleId: string | null) {
  return useQuery({
    queryKey: ['harvest-events', 'stats', cropCycleId],
    queryFn: () => harvestEventsApi.getStatsByCropCycle(cropCycleId!),
    enabled: !!cropCycleId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateHarvestEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateHarvestEventInput) =>
      harvestEventsApi.create(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['harvest-events', variables.crop_cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['harvest-events', 'stats', variables.crop_cycle_id] });
      queryClient.invalidateQueries({ queryKey: ['crop-cycles'] });
      toast.success('Harvest event recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record harvest event: ${error.message}`);
    },
  });
}

export function useUpdateHarvestEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateHarvestEventInput) =>
      harvestEventsApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest-events'] });
      queryClient.invalidateQueries({ queryKey: ['crop-cycles'] });
      toast.success('Harvest event updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update harvest event: ${error.message}`);
    },
  });
}

export function useDeleteHarvestEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => harvestEventsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest-events'] });
      queryClient.invalidateQueries({ queryKey: ['crop-cycles'] });
      toast.success('Harvest event deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete harvest event: ${error.message}`);
    },
  });
}

export function useBiologicalAssets(filters?: {
  farm_id?: string;
  parcel_id?: string;
  asset_type?: string;
  status?: string;
}) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['biological-assets', organizationId, filters],
    queryFn: () => biologicalAssetsApi.getAll(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBiologicalAsset(id: string | null) {
  return useQuery({
    queryKey: ['biological-assets', id],
    queryFn: () => biologicalAssetsApi.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBiologicalAsset() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (input: CreateBiologicalAssetInput) =>
      biologicalAssetsApi.create(currentOrganization!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biological-assets'] });
      toast.success('Biological asset created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create biological asset: ${error.message}`);
    },
  });
}

export function useUpdateBiologicalAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BiologicalAsset> }) =>
      biologicalAssetsApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biological-assets'] });
      toast.success('Biological asset updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update biological asset: ${error.message}`);
    },
  });
}

export function useBiologicalAssetValuations(biologicalAssetId: string | null) {
  return useQuery({
    queryKey: ['biological-asset-valuations', biologicalAssetId],
    queryFn: () => biologicalAssetsApi.getValuations(biologicalAssetId!),
    enabled: !!biologicalAssetId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBiologicalAssetValuation() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (input: CreateBiologicalAssetValuationInput) =>
      biologicalAssetsApi.createValuation(currentOrganization!.id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['biological-asset-valuations', variables.biological_asset_id] });
      queryClient.invalidateQueries({ queryKey: ['biological-assets'] });
      toast.success('Valuation recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record valuation: ${error.message}`);
    },
  });
}

export function useCropCyclePnLReport(campaignId?: string, fiscalYearId?: string) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['reports', 'crop-cycle-pnl', organizationId, campaignId, fiscalYearId],
    queryFn: () => reportingApi.getCropCyclePnLReport(organizationId!, campaignId, fiscalYearId),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useFiscalCampaignReconciliation() {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['reports', 'fiscal-campaign-reconciliation', organizationId],
    queryFn: () => reportingApi.getFiscalCampaignReconciliation(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWIPValuationReport() {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['reports', 'wip-valuation', organizationId],
    queryFn: () => reportingApi.getWIPValuationReport(organizationId!),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useBiologicalAssetsSummary() {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['reports', 'biological-assets-summary', organizationId],
    queryFn: () => reportingApi.getBiologicalAssetsSummary(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
