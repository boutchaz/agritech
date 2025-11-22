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
}
