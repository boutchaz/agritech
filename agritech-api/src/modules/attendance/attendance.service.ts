import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  paginatedResponse,
  type PaginatedResponse,
} from '../../common/dto/paginated-query.dto';
import {
  AttendanceFiltersDto,
  AttendanceSource,
  CreateAttendanceDto,
  UpsertGeofenceDto,
} from './dto';

interface Geofence {
  id: string;
  farm_id: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  is_active: boolean;
}

const EARTH_RADIUS_M = 6371000;

/** Haversine distance between two GPS points in metres. */
function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  // ─── Geofences ───────────────────────────────────────────────

  async listGeofences(organizationId: string, farmId?: string) {
    const supabase = this.databaseService.getAdminClient();
    let query = supabase
      .from('farm_geofences')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    if (farmId) {
      query = query.or(`farm_id.eq.${farmId},farm_id.is.null`);
    }
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createGeofence(
    organizationId: string,
    dto: UpsertGeofenceDto,
  ) {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('farm_geofences')
      .insert({
        organization_id: organizationId,
        farm_id: dto.farm_id ?? null,
        name: dto.name,
        lat: dto.lat,
        lng: dto.lng,
        radius_m: dto.radius_m ?? 250,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateGeofence(
    organizationId: string,
    id: string,
    dto: Partial<UpsertGeofenceDto>,
  ) {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('farm_geofences')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Geofence not found');
    return data;
  }

  async deleteGeofence(organizationId: string, id: string) {
    const supabase = this.databaseService.getAdminClient();
    const { error } = await supabase
      .from('farm_geofences')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);
    if (error) throw new BadRequestException(error.message);
  }

  // ─── Attendance records ──────────────────────────────────────

  async list(
    organizationId: string,
    filters: AttendanceFiltersDto,
  ): Promise<PaginatedResponse<any>> {
    const supabase = this.databaseService.getAdminClient();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;
    const from = (page - 1) * pageSize;

    let query = supabase
      .from('attendance_records')
      .select(
        `*, worker:workers(id, first_name, last_name, cin), farm:farms(id, name)`,
        { count: 'exact' },
      )
      .eq('organization_id', organizationId)
      .order('occurred_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (filters.worker_id) query = query.eq('worker_id', filters.worker_id);
    if (filters.farm_id) query = query.eq('farm_id', filters.farm_id);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.from) query = query.gte('occurred_at', filters.from);
    if (filters.to) query = query.lte('occurred_at', filters.to);

    const { data, error, count } = await query;
    if (error) throw new BadRequestException(error.message);

    return paginatedResponse(data ?? [], count ?? 0, page, pageSize);
  }

  /**
   * Create a check-in or check-out record. When GPS is supplied, validates
   * against the closest active geofence and stores distance + within flag.
   */
  async create(
    organizationId: string,
    userId: string | null,
    dto: CreateAttendanceDto,
  ) {
    const supabase = this.databaseService.getAdminClient();

    // Verify worker belongs to org
    const { data: worker, error: workerErr } = await supabase
      .from('workers')
      .select('id, organization_id')
      .eq('id', dto.worker_id)
      .eq('organization_id', organizationId)
      .single();
    if (workerErr || !worker) {
      throw new NotFoundException('Worker not found in organization');
    }

    let geofenceId: string | null = null;
    let distance: number | null = null;
    let within: boolean | null = null;

    if (dto.lat != null && dto.lng != null) {
      const matched = await this.matchClosestGeofence(
        organizationId,
        dto.farm_id,
        dto.lat,
        dto.lng,
      );
      if (matched) {
        geofenceId = matched.geofence.id;
        distance = matched.distance;
        within = matched.distance <= matched.geofence.radius_m;
        if (!within) {
          throw new BadRequestException(
            `Punch outside geofence (${Math.round(distance)}m from boundary, allowed ${matched.geofence.radius_m}m)`,
          );
        }
      }
    }

    // Sequencing: a check_in must not follow another check_in (and same for
    // check_out) on the same calendar day — invalid pairs inflate hours.
    const occurredAt = dto.occurred_at ?? new Date().toISOString();
    const day = occurredAt.slice(0, 10);
    const { data: lastSameDay } = await supabase
      .from('attendance_records')
      .select('type, occurred_at')
      .eq('organization_id', organizationId)
      .eq('worker_id', dto.worker_id)
      .gte('occurred_at', `${day}T00:00:00`)
      .lte('occurred_at', `${day}T23:59:59`)
      .order('occurred_at', { ascending: false })
      .limit(1);
    const last = lastSameDay?.[0];
    if (last) {
      if (last.type === dto.type) {
        throw new BadRequestException(
          `Cannot record consecutive ${dto.type} punches; expected the opposite type next`,
        );
      }
      if (occurredAt <= last.occurred_at) {
        throw new BadRequestException('Punch occurred_at must be after the previous punch');
      }
    } else if (dto.type === 'check_out') {
      throw new BadRequestException('Cannot check_out without a prior check_in for the day');
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        organization_id: organizationId,
        worker_id: dto.worker_id,
        farm_id: dto.farm_id ?? null,
        geofence_id: geofenceId,
        type: dto.type,
        occurred_at: occurredAt,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        accuracy_m: dto.accuracy_m ?? null,
        distance_m: distance,
        within_geofence: within,
        source: dto.source ?? AttendanceSource.MOBILE,
        notes: dto.notes ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async delete(organizationId: string, id: string) {
    const supabase = this.databaseService.getAdminClient();
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);
    if (error) throw new BadRequestException(error.message);
  }

  /**
   * Per-worker daily summary in a date range. Returns rows with
   * { date, worker_id, first_check_in, last_check_out, hours_worked, total_pings }.
   */
  async dailySummary(
    organizationId: string,
    workerId: string,
    from: string,
    to: string,
  ) {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id, type, occurred_at, within_geofence')
      .eq('organization_id', organizationId)
      .eq('worker_id', workerId)
      .gte('occurred_at', from)
      .lte('occurred_at', to)
      .order('occurred_at', { ascending: true });
    if (error) throw new BadRequestException(error.message);

    type Row = {
      date: string;
      first_check_in: string | null;
      last_check_out: string | null;
      hours_worked: number;
      pings: number;
      ins: number;
      outs: number;
    };
    const byDay = new Map<string, Row>();
    const eventsByDay = new Map<string, Array<{ type: string; occurred_at: string }>>();
    for (const r of data ?? []) {
      const day = r.occurred_at.slice(0, 10);
      const row =
        byDay.get(day) ||
        ({
          date: day,
          first_check_in: null,
          last_check_out: null,
          hours_worked: 0,
          pings: 0,
          ins: 0,
          outs: 0,
        } as Row);
      row.pings += 1;
      if (r.type === 'check_in') {
        row.ins += 1;
        if (!row.first_check_in) row.first_check_in = r.occurred_at;
      } else {
        row.outs += 1;
        row.last_check_out = r.occurred_at;
      }
      byDay.set(day, row);
      const list = eventsByDay.get(day) ?? [];
      list.push({ type: r.type, occurred_at: r.occurred_at });
      eventsByDay.set(day, list);
    }
    // Pair-based hours: sum (check_out - matching check_in) over each shift,
    // so lunch breaks and multiple shifts no longer inflate hours.
    for (const [day, events] of eventsByDay) {
      let openIn: string | null = null;
      let total = 0;
      for (const e of events) {
        if (e.type === 'check_in') {
          if (!openIn) openIn = e.occurred_at;
        } else if (e.type === 'check_out' && openIn) {
          total += (new Date(e.occurred_at).getTime() - new Date(openIn).getTime()) / 3_600_000;
          openIn = null;
        }
      }
      const row = byDay.get(day);
      if (row) row.hours_worked = total;
    }
    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  // ─── Internals ───────────────────────────────────────────────

  private async matchClosestGeofence(
    organizationId: string,
    farmId: string | undefined,
    lat: number,
    lng: number,
  ): Promise<{ geofence: Geofence; distance: number } | null> {
    const supabase = this.databaseService.getAdminClient();
    let query = supabase
      .from('farm_geofences')
      .select('id, farm_id, lat, lng, radius_m, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true);
    if (farmId) {
      query = query.or(`farm_id.eq.${farmId},farm_id.is.null`);
    }
    const { data, error } = await query;
    if (error) return null;
    if (!data || data.length === 0) return null;

    let best: { geofence: Geofence; distance: number } | null = null;
    for (const g of data as Geofence[]) {
      const d = distanceMeters(lat, lng, g.lat, g.lng);
      if (!best || d < best.distance) best = { geofence: g, distance: d };
    }
    return best;
  }
}
