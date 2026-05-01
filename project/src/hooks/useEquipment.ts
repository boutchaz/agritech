import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  equipmentApi,
  type EquipmentAsset,
  type EquipmentMaintenance,
  type CreateEquipmentInput,
  type UpdateEquipmentInput,
  type CreateMaintenanceInput,
  type UpdateMaintenanceInput,
  type EquipmentFilters,
} from '../lib/api/equipment';
import { useAuth } from './useAuth';

export const useEquipment = (filters?: EquipmentFilters) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['equipment', currentOrganization?.id, filters],
    queryFn: async (): Promise<EquipmentAsset[]> => {
      if (!currentOrganization?.id) return [];
      return equipmentApi.getAll(filters, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useEquipmentItem = (id: string | undefined) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['equipment', currentOrganization?.id, id],
    queryFn: async (): Promise<EquipmentAsset | null> => {
      if (!currentOrganization?.id || !id) return null;
      return equipmentApi.getOne(id, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id && !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateEquipment = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateEquipmentInput) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return equipmentApi.create(data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id] });
    },
  });
};

export const useUpdateEquipment = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEquipmentInput }) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return equipmentApi.update(id, data, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id, variables.id] });
    },
  });
};

export const useDeleteEquipment = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return equipmentApi.delete(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id] });
    },
  });
};

export const useEquipmentMaintenance = (equipmentId: string | undefined) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['equipment', currentOrganization?.id, equipmentId, 'maintenance'],
    queryFn: async (): Promise<EquipmentMaintenance[]> => {
      if (!currentOrganization?.id || !equipmentId) return [];
      return equipmentApi.getMaintenance(equipmentId, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id && !!equipmentId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateMaintenance = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ equipmentId, data }: { equipmentId: string; data: CreateMaintenanceInput }) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return equipmentApi.createMaintenance(equipmentId, data, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['equipment', currentOrganization?.id, variables.equipmentId, 'maintenance'],
      });
    },
  });
};

export const useUpdateMaintenance = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ maintenanceId, data }: { maintenanceId: string; data: UpdateMaintenanceInput }) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return equipmentApi.updateMaintenance(maintenanceId, data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id] });
    },
  });
};

export const useDeleteMaintenance = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (maintenanceId: string) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return equipmentApi.deleteMaintenance(maintenanceId, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization?.id] });
    },
  });
};
