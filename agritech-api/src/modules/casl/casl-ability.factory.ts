import { AbilityBuilder, PureAbility, AbilityClass, ExtractSubjectType, InferSubjects } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../modules/database/database.service';
import { Action } from './action.enum';

// Define subjects
export type Subjects = InferSubjects<any> | 'all';

export type AppAbility = PureAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
    constructor(private databaseService: DatabaseService) { }

    async createForUser(user: any, organizationId: string) {
        const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility as AbilityClass<AppAbility>);

        if (!user) {
            return build({
                detectSubjectType: (item) => item.constructor as ExtractSubjectType<Subjects>,
            });
        }

        const client = this.databaseService.getAdminClient();
        const { data: orgUser, error } = await client
            .from('organization_users')
            .select('role_id, roles(name, level)')
            .eq('user_id', user.id)
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .single();

        console.log('[CaslAbilityFactory] User role lookup:', {
            userId: user.id,
            organizationId,
            foundRole: orgUser ? (orgUser.roles as { name?: string })?.name : null,
            error: error?.message || null,
        });

        if (error || !orgUser) {
            console.warn('[CaslAbilityFactory] User not found in organization_users or inactive');
            return build({
                detectSubjectType: (item) => item.constructor as ExtractSubjectType<Subjects>,
            });
        }

        const roleName = (orgUser.roles as any)?.name;
        // const roleLevel = (orgUser.roles as any)?.level;

        if (roleName === 'system_admin' || roleName === 'organization_admin') {
            can(Action.Manage, 'all'); // Admin can do anything
            console.log('[CaslAbilityFactory] Granting manage:all for admin role');
        } else if (roleName === 'farm_manager') {
            can(Action.Manage, 'Farm');
            can(Action.Manage, 'Parcel');
            can(Action.Read, 'all');
            console.log('[CaslAbilityFactory] Granting farm_manager permissions');
        } else if (roleName === 'viewer') {
            can(Action.Read, 'all');
            console.log('[CaslAbilityFactory] Granting viewer permissions');
        } else {
            // Default for other roles (worker, etc.) - adjust as needed
            can(Action.Read, 'all');
            console.log('[CaslAbilityFactory] Granting default read-all permissions for role:', roleName);
        }

        const ability = build({
            detectSubjectType: (item) => item.constructor as ExtractSubjectType<Subjects>,
        });

        // Log a test of the ability to verify it works
        console.log('[CaslAbilityFactory] Testing ability - can manage all:', ability.can(Action.Manage, 'all'));
        console.log('[CaslAbilityFactory] Testing ability - can read Farm:', ability.can(Action.Read, 'Farm'));

        return ability;
    }
}
