import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FilesService } from '../files/files.service';

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

    constructor(
        private databaseService: DatabaseService,
        private filesService: FilesService,
    ) { }

    private isLikelyUuid(value: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value,
        );
    }

    /**
     * file_registry is org-scoped; use header org when present, else first active membership.
     */
    private async resolveOrganizationIdForFileRegistry(
        userId: string,
        headerOrganizationId?: string,
    ): Promise<string | null> {
        if (headerOrganizationId && this.isLikelyUuid(headerOrganizationId)) {
            return headerOrganizationId;
        }
        const client = this.databaseService.getAdminClient();
        const { data, error } = await client
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error || !data?.organization_id) {
            return null;
        }
        return data.organization_id as string;
    }

    /**
     * Create or update user profile using direct table operations
     * Admin client (service_role) bypasses RLS automatically
     */
    async createProfile(dto: CreateUserProfileDto) {
        const client = this.databaseService.getAdminClient();

        try {
            const fullName = dto.fullName || this.calculateFullName(dto.firstName, dto.lastName, dto.email);

            const profileData = {
                id: dto.userId,
                email: dto.email,
                full_name: fullName,
                first_name: dto.firstName || null,
                last_name: dto.lastName || null,
                phone: dto.phone || null,
                language: dto.language || 'fr',
                timezone: dto.timezone || 'Africa/Casablanca',
                onboarding_completed: dto.onboardingCompleted ?? false,
                password_set: dto.passwordSet ?? true,
                avatar_url: null,
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await client
                .from('user_profiles')
                .upsert(profileData, { onConflict: 'id' })
                .select()
                .single();

            if (error) {
                this.logger.error(`Failed to create user profile: ${error.message}`, error);
                throw new InternalServerErrorException(`Failed to create user profile: ${error.message}`);
            }

            if (!data) {
                throw new InternalServerErrorException('Failed to create user profile: no data returned');
            }

            return data;
        } catch (error) {
            if (error instanceof InternalServerErrorException) {
                throw error;
            }
            
            this.logger.error(`Failed to create user profile: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to create user profile: ${error.message}`);
        }
    }

    private calculateFullName(firstName?: string, lastName?: string, email?: string): string {
        if (firstName && lastName) {
            return `${firstName} ${lastName}`;
        }
        if (firstName) {
            return firstName;
        }
        if (lastName) {
            return lastName;
        }
        if (email) {
            return email.split('@')[0];
        }
        return 'User';
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
     * Track user activity by updating their profile's updated_at timestamp
     * Used for live dashboard concurrent users feature
     */
    async trackActivity(userId: string) {
        const client = this.databaseService.getAdminClient();

        try {
            const { error } = await client
                .from('user_profiles')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) {
                this.logger.error(`Failed to track activity: ${error.message}`);
                // Non-critical, don't throw - just return failure
                return { success: false };
            }

            return { success: true };
        } catch (error) {
            this.logger.error(`Failed to track activity: ${error.message}`);
            return { success: false };
        }
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
                    is_active,
                    approval_status
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
                approval_status: org?.approval_status ?? 'pending',
                role: roleData?.name || 'viewer',
                role_display_name: roleData?.display_name || 'Viewer',
                role_level: roleData?.level || 6,
            };
        });
    }

    /**
     * Get all users in an organization with their profiles and roles
     */
    async getOrganizationUsers(organizationId: string) {
        const client = this.databaseService.getAdminClient();

        try {
            // Fetch organization users with roles
            const { data: orgUsers, error: orgError } = await client
                .from('organization_users')
                .select(`
                    *,
                    role:roles!organization_users_role_id_fkey(
                        name,
                        display_name,
                        level
                    )
                `)
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false });

            if (orgError) {
                this.logger.error(`Failed to fetch organization users: ${orgError.message}`);
                throw new BadRequestException(`Failed to fetch organization users: ${orgError.message}`);
            }

            if (!orgUsers || orgUsers.length === 0) {
                return [];
            }

            // Get all user IDs
            const userIds = orgUsers.map(u => u.user_id).filter(id => id);

            // Validate UUIDs
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const validUserIds = userIds.filter(id => uuidRegex.test(id));

            if (validUserIds.length === 0) {
                return [];
            }

            // Fetch user profiles
            const { data: profiles, error: profilesError } = await client
                .from('user_profiles')
                .select('id, first_name, last_name, email, avatar_url')
                .in('id', validUserIds);

            if (profilesError) {
                this.logger.error(`Failed to fetch user profiles: ${profilesError.message}`);
                // Continue without profiles rather than failing
            }

            // Merge profiles into users
            const usersWithProfiles = orgUsers.map(user => ({
                ...user,
                profile: profiles?.find(p => p.id === user.user_id) || null,
            }));

            return usersWithProfiles;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to fetch organization users: ${error.message}`);
            throw new InternalServerErrorException('Failed to fetch organization users');
        }
    }

    /**
     * Update user role in organization
     */
    async updateUserRole(organizationId: string, userId: string, roleId: string) {
        const client = this.databaseService.getAdminClient();

        try {
            const { data, error } = await client
                .from('organization_users')
                .update({ role_id: roleId })
                .eq('user_id', userId)
                .eq('organization_id', organizationId)
                .select()
                .single();

            if (error) {
                this.logger.error(`Failed to update user role: ${error.message}`);
                throw new BadRequestException(`Failed to update user role: ${error.message}`);
            }

            return data;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to update user role: ${error.message}`);
            throw new InternalServerErrorException('Failed to update user role');
        }
    }

    /**
     * Update user active status in organization
     */
    async updateUserStatus(organizationId: string, userId: string, isActive: boolean) {
        const client = this.databaseService.getAdminClient();

        try {
            const { data, error } = await client
                .from('organization_users')
                .update({ is_active: isActive })
                .eq('user_id', userId)
                .eq('organization_id', organizationId)
                .select()
                .single();

            if (error) {
                this.logger.error(`Failed to update user status: ${error.message}`);
                throw new BadRequestException(`Failed to update user status: ${error.message}`);
            }

            return data;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to update user status: ${error.message}`);
            throw new InternalServerErrorException('Failed to update user status');
        }
    }

    /**
     * Remove user from organization
     */
    async removeUserFromOrganization(organizationId: string, userId: string) {
        const client = this.databaseService.getAdminClient();

        try {
            const { error } = await client
                .from('organization_users')
                .delete()
                .eq('user_id', userId)
                .eq('organization_id', organizationId);

            if (error) {
                this.logger.error(`Failed to remove user from organization: ${error.message}`);
                throw new BadRequestException(`Failed to remove user from organization: ${error.message}`);
            }

            return { message: 'User removed successfully' };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to remove user from organization: ${error.message}`);
            throw new InternalServerErrorException('Failed to remove user from organization');
        }
    }

    // =====================================================
    // Tour Preferences Methods
    // =====================================================

    /**
     * Get user's tour preferences (completed and dismissed tours)
     */
    async getTourPreferences(userId: string) {
        const client = this.databaseService.getAdminClient();

        try {
            const { data, error } = await client
                .from('user_profiles')
                .select('completed_tours, dismissed_tours')
                .eq('id', userId)
                .single();

            if (error) {
                this.logger.error(`Failed to get tour preferences: ${error.message}`);
                throw new BadRequestException(`Failed to get tour preferences: ${error.message}`);
            }

            return {
                completed_tours: data?.completed_tours || [],
                dismissed_tours: data?.dismissed_tours || [],
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to get tour preferences: ${error.message}`);
            throw new InternalServerErrorException('Failed to get tour preferences');
        }
    }

    /**
     * Update user's tour preferences
     */
    async updateTourPreferences(userId: string, preferences: { completed_tours?: string[]; dismissed_tours?: string[] }) {
        const client = this.databaseService.getAdminClient();

        try {
            const updateData: any = {
                updated_at: new Date().toISOString(),
            };

            if (preferences.completed_tours !== undefined) {
                updateData.completed_tours = preferences.completed_tours;
            }
            if (preferences.dismissed_tours !== undefined) {
                updateData.dismissed_tours = preferences.dismissed_tours;
            }

            const { data, error } = await client
                .from('user_profiles')
                .update(updateData)
                .eq('id', userId)
                .select('completed_tours, dismissed_tours')
                .single();

            if (error) {
                this.logger.error(`Failed to update tour preferences: ${error.message}`);
                throw new BadRequestException(`Failed to update tour preferences: ${error.message}`);
            }

            this.logger.log(`Tour preferences updated for user ${userId}`);
            return {
                completed_tours: data?.completed_tours || [],
                dismissed_tours: data?.dismissed_tours || [],
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to update tour preferences: ${error.message}`);
            throw new InternalServerErrorException('Failed to update tour preferences');
        }
    }

    /**
     * Dismiss a specific tour (add to dismissed_tours array)
     */
    async dismissTour(userId: string, tourId: string) {
        const client = this.databaseService.getAdminClient();

        try {
            // First get current dismissed tours
            const { data: profile, error: fetchError } = await client
                .from('user_profiles')
                .select('dismissed_tours')
                .eq('id', userId)
                .single();

            if (fetchError) {
                this.logger.error(`Failed to fetch user profile for dismiss: ${fetchError.message}`);
                throw new BadRequestException(`Failed to dismiss tour: ${fetchError.message}`);
            }

            const currentDismissed = profile?.dismissed_tours || [];

            // Only add if not already dismissed
            if (currentDismissed.includes(tourId)) {
                return {
                    success: true,
                    message: 'Tour already dismissed',
                    dismissed_tours: currentDismissed,
                };
            }

            const newDismissed = [...currentDismissed, tourId];

            const { data, error } = await client
                .from('user_profiles')
                .update({
                    dismissed_tours: newDismissed,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select('completed_tours, dismissed_tours')
                .single();

            if (error) {
                this.logger.error(`Failed to dismiss tour: ${error.message}`);
                throw new BadRequestException(`Failed to dismiss tour: ${error.message}`);
            }

            this.logger.log(`Tour '${tourId}' dismissed for user ${userId}`);
            return {
                success: true,
                message: `Tour '${tourId}' dismissed successfully`,
                completed_tours: data?.completed_tours || [],
                dismissed_tours: data?.dismissed_tours || [],
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to dismiss tour: ${error.message}`);
            throw new InternalServerErrorException('Failed to dismiss tour');
        }
    }

    /**
     * Mark a specific tour as completed (add to completed_tours array)
     */
    async completeTour(userId: string, tourId: string) {
        const client = this.databaseService.getAdminClient();

        try {
            // First get current completed tours
            const { data: profile, error: fetchError } = await client
                .from('user_profiles')
                .select('completed_tours')
                .eq('id', userId)
                .single();

            if (fetchError) {
                this.logger.error(`Failed to fetch user profile for complete: ${fetchError.message}`);
                throw new BadRequestException(`Failed to complete tour: ${fetchError.message}`);
            }

            const currentCompleted = profile?.completed_tours || [];

            // Only add if not already completed
            if (currentCompleted.includes(tourId)) {
                return {
                    success: true,
                    message: 'Tour already completed',
                    completed_tours: currentCompleted,
                };
            }

            const newCompleted = [...currentCompleted, tourId];

            const { data, error } = await client
                .from('user_profiles')
                .update({
                    completed_tours: newCompleted,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select('completed_tours, dismissed_tours')
                .single();

            if (error) {
                this.logger.error(`Failed to complete tour: ${error.message}`);
                throw new BadRequestException(`Failed to complete tour: ${error.message}`);
            }

            this.logger.log(`Tour '${tourId}' completed for user ${userId}`);
            return {
                success: true,
                message: `Tour '${tourId}' completed successfully`,
                completed_tours: data?.completed_tours || [],
                dismissed_tours: data?.dismissed_tours || [],
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to complete tour: ${error.message}`);
            throw new InternalServerErrorException('Failed to complete tour');
        }
    }

    /**
     * Reset a specific tour (remove from both completed and dismissed arrays)
     */
    async resetTour(userId: string, tourId: string) {
        const client = this.databaseService.getAdminClient();

        try {
            // First get current tours
            const { data: profile, error: fetchError } = await client
                .from('user_profiles')
                .select('completed_tours, dismissed_tours')
                .eq('id', userId)
                .single();

            if (fetchError) {
                this.logger.error(`Failed to fetch user profile for reset: ${fetchError.message}`);
                throw new BadRequestException(`Failed to reset tour: ${fetchError.message}`);
            }

            const currentCompleted = profile?.completed_tours || [];
            const currentDismissed = profile?.dismissed_tours || [];

            // Remove tour from both arrays
            const newCompleted = currentCompleted.filter((t: string) => t !== tourId);
            const newDismissed = currentDismissed.filter((t: string) => t !== tourId);

            const { data, error } = await client
                .from('user_profiles')
                .update({
                    completed_tours: newCompleted,
                    dismissed_tours: newDismissed,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select('completed_tours, dismissed_tours')
                .single();

            if (error) {
                this.logger.error(`Failed to reset tour: ${error.message}`);
                throw new BadRequestException(`Failed to reset tour: ${error.message}`);
            }

            this.logger.log(`Tour '${tourId}' reset for user ${userId}`);
            return {
                success: true,
                message: `Tour '${tourId}' reset successfully`,
                completed_tours: data?.completed_tours || [],
                dismissed_tours: data?.dismissed_tours || [],
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to reset tour: ${error.message}`);
            throw new InternalServerErrorException('Failed to reset tour');
        }
    }

    /**
     * Reset all tours for a user (clear both completed and dismissed arrays)
     */
    async resetAllTours(userId: string) {
        const client = this.databaseService.getAdminClient();

        try {
            const { data, error } = await client
                .from('user_profiles')
                .update({
                    completed_tours: [],
                    dismissed_tours: [],
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select('completed_tours, dismissed_tours')
                .single();

            if (error) {
                this.logger.error(`Failed to reset all tours: ${error.message}`);
                throw new BadRequestException(`Failed to reset all tours: ${error.message}`);
            }

            this.logger.log(`All tours reset for user ${userId}`);
            return {
                success: true,
                message: 'All tours reset successfully',
                completed_tours: data?.completed_tours || [],
                dismissed_tours: data?.dismissed_tours || [],
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to reset all tours: ${error.message}`);
            throw new InternalServerErrorException('Failed to reset all tours');
        }
    }

    // =====================================================
    // Avatar Methods
    // =====================================================

    /**
     * Upload user avatar to Supabase storage and update profile
     */
    async uploadAvatar(
        userId: string,
        file: Express.Multer.File,
        organizationIdFromHeader?: string,
    ): Promise<{ avatar_url: string }> {
        const client = this.databaseService.getAdminClient();

        try {
            const allowedTypes = ['image/jpeg', 'image/png'];
            if (!allowedTypes.includes(file.mimetype)) {
                throw new BadRequestException('Invalid file type. Only JPEG and PNG are allowed.');
            }

            const maxSize = 2 * 1024 * 1024; // 2MB
            if (file.size > maxSize) {
                throw new BadRequestException('File too large. Maximum size is 2MB.');
            }

            const fileExt = file.originalname.split('.').pop() || 'jpg';
            const fileName = `${userId}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            const { error: uploadError } = await client.storage
                .from('avatars')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) {
                this.logger.error(`Failed to upload avatar: ${uploadError.message}`);
                throw new InternalServerErrorException(`Failed to upload avatar: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = client.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { data, error: updateError } = await client
                .from('user_profiles')
                .update({
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select()
                .single();

            if (updateError) {
                this.logger.error(`Failed to update avatar URL in profile: ${updateError.message}`);
                throw new InternalServerErrorException('Failed to update profile with avatar URL');
            }

            this.logger.log(`Avatar uploaded for user ${userId}`);

            const orgId = await this.resolveOrganizationIdForFileRegistry(
                userId,
                organizationIdFromHeader,
            );
            if (orgId) {
                try {
                    await this.filesService.upsertFileRegistryEntry(
                        orgId,
                        {
                            bucket_name: 'avatars',
                            file_path: filePath,
                            file_name: file.originalname || fileName,
                            file_size: file.size,
                            mime_type: file.mimetype,
                            entity_type: 'user_profiles',
                            entity_id: userId,
                            field_name: 'avatar_url',
                        },
                        userId,
                    );
                } catch (registryError) {
                    const msg =
                        registryError instanceof Error
                            ? registryError.message
                            : String(registryError);
                    this.logger.warn(
                        `Avatar stored but file_registry upsert failed (user ${userId}): ${msg}`,
                    );
                }
            } else {
                this.logger.warn(
                    `Avatar uploaded for ${userId} but no organization resolved for file_registry`,
                );
            }

            return { avatar_url: publicUrl };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            this.logger.error(`Failed to upload avatar: ${error.message}`);
            throw new InternalServerErrorException('Failed to upload avatar');
        }
    }

    /**
     * Remove user avatar from Supabase storage and clear profile URL
     */
    async removeAvatar(
        userId: string,
        organizationIdFromHeader?: string,
    ): Promise<{ success: boolean }> {
        const client = this.databaseService.getAdminClient();

        try {
            // Get current avatar URL to extract file path
            const { data: profile, error: fetchError } = await client
                .from('user_profiles')
                .select('avatar_url')
                .eq('id', userId)
                .single();

            if (fetchError) {
                this.logger.error(`Failed to fetch profile for avatar removal: ${fetchError.message}`);
                throw new NotFoundException('User profile not found');
            }

            let avatarStoragePath: string | null = null;

            if (profile?.avatar_url) {
                // Extract file path from URL
                const urlParts = profile.avatar_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const filePath = `${userId}/${fileName}`;
                avatarStoragePath = filePath;

                const { error: removeError } = await client.storage
                    .from('avatars')
                    .remove([filePath]);

                if (removeError) {
                    this.logger.warn(`Failed to remove avatar file from storage: ${removeError.message}`);
                    // Continue to clear URL even if storage removal fails
                }
            }

            const orgId = await this.resolveOrganizationIdForFileRegistry(
                userId,
                organizationIdFromHeader,
            );
            if (orgId && avatarStoragePath) {
                await this.filesService.deleteRegistryEntryByBucketPath(
                    orgId,
                    'avatars',
                    avatarStoragePath,
                );
            }

            const { error: updateError } = await client
                .from('user_profiles')
                .update({
                    avatar_url: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (updateError) {
                this.logger.error(`Failed to clear avatar URL in profile: ${updateError.message}`);
                throw new InternalServerErrorException('Failed to update profile');
            }

            this.logger.log(`Avatar removed for user ${userId}`);
            return { success: true };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
                throw error;
            }
            this.logger.error(`Failed to remove avatar: ${error.message}`);
            throw new InternalServerErrorException('Failed to remove avatar');
        }
    }
}
