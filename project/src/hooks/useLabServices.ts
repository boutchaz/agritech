import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  labServicesApi,
  type LabServiceProvider,
  type LabServiceType,
  type LabServiceOrder,
  type LabResultParameter,
  type LabServiceRecommendation,
  type SampleCollectionSchedule,
  type OrderFilters,
  type RecommendationFilters,
  type ScheduleFilters,
  type CreateOrderDto,
  type UpdateOrderDto,
  type LabResultParameterDto,
  type CreateRecommendationDto,
  type UpdateRecommendationDto,
  type CreateScheduleDto,
  type UpdateScheduleDto,
  type OrderStatus,
  type ServiceCategory,
} from '@/lib/api/lab-services';

export type { OrderStatus, ServiceCategory };

export function useLabServiceProviders() {
  return useQuery({
    queryKey: ['lab-service-providers'],
    queryFn: () => labServicesApi.getProviders(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLabServiceTypes(providerId?: string, category?: ServiceCategory) {
  return useQuery({
    queryKey: ['lab-service-types', providerId, category],
    queryFn: () => labServicesApi.getServiceTypes(providerId, category),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLabServiceOrders(filters?: OrderFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['lab-service-orders', currentOrganization?.id, filters],
    queryFn: () => labServicesApi.getOrders(filters || {}, currentOrganization?.id),
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLabServiceOrder(orderId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['lab-service-order', orderId],
    queryFn: () => labServicesApi.getOrderById(orderId!, currentOrganization?.id),
    enabled: !!orderId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLabResultParameters(orderId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['lab-result-parameters', orderId],
    queryFn: () => labServicesApi.getResultParameters(orderId!, currentOrganization?.id),
    enabled: !!orderId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLabServiceRecommendations(orderId?: string, parcelId?: string) {
  const { currentOrganization } = useAuth();
  const filters: RecommendationFilters = { orderId, parcelId };

  return useQuery({
    queryKey: ['lab-service-recommendations', orderId, parcelId],
    queryFn: () => labServicesApi.getRecommendations(filters, currentOrganization?.id),
    enabled: !!(orderId || parcelId) && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSampleCollectionSchedules(farmId?: string, parcelId?: string) {
  const { currentOrganization } = useAuth();
  const filters: ScheduleFilters = { farmId, parcelId };

  return useQuery({
    queryKey: ['sample-collection-schedules', currentOrganization?.id, farmId, parcelId],
    queryFn: () => labServicesApi.getSchedules(filters, currentOrganization?.id),
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLabServiceOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (orderData: CreateOrderDto) =>
      labServicesApi.createOrder(orderData, currentOrganization?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] });
    },
  });
}

export function useUpdateLabServiceOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: ({ orderId, updates }: { orderId: string; updates: UpdateOrderDto }) =>
      labServicesApi.updateOrder(orderId, updates, currentOrganization?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['lab-service-order'] });
    },
  });
}

export function useAddLabResultParameters() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (parameters: LabResultParameterDto[]) => {
      if (parameters.length === 0) {
        return Promise.resolve([]);
      }
      const orderId = parameters[0].order_id;
      return labServicesApi.addResultParameters(orderId, parameters, currentOrganization?.id);
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['lab-result-parameters', variables[0].order_id] });
      }
    },
  });
}

export function useCreateLabServiceRecommendation() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (recommendation: CreateRecommendationDto) =>
      labServicesApi.createRecommendation(recommendation, currentOrganization?.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lab-service-recommendations', data.order_id] });
      if (data.parcel_id) {
        queryClient.invalidateQueries({ queryKey: ['lab-service-recommendations', undefined, data.parcel_id] });
      }
    },
  });
}

export function useUpdateLabServiceRecommendation() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: ({
      recommendationId,
      updates,
    }: {
      recommendationId: string;
      updates: UpdateRecommendationDto;
    }) => labServicesApi.updateRecommendation(recommendationId, updates, currentOrganization?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-service-recommendations'] });
    },
  });
}

export function useCreateSampleCollectionSchedule() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (schedule: CreateScheduleDto) =>
      labServicesApi.createSchedule(schedule, currentOrganization?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-collection-schedules'] });
    },
  });
}

export function useUpdateSampleCollectionSchedule() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: ({
      scheduleId,
      updates,
    }: {
      scheduleId: string;
      updates: UpdateScheduleDto;
    }) => labServicesApi.updateSchedule(scheduleId, updates, currentOrganization?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-collection-schedules'] });
    },
  });
}

export function useDeleteSampleCollectionSchedule() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (scheduleId: string) =>
      labServicesApi.deleteSchedule(scheduleId, currentOrganization?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-collection-schedules'] });
    },
  });
}
