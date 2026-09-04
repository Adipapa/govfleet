import type { AlertEvent, Vehicle } from '../types/fleet';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'qts_govfleet_access_token';

export type ApiUser = {
  id: string; username: string; email: string; fullName: string;
  agencyId: string | null; departmentId: string | null; driverId: string | null;
  roles: string[]; permissions: string[];
};

export type VehicleApiRow = {
  id: string; registration_number: string; asset_number: string | null; make: string | null;
  model: string | null; model_year: number | null; vehicle_type: string | null; fuel_type: string | null;
  tank_capacity_litres: number | null; odometer_km: number; status: string; agency_id: string;
  agency_name: string; department_id: string | null; department_name: string | null;
};

export type VehicleListResponse = {
  data: VehicleApiRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export type AlertListResponse = {
  data: AlertEvent[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export type DriverApiRow = {
  id: string; employee_number: string | null; full_name: string; phone: string | null;
  licence_number: string | null; licence_expiry: string | null; active: boolean;
};

export type DriverAssignment = {
  id: string; vehicle_id: string; driver_id: string; starts_at: string; ends_at: string | null;
  assigned_by: string | null; started: boolean; active: boolean;
  employee_number: string | null; full_name: string; phone: string | null;
  licence_number: string | null; licence_expiry: string | null;
};

export type DriverListResponse = { data: DriverApiRow[] };
export type DriverAssignmentResponse = { data: DriverAssignment[] };

export function getAccessToken(): string | null { return sessionStorage.getItem(TOKEN_KEY); }
export function setAccessToken(token: string): void { sessionStorage.setItem(TOKEN_KEY, token); }
export function clearAccessToken(): void { sessionStorage.removeItem(TOKEN_KEY); }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401) clearAccessToken();
  if (!response.ok) throw new Error((await response.text()) || `API request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const result = await request<{ token: string; expiresAt: string; user: ApiUser }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ username, password }),
  });
  setAccessToken(result.token);
  return result;
}

export async function getCurrentUser(): Promise<ApiUser> { return (await request<{ user: ApiUser }>('/auth/me')).user; }

export async function logout(): Promise<void> {
  try { await request<void>('/auth/logout', { method: 'POST' }); } finally { clearAccessToken(); }
}

export async function getVehicles(params: { page?: number; limit?: number; search?: string; status?: string } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  return request<VehicleListResponse>(`/vehicles?${query.toString()}`);
}

export async function getLatestTelemetry() {
  return request<{ data: Array<Record<string, unknown>> }>('/telemetry/latest');
}

export async function getAlerts(params: { page?: number; limit?: number; severity?: string; acknowledged?: boolean; vehicleId?: string } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.severity) query.set('severity', params.severity);
  if (params.acknowledged !== undefined) query.set('acknowledged', String(params.acknowledged));
  if (params.vehicleId) query.set('vehicleId', params.vehicleId);
  return request<AlertListResponse>(`/alerts?${query.toString()}`);
}

export async function getAlertSummary() {
  return request<{ total: number; unacknowledged: number; critical: number; high: number; medium: number; low: number }>('/alerts/summary');
}

export async function acknowledgeAlert(id: string) {
  return request(`/alerts/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' });
}

export async function getDrivers(search = '') {
  const query = new URLSearchParams();
  if (search.trim()) query.set('search', search.trim());
  return request<DriverListResponse>(`/drivers${query.toString() ? `?${query.toString()}` : ''}`);
}

export async function getVehicleDriverAssignments(vehicleId: string) {
  return request<DriverAssignmentResponse>(`/assignments/vehicles/${encodeURIComponent(vehicleId)}`);
}

export async function assignDriverToVehicle(vehicleId: string, driverId: string, startsAt?: string, endsAt?: string) {
  return request<{ data: DriverAssignment }>(`/assignments/vehicles/${encodeURIComponent(vehicleId)}/driver`, {
    method: 'POST', body: JSON.stringify({ driverId, ...(startsAt ? { startsAt } : {}), ...(endsAt ? { endsAt } : {}) }),
  });
}

export async function endDriverVehicleAssignment(assignmentId: string, endsAt?: string) {
  return request<{ data: DriverAssignment }>(`/assignments/${encodeURIComponent(assignmentId)}/end`, {
    method: 'POST', body: JSON.stringify(endsAt ? { endsAt } : {}),
  });
}

export function mapVehicle(row: VehicleApiRow, telemetry?: Record<string, unknown>): Vehicle {
  const fuelType = row.fuel_type === 'Petrol' ? 'Petrol' : 'Diesel';
  const status = ['moving','stopped','idling','parked','offline','no_gps','emergency','unauthorized'].includes(row.status)
    ? row.status as Vehicle['status'] : 'offline';
  const department = row.department_name || row.agency_name;
  const lat = Number(telemetry?.latitude ?? 0); const lng = Number(telemetry?.longitude ?? 0);
  const speed = Number(telemetry?.speed_kmh ?? 0); const ignition = Boolean(telemetry?.ignition ?? false);
  const tank = Number(row.tank_capacity_litres ?? 0); const fuel = Number(telemetry?.fuel_litres ?? 0);
  return {
    id: row.id, regNumber: row.registration_number, assetNumber: row.asset_number || '', make: row.make || '', model: row.model || '',
    year: row.model_year || new Date().getFullYear(), type: (row.vehicle_type || 'Utility Pickup') as Vehicle['type'],
    department: department as Vehicle['department'],
    assignedDriver: { id: '', name: 'Unassigned', phone: '', licenseNumber: '', safetyScore: 100 },
    deviceId: '', simNumber: '', fuelType, tankCapacityLiters: tank, currentFuelLiters: fuel,
    currentFuelPercentage: tank > 0 ? Math.round((fuel / tank) * 100) : 0, mileageKm: Number(telemetry?.odometer_km ?? row.odometer_km ?? 0),
    status, currentLocation: { lat, lng, address: '' }, speedKmh: speed, heading: Number(telemetry?.heading ?? 0), ignition,
    gpsStatus: telemetry ? 'Connected' : 'Offline', satellites: Number(telemetry?.satellites ?? 0), gsmSignal: Number(telemetry?.gsm_signal ?? 0),
    lastCommunication: String(telemetry?.recorded_at ?? ''), batteryVoltage: Number(telemetry?.battery_voltage ?? 0),
    insuranceExpiry: '', registrationExpiry: '', nextServiceKm: 0, lastServiceDate: '', dailyKm: 0, workingHoursToday: 0,
    idleHoursToday: 0, afterHoursUsageDetected: false,
  };
}

export type FleetEvent = { type: 'connected' | 'telemetry.updated' | 'alert.created' | 'vehicle.updated'; occurredAt: string; payload: Record<string, unknown> };

export function subscribeToFleetEvents(onEvent: (event: FleetEvent) => void, onError?: (error: Error) => void) {
  const controller = new AbortController(); const token = getAccessToken();
  if (!token) { onError?.(new Error('Authentication required for realtime events')); return () => controller.abort(); }
  void (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime/events`, { headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(`Realtime connection failed (${response.status})`);
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (!controller.signal.aborted) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const frames = buffer.split('\n\n'); buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const data = frame.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
          if (!data) continue; try { onEvent(JSON.parse(data) as FleetEvent); } catch { /* ignore malformed frame */ }
        }
      }
    } catch (error) { if (!controller.signal.aborted) onError?.(error instanceof Error ? error : new Error(String(error))); }
  })();
  return () => controller.abort();
}
