import { apiClient } from '../api-client';
import type { PaginatedResponse } from './types';

const BASE = '/api/v1/attendance';

export type AttendanceType = 'check_in' | 'check_out';
export type AttendanceSource = 'mobile' | 'manual' | 'admin' | 'biometric';

export interface AttendanceRecord {
  id: string;
  organization_id: string;
  worker_id: string;
  farm_id: string | null;
  geofence_id: string | null;
  type: AttendanceType;
  occurred_at: string;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  distance_m: number | null;
  within_geofence: boolean | null;
  source: AttendanceSource;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  worker?: { id: string; first_name: string; last_name: string; cin?: string | null };
  farm?: { id: string; name: string } | null;
}

export interface CreateAttendanceInput {
  worker_id: string;
  farm_id?: string;
  type: AttendanceType;
  occurred_at?: string;
  lat?: number;
  lng?: number;
  accuracy_m?: number;
  source?: AttendanceSource;
  notes?: string;
}

export interface AttendanceFilters {
  worker_id?: string;
  farm_id?: string;
  type?: AttendanceType;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface FarmGeofence {
  id: string;
  organization_id: string;
  farm_id: string | null;
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsertGeofenceInput {
  farm_id?: string;
  name: string;
  lat: number;
  lng: number;
  radius_m?: number;
  is_active?: boolean;
}

export interface AttendanceDailySummary {
  date: string;
  first_check_in: string | null;
  last_check_out: string | null;
  hours_worked: number;
  pings: number;
  ins: number;
  outs: number;
}

export const attendanceApi = {
  list: (filters: AttendanceFilters, organizationId: string) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    return apiClient.get<PaginatedResponse<AttendanceRecord>>(
      `${BASE}?${qs.toString()}`,
      {},
      organizationId,
    );
  },
  create: (data: CreateAttendanceInput, organizationId: string) =>
    apiClient.post<AttendanceRecord>(BASE, data, {}, organizationId),
  delete: (id: string, organizationId: string) =>
    apiClient.delete<void>(`${BASE}/${id}`, {}, organizationId),
  summary: (workerId: string, from: string, to: string, organizationId: string) =>
    apiClient.get<AttendanceDailySummary[]>(
      `${BASE}/summary/${workerId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      {},
      organizationId,
    ),

  // Geofences
  listGeofences: (organizationId: string, farmId?: string) =>
    apiClient.get<FarmGeofence[]>(
      `${BASE}/geofences${farmId ? `?farm_id=${farmId}` : ''}`,
      {},
      organizationId,
    ),
  createGeofence: (data: UpsertGeofenceInput, organizationId: string) =>
    apiClient.post<FarmGeofence>(`${BASE}/geofences`, data, {}, organizationId),
  updateGeofence: (
    id: string,
    data: Partial<UpsertGeofenceInput>,
    organizationId: string,
  ) =>
    apiClient.patch<FarmGeofence>(
      `${BASE}/geofences/${id}`,
      data,
      {},
      organizationId,
    ),
  deleteGeofence: (id: string, organizationId: string) =>
    apiClient.delete<void>(`${BASE}/geofences/${id}`, {}, organizationId),
};
