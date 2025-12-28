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
import { DeleteParcelDto } from './dto/delete-parcel.dto';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateParcelDto } from './dto/update-parcel.dto';
import { ListParcelsResponseDto } from './dto/list-parcels.dto';

@Injectable()
export class ParcelsService {
  private readonly supabaseAdmin: SupabaseClient;
  private readonly logger = new Logger(ParcelsService.name);

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

  async deleteParcel(userId: string, dto: DeleteParcelDto) {
    const { parcel_id } = dto;

    this.logger.log(`Deleting parcel ${parcel_id} for user ${userId}`);

    // First verify the parcel exists and get farm info
    const { data: existingParcel, error: checkError } = await this.supabaseAdmin
      .from('parcels')
      .select('id, name, farm_id')
      .eq('id', parcel_id)
      .single();

    if (checkError || !existingParcel) {
      this.logger.error('Parcel not found', checkError);
      throw new NotFoundException(
        `Unable to verify parcel: ${checkError?.message || 'Parcel not found'}`,
      );
    }

    if (!existingParcel.farm_id) {
      throw new BadRequestException('Parcel is not associated with any farm');
    }

    // Get farm info to find organization_id
    const { data: farm, error: farmError } = await this.supabaseAdmin
      .from('farms')
      .select('organization_id')
      .eq('id', existingParcel.farm_id)
      .single();

    if (farmError || !farm) {
      this.logger.error('Error fetching farm', farmError);
      throw new NotFoundException(
        `Unable to retrieve farm information: ${farmError?.message || 'Farm not found'}`,
      );
    }

    const organizationId = farm.organization_id;

    if (!organizationId) {
      throw new BadRequestException(
        'Unable to determine organization of the parcel',
      );
    }

    // Check user's role in the organization
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

    // Check subscription status
    const { data: subscriptionCheck, error: subscriptionError } =
      await this.supabaseAdmin.rpc('has_valid_subscription', {
        org_id: organizationId,
      });

    this.logger.log(`Subscription check: ${JSON.stringify({ subscriptionCheck, subscriptionError })}`);

    const hasValidSubscription =
      subscriptionCheck === true ||
      (typeof subscriptionCheck === 'boolean' && subscriptionCheck);

    if (subscriptionError || !hasValidSubscription) {
      this.logger.error('Subscription check failed', subscriptionError);
      throw new ForbiddenException(
        `An active subscription is required to delete parcels. Subscription status: ${hasValidSubscription ? 'Valid' : 'Invalid'}.`,
      );
    }

    this.logger.log(`Deleting parcel: ${parcel_id}`);

    // Delete the parcel
    const { data: deletedParcels, error: deleteError } = await this.supabaseAdmin
      .from('parcels')
      .delete()
      .eq('id', parcel_id)
      .select('id, name');

    if (deleteError) {
      this.logger.error('Delete error', deleteError);
      throw new InternalServerErrorException(
        `Error during deletion: ${deleteError.message}`,
      );
    }

    if (!deletedParcels || deletedParcels.length === 0) {
      this.logger.warn(
        'No parcel deleted - parcel may not exist or was already deleted',
      );

      // Verify if parcel still exists
      const { data: verifyParcel, error: verifyError } = await this.supabaseAdmin
        .from('parcels')
        .select('id')
        .eq('id', parcel_id)
        .maybeSingle();

      if (verifyError) {
        this.logger.error('Error verifying parcel', verifyError);
        throw new InternalServerErrorException(
          `Verification error: ${verifyError.message}`,
        );
      }

      if (verifyParcel) {
        throw new InternalServerErrorException(
          'Deletion failed. Parcel may be referenced elsewhere or protected by a constraint.',
        );
      } else {
        this.logger.log('Parcel was already deleted or does not exist');
        return { success: true, message: 'Parcel deleted or already absent' };
      }
    }

    const deletedParcel = deletedParcels[0];
    this.logger.log(`Parcel deleted successfully: ${deletedParcel.id}`);

    return { success: true, deleted_parcel: deletedParcel };
  }

  async getPerformanceSummary(
    userId: string,
    organizationId: string,
    filters: {
      farmId?: string;
      parcelId?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ) {
    this.logger.log(`Getting parcel performance summary for org ${organizationId}`);

    // Verify user access
    const { data: orgUser, error: orgError } = await this.supabaseAdmin
      .from('organization_users')
      .select('role_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Build query for harvest records joined with parcels and farms
    let query = this.supabaseAdmin
      .from('harvest_records')
      .select(`
        parcel_id,
        crop_type,
        actual_yield,
        estimated_yield,
        revenue_amount,
        cost_amount,
        profit_amount,
        harvest_date,
        parcels!inner (
          id,
          name,
          area,
          area_unit,
          farms!inner (
            id,
            name,
            organization_id
          )
        )
      `)
      .eq('parcels.farms.organization_id', organizationId);

    if (filters.farmId) {
      query = query.eq('parcels.farm_id', filters.farmId);
    }
    if (filters.parcelId) {
      query = query.eq('parcel_id', filters.parcelId);
    }
    if (filters.fromDate) {
      query = query.gte('harvest_date', filters.fromDate.toISOString());
    }
    if (filters.toDate) {
      query = query.lte('harvest_date', filters.toDate.toISOString());
    }

    const { data: harvests, error } = await query;

    if (error) {
      this.logger.error('Error fetching harvest records', error);
      throw new InternalServerErrorException('Failed to fetch performance data');
    }

    // Aggregate data
    const summaryMap = new Map<string, any>();

    harvests?.forEach((record: any) => {
      const parcelId = record.parcel_id;
      const parcel = record.parcels;
      const farm = parcel.farms;

      if (!summaryMap.has(parcelId)) {
        summaryMap.set(parcelId, {
          parcel_id: parcelId,
          parcel_name: parcel.name,
          farm_name: farm.name,
          crop_type: record.crop_type,
          total_harvests: 0,
          total_yield: 0,
          total_estimated_yield: 0,
          total_revenue: 0,
          total_cost: 0,
          total_profit: 0,
          last_harvest_date: null,
          area_hectares: parcel.area_unit === 'hectares' ? parcel.area : parcel.area * 0.404686, // Simple conversion if needed
        });
      }

      const summary = summaryMap.get(parcelId);
      summary.total_harvests++;
      summary.total_yield += record.actual_yield || 0;
      summary.total_estimated_yield += record.estimated_yield || 0;
      summary.total_revenue += record.revenue_amount || 0;
      summary.total_cost += record.cost_amount || 0;
      summary.total_profit += record.profit_amount || 0;

      const harvestDate = new Date(record.harvest_date);
      if (!summary.last_harvest_date || harvestDate > new Date(summary.last_harvest_date)) {
        summary.last_harvest_date = record.harvest_date;
      }
    });

    // Calculate averages and format result
    const result = Array.from(summaryMap.values()).map(s => {
      const avgYieldPerHectare = s.area_hectares > 0 ? s.total_yield / s.area_hectares : 0;
      const avgTargetYield = s.total_harvests > 0 ? s.total_estimated_yield / s.total_harvests : 0;
      const avgVariancePercent = s.total_estimated_yield > 0
        ? ((s.total_yield - s.total_estimated_yield) / s.total_estimated_yield) * 100
        : 0;

      return {
        parcel_id: s.parcel_id,
        parcel_name: s.parcel_name,
        farm_name: s.farm_name,
        crop_type: s.crop_type,
        total_harvests: s.total_harvests,
        avg_yield_per_hectare: parseFloat(avgYieldPerHectare.toFixed(2)),
        avg_target_yield: parseFloat(avgTargetYield.toFixed(2)),
        avg_variance_percent: parseFloat(avgVariancePercent.toFixed(2)),
        performance_rating: avgVariancePercent >= 0 ? 'Excellent' : avgVariancePercent > -10 ? 'Good' : 'Poor',
        total_revenue: parseFloat(s.total_revenue.toFixed(2)),
        total_cost: parseFloat(s.total_cost.toFixed(2)),
        total_profit: parseFloat(s.total_profit.toFixed(2)),
        avg_profit_margin: s.total_revenue > 0 ? parseFloat(((s.total_profit / s.total_revenue) * 100).toFixed(2)) : 0,
        last_harvest_date: s.last_harvest_date
      };
    });

    return result;
  }

  async listParcels(
    userId: string,
    organizationId: string,
    farmId?: string,
  ): Promise<ListParcelsResponseDto> {
    this.logger.log(`Listing parcels for organization ${organizationId}${farmId ? `, farm ${farmId}` : ''}`);

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

    // Build query
    let query = this.supabaseAdmin
      .from('parcels')
      .select(`
        id,
        farm_id,
        name,
        description,
        area,
        area_unit,
        boundary,
        calculated_area,
        perimeter,
        crop_category,
        crop_type,
        tree_type,
        tree_count,
        planting_density,
        variety,
        planting_system,
        spacing,
        density_per_hectare,
        plant_count,
        planting_date,
        planting_year,
        rootstock,
        soil_type,
        irrigation_type,
        is_active,
        created_at,
        updated_at,
        farms!inner (
          id,
          organization_id
        )
      `)
      .eq('farms.organization_id', organizationId);

    if (farmId) {
      query = query.eq('farm_id', farmId);
    }

    query = query.order('name', { ascending: true });

    const { data: parcels, error: parcelsError } = await query;

    if (parcelsError) {
      this.logger.error('Error fetching parcels', parcelsError);
      throw new InternalServerErrorException('Failed to fetch parcels');
    }

    return {
      success: true,
      parcels: parcels || [],
    };
  }

  async createParcel(
    userId: string,
    organizationId: string,
    dto: CreateParcelDto,
  ) {
    this.logger.log(`Creating parcel for user ${userId} in org ${organizationId}`);

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
      .eq('id', dto.farm_id)
      .eq('organization_id', organizationId)
      .single();

    if (farmError || !farm) {
      this.logger.error('Farm not found or access denied', farmError);
      throw new NotFoundException('Farm not found or you do not have access to it');
    }

    // Prepare parcel data
    const parcelData: any = {
      farm_id: dto.farm_id,
      name: dto.name,
      description: dto.description || null,
      area: dto.area,
      area_unit: dto.area_unit || 'hectares',
      crop_category: dto.crop_category || null,
      crop_type: dto.crop_type || null,
      variety: dto.variety || null,
      planting_system: dto.planting_system || null,
      spacing: dto.spacing || null,
      density_per_hectare: dto.density_per_hectare || null,
      plant_count: dto.plant_count || null,
      planting_date: dto.planting_date || null,
      planting_year: dto.planting_year || null,
      rootstock: dto.rootstock || null,
      soil_type: dto.soil_type || null,
      irrigation_type: dto.irrigation_type || null,
      boundary: dto.boundary || null,
      calculated_area: dto.calculated_area || null,
      perimeter: dto.perimeter || null,
      is_active: true,
    };

    // Insert parcel
    const { data: newParcel, error: createError } = await this.supabaseAdmin
      .from('parcels')
      .insert(parcelData)
      .select()
      .single();

    if (createError) {
      this.logger.error('Error creating parcel', createError);
      throw new InternalServerErrorException(`Failed to create parcel: ${createError.message}`);
    }

    this.logger.log(`Parcel created successfully: ${newParcel.id}`);
    return newParcel;
  }

  async updateParcel(
    userId: string,
    organizationId: string,
    parcelId: string,
    dto: UpdateParcelDto,
  ) {
    this.logger.log(`Updating parcel ${parcelId} for user ${userId}`);

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

    // Verify parcel exists and belongs to organization
    const { data: existingParcel, error: checkError } = await this.supabaseAdmin
      .from('parcels')
      .select(`
        id,
        farm_id,
        farms!inner (
          id,
          organization_id
        )
      `)
      .eq('id', parcelId)
      .eq('farms.organization_id', organizationId)
      .single();

    if (checkError || !existingParcel) {
      this.logger.error('Parcel not found or access denied', checkError);
      throw new NotFoundException('Parcel not found or you do not have access to it');
    }

    // Prepare update data (only include fields that are provided)
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.area !== undefined) updateData.area = dto.area;
    if (dto.area_unit !== undefined) updateData.area_unit = dto.area_unit;
    if (dto.crop_category !== undefined) updateData.crop_category = dto.crop_category;
    if (dto.crop_type !== undefined) updateData.crop_type = dto.crop_type;
    if (dto.variety !== undefined) updateData.variety = dto.variety;
    if (dto.planting_system !== undefined) updateData.planting_system = dto.planting_system;
    if (dto.spacing !== undefined) updateData.spacing = dto.spacing;
    if (dto.density_per_hectare !== undefined) updateData.density_per_hectare = dto.density_per_hectare;
    if (dto.plant_count !== undefined) updateData.plant_count = dto.plant_count;
    if (dto.planting_date !== undefined) updateData.planting_date = dto.planting_date;
    if (dto.planting_year !== undefined) updateData.planting_year = dto.planting_year;
    if (dto.rootstock !== undefined) updateData.rootstock = dto.rootstock;
    if (dto.soil_type !== undefined) updateData.soil_type = dto.soil_type;
    if (dto.irrigation_type !== undefined) updateData.irrigation_type = dto.irrigation_type;
    if (dto.boundary !== undefined) updateData.boundary = dto.boundary;
    if (dto.calculated_area !== undefined) updateData.calculated_area = dto.calculated_area;
    if (dto.perimeter !== undefined) updateData.perimeter = dto.perimeter;

    // Update parcel
    const { data: updatedParcel, error: updateError } = await this.supabaseAdmin
      .from('parcels')
      .update(updateData)
      .eq('id', parcelId)
      .select()
      .single();

    if (updateError) {
      this.logger.error('Error updating parcel', updateError);
      throw new InternalServerErrorException(`Failed to update parcel: ${updateError.message}`);
    }

    this.logger.log(`Parcel updated successfully: ${updatedParcel.id}`);
    return updatedParcel;
  }
}
