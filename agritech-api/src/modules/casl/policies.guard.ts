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
        const request = context.switchToHttp().getRequest();
        const requestId = (request as any).requestId || 'unknown';
        console.log(`[PoliciesGuard #${requestId}] canActivate called for:`, request.url);

        try {
            const policyHandlers =
                this.reflector.get<PolicyHandler[]>(
                    CHECK_POLICIES_KEY,
                    context.getHandler(),
                ) || [];

            console.log(`[PoliciesGuard #${requestId}] Policy handlers count:`, policyHandlers.length, 'for', request.url);

            if (policyHandlers.length === 0) {
                console.log('[PoliciesGuard] No policies defined, allowing access for:', request.url);
                return true;
            }

            const user = request.user;

            const findHeaderValue = (headers: Record<string, any>, name: string): string | null => {
                const lowerName = name.toLowerCase();
                const key = Object.keys(headers).find(k => k.toLowerCase() === lowerName);
                return key ? (headers[key] as string) : null;
            };

            const headerOrgId = findHeaderValue(request.headers, 'x-organization-id');

            const organizationId =
                request.organizationId ||
                headerOrgId ||
                request.query?.organizationId ||
                request.query?.organization_id ||
                request.body?.organizationId ||
                request.user?.organizationId;

            // Debug logging for 403 investigation
            console.log('[PoliciesGuard] Debug info:', {
                url: request.url,
                method: request.method,
                userId: user?.id,
                userEmail: user?.email,
                headerOrgId,
                queryOrgId: request.query?.organization_id || request.query?.organizationId,
                bodyOrgId: request.body?.organizationId,
                resolvedOrgId: organizationId,
                allHeaders: Object.keys(request.headers).filter(h => h.toLowerCase().includes('org')),
            });

            if (!organizationId) {
                console.error('[PoliciesGuard] No organization ID found in request');
                throw new BadRequestException('Organization ID is required for permission checks');
            }

            const ability = await this.caslAbilityFactory.createForUser(user, organizationId);

            // Log each policy check result for debugging
            const results = policyHandlers.map((handler, index) => {
                const result = this.execPolicyHandler(handler, ability);
                console.log(`[PoliciesGuard] Policy ${index} check:`, {
                    url: request.url,
                    handlerType: typeof handler,
                    result,
                });
                return result;
            });

            const isAllowed = results.every(Boolean);

            if (!isAllowed) {
                console.error('[PoliciesGuard] Permission denied:', {
                    url: request.url,
                    userId: user?.id,
                    organizationId,
                    policyResults: results,
                });
                throw new ForbiddenException('You do not have sufficient permissions (CASL)');
            }

            return true;
        } catch (error) {
            console.error('[PoliciesGuard] Exception in canActivate:', {
                url: request.url,
                error: error.message,
                stack: error.stack,
            });
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
