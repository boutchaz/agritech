import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, LogIn, LogOut, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { useWorkers } from '@/hooks/useWorkers';
import { useCreateAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/hooks/useAuth';
import type { AttendanceType } from '@/lib/api/attendance';

interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

function getPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  });
}

export default function AttendanceCheckInWidget() {
  const { t } = useTranslation();
  const { currentOrganization, currentFarm } = useAuth();
  const { data: workers = [] } = useWorkers(currentOrganization?.id ?? null, currentFarm?.id);
  const createAttendance = useCreateAttendance();

  const [workerId, setWorkerId] = useState<string>('');
  const [pendingType, setPendingType] = useState<AttendanceType | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handlePunch = async (type: AttendanceType) => {
    if (!workerId) {
      toast.error(t('attendance.selectWorkerFirst', 'Select a worker first'));
      return;
    }
    setPendingType(type);
    setLastResult(null);
    try {
      let pos: GeoPosition | null = null;
      try {
        pos = await getPosition();
      } catch {
        // Continue without GPS — server records null lat/lng.
      }
      const record = await createAttendance.mutateAsync({
        worker_id: workerId,
        farm_id: currentFarm?.id,
        type,
        lat: pos?.lat,
        lng: pos?.lng,
        accuracy_m: pos?.accuracy,
        source: 'mobile',
      });
      const within = record.within_geofence;
      const distance =
        record.distance_m != null ? Math.round(record.distance_m) : null;
      setLastResult(
        within
          ? t('attendance.checkedInOnSite', '✓ On-site ({{d}}m from geofence)', {
              d: distance ?? 0,
            })
          : within === false
            ? t(
                'attendance.checkedInOutsideGeofence',
                '⚠ Outside geofence ({{d}}m away)',
                { d: distance ?? 0 },
              )
            : t('attendance.checkedInNoGeofence', '✓ Recorded (no geofence)'),
      );
      toast.success(
        type === 'check_in'
          ? t('attendance.checkedIn', 'Checked in')
          : t('attendance.checkedOut', 'Checked out'),
      );
    } catch (e: any) {
      toast.error(e?.message ?? t('common.error', 'Error'));
    } finally {
      setPendingType(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" />
          {t('attendance.checkInTitle', 'Check in / out')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={workerId} onValueChange={setWorkerId}>
          <SelectTrigger>
            <SelectValue
              placeholder={t('attendance.selectWorker', 'Select a worker')}
            />
          </SelectTrigger>
          <SelectContent>
            {workers.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.first_name} {w.last_name}
                {w.cin ? ` — ${w.cin}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            disabled={pendingType !== null}
            onClick={() => handlePunch('check_in')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {pendingType === 'check_in' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            {t('attendance.checkIn', 'Check in')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pendingType !== null}
            onClick={() => handlePunch('check_out')}
          >
            {pendingType === 'check_out' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {t('attendance.checkOut', 'Check out')}
          </Button>
        </div>

        {lastResult && (
          <p className="text-xs text-muted-foreground">{lastResult}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {t(
            'attendance.gpsHint',
            'Allow location access to verify on-site presence against the configured geofence.',
          )}
        </p>
      </CardContent>
    </Card>
  );
}
