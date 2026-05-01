import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type HrEventType =
  | 'leave'
  | 'interview'
  | 'training'
  | 'qualification_expiry'
  | 'separation'
  | 'campaign'
  | 'holiday';

export interface HrCalendarEvent {
  id: string;
  type: HrEventType;
  title: string;
  date: string; // ISO date (yyyy-mm-dd) or datetime
  end_date?: string;
  worker_id?: string | null;
  worker_name?: string | null;
  status?: string | null;
  meta?: Record<string, unknown>;
  link?: string;
}

@Injectable()
export class HrCalendarService {
  constructor(private readonly db: DatabaseService) {}

  async aggregate(
    orgId: string,
    from: string,
    to: string,
    types?: string[],
  ): Promise<HrCalendarEvent[]> {
    if (!from || !to) throw new BadRequestException('from and to are required');
    const supabase = this.db.getAdminClient();
    const events: HrCalendarEvent[] = [];
    const want = (t: HrEventType) => !types || types.includes(t);

    if (want('leave')) {
      const { data } = await supabase
        .from('leave_applications')
        .select('id, worker_id, from_date, to_date, status, reason, worker:workers(first_name, last_name), leave_type:leave_types(name)')
        .eq('organization_id', orgId)
        .gte('from_date', from)
        .lte('from_date', to);
      for (const r of (data ?? []) as any[]) {
        events.push({
          id: `leave:${r.id}`,
          type: 'leave',
          title: `${r.worker?.first_name ?? ''} ${r.worker?.last_name ?? ''} — ${r.leave_type?.name ?? 'Leave'}`,
          date: r.from_date,
          end_date: r.to_date,
          worker_id: r.worker_id,
          worker_name: `${r.worker?.first_name ?? ''} ${r.worker?.last_name ?? ''}`.trim(),
          status: r.status,
          link: '/workforce/leave-applications',
        });
      }
    }

    if (want('interview')) {
      const { data } = await supabase
        .from('interviews')
        .select('id, applicant_id, scheduled_at, duration_minutes, status, applicant:job_applicants(first_name, last_name), opening:job_openings(title)')
        .eq('organization_id', orgId)
        .gte('scheduled_at', `${from}T00:00:00Z`)
        .lte('scheduled_at', `${to}T23:59:59Z`);
      for (const r of (data ?? []) as any[]) {
        events.push({
          id: `interview:${r.id}`,
          type: 'interview',
          title: `Interview — ${r.applicant?.first_name ?? ''} ${r.applicant?.last_name ?? ''} (${r.opening?.title ?? ''})`,
          date: r.scheduled_at,
          status: r.status,
          meta: { duration_minutes: r.duration_minutes },
          link: '/workforce/recruitment',
        });
      }
    }

    if (want('training')) {
      const { data } = await supabase
        .from('training_enrollments')
        .select('id, worker_id, enrolled_date, completion_date, status, worker:workers(first_name, last_name), program:training_programs(name)')
        .eq('organization_id', orgId)
        .gte('enrolled_date', from)
        .lte('enrolled_date', to);
      for (const r of (data ?? []) as any[]) {
        events.push({
          id: `training:${r.id}`,
          type: 'training',
          title: `Training — ${r.worker?.first_name ?? ''} ${r.worker?.last_name ?? ''} (${r.program?.name ?? ''})`,
          date: r.enrolled_date,
          end_date: r.completion_date ?? undefined,
          worker_id: r.worker_id,
          worker_name: `${r.worker?.first_name ?? ''} ${r.worker?.last_name ?? ''}`.trim(),
          status: r.status,
          link: '/workforce/training',
        });
      }
    }

    if (want('qualification_expiry')) {
      const { data } = await supabase
        .from('worker_qualifications')
        .select('id, worker_id, expiry_date, qualification_name, qualification_type, worker:workers(first_name, last_name)')
        .eq('organization_id', orgId)
        .not('expiry_date', 'is', null)
        .gte('expiry_date', from)
        .lte('expiry_date', to);
      for (const r of (data ?? []) as any[]) {
        events.push({
          id: `qualification:${r.id}`,
          type: 'qualification_expiry',
          title: `Expiry — ${r.qualification_name} (${r.worker?.first_name ?? ''} ${r.worker?.last_name ?? ''})`,
          date: r.expiry_date,
          worker_id: r.worker_id,
          worker_name: `${r.worker?.first_name ?? ''} ${r.worker?.last_name ?? ''}`.trim(),
          meta: { qualification_type: r.qualification_type },
          link: '/workforce/qualifications',
        });
      }
    }

    if (want('separation')) {
      const { data } = await supabase
        .from('separations')
        .select('id, worker_id, separation_type, relieving_date, status, worker:workers(first_name, last_name)')
        .eq('organization_id', orgId)
        .gte('relieving_date', from)
        .lte('relieving_date', to);
      for (const r of (data ?? []) as any[]) {
        events.push({
          id: `separation:${r.id}`,
          type: 'separation',
          title: `Relieving — ${r.worker?.first_name ?? ''} ${r.worker?.last_name ?? ''} (${r.separation_type})`,
          date: r.relieving_date,
          worker_id: r.worker_id,
          worker_name: `${r.worker?.first_name ?? ''} ${r.worker?.last_name ?? ''}`.trim(),
          status: r.status,
          link: `/workforce/separations/${r.id}`,
        });
      }
    }

    if (want('campaign')) {
      const { data } = await supabase
        .from('seasonal_campaigns')
        .select('id, name, start_date, end_date, season_type, status')
        .eq('organization_id', orgId)
        .or(`and(start_date.lte.${to},end_date.gte.${from})`);
      for (const r of (data ?? []) as any[]) {
        events.push({
          id: `campaign:${r.id}`,
          type: 'campaign',
          title: `Campaign — ${r.name}`,
          date: r.start_date,
          end_date: r.end_date,
          status: r.status,
          meta: { season_type: r.season_type },
          link: '/workforce/seasonal-campaigns',
        });
      }
    }

    if (want('holiday')) {
      const { data: lists } = await supabase
        .from('holiday_lists')
        .select('id')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      const listIds = (lists ?? []).map((l) => l.id);
      if (listIds.length) {
        const { data } = await supabase
          .from('holidays')
          .select('id, date, name, holiday_type')
          .in('holiday_list_id', listIds)
          .gte('date', from)
          .lte('date', to);
        for (const r of (data ?? []) as any[]) {
          events.push({
            id: `holiday:${r.id}`,
            type: 'holiday',
            title: `Holiday — ${r.name}`,
            date: r.date,
            meta: { holiday_type: r.holiday_type },
            link: '/workforce/holidays',
          });
        }
      }
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }
}
