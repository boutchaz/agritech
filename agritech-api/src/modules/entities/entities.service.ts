import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';

export interface RegisterAbstractEntityDto {
  entityType: string;
  entityId: string;
  organizationId: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface LogEntityEventDto {
  entityType: string;
  entityId: string;
  eventType: string;
  eventData?: Record<string, any>;
}

export interface EntitySearchParams {
  searchTerm?: string;
  entityTypes?: string[];
  tags?: string[];
  limit?: number;
}

export interface SearchResult {
  entity_type: string;
  entity_id: string;
  entity_config: Record<string, any>;
  metadata: Record<string, any>;
}

@Injectable()
export class EntitiesService {
  private readonly logger = new Logger(EntitiesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Register or update an abstract entity
   * Moved from SQL: register_abstract_entity()
   */
  async registerEntity(dto: RegisterAbstractEntityDto): Promise<{ abstractId: string }> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('abstract_entities')
      .upsert(
        {
          entity_type: dto.entityType,
          entity_id: dto.entityId,
          organization_id: dto.organizationId,
          metadata: dto.metadata || {},
          tags: dto.tags || [],
        },
        {
          onConflict: 'entity_type,entity_id',
          ignoreDuplicates: false,
        },
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to register abstract entity: ${error.message}`);
    }

    this.logger.log(`Entity registered: ${dto.entityType}/${dto.entityId} for org ${dto.organizationId}`);

    return { abstractId: data.id };
  }

  /**
   * Log an event for an entity
   * Moved from SQL: log_entity_event()
   */
  async logEvent(userId: string, dto: LogEntityEventDto): Promise<{ eventId: string }> {
    const client = this.databaseService.getAdminClient();

    // First, get organization_id from the abstract entity
    const { data: entity } = await client
      .from('abstract_entities')
      .select('organization_id')
      .eq('entity_type', dto.entityType)
      .eq('entity_id', dto.entityId)
      .maybeSingle();

    if (!entity) {
      throw new BadRequestException(`Entity not registered: ${dto.entityType}/${dto.entityId}`);
    }

    // Log the event
    const { data, error } = await client
      .from('entity_events')
      .insert({
        entity_type: dto.entityType,
        entity_id: dto.entityId,
        event_type: dto.eventType,
        event_data: dto.eventData || {},
        user_id: userId,
        organization_id: entity.organization_id,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to log entity event: ${error.message}`);
    }

    this.logger.log(`Entity event logged: ${dto.eventType} for ${dto.entityType}/${dto.entityId}`);

    return { eventId: data.id };
  }

  /**
   * Get an abstract entity by type and ID
   * Moved from SQL: get_abstract_entity()
   */
  async getEntity(
    userId: string,
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<any> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('abstract_entities')
      .select('id, entity_type, entity_id, organization_id, metadata, tags')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch abstract entity: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException(`Entity not found: ${entityType}/${entityId}`);
    }

    return data;
  }

  /**
   * Search for entities across all types
   * Moved from SQL: search_entities()
   */
  async searchEntities(
    userId: string,
    organizationId: string,
    params: EntitySearchParams,
  ): Promise<SearchResult[]> {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('abstract_entities')
      .select(`
        entity_type,
        entity_id,
        metadata
      `)
      .eq('organization_id', organizationId);

    // Filter by entity types if specified
    if (params.entityTypes && params.entityTypes.length > 0) {
      query = query.in('entity_type', params.entityTypes);
    }

    // Filter by tags if specified
    if (params.tags && params.tags.length > 0) {
      query = query.contains('tags', params.tags);
    }

    // Search in metadata if search term provided
    if (params.searchTerm) {
      const s = sanitizeSearch(params.searchTerm);
      if (s) query = query.or(`metadata.ilike.%${s}%,entity_type.ilike.%${s}%`);
    }

    // Apply limit
    const limit = params.limit || 50;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to search entities: ${error.message}`);
    }

    // Get entity type configs
    const entityTypes = [...new Set((data || []).map((e: any) => e.entity_type))];
    const { data: typeConfigs } = await client
      .from('entity_types')
      .select('slug, config')
      .in('slug', entityTypes);

    const typeConfigMap = new Map(
      (typeConfigs || []).map((tc: any) => [tc.slug, tc.config]),
    );

    // Merge results with entity type configs
    const results: SearchResult[] = (data || []).map((entity: any) => ({
      entity_type: entity.entity_type,
      entity_id: entity.entity_id,
      entity_config: typeConfigMap.get(entity.entity_type) || {},
      metadata: entity.metadata,
    }));

    return results;
  }

  /**
   * Get events for an entity
   */
  async getEntityEvents(
    userId: string,
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<any[]> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('entity_events')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch entity events: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get entity activity feed (events across all entities for an organization)
   */
  async getActivityFeed(
    userId: string,
    organizationId: string,
    limit = 50,
  ): Promise<any[]> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('entity_events')
      .select(`
        *,
        abstract_entities!inner(entity_type, entity_id, metadata)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch activity feed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Bulk register entities (e.g., during migration or bulk import)
   */
  async bulkRegisterEntities(
    userId: string,
    entities: RegisterAbstractEntityDto[],
  ): Promise<{ registered: number; failed: number; errors: any[] }> {
    let registered = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const entity of entities) {
      try {
        await this.registerEntity(entity);
        registered++;
      } catch (error) {
        failed++;
        errors.push({
          entity: `${entity.entityType}/${entity.entityId}`,
          error: error.message,
        });
      }
    }

    this.logger.log(`Bulk registration complete: ${registered} succeeded, ${failed} failed`);

    return { registered, failed, errors };
  }

  /**
   * Unregister an entity (remove from abstract registry)
   */
  async unregisterEntity(
    userId: string,
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<{ deleted: boolean }> {
    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('abstract_entities')
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to unregister entity: ${error.message}`);
    }

    this.logger.log(`Entity unregistered: ${entityType}/${entityId}`);

    return { deleted: true };
  }
}
