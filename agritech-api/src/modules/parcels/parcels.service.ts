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
}
