import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DeleteFarmDto } from './dto/delete-farm.dto';
import { ImportFarmDto } from './dto/import-farm.dto';
import { ListFarmsResponseDto, FarmDto } from './dto/list-farms.dto';
import { paginatedResponse, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AdoptionService, MilestoneType } from '../adoption/adoption.service';

@Injectable()
export class FarmsService {
  private readonly supabaseAdmin: SupabaseClient;
  private readonly logger = new Logger(FarmsService.name);
  private readonly farmRoleDefinitions = [
    {
      role: 'main_manager',
      description: 'Full access to manage the farm and team.',
      permissions: {
        manage_farms: true,
        manage_sub_farms: true,
        manage_users: true,
        view_reports: true,
        manage_crops: true,
        manage_parcels: true,
        manage_inventory: true,
        manage_activities: true,
      },
    },
    {
      role: 'sub_manager',
      description: 'Manage farm operations without user administration.',
      permissions: {
        manage_farms: false,
        manage_sub_farms: true,
        manage_users: false,
        view_reports: true,
        manage_crops: true,
        manage_parcels: true,
        manage_inventory: true,
        manage_activities: true,
      },
    },
    {
      role: 'supervisor',
      description: 'Supervise field work and monitor progress.',
      permissions: {
        manage_farms: false,
        manage_sub_farms: false,
        manage_users: false,
        view_reports: true,
        manage_crops: true,
        manage_parcels: true,
        manage_inventory: false,
        manage_activities: true,
      },
    },
    {
      role: 'coordinator',
      description: 'Coordinate day-to-day field activities.',
      permissions: {
        manage_farms: false,
        manage_sub_farms: false,
        manage_users: false,
        view_reports: true,
        manage_crops: true,
        manage_parcels: false,
        manage_inventory: false,
        manage_activities: true,
      },
    },
  ];

  constructor(
    private configService: ConfigService,
    private subscriptionsService: SubscriptionsService,
    private adoptionService: AdoptionService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async listFarms(
    userId: string,
    organizationId: string,
  ): Promise<PaginatedResponse<FarmDto>> {
    this.logger.log(
      `Listing farms for organization ${organizationId}, user ${userId}`,
    );

    this.logger.debug(`[listFarms] Checking membership - userId: "${userId}", orgId: "${organizationId}", types: userId=${typeof userId}, orgId=${typeof organizationId}`);
    
    const { data: allUserOrgs } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id, role_id, is_active')
      .eq('user_id', userId);
    
    this.logger.debug(`[listFarms] All user orgs: ${JSON.stringify(allUserOrgs)}`);
    
    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id, role_id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    this.logger.debug(`[listFarms] Specific org check - orgUser: ${JSON.stringify(orgUser)}, error: ${JSON.stringify(orgError)}`);

    if (orgError || !orgUser) {
      // Return empty list instead of 403 for users without organization membership
      // This supports the onboarding flow where users may not have organization_users record yet
      this.logger.warn(`User ${userId} not found in organization ${organizationId}, returning empty farms list`);
      return paginatedResponse<FarmDto>([], 0, 1, 100);
    }

    // Fetch all farms for the organization with parcel counts
    const { data: farms, error: farmsError } = await this.supabaseAdmin
      .from('farms')
      .select('id, name, location, size, manager_name, is_active, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (farmsError) {
      this.logger.error('Error fetching farms', farmsError);
      throw new InternalServerErrorException('Failed to fetch farms');
    }

    // Get parcel counts for each farm
    const farmIds = farms.map((f) => f.id);
    let parcelCounts: Record<string, number> = {};

    if (farmIds.length > 0) {
      this.logger.log(`Fetching parcels for ${farmIds.length} farms`);

      const { data: parcels, error: parcelsError } = await this.supabaseAdmin
        .from('parcels')
        .select('farm_id')
        .in('farm_id', farmIds)
        .eq('is_active', true);

      if (parcelsError) {
        this.logger.error(`Error fetching parcels: ${parcelsError.message}`);
      } else if (parcels) {
        this.logger.log(`Found ${parcels.length} active parcels for ${farmIds.length} farms`);
        parcelCounts = parcels.reduce(
          (acc, p) => {
            acc[p.farm_id] = (acc[p.farm_id] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );
        this.logger.log(`Parcel counts by farm: ${JSON.stringify(parcelCounts)}`);
      } else {
        this.logger.warn('No parcels found or parcels is null');
      }
    }

    // Map to response format (matching RPC function structure)
    const farmDtos: FarmDto[] = farms.map((farm) => ({
      farm_id: farm.id,
      farm_name: farm.name,
      parent_farm_id: null, // farms table doesn't support hierarchy
      farm_type: 'main', // farms table doesn't have farm_type
      farm_size: farm.size,
      farm_location: farm.location || null,
      manager_name: farm.manager_name || 'N/A',
      is_active: farm.is_active ?? true,
      hierarchy_level: 1, // farms table doesn't support hierarchy
      parcel_count: parcelCounts[farm.id] || 0,
      subparcel_count: 0, // not supported yet
    }));

    return paginatedResponse<FarmDto>(farmDtos, farmDtos.length, 1, farmDtos.length || 100);
  }

  /**
   * Get farm hierarchy tree
   * Migrated from get_farm_hierarchy_tree SQL function
   */
  async getFarmHierarchy(userId: string, organizationId: string) {
    // Reuse listFarms logic as the underlying data structure is currently flat
    const farmsList = await this.listFarms(userId, organizationId);

    // Transform to tree structure (currently just root nodes)
    const tree = farmsList.data.map((farm: FarmDto) => ({
      id: farm.farm_id,
      name: farm.farm_name,
      type: farm.farm_type,
      size: farm.farm_size,
      manager: farm.manager_name,
      isActive: farm.is_active,
      parcelCount: farm.parcel_count,
      children: [] // No sub-farms supported yet
    }));

    return tree;
  }

  async getAvailableFarmRoles() {
    return this.farmRoleDefinitions;
  }

  async getFarmRoles(userId: string, organizationId: string, farmId: string) {
    const { data: farm, error: farmError } = await this.supabaseAdmin
      .from('farms')
      .select('id, organization_id')
      .eq('id', farmId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (farmError || !farm) {
      throw new NotFoundException('Farm not found');
    }

    const { data: orgUser } = await this.supabaseAdmin
      .from('organization_users')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const { data: roles, error } = await this.supabaseAdmin
      .from('farm_management_roles')
      .select('id, farm_id, user_id, role, is_active, created_at')
      .eq('farm_id', farmId)
      .eq('is_active', true);

    if (error) {
      this.logger.error(`Failed to fetch farm roles: ${error.message}`);
      throw new BadRequestException(`Failed to fetch farm roles: ${error.message}`);
    }

    const userIds = (roles || []).map((role) => role.user_id).filter(Boolean);
    let profiles: Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }> = [];

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await this.supabaseAdmin
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (profilesError) {
        this.logger.warn(`Failed to fetch user profiles for farm roles: ${profilesError.message}`);
      } else {
        profiles = profilesData || [];
      }
    }

    return (roles || []).map((role) => ({
      ...role,
      permissions: this.getRolePermissions(role.role),
      assigned_at: role.created_at,
      user_profile: profiles.find((profile) => profile.id === role.user_id),
    }));
  }

  async getOrganizationUsersForFarm(userId: string, organizationId: string, farmId: string) {
    const { data: farm, error: farmError } = await this.supabaseAdmin
      .from('farms')
      .select('id, organization_id')
      .eq('id', farmId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (farmError || !farm) {
      throw new NotFoundException('Farm not found');
    }

    const { data: orgUser } = await this.supabaseAdmin
      .from('organization_users')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const { data: orgUsers, error } = await this.supabaseAdmin
      .from('organization_users')
      .select('user_id, role_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) {
      throw new BadRequestException(`Failed to fetch organization users: ${error.message}`);
    }

    const userIds = (orgUsers || []).map((entry) => entry.user_id).filter(Boolean);
    let profiles: Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }> = [];

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await this.supabaseAdmin
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (profilesError) {
        this.logger.warn(`Failed to fetch organization user profiles: ${profilesError.message}`);
      } else {
        profiles = profilesData || [];
      }
    }

    return (orgUsers || []).map((entry) => ({
      ...entry,
      user_profile: profiles.find((profile) => profile.id === entry.user_id),
    }));
  }

  async assignFarmRole(
    userId: string,
    organizationId: string,
    farmId: string,
    input: { user_id: string; role: string },
  ) {
    const { data: farm, error: farmError } = await this.supabaseAdmin
      .from('farms')
      .select('id')
      .eq('id', farmId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (farmError || !farm) {
      throw new NotFoundException('Farm not found');
    }

    const { data: orgUser } = await this.supabaseAdmin
      .from('organization_users')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const { data, error } = await this.supabaseAdmin
      .from('farm_management_roles')
      .insert({
        farm_id: farmId,
        user_id: input.user_id,
        role: input.role,
        is_active: true,
      })
      .select('id, farm_id, user_id, role, is_active, created_at')
      .single();

    if (error) {
      this.logger.error(`Failed to assign farm role: ${error.message}`);
      throw new BadRequestException(`Failed to assign farm role: ${error.message}`);
    }

    return {
      ...data,
      permissions: this.getRolePermissions(data.role),
      assigned_at: data.created_at,
    };
  }

  async removeFarmRole(
    userId: string,
    organizationId: string,
    farmId: string,
    roleId: string,
  ) {
    const { data: farm, error: farmError } = await this.supabaseAdmin
      .from('farms')
      .select('id')
      .eq('id', farmId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (farmError || !farm) {
      throw new NotFoundException('Farm not found');
    }

    const { data: orgUser } = await this.supabaseAdmin
      .from('organization_users')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const { error } = await this.supabaseAdmin
      .from('farm_management_roles')
      .update({ is_active: false })
      .eq('id', roleId)
      .eq('farm_id', farmId);

    if (error) {
      this.logger.error(`Failed to remove farm role: ${error.message}`);
      throw new BadRequestException(`Failed to remove farm role: ${error.message}`);
    }

    return { success: true };
  }

  async getUserFarmRoles(organizationId: string, userId: string) {
    const { data: roles, error } = await this.supabaseAdmin
      .from('farm_management_roles')
      .select('id, farm_id, role, is_active, created_at, farms!inner(name, organization_id)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('farms.organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to fetch user farm roles: ${error.message}`);
      throw new BadRequestException(`Failed to fetch user farm roles: ${error.message}`);
    }

    return (roles || []).map((role) => ({
      farm_id: role.farm_id,
      farm_name: (role as any).farms?.name || 'Unknown Farm',
      role: role.role,
      permissions: this.getRolePermissions(role.role),
      assigned_at: role.created_at,
      is_active: role.is_active,
    }));
  }

  async createFarm(userId: string, organizationId: string, dto: any) {
    this.logger.log(`Creating farm for user ${userId} in org ${organizationId}`);

    // Verify user access
    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from('organization_users')
      .select('role_id, roles!inner(name)')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Check permissions (admin/manager)
    const userRole = (orgUser as any).roles?.name;
    const allowedRoles = ['system_admin', 'organization_admin', 'farm_manager'];
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new ForbiddenException('Insufficient permissions to create farms');
    }

    // Check subscription
    const hasValidSubscription = await this.subscriptionsService.hasValidSubscription(organizationId);
    if (!hasValidSubscription) {
      throw new ForbiddenException('Active subscription required to create farms');
    }

    // Enforce subscription farm limit
    const { data: sub } = await this.supabaseAdmin
      .from('subscriptions')
      .select('max_farms')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (sub?.max_farms != null) {
      const { count: farmCount } = await this.supabaseAdmin
        .from('farms')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if ((farmCount ?? 0) >= sub.max_farms) {
        throw new ForbiddenException(
          `Subscription limit reached: maximum ${sub.max_farms} farms for your plan`,
        );
      }
    }

    // Prepare farm data
    // Note: farms table schema has: size_unit (not area_unit), status, manager_name (not manager_id)
    // Does NOT have: farm_type, parent_farm_id, hierarchy_level, manager_id
    const farmData: any = {
      organization_id: organizationId,
      name: dto.name,
      location: dto.location || null,
      size: dto.size || null,
      size_unit: dto.size_unit || 'hectare', // Default to 'hectare' per schema
      description: dto.description || null,
      manager_name: dto.manager_name || null,
      manager_email: dto.manager_email || null,
      manager_phone: dto.manager_phone || null,
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      status: dto.status || 'active',
    };

    // Only add optional fields if they are provided
    if (dto.address) farmData.address = dto.address;
    if (dto.city) farmData.city = dto.city;
    if (dto.state) farmData.state = dto.state;
    if (dto.postal_code) farmData.postal_code = dto.postal_code;
    if (dto.country) farmData.country = dto.country;
    if (dto.soil_type) farmData.soil_type = dto.soil_type;
    if (dto.climate_zone) farmData.climate_zone = dto.climate_zone;
    if (dto.irrigation_type) farmData.irrigation_type = dto.irrigation_type;
    if (dto.established_date) farmData.established_date = dto.established_date;
    if (dto.certification_status) farmData.certification_status = dto.certification_status;
    if (dto.coordinates) farmData.coordinates = dto.coordinates;

    // Insert farm
    const { data: newFarm, error: createError } = await this.supabaseAdmin
      .from('farms')
      .insert(farmData)
      .select()
      .single();

    if (createError) {
      this.logger.error('Error creating farm', createError);
      throw new InternalServerErrorException(`Failed to create farm: ${createError.message}`);
    }

    this.logger.log(`Farm created successfully: ${newFarm.id}`);

    // Track first farm created milestone
    await this.adoptionService.recordMilestone(
      userId,
      MilestoneType.FIRST_FARM_CREATED,
      organizationId,
      {
        farm_id: newFarm.id,
        farm_name: newFarm.name,
      },
    );

    return newFarm;
  }

  async updateFarm(userId: string, organizationId: string, farmId: string, dto: any) {
    this.logger.log(`Updating farm ${farmId} for user ${userId} in org ${organizationId}`);

    // Verify user access
    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from('organization_users')
      .select('role_id, roles!inner(name)')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Check permissions (admin/manager)
    const userRole = (orgUser as any).roles?.name;
    const allowedRoles = ['system_admin', 'organization_admin', 'farm_manager'];
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new ForbiddenException('Insufficient permissions to update farms');
    }

    // Verify farm exists and belongs to organization
    const { data: existingFarm, error: farmError } = await this.supabaseAdmin
      .from('farms')
      .select('id, organization_id')
      .eq('id', farmId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (farmError || !existingFarm) {
      throw new NotFoundException('Farm not found');
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.size !== undefined) updateData.size = dto.size;
    if (dto.size_unit !== undefined) updateData.size_unit = dto.size_unit;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.manager_name !== undefined) updateData.manager_name = dto.manager_name;
    if (dto.manager_email !== undefined) updateData.manager_email = dto.manager_email;
    if (dto.manager_phone !== undefined) updateData.manager_phone = dto.manager_phone;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.postal_code !== undefined) updateData.postal_code = dto.postal_code;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.soil_type !== undefined) updateData.soil_type = dto.soil_type;
    if (dto.climate_zone !== undefined) updateData.climate_zone = dto.climate_zone;
    if (dto.irrigation_type !== undefined) updateData.irrigation_type = dto.irrigation_type;
    if (dto.established_date !== undefined) updateData.established_date = dto.established_date;
    if (dto.certification_status !== undefined) updateData.certification_status = dto.certification_status;
    if (dto.coordinates !== undefined) updateData.coordinates = dto.coordinates;

    // Update farm
    const { data: updatedFarm, error: updateError } = await this.supabaseAdmin
      .from('farms')
      .update(updateData)
      .eq('id', farmId)
      .select()
      .single();

    if (updateError) {
      this.logger.error('Error updating farm', updateError);
      throw new InternalServerErrorException(`Failed to update farm: ${updateError.message}`);
    }

    this.logger.log(`Farm updated successfully: ${farmId}`);
    return updatedFarm;
  }

  private getRolePermissions(role: string | null) {
    const definition = this.farmRoleDefinitions.find((item) => item.role === role);
    return definition ? definition.permissions : {};
  }

  async getFarm(userId: string, organizationId: string, farmId: string) {
    this.logger.log(`Getting farm ${farmId} for user ${userId} in org ${organizationId}`);

    // Verify user access
    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      this.logger.error('User not authorized for organization', orgError);
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Fetch farm
    const { data: farm, error: farmError } = await this.supabaseAdmin
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .eq('organization_id', organizationId)
      .single();

    if (farmError || !farm) {
      this.logger.error('Farm not found or access denied', farmError);
      throw new NotFoundException('Farm not found or you do not have access to it');
    }

    return farm;
  }

  async getFarmRelatedDataCounts(userId: string, organizationId: string, farmId: string) {
    this.logger.log(`Getting related data counts for farm ${farmId}`);

    // Verify user access
    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Verify farm belongs to organization
    const { data: farm, error: farmError } = await this.supabaseAdmin
      .from('farms')
      .select('id, organization_id')
      .eq('id', farmId)
      .eq('organization_id', organizationId)
      .single();

    if (farmError || !farm) {
      throw new NotFoundException('Farm not found or you do not have access to it');
    }

    // Get counts for all related data
    const [
      parcelsRes,
      workersRes,
      tasksRes,
      satelliteRes,
      warehousesRes,
      inventoryRes,
      structuresRes
    ] = await Promise.all([
      this.supabaseAdmin.from('parcels').select('id', { count: 'exact', head: true }).eq('farm_id', farmId).eq('is_active', true),
      this.supabaseAdmin.from('workers').select('id', { count: 'exact', head: true }).eq('farm_id', farmId),
      this.supabaseAdmin.from('tasks').select('id', { count: 'exact', head: true }).eq('farm_id', farmId),
      this.supabaseAdmin.from('satellite_data').select('id', { count: 'exact', head: true }).eq('farm_id', farmId),
      this.supabaseAdmin.from('warehouses').select('id', { count: 'exact', head: true }).eq('farm_id', farmId),
      this.supabaseAdmin.from('items').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      this.supabaseAdmin.from('structures').select('id', { count: 'exact', head: true }).eq('farm_id', farmId).eq('is_active', true),
    ]);

    return {
      parcels: parcelsRes.count || 0,
      workers: workersRes.count || 0,
      tasks: tasksRes.count || 0,
      satellite_data: satelliteRes.count || 0,
      warehouses: warehousesRes.count || 0,
      inventory_items: inventoryRes.count || 0,
      structures: structuresRes.count || 0,
    };
  }



  async deleteFarm(userId: string, dto: DeleteFarmDto) {
    const { farm_id } = dto;

    this.logger.log(`Deleting farm ${farm_id} for user ${userId}`);

    // First verify the farm exists and get organization info
    const { data: existingFarm, error: checkError } = await this.supabaseAdmin
      .from('farms')
      .select('id, name, organization_id')
      .eq('id', farm_id)
      .single();

    if (checkError || !existingFarm) {
      this.logger.error('Farm not found', checkError);
      throw new NotFoundException(
        `Unable to verify farm: ${checkError?.message || 'Farm not found'}`,
      );
    }

    const organizationId = existingFarm.organization_id;

    if (!organizationId) {
      throw new BadRequestException(
        'Farm is not associated with any organization',
      );
    }

    // Check user's role in the organization
    // Note: Using role_id instead of role
    const { data: orgUser, error: roleError } = await this.supabaseAdmin
      .from('organization_users')
      .select('role_id, roles!inner(name)')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (roleError) {
      this.logger.error('Error checking user role', roleError);
      throw new InternalServerErrorException(
        `Unable to verify your role: ${roleError.message}`,
      );
    }

    if (!orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Extract role name from the joined roles table
    const userRole = (orgUser as any).roles?.name;
    const allowedRoles = ['system_admin', 'organization_admin'];
    const hasRequiredRole = userRole && allowedRoles.includes(userRole);

    if (!hasRequiredRole) {
      const roleDisplayNames: Record<string, string> = {
        system_admin: 'System Administrator',
        organization_admin: 'Organization Administrator',
        farm_manager: 'Farm Manager',
        farm_worker: 'Farm Worker',
        day_laborer: 'Day Laborer',
        viewer: 'Viewer',
      };

      const currentRoleDisplay =
        roleDisplayNames[userRole || ''] || userRole || 'None';

      throw new ForbiddenException(
        `You do not have the required role to delete farms. Current role: ${currentRoleDisplay}. Required roles: System Administrator or Organization Administrator.`,
      );
    }

    // Check subscription
    const hasValidSubscription = await this.subscriptionsService.hasValidSubscription(organizationId);

    if (!hasValidSubscription) {
      this.logger.error('Subscription check failed: invalid or expired');
      throw new ForbiddenException(
        `An active subscription is required to delete farms.`,
      );
    }

    // Check if farm has sub-farms (if parent_farm_id column exists)
    try {
      const { data: subFarms, error: subFarmsError } = await this.supabaseAdmin
        .from('farms')
        .select('id, name')
        .eq('parent_farm_id', farm_id)
        .eq('is_active', true);

      if (subFarmsError) {
        // If column doesn't exist (code 42703), skip the check
        if (subFarmsError.code === '42703') {
          this.logger.log(
            'parent_farm_id column not found, skipping sub-farms check',
          );
        } else {
          this.logger.error('Error checking sub-farms', subFarmsError);
          // Continue with deletion, but warn
        }
      } else if (subFarms && subFarms.length > 0) {
        throw new BadRequestException(
          `Cannot delete farm as it contains ${subFarms.length} sub-farm(s). Please delete or reassign sub-farms first.`,
        );
      }
    } catch (error: any) {
      // If parent_farm_id column doesn't exist, skip the check
      if (
        error?.code === '42703' ||
        error?.message?.includes('parent_farm_id')
      ) {
        this.logger.log(
          'parent_farm_id column not found, skipping sub-farms check',
        );
      } else if (error instanceof BadRequestException) {
        throw error; // Re-throw if it's our own BadRequestException
      } else {
        this.logger.error('Unexpected error checking sub-farms', error);
        // Continue with deletion
      }
    }

    this.logger.log(`Deleting farm: ${farm_id}`);

    const { data: deletedFarms, error: deleteError } = await this.supabaseAdmin
      .from('farms')
      .delete()
      .eq('id', farm_id)
      .select('id, name');

    if (deleteError) {
      this.logger.error('Delete error', deleteError);
      throw new InternalServerErrorException(
        `Error during deletion: ${deleteError.message}`,
      );
    }

    const deletedFarmsArray = Array.isArray(deletedFarms)
      ? deletedFarms
      : deletedFarms
        ? [deletedFarms]
        : [];

    if (deletedFarmsArray.length === 0) {
      this.logger.warn(
        'No farm deleted - farm may not exist or was already deleted',
      );

      // Verify if farm still exists
      const { data: verifyFarm, error: verifyError } = await this.supabaseAdmin
        .from('farms')
        .select('id')
        .eq('id', farm_id)
        .maybeSingle();

      if (verifyError) {
        this.logger.error('Error verifying farm', verifyError);
        throw new InternalServerErrorException(
          `Verification error: ${verifyError.message}`,
        );
      }

      if (verifyFarm) {
        throw new InternalServerErrorException(
          'Deletion failed. Farm may be referenced elsewhere or protected by a constraint.',
        );
      } else {
        this.logger.log('Farm was already deleted or does not exist');
        return { success: true, message: 'Farm deleted or already absent' };
      }
    }

    const deletedFarm = deletedFarmsArray[0];
    this.logger.log(`Farm deleted successfully: ${deletedFarm.id}`);

    return { success: true, deleted_farm: deletedFarm };
  }

  async importFarm(userId: string, dto: ImportFarmDto) {
    const { organization_id, export_data, skip_duplicates = false } = dto;

    this.logger.log(
      `Importing farms for organization ${organization_id} by user ${userId}`,
    );

    // Validate export data structure
    if (!export_data.farms || !Array.isArray(export_data.farms)) {
      throw new BadRequestException(
        'Invalid export_data: farms array is required',
      );
    }

    // Verify user has access to this organization
    const { data: orgUser } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    this.logger.log(`Starting farm import: ${JSON.stringify({
      organization_id,
      total_farms: export_data.farms.length,
      total_parcels: export_data.parcels?.length || 0,
      total_aois: export_data.satellite_aois?.length || 0,
    })}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    const idMappings = {
      farms: {} as Record<string, string>,
      parcels: {} as Record<string, string>,
      satellite_aois: {} as Record<string, string>,
    };

    let importedFarms = 0;
    let importedParcels = 0;
    let importedAois = 0;

    // Step 1: Import all farms (farms table doesn't support hierarchy)
    for (const farm of export_data.farms) {
      try {
        // Check for duplicates if skip_duplicates is enabled
        if (skip_duplicates) {
          const { data: existing } = await this.supabaseAdmin
            .from('farms')
            .select('id')
            .eq('organization_id', organization_id)
            .eq('name', farm.name)
            .maybeSingle();

          if (existing) {
            warnings.push(`Skipped duplicate farm: ${farm.name}`);
            idMappings.farms[farm.original_id || farm.id] = existing.id;
            continue;
          }
        }

        const { data: newFarm, error: farmError } = await this.supabaseAdmin
          .from('farms')
          .insert({
            organization_id,
            name: farm.name,
            location: farm.location,
            size: farm.size,
            size_unit: farm.size_unit || farm.area_unit || 'hectare',
            description: farm.description,
            address: farm.address,
            city: farm.city,
            state: farm.state,
            postal_code: farm.postal_code,
            country: farm.country,
            soil_type: farm.soil_type,
            climate_zone: farm.climate_zone,
            irrigation_type: farm.irrigation_type,
            manager_name: farm.manager_name,
            manager_email: farm.manager_email,
            manager_phone: farm.manager_phone,
            established_date: farm.established_date,
            certification_status: farm.certification_status,
            coordinates: farm.coordinates,
            status: farm.status || 'active',
            is_active: farm.is_active !== false,
          })
          .select('id')
          .single();

        if (farmError) {
          errors.push(
            `Failed to import farm ${farm.name}: ${farmError.message}`,
          );
          continue;
        }

        idMappings.farms[farm.original_id || farm.id] = newFarm.id;
        importedFarms++;
      } catch (error) {
        errors.push(
          `Error importing farm ${farm.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Step 2: Import parcels
    this.logger.log(`Importing ${export_data.parcels?.length || 0} parcels...`);
    this.logger.log(`Available farm ID mappings: ${JSON.stringify(idMappings.farms)}`);

    for (const parcel of export_data.parcels || []) {
      try {
        const lookupKey = parcel.original_farm_id || parcel.farm_id;
        const newFarmId = idMappings.farms[lookupKey];

        this.logger.log(`Importing parcel "${parcel.name}": lookupKey=${lookupKey}, newFarmId=${newFarmId}`);

        if (!newFarmId) {
          const errorMsg = `Failed to import parcel ${parcel.name}: farm not found (lookup key: ${lookupKey})`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        if (skip_duplicates) {
          const { data: existing } = await this.supabaseAdmin
            .from('parcels')
            .select('id')
            .eq('farm_id', newFarmId)
            .eq('name', parcel.name)
            .maybeSingle();

          if (existing) {
            warnings.push(`Skipped duplicate parcel: ${parcel.name}`);
            idMappings.parcels[parcel.original_id || parcel.id] = existing.id;
            continue;
          }
        }

        const { data: newParcel, error: parcelError } =
          await this.supabaseAdmin
            .from('parcels')
            .insert({
              farm_id: newFarmId,
              name: parcel.name,
              description: parcel.description,
              area: parcel.area,
              area_unit: parcel.area_unit || 'hectares',
              soil_type: parcel.soil_type,
              boundary: parcel.boundary,
              elevation: parcel.elevation,
              slope_percentage: parcel.slope_percentage,
              irrigation_type: parcel.irrigation_type,
              notes: parcel.notes,
              calculated_area: parcel.calculated_area,
              planting_density: parcel.planting_density,
              perimeter: parcel.perimeter,
              variety: parcel.variety,
              planting_date: parcel.planting_date,
              planting_type: parcel.planting_type,
              is_active: parcel.is_active !== false, // Ensure is_active is set (default true)
            })
            .select('id')
            .single();

        if (parcelError) {
          const errorMsg = `Failed to import parcel ${parcel.name}: ${parcelError.message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        idMappings.parcels[parcel.original_id || parcel.id] = newParcel.id;
        importedParcels++;
        this.logger.log(`✓ Successfully imported parcel "${parcel.name}" with ID ${newParcel.id} (farm_id: ${newFarmId})`);
      } catch (error) {
        errors.push(
          `Error importing parcel ${parcel.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Step 3: Import satellite AOIs
    for (const aoi of export_data.satellite_aois || []) {
      try {
        const newFarmId = aoi.original_farm_id
          ? idMappings.farms[aoi.original_farm_id]
          : null;
        const newParcelId = aoi.original_parcel_id
          ? idMappings.parcels[aoi.original_parcel_id]
          : null;

        if (!newFarmId && !newParcelId) {
          warnings.push(
            `Skipped AOI ${aoi.name}: no valid farm or parcel reference`,
          );
          continue;
        }

        if (skip_duplicates) {
          const { data: existing } = await this.supabaseAdmin
            .from('satellite_aois')
            .select('id')
            .eq('organization_id', organization_id)
            .eq('name', aoi.name)
            .maybeSingle();

          if (existing) {
            warnings.push(`Skipped duplicate AOI: ${aoi.name}`);
            idMappings.satellite_aois[aoi.original_id || aoi.id] =
              existing.id;
            continue;
          }
        }

        const { data: newAoi, error: aoiError } = await this.supabaseAdmin
          .from('satellite_aois')
          .insert({
            organization_id,
            farm_id: newFarmId,
            parcel_id: newParcelId,
            name: aoi.name,
            description: aoi.description,
            geometry_json: aoi.geometry_json,
            area_hectares: aoi.area_hectares,
            is_active: aoi.is_active !== false,
          })
          .select('id')
          .single();

        if (aoiError) {
          errors.push(`Failed to import AOI ${aoi.name}: ${aoiError.message}`);
          continue;
        }

        idMappings.satellite_aois[aoi.original_id || aoi.id] = newAoi.id;
        importedAois++;
      } catch (error) {
        errors.push(
          `Error importing AOI ${aoi.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    this.logger.log(
      `Import completed: ${JSON.stringify({
        farms: importedFarms,
        parcels: importedParcels,
        aois: importedAois,
        errors: errors.length,
        warnings: warnings.length,
      })}`,
    );

    return {
      success: errors.length === 0,
      imported: {
        farms: importedFarms,
        parcels: importedParcels,
        satellite_aois: importedAois,
        id_mappings: idMappings,
      },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  async batchDeleteFarms(userId: string, farmIds: string[]) {
    this.logger.log(
      `Batch deleting ${farmIds.length} farms for user ${userId}`,
    );

    const deletedFarms: Array<{ id: string; name: string }> = [];
    const errors: Array<{ id: string; name: string; error: string }> = [];

    // Process each farm deletion
    for (const farmId of farmIds) {
      try {
        // Verify the farm exists and get organization info
        const { data: existingFarm, error: checkError } =
          await this.supabaseAdmin
            .from('farms')
            .select('id, name, organization_id')
            .eq('id', farmId)
            .maybeSingle();

        if (checkError || !existingFarm) {
          errors.push({
            id: farmId,
            name: 'Unknown',
            error: checkError?.message || 'Farm not found',
          });
          continue;
        }

        const organizationId = existingFarm.organization_id;

        if (!organizationId) {
          errors.push({
            id: farmId,
            name: existingFarm.name,
            error: 'Farm is not associated with any organization',
          });
          continue;
        }

        // Check user's role in the organization (only check once per org)
        const { data: orgUser, error: roleError } = await this.supabaseAdmin
          .from('organization_users')
          .select('role_id, roles!inner(name)')
          .eq('organization_id', organizationId)
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (roleError || !orgUser) {
          errors.push({
            id: farmId,
            name: existingFarm.name,
            error: 'You do not have access to this organization',
          });
          continue;
        }

        // Extract role name
        const userRole = (orgUser as any).roles?.name;
        const allowedRoles = ['system_admin', 'organization_admin'];
        const hasRequiredRole = userRole && allowedRoles.includes(userRole);

        if (!hasRequiredRole) {
          errors.push({
            id: farmId,
            name: existingFarm.name,
            error: `Insufficient permissions. Required: System Administrator or Organization Administrator.`,
          });
          continue;
        }

        // Check subscription
        const hasValidSubscription = await this.subscriptionsService.hasValidSubscription(organizationId);

        if (!hasValidSubscription) {
          errors.push({
            id: farmId,
            name: existingFarm.name,
            error: 'An active subscription is required to delete farms',
          });
          continue;
        }

        // Delete the farm (CASCADE will handle related data)
        const { error: deleteError } = await this.supabaseAdmin
          .from('farms')
          .delete()
          .eq('id', farmId);

        if (deleteError) {
          errors.push({
            id: farmId,
            name: existingFarm.name,
            error: deleteError.message,
          });
          continue;
        }

        // Successfully deleted
        deletedFarms.push({
          id: farmId,
          name: existingFarm.name,
        });

        this.logger.log(`✓ Successfully deleted farm: ${existingFarm.name}`);
      } catch (error) {
        this.logger.error(`Error deleting farm ${farmId}:`, error);
        errors.push({
          id: farmId,
          name: 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `Batch delete completed: ${deletedFarms.length} deleted, ${errors.length} failed`,
    );

    return {
      deleted: deletedFarms.length,
      failed: errors.length,
      deleted_farms: deletedFarms,
      errors: errors,
      success: deletedFarms.length > 0 && errors.length === 0,
    };
  }

  /**
   * Export farm data (farms, parcels, satellite AOIs) in structured JSON format
   * Supports single farm export (with optional sub-farms) or organization-wide export
   */
  async exportFarm(userId: string, dto: any) {
    const { farm_id, organization_id, include_sub_farms = true } = dto;

    this.logger.log(
      `Exporting farms for user ${userId}: farm_id=${farm_id}, organization_id=${organization_id}, include_sub_farms=${include_sub_farms}`,
    );

    // Validate that at least one ID is provided
    if (!farm_id && !organization_id) {
      throw new BadRequestException(
        'Missing required field: either farm_id or organization_id must be provided',
      );
    }

    let farmsToExport: any[] = [];

    if (farm_id) {
      // Export specific farm (and optionally sub-farms)
      const { data: farm, error: farmError } = await this.supabaseAdmin
        .from('farms')
        .select('*')
        .eq('id', farm_id)
        .maybeSingle();

      if (farmError || !farm) {
        this.logger.error('Farm not found', farmError);
        throw new NotFoundException(
          `Farm not found: ${farmError?.message || 'Unknown error'}`,
        );
      }

      // Verify user has access to this farm's organization
      const { data: orgUser } = await this.supabaseAdmin
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', farm.organization_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!orgUser) {
        throw new ForbiddenException('You do not have access to this farm');
      }

      farmsToExport = [farm];

      // If include_sub_farms, fetch all sub-farms recursively
      if (include_sub_farms) {
        const fetchSubFarms = async (
          parentFarmId: string,
          allFarms: any[],
        ): Promise<any[]> => {
          try {
            const { data: subFarms, error: subError } =
              await this.supabaseAdmin
                .from('farms')
                .select('*')
                .eq('parent_farm_id', parentFarmId)
                .eq('is_active', true);

            if (subError) {
              // If parent_farm_id column doesn't exist, skip
              if (subError.code === '42703') {
                this.logger.log(
                  'parent_farm_id column not found, skipping sub-farms',
                );
                return allFarms;
              }
              this.logger.error('Error fetching sub-farms', subError);
              return allFarms;
            }

            if (subFarms && subFarms.length > 0) {
              allFarms.push(...subFarms);
              // Recursively fetch sub-farms of sub-farms
              for (const subFarm of subFarms) {
                await fetchSubFarms(subFarm.id, allFarms);
              }
            }

            return allFarms;
          } catch (error) {
            this.logger.error('Error in fetchSubFarms', error);
            return allFarms;
          }
        };

        const subFarms = await fetchSubFarms(farm_id, []);
        farmsToExport.push(...subFarms);
      }
    } else if (organization_id) {
      // Export all farms for organization
      const { data: orgUser } = await this.supabaseAdmin
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organization_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!orgUser) {
        throw new ForbiddenException(
          'You do not have access to this organization',
        );
      }

      const { data: orgFarms, error: orgFarmsError } =
        await this.supabaseAdmin
          .from('farms')
          .select('*')
          .eq('organization_id', organization_id)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

      if (orgFarmsError) {
        this.logger.error('Error fetching organization farms', orgFarmsError);
        throw new InternalServerErrorException(
          `Error fetching farms: ${orgFarmsError.message}`,
        );
      }

      farmsToExport = orgFarms || [];
    }

    if (farmsToExport.length === 0) {
      throw new NotFoundException('No farms found to export');
    }

    const farmIds = farmsToExport.map((f) => f.id);

    // Fetch all parcels for these farms
    const { data: parcels, error: parcelsError } = await this.supabaseAdmin
      .from('parcels')
      .select('*')
      .in('farm_id', farmIds)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (parcelsError) {
      this.logger.error('Error fetching parcels', parcelsError);
      throw new InternalServerErrorException(
        `Error fetching parcels: ${parcelsError.message}`,
      );
    }

    const parcelIds = parcels?.map((p) => p.id) || [];

    // Fetch all satellite AOIs for these farms and parcels
    let satelliteAois: any[] = [];
    if (farmIds.length > 0) {
      try {
        const orCondition =
          parcelIds.length > 0
            ? `farm_id.in.(${farmIds.join(',')}),parcel_id.in.(${parcelIds.join(',')})`
            : `farm_id.in.(${farmIds.join(',')})`;

        const { data: aois, error: aoisError } = await this.supabaseAdmin
          .from('satellite_aois')
          .select('*')
          .or(orCondition)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (aoisError) {
          this.logger.error('Error fetching satellite AOIs', aoisError);
          // Don't fail if AOIs can't be fetched, just log it
        } else {
          satelliteAois = aois || [];
        }
      } catch (error) {
        this.logger.error('Error fetching satellite AOIs', error);
        // Continue without AOIs
      }
    }

    // Prepare export data (preserve original IDs for import mapping)
    const exportData = {
      exported_at: new Date().toISOString(),
      version: '1.0.0',
      farms: farmsToExport.map((farm) => ({
        ...farm,
        original_id: farm.id, // Keep original ID for mapping during import
      })),
      parcels: (parcels || []).map((parcel) => ({
        ...parcel,
        original_id: parcel.id,
        original_farm_id: parcel.farm_id, // Keep original farm_id for mapping
      })),
      satellite_aois: satelliteAois.map((aoi) => ({
        ...aoi,
        original_id: aoi.id,
        original_farm_id: aoi.farm_id,
        original_parcel_id: aoi.parcel_id,
      })),
      metadata: {
        total_farms: farmsToExport.length,
        total_parcels: parcels?.length || 0,
        total_aois: satelliteAois.length,
      },
    };

    this.logger.log('Export completed:', exportData.metadata);

    return {
      success: true,
      data: exportData,
    };
  }
}
