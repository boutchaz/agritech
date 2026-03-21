import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { paginate, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
import { CreateSupplierDto, UpdateSupplierDto, SupplierFiltersDto } from './dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all suppliers with optional filters
   */
  async findAll(organizationId: string, filters?: SupplierFiltersDto): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();

    return paginate(client, 'suppliers', {
      filters: (q) => {
        q = q.eq('organization_id', organizationId);
        if (filters?.name) q = q.ilike('name', `%${filters.name}%`);
        if (filters?.supplier_code) q = q.eq('supplier_code', filters.supplier_code);
        if (filters?.supplier_type) q = q.eq('supplier_type', filters.supplier_type);
        if (filters?.assigned_to) q = q.eq('assigned_to', filters.assigned_to);
        q = q.eq('is_active', filters?.is_active ?? true);
        return q;
      },
      page: (filters as any)?.page || 1,
      pageSize: (filters as any)?.pageSize || 50,
      orderBy: 'name',
      ascending: true,
    });
  }

  /**
   * Get a single supplier by ID
   */
  async findOne(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return data;
  }

  /**
   * Create a new supplier
   */
  async create(dto: CreateSupplierDto, organizationId: string, userId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('suppliers')
      .insert({
        organization_id: organizationId,
        name: dto.name,
        supplier_code: dto.supplier_code || null,
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
        currency_code: dto.currency_code || null,
        supplier_type: dto.supplier_type || null,
        assigned_to: dto.assigned_to || null,
        notes: dto.notes || null,
        is_active: dto.is_active ?? true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create supplier: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a supplier
   */
  async update(id: string, dto: UpdateSupplierDto, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // First verify the supplier exists and belongs to the organization
    await this.findOne(id, organizationId);

    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.supplier_code !== undefined) updateData.supplier_code = dto.supplier_code;
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
    if (dto.currency_code !== undefined) updateData.currency_code = dto.currency_code;
    if (dto.supplier_type !== undefined) updateData.supplier_type = dto.supplier_type;
    if (dto.assigned_to !== undefined) updateData.assigned_to = dto.assigned_to;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    const { data, error } = await client
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update supplier: ${error.message}`);
    }

    return data;
  }

  /**
   * Soft delete a supplier (set is_active to false)
   */
  async delete(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // First verify the supplier exists and belongs to the organization
    await this.findOne(id, organizationId);

    const { error } = await client
      .from('suppliers')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to delete supplier: ${error.message}`);
    }

    return { message: 'Supplier deleted successfully' };
  }
}
