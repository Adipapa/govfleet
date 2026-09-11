import type { AlertEvent, Vehicle } from '../types/fleet';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'qts_govfleet_access_token';

export type ApiUser = {
  id: string; username: string; email: string; fullName: string;
  agencyId: string | null; departmentId: string | null; driverId: string | null;
  roles: string[]; permissions: string[];
};

export type VehicleApiRow = {
  id: string; registration_number: string; asset_number: string | null; vin: string | null; engine_number: string | null;
  make: string | null; model: string | null; model_year: number | null; vehicle_type: string | null; body_type: string | null;
  color: string | null; transmission: string | null; seats: number | null; fuel_type: string | null;
  tank_capacity_litres: number | null; odometer_km: number; status: string; active: boolean; agency_id: string; agency_name: string;
  department_id: string | null; department_name: string | null; acquisition_date: string | null; acquisition_method: string | null;
  purchase_value: number | null; base_location: string | null; cost_center: string | null; asset_category: string | null;
  registration_expiry: string | null; insurance_expiry: string | null; roadworthiness_expiry: string | null; permit_expiry: string | null;
  next_service_date: string | null; next_service_odometer_km: number | null; last_service_date: string | null;
  last_service_odometer_km: number | null; notes: string | null; disposal_date: string | null; disposal_reason: string | null;
  created_at: string; updated_at: string;
};
export type VehicleListResponse = { data: VehicleApiRow[]; pagination: { page: number; limit: number; total: number; pages: number } };
export type VehicleDetail = VehicleApiRow & {
  current_driver: Record<string, unknown> | null; current_device: Record<string, unknown> | null;
  latest_telemetry: Record<string, unknown> | null; trip_count: number; open_maintenance_count: number;
  open_alert_count: number; month_distance_km: number; recent_maintenance: Array<Record<string, unknown>> | null;
  assignment_history: Array<Record<string, unknown>>;
};
export type AlertListResponse = { data: AlertEvent[]; pagination: { page: number; limit: number; total: number; pages: number } };
export type DeviceApiRow = { id: string; device_identifier: string; serial_number: string | null; manufacturer: string | null; model: string | null; protocol: string | null; firmware_version: string | null; status: string; last_heartbeat_at: string | null; vehicle_id: string | null; registration_number: string | null; agency_id: string | null; department_id: string | null };
export type DeviceCreateInput = { deviceIdentifier: string; serialNumber?: string; manufacturer?: string; model?: string; protocol?: string; firmwareVersion?: string };
export type DeviceCredentialResponse = { token: string; warning: string };

export function getAccessToken(): string | null { return sessionStorage.getItem(TOKEN_KEY); }
export function setAccessToken(token: string): void { sessionStorage.setItem(TOKEN_KEY, token); }
export function clearAccessToken(): void { sessionStorage.removeItem(TOKEN_KEY); }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers); headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getAccessToken(); if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401) clearAccessToken();
  if (!response.ok) throw new Error((await response.text()) || `API request failed (${response.status})`);
  if (response.status === 204) return undefined as T; return response.json() as Promise<T>;
}

export async function login(username: string, password: string) { const result = await request<{ token: string; expiresAt: string; user: ApiUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); setAccessToken(result.token); return result; }
export async function getCurrentUser(): Promise<ApiUser> { return (await request<{ user: ApiUser }>('/auth/me')).user; }
export async function logout(): Promise<void> { try { await request<void>('/auth/logout', { method: 'POST' }); } finally { clearAccessToken(); } }
export async function getVehicles(params: { page?: number; limit?: number; search?: string; status?: string; agencyId?: string; departmentId?: string; vehicleType?: string; fuelType?: string; includeInactive?: boolean } = {}) { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); }); return request<VehicleListResponse>(`/vehicles?${query.toString()}`); }
export async function getVehicle(id: string) { return (await request<{ data: VehicleDetail }>(`/vehicles/${encodeURIComponent(id)}`)).data; }
export type VehicleWriteInput = Partial<{ agencyId: string; departmentId: string; registrationNumber: string; assetNumber: string; vin: string; engineNumber: string; make: string; model: string; modelYear: number; vehicleType: string; bodyType: string; color: string; transmission: string; seats: number; fuelType: string; tankCapacityLitres: number; odometerKm: number; acquisitionDate: string; acquisitionMethod: string; purchaseValue: number; baseLocation: string; costCenter: string; assetCategory: string; registrationExpiry: string; insuranceExpiry: string; roadworthinessExpiry: string; permitExpiry: string; nextServiceDate: string; nextServiceOdometerKm: number; lastServiceDate: string; lastServiceOdometerKm: number; notes: string; disposalDate: string; disposalReason: string; status: string; active: boolean }>;
export async function createVehicle(input: VehicleWriteInput) { return (await request<{ data: VehicleApiRow }>('/vehicles', { method: 'POST', body: JSON.stringify(input) })).data; }
export async function updateVehicle(id: string, input: VehicleWriteInput) { return (await request<{ data: VehicleApiRow }>(`/vehicles/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) })).data; }
export async function getDevices() { return request<{ data: DeviceApiRow[] }>('/devices'); }
export async function registerDevice(input: DeviceCreateInput) { return request<{ data: DeviceApiRow }>('/devices', { method: 'POST', body: JSON.stringify(input) }); }
export async function assignDevice(deviceId: string, vehicleId: string) { return request<{ data: Record<string, unknown> }>(`/devices/${encodeURIComponent(deviceId)}/assign`, { method: 'POST', body: JSON.stringify({ vehicleId }) }); }
export async function generateDeviceCredential(deviceId: string) { return request<DeviceCredentialResponse>(`/devices/${encodeURIComponent(deviceId)}/credentials`, { method: 'POST' }); }
export async function getLatestTelemetry() { return (await request<{ data: Array<Record<string, unknown>> }>('/telemetry/latest')).data; }
export async function getAlerts(params: { page?: number; limit?: number; severity?: string; acknowledged?: boolean; vehicleId?: string } = {}) { const query = new URLSearchParams(); if (params.page) query.set('page', String(params.page)); if (params.limit) query.set('limit', String(params.limit)); if (params.severity) query.set('severity', params.severity); if (params.acknowledged !== undefined) query.set('acknowledged', String(params.acknowledged)); if (params.vehicleId) query.set('vehicleId', params.vehicleId); return request<AlertListResponse>(`/alerts?${query.toString()}`); }
export async function getAlertSummary() { return request<{ total: number; unacknowledged: number; critical: number; high: number; medium: number; low: number }>('/alerts/summary'); }
export async function acknowledgeAlert(id: string) { return request(`/alerts/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' }); }

export function mapVehicle(row: VehicleApiRow, telemetry?: Record<string, unknown>): Vehicle {
  const fuelType = row.fuel_type === 'Petrol' ? 'Petrol' : 'Diesel';
  const status = ['moving','stopped','idling','parked','offline','no_gps','emergency','unauthorized'].includes(row.status) ? row.status as Vehicle['status'] : 'offline';
  const department = row.department_name || row.agency_name;
  const currentTelemetry = telemetry;
  const lat = Number(currentTelemetry?.latitude ?? 0); const lng = Number(currentTelemetry?.longitude ?? 0);
  const tank = Number(row.tank_capacity_litres ?? 0); const fuel = Number(currentTelemetry?.fuel_litres ?? 0);
  return {
    id: row.id, regNumber: row.registration_number, assetNumber: row.asset_number || '', make: row.make || '', model: row.model || '', year: row.model_year || 0,
    type: (row.vehicle_type || 'Other') as Vehicle['type'], department: department as Vehicle['department'],
    assignedDriver: { id: '', name: 'Unassigned', phone: '', licenseNumber: '', safetyScore: 0 }, deviceId: '', simNumber: '', fuelType,
    tankCapacityLiters: tank, currentFuelLiters: fuel, currentFuelPercentage: tank > 0 && currentTelemetry?.fuel_litres != null ? Math.round((fuel / tank) * 100) : 0,
    mileageKm: Number(currentTelemetry?.odometer_km ?? row.odometer_km ?? 0), status,
    currentLocation: { lat, lng, address: '' }, speedKmh: Number(currentTelemetry?.speed_kmh ?? 0), heading: Number(currentTelemetry?.heading ?? 0),
    ignition: Boolean(currentTelemetry?.ignition ?? false), gpsStatus: currentTelemetry ? 'Connected' : 'Offline', satellites: Number(currentTelemetry?.satellites ?? 0),
    gsmSignal: Number(currentTelemetry?.gsm_signal ?? 0), lastCommunication: String(currentTelemetry?.recorded_at ?? ''), batteryVoltage: Number(currentTelemetry?.battery_voltage ?? 0),
    insuranceExpiry: row.insurance_expiry || '', registrationExpiry: row.registration_expiry || '', nextServiceKm: Number(row.next_service_odometer_km ?? 0),
    lastServiceDate: row.last_service_date || '', dailyKm: 0, workingHoursToday: 0, idleHoursToday: 0, afterHoursUsageDetected: false,
  };
}

export type FleetEvent = { type: 'connected' | 'telemetry.updated' | 'alert.created' | 'vehicle.updated'; occurredAt: string; payload: Record<string, unknown> };
export function subscribeToFleetEvents(onEvent: (event: FleetEvent) => void, onError?: (error: Error) => void) { const controller = new AbortController(); const token = getAccessToken(); if (!token) { onError?.(new Error('Authentication required for realtime events')); return () => controller.abort(); } void (async () => { try { const response = await fetch(`${API_BASE_URL}/realtime/events`, { headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` }, signal: controller.signal }); if (!response.ok || !response.body) throw new Error(`Realtime connection failed (${response.status})`); const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; while (!controller.signal.aborted) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const frames = buffer.split('\n\n'); buffer = frames.pop() ?? ''; for (const frame of frames) { const data = frame.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n'); if (!data) continue; try { onEvent(JSON.parse(data) as FleetEvent); } catch { /* ignore malformed frame */ } } } } catch (error) { if (!controller.signal.aborted) onError?.(error instanceof Error ? error : new Error(String(error))); } })(); return () => controller.abort(); }
