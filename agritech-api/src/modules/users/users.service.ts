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
     * Migrated from create_user_profile SQL function
     */
    async createProfile(dto: CreateUserProfileDto) {
        const client = this.databaseService.getAdminClient();

        const fullName = dto.fullName ||
            (dto.firstName && dto.lastName ? `${dto.firstName} ${dto.lastName}` : dto.email.split('@')[0]);

        const profileData = {
            id: dto.userId,
            email: dto.email,
            full_name: fullName,
            first_name: dto.firstName,
            last_name: dto.lastName,
            phone: dto.phone,
            language: dto.language || 'fr',
            timezone: dto.timezone || 'Africa/Casablanca',
            onboarding_completed: dto.onboardingCompleted || false,
            password_set: dto.passwordSet ?? true,
            updated_at: new Date().toISOString(),
        };

        // Verify user exists in auth.users (optional, as foreign key would fail, but good for error msg)
        // Note: We can't easily query auth.users directly with service role in all setups, 
        // but the insert into user_profiles will fail with FK violation if not.

        const { data, error } = await client
            .from('user_profiles')
            .upsert(profileData)
            .select()
            .single();

        if (error) {
            this.logger.error(`Failed to create user profile: ${error.message}`);
            throw new InternalServerErrorException('Failed to create user profile');
        }

        return data;
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
