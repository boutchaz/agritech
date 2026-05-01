import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../modules/database/database.service';
import { REQUIRED_MODULES_KEY } from '../decorators/require-module.decorator';

@Injectable()
export class ModuleEntitlementGuard implements CanActivate {
  private readonly logger = new Logger(ModuleEntitlementGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModules =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_MODULES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredModules.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organizationId = this.resolveOrganizationId(request);

    if (!organizationId) {
      throw new BadRequestException(
        'Organization ID is required for module entitlement checks',
      );
    }

    const client = this.databaseService.getAdminClient();

    const { data: catalog, error: catalogError } = await client
      .from('modules')
      .select('id, slug, is_required')
      .in('slug', requiredModules)
      .eq('is_available', true);

    if (catalogError) {
      this.logger.error(`Failed to load module catalog: ${catalogError.message}`);
      throw new InternalServerErrorException('Failed to verify module entitlement');
    }

    const knownModules = catalog ?? [];
    const entitledSlugs = new Set<string>(
      knownModules
        .filter((module: any) => module.is_required)
        .map((module: any) => module.slug as string),
    );

    const moduleIds = knownModules
      .map((module: any) => module.id as string)
      .filter(Boolean);

    if (moduleIds.length > 0) {
      const { data: orgModules, error: orgModulesError } = await client
        .from('organization_modules')
        .select('module_id, modules!inner(slug)')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .in('module_id', moduleIds);

      if (orgModulesError) {
        this.logger.error(
          `Failed to load organization modules: ${orgModulesError.message}`,
        );
        throw new InternalServerErrorException(
          'Failed to verify module entitlement',
        );
      }

      for (const row of orgModules ?? []) {
        const slug = (row.modules as any)?.slug;
        if (typeof slug === 'string' && slug.length > 0) {
          entitledSlugs.add(slug);
        }
      }
    }

    const hasEntitlement = requiredModules.some((slug) => entitledSlugs.has(slug));

    if (!hasEntitlement) {
      if (requiredModules.length === 1) {
        throw new ForbiddenException(
          `Module '${requiredModules[0]}' is not activated for this organization`,
        );
      }

      throw new ForbiddenException(
        `This feature requires one of the following activated modules: ${requiredModules.join(', ')}`,
      );
    }

    return true;
  }

  private resolveOrganizationId(request: any): string | undefined {
    const findHeaderValue = (
      headers: Record<string, any> | undefined,
      name: string,
    ): string | undefined => {
      if (!headers) return undefined;

      const key = Object.keys(headers).find(
        (headerName) => headerName.toLowerCase() === name.toLowerCase(),
      );

      return key ? (headers[key] as string | undefined) : undefined;
    };

    return (
      request.organizationId ||
      request.params?.organizationId ||
      request.params?.organization_id ||
      request.query?.organizationId ||
      request.query?.organization_id ||
      findHeaderValue(request.headers, 'x-organization-id') ||
      request.user?.organizationId
    );
  }
}
