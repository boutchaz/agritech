import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateOrganizationGroupDto,
  UpdateOrganizationGroupDto,
} from './dto/create-organization-group.dto';

export interface OrganizationGroup {
  id: string;
  parent_organization_id: string;
  name: string;
  base_currency: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationGroupMember {
  id: string;
  group_id: string;
  organization_id: string;
  created_at: string;
  organization?: { id: string; name: string; currency_code: string | null };
}

@Injectable()
export class OrganizationGroupsService {
  private readonly logger = new Logger(OrganizationGroupsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(parentOrganizationId: string): Promise<OrganizationGroup[]> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('organization_groups')
      .select('*')
      .eq('parent_organization_id', parentOrganizationId)
      .order('name', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return (data || []) as OrganizationGroup[];
  }

  async findOne(id: string, parentOrganizationId: string): Promise<OrganizationGroup> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('organization_groups')
      .select('*')
      .eq('id', id)
      .eq('parent_organization_id', parentOrganizationId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Organization group not found: ${id}`);
    return data as OrganizationGroup;
  }

  async create(
    parentOrganizationId: string,
    dto: CreateOrganizationGroupDto,
  ): Promise<OrganizationGroup> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('organization_groups')
      .insert({
        parent_organization_id: parentOrganizationId,
        name: dto.name,
        base_currency: dto.base_currency.toUpperCase(),
      })
      .select()
      .single();
    if (error) {
      this.logger.error(`Failed to create org group: ${error.message}`);
      throw new BadRequestException(error.message);
    }
    return data as OrganizationGroup;
  }

  async update(
    id: string,
    parentOrganizationId: string,
    dto: UpdateOrganizationGroupDto,
  ): Promise<OrganizationGroup> {
    await this.findOne(id, parentOrganizationId);
    const supabase = this.databaseService.getAdminClient();
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.base_currency !== undefined) payload.base_currency = dto.base_currency.toUpperCase();
    const { data, error } = await supabase
      .from('organization_groups')
      .update(payload)
      .eq('id', id)
      .eq('parent_organization_id', parentOrganizationId)
      .select()
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Organization group not found: ${id}`);
    return data as OrganizationGroup;
  }

  async remove(id: string, parentOrganizationId: string): Promise<void> {
    await this.findOne(id, parentOrganizationId);
    const supabase = this.databaseService.getAdminClient();
    const { error } = await supabase
      .from('organization_groups')
      .delete()
      .eq('id', id)
      .eq('parent_organization_id', parentOrganizationId);
    if (error) throw new BadRequestException(error.message);
  }

  async listMembers(
    groupId: string,
    parentOrganizationId: string,
  ): Promise<OrganizationGroupMember[]> {
    await this.findOne(groupId, parentOrganizationId);
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('organization_group_members')
      .select('*, organization:organizations(id, name, currency_code)')
      .eq('group_id', groupId);
    if (error) throw new BadRequestException(error.message);
    return (data || []) as OrganizationGroupMember[];
  }

  async addMember(
    groupId: string,
    parentOrganizationId: string,
    organizationId: string,
    userId: string,
  ): Promise<OrganizationGroupMember> {
    await this.findOne(groupId, parentOrganizationId);

    // Validate the caller is a member of the org being added (no cross-org leakage).
    const supabase = this.databaseService.getAdminClient();
    const { data: ou, error: ouErr } = await supabase
      .from('organization_users')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();
    if (ouErr) throw new BadRequestException(ouErr.message);
    if (!ou) {
      throw new ForbiddenException(
        'You can only add organizations you are a member of to a group',
      );
    }

    const { data, error } = await supabase
      .from('organization_group_members')
      .insert({ group_id: groupId, organization_id: organizationId })
      .select('*, organization:organizations(id, name, currency_code)')
      .single();
    if (error) {
      this.logger.error(`Failed to add member: ${error.message}`);
      throw new BadRequestException(error.message);
    }
    return data as OrganizationGroupMember;
  }

  async removeMember(
    groupId: string,
    parentOrganizationId: string,
    organizationId: string,
  ): Promise<void> {
    await this.findOne(groupId, parentOrganizationId);
    const supabase = this.databaseService.getAdminClient();
    const { error } = await supabase
      .from('organization_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('organization_id', organizationId);
    if (error) throw new BadRequestException(error.message);
  }

  /** Internal: returns member organization ids for a group (no parent check). */
  async getMemberOrgIds(groupId: string): Promise<string[]> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('organization_group_members')
      .select('organization_id')
      .eq('group_id', groupId);
    if (error) throw new BadRequestException(error.message);
    return (data || []).map((r: any) => r.organization_id as string);
  }
}
