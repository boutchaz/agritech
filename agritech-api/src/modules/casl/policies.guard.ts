import { CanActivate, ExecutionContext, Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, AppAbility } from './casl-ability.factory';
import { CHECK_POLICIES_KEY } from './check-policies.decorator';
import { PolicyHandler } from './policy.interface';

@Injectable()
export class PoliciesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private caslAbilityFactory: CaslAbilityFactory,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policyHandlers =
            this.reflector.get<PolicyHandler[]>(
                CHECK_POLICIES_KEY,
                context.getHandler(),
            ) || [];

        // If no policies are defined, allow access (or deny? usually allow if other guards passed)
        // But here we want to be strict if the guard is applied
        if (policyHandlers.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Organization ID should have been extracted by a previous guard (e.g., OrganizationGuard)
        // or we extract it here again as fallback
        const organizationId =
            request.organizationId ||
            request.headers['x-organization-id'] ||
            request.query?.organizationId ||
            request.query?.organization_id ||
            request.body?.organizationId ||
            request.user?.organizationId;

        if (!organizationId) {
            throw new BadRequestException('Organization ID is required for permission checks');
        }

        const ability = await this.caslAbilityFactory.createForUser(user, organizationId);

        const isAllowed = policyHandlers.every((handler) =>
            this.execPolicyHandler(handler, ability),
        );

        if (!isAllowed) {
            throw new ForbiddenException('You do not have sufficient permissions (CASL)');
        }

        return true;
    }

    private execPolicyHandler(handler: PolicyHandler, ability: AppAbility) {
        if (typeof handler === 'function') {
            return handler(ability);
        }
        return handler.handle(ability);
    }
}
