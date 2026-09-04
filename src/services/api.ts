import type { AlertEvent, Vehicle } from '../types/fleet';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'qts_govfleet_access_token';

export type ApiUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  agencyId: string | null;
  departmentId: string | null;
  driverId: string | null;
  roles: string[];
  permissions: string[];
};

export type ApiVehicle = Vehicle & {
  agencyId?: string;
  departmentId?: string | null;
  deviceId?: string | null;
  driverId?: string | null;
};

export type VehicleListResponse = {
  data: ApiVehicle[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type AlertListResponse = {
  data: AlertEvent[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401) clearAccessToken();
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `API request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const result = await request<{ token: string; expiresAt: string; user: ApiUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setAccessToken(result.token);
  return result;
}

export async function getCurrentUser(): Promise<ApiUser> {
  const result = await request<{ user: ApiUser }>('/auth/me');
  return result.user;
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/auth/logout', { method: 'POST' });
  } finally {
    clearAccessToken();
  }
}

export async function getVehicles(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
} = {}): Promise<VehicleListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  return request<VehicleListResponse>(`/vehicles?${query.toString()}`);
}

export async function getLatestTelemetry(vehicleIds?: string[]) {
  const query = vehicleIds?.length ? `?vehicleIds=${encodeURIComponent(vehicleIds.join(','))}` : '';
  return request<{ data: Array<Record<string, unknown>> }>(`/telemetry/latest${query}`);
}

export async function getAlerts(params: {
  page?: number;
  pageSize?: number;
  severity?: string;
  acknowledged?: boolean;
  vehicleId?: string;
} = {}): Promise<AlertListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
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

export type FleetEvent = {
  type: 'connected' | 'telemetry.updated' | 'alert.created' | 'vehicle.updated';
  occurredAt: string;
  payload: Record<string, unknown>;
};

/**
 * Browser-safe SSE client using fetch so Authorization headers are supported.
 * Native EventSource cannot attach a Bearer token.
 */
export function subscribeToFleetEvents(onEvent: (event: FleetEvent) => void, onError?: (error: Error) => void) {
  const controller = new AbortController();
  const token = getAccessToken();
  if (!token) {
    onError?.(new Error('Authentication required for realtime events'));
    return () => controller.abort();
  }

  void (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/realtime/events`, {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error(`Realtime connection failed (${response.status})`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!controller.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const data = frame.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
          if (!data) continue;
          try {
            onEvent(JSON.parse(data) as FleetEvent);
          } catch {
            // Ignore malformed SSE frames rather than killing the live stream.
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return () => controller.abort();
}
