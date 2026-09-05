const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'qts_govfleet_access_token';

export type DeviceApiRow = {
  id: string;
  device_identifier: string;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  protocol: string | null;
  firmware_version: string | null;
  status: string;
  last_heartbeat_at: string | null;
  vehicle_id: string | null;
  registration_number: string | null;
  agency_id?: string | null;
  department_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) throw new Error((await response.text()) || `API request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getDevices() {
  return request<{ data: DeviceApiRow[] }>('/devices');
}

export function createDevice(input: {
  deviceIdentifier: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  protocol?: string;
  firmwareVersion?: string;
}) {
  return request<{ data: DeviceApiRow }>('/devices', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function assignDevice(deviceId: string, vehicleId: string) {
  return request<{ data: Record<string, unknown> }>(`/devices/${encodeURIComponent(deviceId)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ vehicleId }),
  });
}

export function rotateDeviceCredential(deviceId: string) {
  return request<{ token: string; warning: string }>(`/devices/${encodeURIComponent(deviceId)}/credentials`, {
    method: 'POST',
  });
}
