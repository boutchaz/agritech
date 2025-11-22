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
}
