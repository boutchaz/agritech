import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  attendanceApi,
  type AttendanceFilters,
  type CreateAttendanceInput,
  type UpsertGeofenceInput,
} from '@/lib/api/attendance';
import { withOfflineQueue } from '@/lib/offline/withOfflineQueue';

export function useAttendanceRecords(filters: AttendanceFilters = {}) {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['attendance', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return attendanceApi.list(filters, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useCreateAttendance() {
  const { currentOrganization } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAttendanceInput) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      const queued = withOfflineQueue<CreateAttendanceInput, Awaited<ReturnType<typeof attendanceApi.create>>>(
        {
          organizationId: currentOrganization.id,
          resource: 'attendance',
          method: 'POST',
          url: '/api/v1/attendance',
          buildPayload: (input, clientId) => ({ ...input, client_id: clientId }),
          buildOptimisticStub: (input, clientId) =>
            ({ id: clientId, _pending: true, ...input }) as never,
        },
        (input) => attendanceApi.create(input, currentOrganization.id),
      );
      return queued(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', currentOrganization?.id] });
    },
  });
}

export function useDeleteAttendance() {
  const { currentOrganization } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return attendanceApi.delete(id, currentOrganization.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', currentOrganization?.id] });
    },
  });
}

export function useAttendanceSummary(workerId: string | null, from: string, to: string) {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['attendance', 'summary', currentOrganization?.id, workerId, from, to],
    queryFn: async () => {
      if (!currentOrganization?.id || !workerId) return [];
      return attendanceApi.summary(workerId, from, to, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id && !!workerId && !!from && !!to,
  });
}

export function useGeofences(farmId?: string) {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['attendance-geofences', currentOrganization?.id, farmId],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return attendanceApi.listGeofences(currentOrganization.id, farmId);
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useCreateGeofence() {
  const { currentOrganization } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpsertGeofenceInput) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return attendanceApi.createGeofence(data, currentOrganization.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-geofences', currentOrganization?.id] });
    },
  });
}

export function useUpdateGeofence() {
  const { currentOrganization } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UpsertGeofenceInput> }) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return attendanceApi.updateGeofence(id, updates, currentOrganization.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-geofences', currentOrganization?.id] });
    },
  });
}

export function useDeleteGeofence() {
  const { currentOrganization } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return attendanceApi.deleteGeofence(id, currentOrganization.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-geofences', currentOrganization?.id] });
    },
  });
}
