import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DeliveriesService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Verify user has access to organization
   */
  private async verifyOrganizationAccess(userId: string, organizationId: string): Promise<void> {
    const client = this.databaseService.getAdminClient();

    const { data: membership, error } = await client
      .from('organization_users')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !membership) {
      throw new BadRequestException('User does not have access to this organization');
    }
  }

  /**
   * Get all deliveries for an organization with optional filters
   */
  async getAll(organizationId: string, filters?: {
    status?: string; // comma-separated
    payment_status?: string; // comma-separated
    delivery_type?: string; // comma-separated
    farm_id?: string;
    driver_id?: string;
    date_from?: string;
    date_to?: string;
    customer_name?: string;
  }) {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('deliveries')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.status) {
      const statuses = filters.status.split(',');
      query = query.in('status', statuses);
    }

    if (filters?.payment_status) {
      const paymentStatuses = filters.payment_status.split(',');
      query = query.in('payment_status', paymentStatuses);
    }

    if (filters?.delivery_type) {
      const types = filters.delivery_type.split(',');
      query = query.in('delivery_type', types);
    }

    if (filters?.farm_id) {
      query = query.eq('farm_id', filters.farm_id);
    }

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.date_from) {
      query = query.gte('delivery_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('delivery_date', filters.date_to);
    }

    if (filters?.customer_name) {
      query = query.ilike('customer_name', `%${filters.customer_name}%`);
    }

    query = query.order('delivery_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch deliveries: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single delivery by ID with items and tracking
   */
  async getById(organizationId: string, deliveryId: string) {
    const client = this.databaseService.getAdminClient();

    // Get delivery
    const { data: delivery, error: deliveryError } = await client
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .eq('organization_id', organizationId)
      .single();

    if (deliveryError || !delivery) {
      throw new NotFoundException(`Delivery not found`);
    }

    // Get delivery items with harvest details
    const { data: items } = await client
      .from('delivery_items')
      .select(`
        *,
        harvest:harvest_record_id(harvest_date, crop_id, parcel_id)
      `)
      .eq('delivery_id', deliveryId);

    // Get tracking records
    const { data: tracking } = await client
      .from('delivery_tracking')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('recorded_at', { ascending: false });

    return {
      ...delivery,
      items: items || [],
      tracking: tracking || [],
    };
  }

  /**
   * Get delivery items for a specific delivery
   */
  async getItems(deliveryId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('delivery_items')
      .select(`
        *,
        harvest:harvest_record_id(
          harvest_date,
          crop_id,
          parcel_id
        )
      `)
      .eq('delivery_id', deliveryId);

    if (error) {
      throw new BadRequestException(`Failed to fetch delivery items: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get delivery tracking records for a specific delivery
   */
  async getTracking(deliveryId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('delivery_tracking')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('recorded_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch delivery tracking: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new delivery with items
   */
  async create(
    userId: string,
    organizationId: string,
    deliveryData: {
      farm_id: string;
      delivery_date: string;
      delivery_type: string;
      customer_name: string;
      customer_contact?: string;
      customer_email?: string;
      delivery_address?: string;
      destination_lat?: number;
      destination_lng?: number;
      driver_id?: string;
      vehicle_info?: string;
      payment_method?: string;
      payment_terms?: string;
      notes?: string;
      items: Array<{
        harvest_record_id: string;
        quantity: number;
        unit: string;
        price_per_unit: number;
      }>;
    },
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Calculate totals from items
    const totalQuantity = deliveryData.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = deliveryData.items.reduce(
      (sum, item) => sum + item.quantity * item.price_per_unit,
      0,
    );

    // Create delivery
    const { data: delivery, error: deliveryError } = await client
      .from('deliveries')
      .insert({
        organization_id: organizationId,
        farm_id: deliveryData.farm_id,
        delivery_date: deliveryData.delivery_date,
        delivery_type: deliveryData.delivery_type,
        customer_name: deliveryData.customer_name,
        customer_contact: deliveryData.customer_contact,
        customer_email: deliveryData.customer_email,
        delivery_address: deliveryData.delivery_address,
        destination_lat: deliveryData.destination_lat,
        destination_lng: deliveryData.destination_lng,
        driver_id: deliveryData.driver_id,
        vehicle_info: deliveryData.vehicle_info,
        payment_method: deliveryData.payment_method,
        payment_terms: deliveryData.payment_terms,
        notes: deliveryData.notes,
        total_quantity: totalQuantity,
        total_amount: totalAmount,
        currency: 'MAD', // Default currency
        payment_received: 0,
        payment_status: 'pending',
        status: 'pending',
        created_by: userId,
      })
      .select()
      .single();

    if (deliveryError) {
      throw new BadRequestException(`Failed to create delivery: ${deliveryError.message}`);
    }

    // Create delivery items
    if (deliveryData.items && deliveryData.items.length > 0) {
      const itemInserts = deliveryData.items.map((item) => ({
        delivery_id: delivery.id,
        harvest_record_id: item.harvest_record_id,
        quantity: item.quantity,
        unit: item.unit,
        price_per_unit: item.price_per_unit,
        total_amount: item.quantity * item.price_per_unit,
      }));

      const { error: itemsError } = await client
        .from('delivery_items')
        .insert(itemInserts);

      if (itemsError) {
        throw new BadRequestException(`Failed to create delivery items: ${itemsError.message}`);
      }
    }

    return delivery;
  }

  /**
   * Update delivery status and create tracking record
   */
  async updateStatus(
    userId: string,
    organizationId: string,
    deliveryId: string,
    statusData: {
      status: string;
      location_lat?: number;
      location_lng?: number;
      location_name?: string;
      notes?: string;
      photo_url?: string;
    },
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Update delivery status
    const { data: delivery, error: deliveryError } = await client
      .from('deliveries')
      .update({ status: statusData.status })
      .eq('id', deliveryId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (deliveryError) {
      throw new BadRequestException(`Failed to update delivery status: ${deliveryError.message}`);
    }

    // Create tracking record
    const { error: trackingError } = await client
      .from('delivery_tracking')
      .insert({
        delivery_id: deliveryId,
        status: statusData.status,
        location_lat: statusData.location_lat,
        location_lng: statusData.location_lng,
        location_name: statusData.location_name,
        notes: statusData.notes,
        photo_url: statusData.photo_url,
        recorded_by: userId,
      });

    if (trackingError) {
      throw new BadRequestException(`Failed to create tracking record: ${trackingError.message}`);
    }

    return delivery;
  }

  /**
   * Complete a delivery (mark as delivered with signature)
   */
  async complete(
    userId: string,
    organizationId: string,
    deliveryId: string,
    completionData: {
      signature_image: string;
      signature_name: string;
      arrival_time?: string;
      notes?: string;
    },
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('deliveries')
      .update({
        status: 'delivered',
        signature_image: completionData.signature_image,
        signature_name: completionData.signature_name,
        signature_date: new Date().toISOString(),
        arrival_time: completionData.arrival_time || new Date().toISOString(),
        notes: completionData.notes || null,
      })
      .eq('id', deliveryId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to complete delivery: ${error.message}`);
    }

    return data;
  }

  /**
   * Update delivery payment information
   */
  async updatePayment(
    userId: string,
    organizationId: string,
    deliveryId: string,
    paymentData: {
      payment_received: number;
      payment_date?: string;
      payment_status?: string;
    },
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('deliveries')
      .update({
        payment_received: paymentData.payment_received,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        payment_status: paymentData.payment_status || 'partial',
      })
      .eq('id', deliveryId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update payment: ${error.message}`);
    }

    return data;
  }

  /**
   * Cancel a delivery
   */
  async cancel(
    userId: string,
    organizationId: string,
    deliveryId: string,
    reason?: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('deliveries')
      .update({
        status: 'cancelled',
        notes: reason,
      })
      .eq('id', deliveryId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to cancel delivery: ${error.message}`);
    }

    return data;
  }
}
