import { getAccessToken } from './api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

export type AuditApiRow = {
  id: string;
  user_id: string | null;
  username: string | null;
  full_name: string | null;
  session_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  result: string;
  ip_address: string | null;
  user_agent: string | null;
  details: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function getAuditLogs(params: { limit?: number; action?: string; resourceType?: string; result?: string } = {}) {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  if (params.action) q.set('action', params.action);
  if (params.resourceType) q.set('resourceType', params.resourceType);
  if (params.result) q.set('result', params.result);
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/audit?${q}`, {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
  return response.json() as Promise<{ data: AuditApiRow[] }>;
}
