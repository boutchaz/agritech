import { Injectable, Logger, BadRequestException, ConflictException, InternalServerErrorException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface CreateOrganizationDto {
    name: string;
    slug?: string;
    description?: string;
    currencyCode?: string;
    timezone?: string;
    isActive?: boolean;
    accountType?: 'individual' | 'business' | 'farm';
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    contactPerson?: string;
    website?: string;
    taxId?: string;
    logoUrl?: string;
}

export interface UpdateOrganizationDto {
    name?: string;
    description?: string;
    currencyCode?: string;
    timezone?: string;
    isActive?: boolean;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    contactPerson?: string;
    website?: string;
    taxId?: string;
    logoUrl?: string;
}

@Injectable()
export class OrganizationsService {
    private readonly logger = new Logger(OrganizationsService.name);
    private readonly supabaseAdmin: SupabaseClient;

    constructor(
        private databaseService: DatabaseService,
        private configService: ConfigService,
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

    /**
     * Create a new organization
     * Migrated from create_organization SQL function
     * Uses admin client to bypass RLS policies
     */
    async create(dto: CreateOrganizationDto) {
        // Use supabaseAdmin directly - it's initialized with service role key
        const client = this.supabaseAdmin;
        this.logger.debug(`Creating organization with admin client: ${dto.name}`);

        let slug = dto.slug;
        if (!slug) {
            // Generate slug from name
            slug = this.generateSlug(dto.name);
        }

        // Retry logic for unique slug
        const maxRetries = 5;
        let retryCount = 0;
        let orgCreated = false;
        let organization = null;

        while (!orgCreated && retryCount < maxRetries) {
            const currentSlug = retryCount === 0 ? slug : `${slug}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            const { data, error } = await client
                .from('organizations')
                .insert({
                    name: dto.name,
                    slug: currentSlug,
                    description: dto.description,
                    currency_code: dto.currencyCode || 'MAD',
                    timezone: dto.timezone || 'Africa/Casablanca',
                    is_active: dto.isActive ?? true,
                    account_type: dto.accountType || 'business',
                    email: dto.email,
                    phone: dto.phone,
                    address: dto.address,
                    city: dto.city,
                    state: dto.state,
                    postal_code: dto.postalCode,
                    country: dto.country,
                    contact_person: dto.contactPerson,
                    website: dto.website,
                    tax_id: dto.taxId,
                    logo_url: dto.logoUrl,
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505' && error.message.includes('slug')) {
                    retryCount++;
                    this.logger.warn(`Slug collision for ${currentSlug}, retrying...`);
                    continue;
                }
                this.logger.error(`Failed to create organization: ${error.message}`);
                throw new BadRequestException('Failed to create organization');
            }

            organization = data;
            orgCreated = true;
        }

        if (!orgCreated) {
            throw new ConflictException('Failed to create organization with unique slug after multiple attempts');
        }

        return organization;
    }

    async findOne(id: string) {
        const client = this.databaseService.getAdminClient();
        const { data, error } = await client
            .from('organizations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return null;
        }
        return data;
    }

    async getOrganization(userId: string, organizationId: string) {
        this.logger.log(`Getting organization ${organizationId} for user ${userId}`);

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

        // Fetch organization with all fields
        const { data: organization, error: fetchError } = await this.supabaseAdmin
            .from('organizations')
            .select('*')
            .eq('id', organizationId)
            .single();

        if (fetchError || !organization) {
            this.logger.error('Organization not found', fetchError);
            throw new NotFoundException('Organization not found');
        }

        return organization;
    }

    async updateOrganization(userId: string, organizationId: string, updateData: UpdateOrganizationDto) {
        this.logger.log(`Updating organization ${organizationId} for user ${userId}`);

        // Verify user access and get role through foreign key join
        const { data: orgUser, error: orgError } = await this.supabaseAdmin
            .from('organization_users')
            .select(`
                organization_id,
                role_id,
                roles (
                    name
                )
            `)
            .eq('organization_id', organizationId)
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle();

        if (orgError || !orgUser) {
            this.logger.error('User not authorized for organization', orgError);
            throw new ForbiddenException('You do not have access to this organization');
        }

        // Get role name from the joined roles table
        const roleName = (orgUser.roles as any)?.name;

        // Only organization_admin and system_admin can update organization
        if (roleName !== 'organization_admin' && roleName !== 'system_admin') {
            throw new ForbiddenException('You do not have permission to update this organization');
        }

        // Map camelCase to snake_case for database
        const dbUpdateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (updateData.name !== undefined) dbUpdateData.name = updateData.name;
        if (updateData.description !== undefined) dbUpdateData.description = updateData.description;
        if (updateData.currencyCode !== undefined) dbUpdateData.currency_code = updateData.currencyCode;
        if (updateData.timezone !== undefined) dbUpdateData.timezone = updateData.timezone;
        if (updateData.isActive !== undefined) dbUpdateData.is_active = updateData.isActive;
        if (updateData.email !== undefined) dbUpdateData.email = updateData.email;
        if (updateData.phone !== undefined) dbUpdateData.phone = updateData.phone;
        if (updateData.address !== undefined) dbUpdateData.address = updateData.address;
        if (updateData.city !== undefined) dbUpdateData.city = updateData.city;
        if (updateData.state !== undefined) dbUpdateData.state = updateData.state;
        if (updateData.postalCode !== undefined) dbUpdateData.postal_code = updateData.postalCode;
        if (updateData.country !== undefined) dbUpdateData.country = updateData.country;
        if (updateData.contactPerson !== undefined) dbUpdateData.contact_person = updateData.contactPerson;
        if (updateData.website !== undefined) dbUpdateData.website = updateData.website;
        if (updateData.taxId !== undefined) dbUpdateData.tax_id = updateData.taxId;
        if (updateData.logoUrl !== undefined) dbUpdateData.logo_url = updateData.logoUrl;

        // Update organization
        const { data: organization, error: updateError } = await this.supabaseAdmin
            .from('organizations')
            .update(dbUpdateData)
            .eq('id', organizationId)
            .select()
            .single();

        if (updateError || !organization) {
            this.logger.error('Failed to update organization', updateError);
            throw new InternalServerErrorException('Failed to update organization');
        }

        return organization;
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    }
}
