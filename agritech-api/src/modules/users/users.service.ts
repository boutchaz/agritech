import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateUserProfileDto {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    phone?: string;
    language?: string;
    timezone?: string;
    onboardingCompleted?: boolean;
    passwordSet?: boolean;
}

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private databaseService: DatabaseService) { }

    /**
     * Create or update user profile
     * Uses SECURITY DEFINER RPC function to bypass RLS policies
     * Function: create_or_update_user_profile (defined in schema migration)
     */
    async createProfile(dto: CreateUserProfileDto) {
        const client = this.databaseService.getAdminClient();

        try {
            // Call the SECURITY DEFINER function via RPC which bypasses RLS
            // Function handles full_name calculation if not provided
            const { data, error } = await client.rpc('create_or_update_user_profile', {
                p_user_id: dto.userId,
                p_email: dto.email,
                p_full_name: dto.fullName || null,
                p_first_name: dto.firstName || null,
                p_last_name: dto.lastName || null,
                p_phone: dto.phone || null,
                p_language: dto.language || 'fr',
                p_timezone: dto.timezone || 'Africa/Casablanca',
                p_onboarding_completed: dto.onboardingCompleted ?? false,
                p_password_set: dto.passwordSet ?? true,
                p_avatar_url: null,
            });

            if (error) {
                this.logger.error(`Failed to create user profile via RPC: ${error.message}`, error);
                throw new InternalServerErrorException(`Failed to create user profile: ${error.message}`);
            }

            if (!data) {
                throw new InternalServerErrorException('Failed to create user profile: no data returned');
            }

            return data;
        } catch (error) {
            // If error is already an InternalServerErrorException, re-throw it
            if (error instanceof InternalServerErrorException) {
                throw error;
            }
            
            this.logger.error(`Failed to create user profile: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to create user profile: ${error.message}`);
        }
    }

    async findOne(id: string) {
        const client = this.databaseService.getAdminClient();
        const { data, error } = await client
            .from('user_profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return null;
        }
        return data;
    }

    async updateProfile(id: string, updateData: any) {
        const client = this.databaseService.getAdminClient();

        const { data, error } = await client
            .from('user_profiles')
            .update({
                ...updateData,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            this.logger.error(`Failed to update user profile: ${error.message}`);
            throw new InternalServerErrorException('Failed to update user profile');
        }

        return data;
    }

    /**
     * Get all organizations that a user belongs to
     * Includes role information from organization_users join
     */
    async getUserOrganizations(userId: string) {
        const client = this.databaseService.getAdminClient();

        const { data, error } = await client
            .from('organization_users')
            .select(`
                organization_id,
                role_id,
                is_active,
                role:roles!organization_users_role_id_fkey (
                    id,
                    name,
                    display_name,
                    level
                ),
                organizations:organization_id (
                    id,
                    name,
                    slug,
                    description,
                    address,
                    city,
                    state,
                    postal_code,
                    country,
                    phone,
                    email,
                    website,
                    tax_id,
                    currency_code,
                    timezone,
                    logo_url,
                    is_active
                )
            `)
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) {
            this.logger.error(`Failed to fetch user organizations: ${error.message}`);
            throw new BadRequestException(`Failed to fetch user organizations: ${error.message}`);
        }

        // Transform the data to flatten the structure
        return (data || []).map((ou: any) => {
            const org = ou.organizations;
            const roleData = ou.role;

            return {
                id: ou.organization_id,
                name: org?.name || 'Unknown',
                slug: org?.slug || org?.name || 'unknown',
                description: org?.description || null,
                address: org?.address || null,
                city: org?.city || null,
                state: org?.state || null,
                postal_code: org?.postal_code || null,
                country: org?.country || null,
                phone: org?.phone || null,
                email: org?.email || null,
                website: org?.website || null,
                tax_id: org?.tax_id || null,
                logo_url: org?.logo_url || null,
                currency_code: org?.currency_code || 'MAD',
                timezone: org?.timezone || 'Africa/Casablanca',
                is_active: org?.is_active ?? ou.is_active,
                role: roleData?.name || 'viewer',
                role_display_name: roleData?.display_name || 'Viewer',
                role_level: roleData?.level || 6,
            };
        });
    }
}
