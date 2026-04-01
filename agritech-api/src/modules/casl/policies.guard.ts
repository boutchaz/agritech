import { CanActivate, ExecutionContext, Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, AppAbility } from './casl-ability.factory';
import { CHECK_POLICIES_KEY } from './check-policies.decorator';
import { PolicyHandler } from './policy.interface';

@Injectable()
export class PoliciesGuard implements CanActivate {
    private readonly logger = new Logger(PoliciesGuard.name);

    constructor(
        private reflector: Reflector,
        private caslAbilityFactory: CaslAbilityFactory,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        try {
            const policyHandlers =
                this.reflector.get<PolicyHandler[]>(
                    CHECK_POLICIES_KEY,
                    context.getHandler(),
                ) || [];

            if (policyHandlers.length === 0) {
                return true;
            }

            const user = request.user;

            const findHeaderValue = (headers: Record<string, any>, name: string): string | null => {
                const lowerName = name.toLowerCase();
                const key = Object.keys(headers).find(k => k.toLowerCase() === lowerName);
                return key ? (headers[key] as string) : null;
            };

            const headerOrgId = findHeaderValue(request.headers, 'x-organization-id');

            // SECURITY: Do NOT read organizationId from request.body to prevent
            // guard/controller mismatch (same fix as OrganizationGuard)
            const organizationId =
                headerOrgId ||
                request.organizationId ||
                request.query?.organizationId ||
                request.query?.organization_id ||
                request.user?.organizationId;

            if (!organizationId) {
                throw new BadRequestException('Organization ID is required for permission checks');
            }

            const ability = await this.caslAbilityFactory.createForUser(user, organizationId);

            const isAllowed = policyHandlers.every((handler) =>
                this.execPolicyHandler(handler, ability),
            );

            if (!isAllowed) {
                this.logger.debug(
                    `Permission denied for user ${user?.id} on ${request.method} ${request.url}`,
                );
                throw new ForbiddenException('You do not have sufficient permissions (CASL)');
            }

            return true;
        } catch (error) {
            if (error instanceof ForbiddenException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`PoliciesGuard error: ${error.message}`);
            throw error;
        }
    }

    private execPolicyHandler(handler: PolicyHandler, ability: AppAbility) {
        if (typeof handler === 'function') {
            return handler(ability);
        }
        return handler.handle(ability);
    }
}
