import { useMemo, useState } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plane,
  UserPlus2,
  GraduationCap,
  AlertTriangle,
  LogOut,
  Sprout,
  Star,
} from 'lucide-react';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';
import { useAuth } from '@/hooks/useAuth';
import { useHrCalendar } from '@/hooks/useHrAdvanced';
import type { HrCalendarEvent, HrEventType } from '@/lib/api/hr-advanced';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/hr-calendar')({
  component: withRouteProtection(HrCalendarPage, 'read', 'Worker'),
});

const ALL_TYPES: HrEventType[] = [
  'leave', 'interview', 'training', 'qualification_expiry',
  'separation', 'campaign', 'holiday',
];

const TYPE_META: Record<HrEventType, { color: string; icon: typeof Plane; label: string }> = {
  leave: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200', icon: Plane, label: 'Leave' },
  interview: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200', icon: UserPlus2, label: 'Interview' },
  training: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', icon: GraduationCap, label: 'Training' },
  qualification_expiry: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', icon: AlertTriangle, label: 'Cert expiry' },
  separation: { color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200', icon: LogOut, label: 'Separation' },
  campaign: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200', icon: Sprout, label: 'Campaign' },
  holiday: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: Star, label: 'Holiday' },
};

function HrCalendarPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id ?? null;

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [enabledTypes, setEnabledTypes] = useState<Set<HrEventType>>(new Set(ALL_TYPES));

  const { from, to, days } = useMemo(() => {
    const first = new Date(cursor);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    // Pad to grid: Mon=1 first column. JS getDay: Sun=0..Sat=6
    const startWeekday = (first.getDay() + 6) % 7; // 0=Mon..6=Sun
    const grid: Date[] = [];
    const start = new Date(first);
    start.setDate(first.getDate() - startWeekday);
    const cells = Math.ceil((startWeekday + last.getDate()) / 7) * 7;
    for (let i = 0; i < cells; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      grid.push(d);
    }
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { from: fmt(grid[0]), to: fmt(grid[grid.length - 1]), days: grid };
  }, [cursor]);

  const types = useMemo(() => Array.from(enabledTypes), [enabledTypes]);
  const query = useHrCalendar(orgId, from, to, types);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, HrCalendarEvent[]>();
    for (const e of query.data ?? []) {
      const start = e.date.slice(0, 10);
      const end = (e.end_date ?? e.date).slice(0, 10);
      // Spread multi-day events across all dates in range
      const sd = new Date(start);
      const ed = new Date(end);
      for (let d = new Date(sd); d <= ed; d.setDate(d.getDate() + 1)) {
        const k = d.toISOString().slice(0, 10);
        const arr = map.get(k) ?? [];
        arr.push(e);
        map.set(k, arr);
      }
    }
    return map;
  }, [query.data]);

  const today = new Date().toISOString().slice(0, 10);
  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  if (!orgId) return null;

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('hrCalendar.title', 'HR Calendar')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('hrCalendar.subtitle', 'All HR events in one view: leaves, interviews, training, expiries, separations, campaigns, holidays.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="px-3 py-1.5 text-sm font-medium min-w-[180px] text-center capitalize">
            {monthLabel}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date();
              setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            {t('hrCalendar.today', 'Today')}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((tp) => {
          const meta = TYPE_META[tp];
          const Icon = meta.icon;
          const active = enabledTypes.has(tp);
          return (
            <button
              key={tp}
              type="button"
              onClick={() =>
                setEnabledTypes((cur) => {
                  const next = new Set(cur);
                  if (next.has(tp)) next.delete(tp);
                  else next.add(tp);
                  return next;
                })
              }
              className={`px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5 border ${
                active ? meta.color + ' border-transparent' : 'bg-background border-input text-gray-500'
              }`}
            >
              <Icon className="w-3 h-3" />
              {t(`hrCalendar.${tp}`, meta.label)}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-7 border-b text-xs text-gray-500">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="px-2 py-2 font-medium">
                    {t(`weekday.${d.toLowerCase()}`, d)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((d, i) => {
                  const k = d.toISOString().slice(0, 10);
                  const inMonth = d.getMonth() === cursor.getMonth();
                  const isToday = k === today;
                  const events = eventsByDate.get(k) ?? [];
                  return (
                    <div
                      key={i}
                      className={`min-h-[110px] border-b border-r p-1.5 ${
                        inMonth ? '' : 'bg-gray-50/40 dark:bg-gray-900/20'
                      }`}
                    >
                      <div
                        className={`text-xs mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          isToday
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : inMonth
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-400'
                        }`}
                      >
                        {d.getDate()}
                      </div>
                      <div className="space-y-1">
                        {events.slice(0, 3).map((e) => {
                          const meta = TYPE_META[e.type];
                          const Icon = meta.icon;
                          const inner = (
                            <div
                              className={`text-[10px] px-1.5 py-0.5 rounded ${meta.color} flex items-center gap-1 truncate`}
                              title={e.title}
                            >
                              <Icon className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{e.title}</span>
                            </div>
                          );
                          return e.link ? (
                            <Link key={e.id} to={e.link}>{inner}</Link>
                          ) : (
                            <div key={e.id}>{inner}</div>
                          );
                        })}
                        {events.length > 3 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{events.length - 3} {t('hrCalendar.more', 'more')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
