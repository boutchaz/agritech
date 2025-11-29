import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

@Injectable()
export class TaxesService {
  private readonly logger = new Logger(TaxesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all taxes for an organization with optional filters
   */
  async findAll(
    organizationId: string,
    filters?: {
      tax_type?: 'sales' | 'purchase' | 'both';
      is_active?: boolean;
      search?: string;
    }
  ): Promise<any> {
    const supabase = this.databaseService.getClient();

    let query = supabase
      .from('taxes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    // Filter by tax_type if specified (sales, purchase, or both)
    if (filters?.tax_type) {
      query = query.or(`tax_type.eq.${filters.tax_type},tax_type.eq.both`);
    }

    // Filter by is_active if specified
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    // Search by name
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch taxes: ${error.message}`);
      throw new BadRequestException(`Failed to fetch taxes: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a single tax by ID
   */
  async findOne(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getClient();

    const { data, error } = await supabase
      .from('taxes')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch tax: ${error.message}`);
      throw new BadRequestException(`Failed to fetch tax: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Tax not found');
    }

    return data;
  }

  /**
   * Create a new tax
   */
  async create(dto: CreateTaxDto): Promise<any> {
    const supabase = this.databaseService.getClient();

    const { data, error } = await supabase
      .from('taxes')
      .insert({
        organization_id: dto.organization_id,
        name: dto.tax_name,
        rate: dto.tax_rate,
        tax_type: dto.tax_type,
        is_active: dto.is_active ?? true,
        description: dto.description,
        created_by: dto.created_by,
        updated_by: dto.created_by,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create tax: ${error.message}`);
      throw new BadRequestException(`Failed to create tax: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a tax
   */
  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateTaxDto
  ): Promise<any> {
    const supabase = this.databaseService.getClient();

    const updateData: any = {
      updated_by: userId,
    };

    if (dto.tax_name !== undefined) updateData.name = dto.tax_name;
    if (dto.tax_rate !== undefined) updateData.rate = dto.tax_rate;
    if (dto.tax_type !== undefined) updateData.tax_type = dto.tax_type;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
    if (dto.description !== undefined) updateData.description = dto.description;

    const { data, error } = await supabase
      .from('taxes')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update tax: ${error.message}`);
      throw new BadRequestException(`Failed to update tax: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a tax
   */
  async delete(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getClient();

    // Check if tax is used in invoice items
    const { data: invoiceItems } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('tax_id', id)
      .limit(1);

    if (invoiceItems && invoiceItems.length > 0) {
      throw new BadRequestException(
        'Cannot delete tax used in invoices. Please deactivate it instead.'
      );
    }

    const { error } = await supabase
      .from('taxes')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete tax: ${error.message}`);
      throw new BadRequestException(`Failed to delete tax: ${error.message}`);
    }

    return { message: 'Tax deleted successfully' };
  }
}
