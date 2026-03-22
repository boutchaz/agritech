import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  LabServiceOrderFiltersDto,
  CreateLabServiceOrderDto,
  UpdateLabServiceOrderDto,
  CreateLabResultParametersDto,
  CreateLabRecommendationDto,
  UpdateLabRecommendationDto,
  LabRecommendationFiltersDto,
  SampleScheduleFiltersDto,
  CreateSampleScheduleDto,
  UpdateSampleScheduleDto,
  ServiceCategory,
} from './dto';

@Injectable()
export class LabServicesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private async verifyOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('organization_users')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new NotFoundException('Organization not found or access denied');
    }
  }

  async getProviders() {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('lab_service_providers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new BadRequestException(`Failed to fetch providers: ${error.message}`);
    }

    return data || [];
  }

  async getProviderById(providerId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('lab_service_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Provider not found');
    }

    return data;
  }

  async getServiceTypes(providerId?: string, category?: ServiceCategory) {
    const client = this.databaseService.getAdminClient();
    let query = client
      .from('lab_service_types')
      .select('*, provider:lab_service_providers(*)')
      .eq('is_active', true);

    if (providerId) {
      query = query.eq('provider_id', providerId);
    }
    if (category) {
      query = query.eq('category', category);
    }

    query = query.order('category').order('name');

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch service types: ${error.message}`);
    }

    return data || [];
  }

  async getServiceTypeById(typeId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('lab_service_types')
      .select('*, provider:lab_service_providers(*)')
      .eq('id', typeId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Service type not found');
    }

    return data;
  }

  async getOrders(
    userId: string,
    organizationId: string,
    filters: LabServiceOrderFiltersDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('lab_service_orders')
      .select(`
        *,
        service_type:lab_service_types(*),
        provider:lab_service_providers(*),
        farm:farms(id, name),
        parcel:parcels(id, name),
        sample_collector:user_profiles(id, full_name),
        creator:user_profiles(id, full_name)
      `)
      .eq('organization_id', organizationId)
      .order('order_date', { ascending: false });

    if (filters.farmId) {
      query = query.eq('farm_id', filters.farmId);
    }
    if (filters.parcelId) {
      query = query.eq('parcel_id', filters.parcelId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch orders: ${error.message}`);
    }

    return data || [];
  }

  async getOrderById(
    userId: string,
    organizationId: string,
    orderId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('lab_service_orders')
      .select(`
        *,
        service_type:lab_service_types(*),
        provider:lab_service_providers(*),
        farm:farms(id, name),
        parcel:parcels(id, name),
        sample_collector:user_profiles(id, full_name),
        creator:user_profiles(id, full_name)
      `)
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Order not found');
    }

    return data;
  }

  async createOrder(
    userId: string,
    organizationId: string,
    dto: CreateLabServiceOrderDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('lab_service_orders')
      .insert({
        ...dto,
        organization_id: organizationId,
        created_by: userId,
        order_date: dto.order_date || new Date().toISOString(),
        status: dto.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }

    return data;
  }

  async updateOrder(
    userId: string,
    organizationId: string,
    orderId: string,
    dto: UpdateLabServiceOrderDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: existing } = await client
      .from('lab_service_orders')
      .select('id')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    const { data, error } = await client
      .from('lab_service_orders')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update order: ${error.message}`);
    }

    return data;
  }

  async getResultParameters(
    userId: string,
    organizationId: string,
    orderId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: order } = await client
      .from('lab_service_orders')
      .select('id')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const { data, error } = await client
      .from('lab_result_parameters')
      .select('*')
      .eq('order_id', orderId)
      .order('parameter_name');

    if (error) {
      throw new BadRequestException(`Failed to fetch result parameters: ${error.message}`);
    }

    return data || [];
  }

  async addResultParameters(
    userId: string,
    organizationId: string,
    orderId: string,
    dto: CreateLabResultParametersDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: order } = await client
      .from('lab_service_orders')
      .select('id')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const parametersWithOrderId = dto.parameters.map((p) => ({
      ...p,
      order_id: orderId,
    }));

    const { data, error } = await client
      .from('lab_result_parameters')
      .insert(parametersWithOrderId)
      .select();

    if (error) {
      throw new BadRequestException(`Failed to add result parameters: ${error.message}`);
    }

    return data;
  }

  async getRecommendations(
    userId: string,
    organizationId: string,
    filters: LabRecommendationFiltersDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('lab_service_recommendations')
      .select('*, implementer:user_profiles(id, full_name)')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.orderId) {
      query = query.eq('order_id', filters.orderId);
    }
    if (filters.parcelId) {
      query = query.eq('parcel_id', filters.parcelId);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch recommendations: ${error.message}`);
    }

    return data || [];
  }

  async createRecommendation(
    userId: string,
    organizationId: string,
    dto: CreateLabRecommendationDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: order } = await client
      .from('lab_service_orders')
      .select('id')
      .eq('id', dto.order_id)
      .eq('organization_id', organizationId)
      .single();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const { data, error } = await client
      .from('lab_service_recommendations')
      .insert({
        ...dto,
        status: dto.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create recommendation: ${error.message}`);
    }

    return data;
  }

  async updateRecommendation(
    userId: string,
    organizationId: string,
    recommendationId: string,
    dto: UpdateLabRecommendationDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: existing } = await client
      .from('lab_service_recommendations')
      .select('id, order_id')
      .eq('id', recommendationId)
      .single();

    if (!existing) {
      throw new NotFoundException('Recommendation not found');
    }

    const { data: order } = await client
      .from('lab_service_orders')
      .select('id')
      .eq('id', existing.order_id)
      .eq('organization_id', organizationId)
      .single();

    if (!order) {
      throw new NotFoundException('Order not found or access denied');
    }

    const { data, error } = await client
      .from('lab_service_recommendations')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update recommendation: ${error.message}`);
    }

    return data;
  }

  async getSchedules(
    userId: string,
    organizationId: string,
    filters: SampleScheduleFiltersDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('sample_collection_schedules')
      .select(`
        *,
        farm:farms(id, name),
        parcel:parcels(id, name),
        service_type:lab_service_types(*),
        assignee:user_profiles(id, full_name)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('next_collection_date');

    if (filters.farmId) {
      query = query.eq('farm_id', filters.farmId);
    }
    if (filters.parcelId) {
      query = query.eq('parcel_id', filters.parcelId);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch schedules: ${error.message}`);
    }

    return data || [];
  }

  async createSchedule(
    userId: string,
    organizationId: string,
    dto: CreateSampleScheduleDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('sample_collection_schedules')
      .insert({
        ...dto,
        organization_id: organizationId,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create schedule: ${error.message}`);
    }

    return data;
  }

  async updateSchedule(
    userId: string,
    organizationId: string,
    scheduleId: string,
    dto: UpdateSampleScheduleDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: existing } = await client
      .from('sample_collection_schedules')
      .select('id')
      .eq('id', scheduleId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      throw new NotFoundException('Schedule not found');
    }

    const { data, error } = await client
      .from('sample_collection_schedules')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update schedule: ${error.message}`);
    }

    return data;
  }

  async deleteSchedule(
    userId: string,
    organizationId: string,
    scheduleId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('sample_collection_schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to delete schedule: ${error.message}`);
    }
  }
}
