import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateDocumentTemplateDto, DocumentType, UpdateDocumentTemplateDto } from './dto';
import { paginatedResponse, type PaginatedResponse } from '../../common/dto/paginated-query.dto';

@Injectable()
export class DocumentTemplatesService {
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

  async findAll(
    userId: string,
    organizationId: string,
    documentType?: DocumentType,
    pagination: { page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<any>> {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const page = Math.max(1, Number(pagination.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(pagination.pageSize) || 100));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const apply = (q: any) => {
      q = q.eq('organization_id', organizationId);
      if (documentType) q = q.eq('document_type', documentType);
      return q;
    };

    const { count } = await apply(
      client.from('document_templates').select('id', { count: 'exact', head: true }),
    );
    const { data, error } = await apply(client.from('document_templates').select('*'))
      .order('name')
      .range(from, to);

    if (error) {
      throw new BadRequestException(`Failed to fetch templates: ${error.message}`);
    }

    return paginatedResponse(data ?? [], count ?? 0, page, pageSize);
  }

  async findOne(
    userId: string,
    organizationId: string,
    templateId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Template not found');
    }

    return data;
  }

  async findDefault(
    userId: string,
    organizationId: string,
    documentType: DocumentType,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('document_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('document_type', documentType)
      .eq('is_default', true)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch default template: ${error.message}`);
    }

    return data;
  }

  async create(
    userId: string,
    organizationId: string,
    dto: CreateDocumentTemplateDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    if (dto.is_default) {
      await this.clearDefaultForType(client, organizationId, dto.document_type);
    }

    const { data, error } = await client
      .from('document_templates')
      .insert({
        ...dto,
        organization_id: organizationId,
        created_by: userId,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create template: ${error.message}`);
    }

    return data;
  }

  async update(
    userId: string,
    organizationId: string,
    templateId: string,
    dto: UpdateDocumentTemplateDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: existing } = await client
      .from('document_templates')
      .select('document_type')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    if (dto.is_default) {
      const docType = dto.document_type || existing.document_type;
      await this.clearDefaultForType(client, organizationId, docType);
    }

    const { data, error } = await client
      .from('document_templates')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update template: ${error.message}`);
    }

    return data;
  }

  async delete(
    userId: string,
    organizationId: string,
    templateId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('document_templates')
      .delete()
      .eq('id', templateId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to delete template: ${error.message}`);
    }
  }

  async setDefault(
    userId: string,
    organizationId: string,
    templateId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: template } = await client
      .from('document_templates')
      .select('document_type')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.clearDefaultForType(client, organizationId, template.document_type);

    const { data, error } = await client
      .from('document_templates')
      .update({ is_default: true })
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to set default: ${error.message}`);
    }

    return data;
  }

  async duplicate(
    userId: string,
    organizationId: string,
    templateId: string,
    newName?: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: original } = await client
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (!original) {
      throw new NotFoundException('Template not found');
    }

    const { id, created_at, updated_at, ...templateData } = original;

    const { data, error } = await client
      .from('document_templates')
      .insert({
        ...templateData,
        name: newName || `${original.name} (Copy)`,
        is_default: false,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to duplicate template: ${error.message}`);
    }

    return data;
  }

  private async clearDefaultForType(
    client: ReturnType<typeof this.databaseService.getAdminClient>,
    organizationId: string,
    documentType: string,
  ) {
    await client
      .from('document_templates')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('document_type', documentType)
      .eq('is_default', true);
  }
}
