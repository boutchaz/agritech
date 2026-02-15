import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCropTemplateDto } from './dto/create-crop-template.dto';

@Injectable()
export class CropTemplatesService {
  private readonly logger = new Logger(CropTemplatesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(organizationId?: string) {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('crop_templates')
      .select('*')
      .order('crop_name', { ascending: true });

    if (organizationId) {
      query = query.or(`is_global.eq.true,organization_id.eq.${organizationId}`);
    } else {
      query = query.eq('is_global', true);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch crop templates: ${error.message}`);
      throw error;
    }

    return data || [];
  }

  async findOne(id: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('crop_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch crop template: ${error.message}`);
      throw error;
    }

    if (!data) {
      throw new NotFoundException('Crop template not found');
    }

    return data;
  }

  async create(organizationId: string, dto: CreateCropTemplateDto) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('crop_templates')
      .insert({
        ...dto,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create crop template: ${error.message}`);
      throw error;
    }

    return data;
  }

  async update(id: string, organizationId: string, dto: Partial<CreateCropTemplateDto>) {
    const existing = await this.findOne(id);

    if (existing.is_global && existing.organization_id !== organizationId) {
      throw new ForbiddenException('Cannot update global templates');
    }

    if (existing.organization_id && existing.organization_id !== organizationId) {
      throw new ForbiddenException('Cannot update templates from another organization');
    }

    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('crop_templates')
      .update(dto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update crop template: ${error.message}`);
      throw error;
    }

    return data;
  }

  async remove(id: string, organizationId: string) {
    const existing = await this.findOne(id);

    if (existing.is_global && existing.organization_id !== organizationId) {
      throw new ForbiddenException('Cannot delete global templates');
    }

    if (existing.organization_id && existing.organization_id !== organizationId) {
      throw new ForbiddenException('Cannot delete templates from another organization');
    }

    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('crop_templates')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete crop template: ${error.message}`);
      throw error;
    }

    return { id };
  }

  async findGlobal() {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('crop_templates')
      .select('*')
      .eq('is_global', true)
      .order('crop_name', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch global crop templates: ${error.message}`);
      throw error;
    }

    return data || [];
  }
}
