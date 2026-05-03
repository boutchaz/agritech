import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, MapPin, Users, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAttendanceRecords } from '@/hooks/useAttendance';
import AttendanceCheckInWidget from '@/components/Workforce/AttendanceCheckInWidget';

function AttendancePage() {
  const { t } = useTranslation();

  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [type, setType] = useState<'all' | 'check_in' | 'check_out'>('all');

  const { data, isLoading } = useAttendanceRecords({
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
    type: type === 'all' ? undefined : type,
    pageSize: 100,
  });
  const records = data?.data ?? [];

  const stats = useMemo(() => {
    const totalIns = records.filter((r) => r.type === 'check_in').length;
    const totalOuts = records.filter((r) => r.type === 'check_out').length;
    const offSite = records.filter(
      (r) => r.within_geofence === false,
    ).length;
    return { totalIns, totalOuts, offSite };
  }, [records]);

  return (
    <>
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <AttendanceCheckInWidget />

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                icon={<Users className="h-4 w-4 text-emerald-600" />}
                label={t('attendance.stats.checkIns', 'Check-ins')}
                value={stats.totalIns}
              />
              <StatCard
                icon={<CheckCircle2 className="h-4 w-4 text-blue-600" />}
                label={t('attendance.stats.checkOuts', 'Check-outs')}
                value={stats.totalOuts}
              />
              <StatCard
                icon={<X className="h-4 w-4 text-rose-600" />}
                label={t('attendance.stats.offSite', 'Off-site')}
                value={stats.offSite}
              />
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {t('attendance.filters.from', 'From')}
                    </label>
                    <Input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {t('attendance.filters.to', 'To')}
                    </label>
                    <Input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {t('attendance.filters.type', 'Type')}
                    </label>
                    <Select value={type} onValueChange={(v) => setType(v as any)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t('attendance.filters.allTypes', 'All')}
                        </SelectItem>
                        <SelectItem value="check_in">
                          {t('attendance.checkIn', 'Check in')}
                        </SelectItem>
                        <SelectItem value="check_out">
                          {t('attendance.checkOut', 'Check out')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {t('common.loading', 'Loading...')}
              </div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {t('attendance.empty', 'No attendance records in this range.')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('attendance.cols.when', 'When')}</TableHead>
                    <TableHead>{t('attendance.cols.worker', 'Worker')}</TableHead>
                    <TableHead>{t('attendance.cols.farm', 'Farm')}</TableHead>
                    <TableHead>{t('attendance.cols.type', 'Type')}</TableHead>
                    <TableHead className="text-right">
                      {t('attendance.cols.geofence', 'Geofence')}
                    </TableHead>
                    <TableHead>{t('attendance.cols.source', 'Source')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">
                        {new Date(r.occurred_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {r.worker
                          ? `${r.worker.first_name} ${r.worker.last_name}`
                          : r.worker_id}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.farm?.name ?? '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.type === 'check_in' ? 'default' : 'secondary'}
                        >
                          {r.type === 'check_in'
                            ? t('attendance.checkIn', 'Check in')
                            : t('attendance.checkOut', 'Check out')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.within_geofence === true ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30">
                            <MapPin className="mr-1 h-3 w-3" />
                            {t('attendance.onSite', 'On-site')}
                            {r.distance_m != null
                              ? ` (${Math.round(r.distance_m)}m)`
                              : ''}
                          </Badge>
                        ) : r.within_geofence === false ? (
                          <Badge variant="destructive">
                            {t('attendance.offSite', 'Off-site')}
                            {r.distance_m != null
                              ? ` (${Math.round(r.distance_m)}m)`
                              : ''}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.source}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/attendance')({
  component: AttendancePage,
});
