import { apiClient } from '../api-client';

const BASE_URL = '/api/v1';
const ORG_BASE_URL = '/api/v1/organizations';

export type OrderStatus = 'pending' | 'sample_collected' | 'sent_to_lab' | 'in_progress' | 'completed' | 'cancelled';
export type ServiceCategory = 'soil' | 'leaf' | 'water' | 'tissue' | 'other';

export interface LabServiceProvider {
  id: string;
  name: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LabServiceType {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  turnaround_days: number | null;
  base_price: number | null;
  is_active: boolean;
  provider?: LabServiceProvider;
  created_at: string;
  updated_at: string;
}

export interface LabServiceOrder {
  id: string;
  organization_id: string;
  service_type_id: string;
  provider_id: string;
  farm_id: string | null;
  parcel_id: string | null;
  order_date: string;
  status: OrderStatus;
  sample_collection_date: string | null;
  sample_collector_id: string | null;
  lab_reference_number: string | null;
  expected_results_date: string | null;
  actual_results_date: string | null;
  cost: number | null;
  notes: string | null;
  sampling_location: string | null;
  sampling_depth_cm: number | null;
  created_by: string | null;
  service_type?: LabServiceType;
  provider?: LabServiceProvider;
  farm?: { id: string; name: string };
  parcel?: { id: string; name: string };
  sample_collector?: { id: string; full_name: string };
  creator?: { id: string; full_name: string };
  created_at: string;
  updated_at: string;
}

export interface LabResultParameter {
  id: string;
  order_id: string;
  parameter_name: string;
  value: number | null;
  unit: string | null;
  reference_min: number | null;
  reference_max: number | null;
  interpretation: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabServiceRecommendation {
  id: string;
  order_id: string;
  parcel_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: number;
  status: string;
  target_date: string | null;
  implemented_date: string | null;
  implemented_by: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  notes: string | null;
  implementer?: { id: string; full_name: string };
  created_at: string;
  updated_at: string;
}

export interface SampleCollectionSchedule {
  id: string;
  organization_id: string;
  service_type_id: string;
  farm_id: string | null;
  parcel_id: string | null;
  name: string;
  frequency: string | null;
  frequency_days: number | null;
  next_collection_date: string;
  last_collection_date: string | null;
  assigned_to: string | null;
  is_active: boolean;
  sampling_location: string | null;
  notes: string | null;
  farm?: { id: string; name: string };
  parcel?: { id: string; name: string };
  service_type?: LabServiceType;
  assignee?: { id: string; full_name: string };
  created_at: string;
  updated_at: string;
}

export interface OrderFilters {
  farmId?: string;
  parcelId?: string;
  status?: OrderStatus;
}

export interface RecommendationFilters {
  orderId?: string;
  parcelId?: string;
}

export interface ScheduleFilters {
  farmId?: string;
  parcelId?: string;
}

export interface CreateOrderDto {
  service_type_id: string;
  provider_id: string;
  farm_id?: string;
  parcel_id?: string;
  order_date?: string;
  status?: OrderStatus;
  sample_collection_date?: string;
  sample_collector_id?: string;
  lab_reference_number?: string;
  expected_results_date?: string;
  actual_results_date?: string;
  cost?: number;
  notes?: string;
  sampling_location?: string;
  sampling_depth_cm?: number;
}

export interface UpdateOrderDto extends Partial<CreateOrderDto> {}

export interface LabResultParameterDto {
  order_id: string;
  parameter_name: string;
  value?: number;
  unit?: string;
  reference_min?: number;
  reference_max?: number;
  interpretation?: string;
  notes?: string;
}

export interface CreateRecommendationDto {
  order_id: string;
  parcel_id?: string;
  title: string;
  description?: string;
  category?: string;
  priority?: number;
  status?: string;
  target_date?: string;
  estimated_cost?: number;
  notes?: string;
}

export interface UpdateRecommendationDto {
  title?: string;
  description?: string;
  category?: string;
  priority?: number;
  status?: string;
  target_date?: string;
  implemented_date?: string;
  implemented_by?: string;
  estimated_cost?: number;
  actual_cost?: number;
  notes?: string;
}

export interface CreateScheduleDto {
  service_type_id: string;
  farm_id?: string;
  parcel_id?: string;
  name: string;
  frequency?: string;
  frequency_days?: number;
  next_collection_date: string;
  last_collection_date?: string;
  assigned_to?: string;
  is_active?: boolean;
  sampling_location?: string;
  notes?: string;
}

export interface UpdateScheduleDto extends Partial<CreateScheduleDto> {}

export const labServicesApi = {
  async getProviders(): Promise<LabServiceProvider[]> {
    return apiClient.get<LabServiceProvider[]>(`${BASE_URL}/lab-services/providers`);
  },

  async getProviderById(providerId: string): Promise<LabServiceProvider> {
    return apiClient.get<LabServiceProvider>(`${BASE_URL}/lab-services/providers/${providerId}`);
  },

  async getServiceTypes(
    providerId?: string,
    category?: ServiceCategory,
  ): Promise<LabServiceType[]> {
    const params = new URLSearchParams();
    if (providerId) params.append('providerId', providerId);
    if (category) params.append('category', category);
    const queryString = params.toString();
    return apiClient.get<LabServiceType[]>(
      `${BASE_URL}/lab-services/types${queryString ? `?${queryString}` : ''}`,
    );
  },

  async getServiceTypeById(typeId: string): Promise<LabServiceType> {
    return apiClient.get<LabServiceType>(`${BASE_URL}/lab-services/types/${typeId}`);
  },

  async getOrders(
    filters: OrderFilters,
    organizationId?: string,
  ): Promise<LabServiceOrder[]> {
    const params = new URLSearchParams();
    if (filters.farmId) params.append('farmId', filters.farmId);
    if (filters.parcelId) params.append('parcelId', filters.parcelId);
    if (filters.status) params.append('status', filters.status);
    const queryString = params.toString();
    return apiClient.get<LabServiceOrder[]>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/orders${queryString ? `?${queryString}` : ''}`,
      {},
      organizationId,
    );
  },

  async getOrderById(
    orderId: string,
    organizationId?: string,
  ): Promise<LabServiceOrder> {
    return apiClient.get<LabServiceOrder>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/orders/${orderId}`,
      {},
      organizationId,
    );
  },

  async createOrder(
    data: CreateOrderDto,
    organizationId?: string,
  ): Promise<LabServiceOrder> {
    return apiClient.post<LabServiceOrder>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/orders`,
      data,
      {},
      organizationId,
    );
  },

  async updateOrder(
    orderId: string,
    data: UpdateOrderDto,
    organizationId?: string,
  ): Promise<LabServiceOrder> {
    return apiClient.patch<LabServiceOrder>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/orders/${orderId}`,
      data,
      {},
      organizationId,
    );
  },

  async getResultParameters(
    orderId: string,
    organizationId?: string,
  ): Promise<LabResultParameter[]> {
    return apiClient.get<LabResultParameter[]>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/orders/${orderId}/results`,
      {},
      organizationId,
    );
  },

  async addResultParameters(
    orderId: string,
    parameters: LabResultParameterDto[],
    organizationId?: string,
  ): Promise<LabResultParameter[]> {
    return apiClient.post<LabResultParameter[]>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/orders/${orderId}/results`,
      { parameters },
      {},
      organizationId,
    );
  },

  async getRecommendations(
    filters: RecommendationFilters,
    organizationId?: string,
  ): Promise<LabServiceRecommendation[]> {
    const params = new URLSearchParams();
    if (filters.orderId) params.append('orderId', filters.orderId);
    if (filters.parcelId) params.append('parcelId', filters.parcelId);
    const queryString = params.toString();
    return apiClient.get<LabServiceRecommendation[]>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/recommendations${queryString ? `?${queryString}` : ''}`,
      {},
      organizationId,
    );
  },

  async createRecommendation(
    data: CreateRecommendationDto,
    organizationId?: string,
  ): Promise<LabServiceRecommendation> {
    return apiClient.post<LabServiceRecommendation>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/recommendations`,
      data,
      {},
      organizationId,
    );
  },

  async updateRecommendation(
    recommendationId: string,
    data: UpdateRecommendationDto,
    organizationId?: string,
  ): Promise<LabServiceRecommendation> {
    return apiClient.patch<LabServiceRecommendation>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/recommendations/${recommendationId}`,
      data,
      {},
      organizationId,
    );
  },

  async getSchedules(
    filters: ScheduleFilters,
    organizationId?: string,
  ): Promise<SampleCollectionSchedule[]> {
    const params = new URLSearchParams();
    if (filters.farmId) params.append('farmId', filters.farmId);
    if (filters.parcelId) params.append('parcelId', filters.parcelId);
    const queryString = params.toString();
    return apiClient.get<SampleCollectionSchedule[]>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/schedules${queryString ? `?${queryString}` : ''}`,
      {},
      organizationId,
    );
  },

  async createSchedule(
    data: CreateScheduleDto,
    organizationId?: string,
  ): Promise<SampleCollectionSchedule> {
    return apiClient.post<SampleCollectionSchedule>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/schedules`,
      data,
      {},
      organizationId,
    );
  },

  async updateSchedule(
    scheduleId: string,
    data: UpdateScheduleDto,
    organizationId?: string,
  ): Promise<SampleCollectionSchedule> {
    return apiClient.patch<SampleCollectionSchedule>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/schedules/${scheduleId}`,
      data,
      {},
      organizationId,
    );
  },

  async deleteSchedule(
    scheduleId: string,
    organizationId?: string,
  ): Promise<void> {
    return apiClient.delete<void>(
      `${ORG_BASE_URL}/${organizationId}/lab-services/schedules/${scheduleId}`,
      {},
      organizationId,
    );
  },
};
