import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface EmitEventDto {
  organization_id?: string;
  user_id?: string;
  event_type: string;
  event_data?: Record<string, any>;
  source?: string;
  session_id?: string;
}

export interface EventFiltersDto {
  event_type?: string;
  organization_id?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface Event {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  event_type: string;
  event_data: Record<string, any>;
  source: string;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  occurred_at: string;
}

@Injectable()
export class EventsService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Emit a new event
   */
  async emit(event: EmitEventDto): Promise<void> {
    const client = this.databaseService.getAdminClient();

    try {
      await client.from('events').insert({
        organization_id: event.organization_id,
        user_id: event.user_id,
        event_type: event.event_type,
        event_data: event.event_data || {},
        source: event.source || 'api',
        session_id: event.session_id,
        occurred_at: new Date().toISOString(),
      });
    } catch (error) {
      // Log but don't throw - events should not break main flow
      console.error('Failed to emit event:', error);
    }
  }

  /**
   * Emit multiple events in batch
   */
  async emitBatch(events: EmitEventDto[]): Promise<void> {
    const client = this.databaseService.getAdminClient();

    try {
      const records = events.map((event) => ({
        organization_id: event.organization_id,
        user_id: event.user_id,
        event_type: event.event_type,
        event_data: event.event_data || {},
        source: event.source || 'api',
        session_id: event.session_id,
        occurred_at: new Date().toISOString(),
      }));

      await client.from('events').insert(records);
    } catch (error) {
      console.error('Failed to emit batch events:', error);
    }
  }

  /**
   * Get events by organization
   */
  async getByOrg(
    orgId: string,
    filters: EventFiltersDto = {},
  ): Promise<{ data: Event[]; total: number }> {
    const client = this.databaseService.getAdminClient();
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    let query = client
      .from('events')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId);

    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.start_date) {
      query = query.gte('occurred_at', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('occurred_at', filters.end_date);
    }

    query = query
      .order('occurred_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return { data: data || [], total: count || 0 };
  }

  /**
   * Get all events (admin only)
   */
  async getAll(filters: EventFiltersDto = {}): Promise<{ data: Event[]; total: number }> {
    const client = this.databaseService.getAdminClient();
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    let query = client.from('events').select('*', { count: 'exact' });

    if (filters.organization_id) {
      query = query.eq('organization_id', filters.organization_id);
    }
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.start_date) {
      query = query.gte('occurred_at', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('occurred_at', filters.end_date);
    }

    query = query
      .order('occurred_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return { data: data || [], total: count || 0 };
  }

  /**
   * Get event type distribution
   */
  async getEventTypeDistribution(
    orgId?: string,
    days: number = 30,
  ): Promise<{ event_type: string; count: number }[]> {
    const client = this.databaseService.getAdminClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = client
      .from('events')
      .select('event_type')
      .gte('occurred_at', startDate.toISOString());

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch event distribution: ${error.message}`);
    }

    // Group and count
    const counts: { [key: string]: number } = {};
    for (const row of data || []) {
      counts[row.event_type] = (counts[row.event_type] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([event_type, count]) => ({ event_type, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get daily event counts
   */
  async getDailyEventCounts(
    orgId?: string,
    days: number = 30,
  ): Promise<{ date: string; count: number }[]> {
    const client = this.databaseService.getAdminClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = client
      .from('events')
      .select('occurred_at')
      .gte('occurred_at', startDate.toISOString());

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch daily counts: ${error.message}`);
    }

    // Group by date
    const counts: { [key: string]: number } = {};
    for (const row of data || []) {
      const date = row.occurred_at.split('T')[0];
      counts[date] = (counts[date] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
