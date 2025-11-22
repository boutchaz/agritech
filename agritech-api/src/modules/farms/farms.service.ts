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

@Injectable()
export class FarmsService {
  private readonly supabaseAdmin: SupabaseClient;
  private readonly logger = new Logger(FarmsService.name);

  constructor(private configService: ConfigService) {
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
    const { data: subscriptionCheck, error: subscriptionError } =
      await this.supabaseAdmin.rpc('has_valid_subscription', {
        org_id: organizationId,
      });

    const hasValidSubscription =
      subscriptionCheck === true ||
      (typeof subscriptionCheck === 'boolean' && subscriptionCheck);

    if (subscriptionError || !hasValidSubscription) {
      this.logger.error('Subscription check failed', subscriptionError);
      throw new ForbiddenException(
        `An active subscription is required to delete farms. Subscription status: ${hasValidSubscription ? 'Valid' : 'Invalid'}.`,
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

    // Use RPC function to bypass the subscription trigger
    let { data: deletedFarms, error: deleteError } = await this.supabaseAdmin
      .rpc('delete_farm_direct', { p_farm_id: farm_id });

    // If RPC function doesn't exist, fallback to direct delete
    if (
      deleteError &&
      (deleteError.code === '42883' || deleteError.code === 'PGRST202')
    ) {
      this.logger.log(
        'RPC function not found, using direct delete (may be blocked by trigger)',
      );

      // Fallback to direct delete
      const directDeleteResult = await this.supabaseAdmin
        .from('farms')
        .delete()
        .eq('id', farm_id)
        .select('id, name');

      deletedFarms = directDeleteResult.data;
      deleteError = directDeleteResult.error;

      // If delete was blocked by trigger, provide helpful error message
      if (
        deleteError &&
        (deleteError.message?.includes('subscription') ||
          deleteError.code === 'P0001')
      ) {
        this.logger.error('Delete blocked by trigger', deleteError);
        throw new InternalServerErrorException(
          'Deletion was blocked by subscription verification. Please apply migration 20250203000011_create_delete_farm_function.sql to resolve this issue.',
        );
      }
    }

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

    // Step 1: Import farms (main farms first, then sub-farms)
    const mainFarms = export_data.farms.filter(
      (f: any) => !f.parent_farm_id,
    );
    const subFarms = export_data.farms.filter((f: any) => f.parent_farm_id);

    // Import main farms first
    for (const farm of mainFarms) {
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
            area_unit: farm.area_unit || 'hectares',
            description: farm.description,
            latitude: farm.latitude,
            longitude: farm.longitude,
            farm_type: farm.farm_type || 'main',
            hierarchy_level: farm.hierarchy_level || 1,
            manager_id: null, // Don't import manager_id, they may not exist
            is_active: farm.is_active !== false,
            established_date: farm.established_date,
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

    // Import sub-farms (with parent mapping)
    for (const farm of subFarms) {
      try {
        const newParentFarmId = idMappings.farms[farm.parent_farm_id];
        if (!newParentFarmId) {
          errors.push(
            `Failed to import sub-farm ${farm.name}: parent farm not found`,
          );
          continue;
        }

        if (skip_duplicates) {
          const { data: existing } = await this.supabaseAdmin
            .from('farms')
            .select('id')
            .eq('organization_id', organization_id)
            .eq('parent_farm_id', newParentFarmId)
            .eq('name', farm.name)
            .maybeSingle();

          if (existing) {
            warnings.push(`Skipped duplicate sub-farm: ${farm.name}`);
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
            area_unit: farm.area_unit || 'hectares',
            description: farm.description,
            latitude: farm.latitude,
            longitude: farm.longitude,
            parent_farm_id: newParentFarmId,
            farm_type: farm.farm_type || 'sub',
            hierarchy_level: farm.hierarchy_level || 2,
            manager_id: null,
            is_active: farm.is_active !== false,
            established_date: farm.established_date,
          })
          .select('id')
          .single();

        if (farmError) {
          errors.push(
            `Failed to import sub-farm ${farm.name}: ${farmError.message}`,
          );
          continue;
        }

        idMappings.farms[farm.original_id || farm.id] = newFarm.id;
        importedFarms++;
      } catch (error) {
        errors.push(
          `Error importing sub-farm ${farm.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Step 2: Import parcels
    for (const parcel of export_data.parcels || []) {
      try {
        const newFarmId =
          idMappings.farms[parcel.original_farm_id || parcel.farm_id];
        if (!newFarmId) {
          errors.push(
            `Failed to import parcel ${parcel.name}: farm not found`,
          );
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
            })
            .select('id')
            .single();

        if (parcelError) {
          errors.push(
            `Failed to import parcel ${parcel.name}: ${parcelError.message}`,
          );
          continue;
        }

        idMappings.parcels[parcel.original_id || parcel.id] = newParcel.id;
        importedParcels++;
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
}
