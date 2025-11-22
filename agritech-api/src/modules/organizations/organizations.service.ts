import { Injectable, Logger, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateOrganizationDto {
    name: string;
    slug?: string;
    description?: string;
    currencyCode?: string;
    timezone?: string;
    isActive?: boolean;
}

@Injectable()
export class OrganizationsService {
    private readonly logger = new Logger(OrganizationsService.name);

    constructor(private databaseService: DatabaseService) { }

    /**
     * Create a new organization
     * Migrated from create_organization SQL function
     */
    async create(dto: CreateOrganizationDto) {
        const client = this.databaseService.getAdminClient();

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
