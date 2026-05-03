import { apiClient } from '../api-client';

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
  organization?: {
    id: string;
    name: string;
    currency_code: string | null;
  };
}

export interface CreateOrganizationGroupInput {
  name: string;
  base_currency: string;
}

export type UpdateOrganizationGroupInput = Partial<CreateOrganizationGroupInput>;

export const organizationGroupsApi = {
  async getAll(organizationId?: string): Promise<OrganizationGroup[]> {
    return apiClient.get<OrganizationGroup[]>('/api/v1/organization-groups', {}, organizationId);
  },

  async getOne(id: string, organizationId?: string): Promise<OrganizationGroup> {
    return apiClient.get<OrganizationGroup>(`/api/v1/organization-groups/${id}`, {}, organizationId);
  },

  async create(
    data: CreateOrganizationGroupInput,
    organizationId?: string,
  ): Promise<OrganizationGroup> {
    return apiClient.post<OrganizationGroup>('/api/v1/organization-groups', data, {}, organizationId);
  },

  async update(
    id: string,
    data: UpdateOrganizationGroupInput,
    organizationId?: string,
  ): Promise<OrganizationGroup> {
    return apiClient.patch<OrganizationGroup>(
      `/api/v1/organization-groups/${id}`,
      data,
      {},
      organizationId,
    );
  },

  async delete(id: string, organizationId?: string): Promise<void> {
    await apiClient.delete(`/api/v1/organization-groups/${id}`, {}, organizationId);
  },

  async listMembers(
    groupId: string,
    organizationId?: string,
  ): Promise<OrganizationGroupMember[]> {
    return apiClient.get<OrganizationGroupMember[]>(
      `/api/v1/organization-groups/${groupId}/members`,
      {},
      organizationId,
    );
  },

  async addMember(
    groupId: string,
    memberOrganizationId: string,
    organizationId?: string,
  ): Promise<OrganizationGroupMember> {
    return apiClient.post<OrganizationGroupMember>(
      `/api/v1/organization-groups/${groupId}/members`,
      { organization_id: memberOrganizationId },
      {},
      organizationId,
    );
  },

  async removeMember(
    groupId: string,
    memberOrganizationId: string,
    organizationId?: string,
  ): Promise<void> {
    await apiClient.delete(
      `/api/v1/organization-groups/${groupId}/members/${memberOrganizationId}`,
      {},
      organizationId,
    );
  },
};
