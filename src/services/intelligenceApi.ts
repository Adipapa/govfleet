import { getAccessToken } from './api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

export type ExecutiveKpi = {
  period: { from: string; to: string };
  fleet: { total: number; moving: number; offline: number; emergency: number };
  utilization: number;
  availability: number;
  safetyExposure: number;
  fuelIntegrity: { openAnomalies: number };
  maintenance: { overdue: number };
  operations: { trips: number; distanceKm: number; tripHours: number };
  definitions: Record<string, string>;
};

export type VehicleIntelligence = {
  id: string;
  registration_number: string;
  status: string;
  odometer_km: number | string;
  distance_km: number | string;
  fuel_cost: number | string;
  maintenance_cost: number | string;
  total_cost: number | string;
  cost_per_km: number | string;
  fuel_anomalies: number | string;
  driver_events: number | string;
  overdue_maintenance: number | string;
  intelligence_risk_score: number;
};

export type FleetRecommendation = {
  vehicleId: string;
  registrationNumber: string;
  priority: 'low' | 'medium' | 'high' | 'critical' | string;
  action: string;
  reason: string;
};

async function request<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getExecutiveKpi(params: { from?: string; to?: string } = {}) {
  const q = new URLSearchParams();
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  return request<{ data: ExecutiveKpi }>(`/intelligence/kpi?${q}`);
}

export async function getVehicleIntelligence() {
  return request<{ data: VehicleIntelligence[] }>('/intelligence/vehicles');
}

export async function getFleetRecommendations() {
  return request<{ data: FleetRecommendation[] }>('/intelligence/recommendations');
}
