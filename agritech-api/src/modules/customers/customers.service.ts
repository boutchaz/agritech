import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerFiltersDto } from './dto';

@Injectable()
export class CustomersService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all customers with optional filters
   */
  async findAll(organizationId: string, filters?: CustomerFiltersDto) {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.name) {
      query = query.ilike('name', `%${filters.name}%`);
    }

    if (filters?.customer_code) {
      query = query.eq('customer_code', filters.customer_code);
    }

    if (filters?.customer_type) {
      query = query.eq('customer_type', filters.customer_type);
    }

    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    } else {
      // Default to active customers only
      query = query.eq('is_active', true);
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a single customer by ID
   */
  async findOne(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return data;
  }

  /**
   * Create a new customer
   */
  async create(dto: CreateCustomerDto, organizationId: string, userId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('customers')
      .insert({
        organization_id: organizationId,
        name: dto.name,
        customer_code: dto.customer_code || null,
        contact_person: dto.contact_person || null,
        email: dto.email || null,
        phone: dto.phone || null,
        mobile: dto.mobile || null,
        address: dto.address || null,
        city: dto.city || null,
        state_province: dto.state_province || null,
        postal_code: dto.postal_code || null,
        country: dto.country || null,
        website: dto.website || null,
        tax_id: dto.tax_id || null,
        payment_terms: dto.payment_terms || null,
        credit_limit: dto.credit_limit || null,
        currency_code: dto.currency_code || null,
        customer_type: dto.customer_type || null,
        price_list: dto.price_list || null,
        assigned_to: dto.assigned_to || null,
        notes: dto.notes || null,
        is_active: dto.is_active ?? true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a customer
   */
  async update(id: string, dto: UpdateCustomerDto, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // First verify the customer exists and belongs to the organization
    await this.findOne(id, organizationId);

    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.customer_code !== undefined) updateData.customer_code = dto.customer_code;
    if (dto.contact_person !== undefined) updateData.contact_person = dto.contact_person;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.mobile !== undefined) updateData.mobile = dto.mobile;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state_province !== undefined) updateData.state_province = dto.state_province;
    if (dto.postal_code !== undefined) updateData.postal_code = dto.postal_code;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.tax_id !== undefined) updateData.tax_id = dto.tax_id;
    if (dto.payment_terms !== undefined) updateData.payment_terms = dto.payment_terms;
    if (dto.credit_limit !== undefined) updateData.credit_limit = dto.credit_limit;
    if (dto.currency_code !== undefined) updateData.currency_code = dto.currency_code;
    if (dto.customer_type !== undefined) updateData.customer_type = dto.customer_type;
    if (dto.price_list !== undefined) updateData.price_list = dto.price_list;
    if (dto.assigned_to !== undefined) updateData.assigned_to = dto.assigned_to;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    const { data, error } = await client
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }

    return data;
  }

  /**
   * Soft delete a customer (set is_active to false)
   */
  async delete(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // First verify the customer exists and belongs to the organization
    await this.findOne(id, organizationId);

    const { error } = await client
      .from('customers')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to delete customer: ${error.message}`);
    }

    return { message: 'Customer deleted successfully' };
  }
}
