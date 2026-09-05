const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'qts_govfleet_access_token';

export type GeofenceApiRow = { id:string; agency_id:string|null; department_id:string|null; name:string; category:string; restricted:boolean; alert_on_entry:boolean; alert_on_exit:boolean; speed_limit_kmh:number|string|null; center_lat:number|string; center_lng:number|string; radius_m:number; active:boolean; created_at:string; updated_at:string };

async function request<T>(path:string, init:RequestInit={}):Promise<T>{
  const headers=new Headers(init.headers); headers.set('Accept','application/json');
  if(init.body&&!headers.has('Content-Type')) headers.set('Content-Type','application/json');
  const token=sessionStorage.getItem(TOKEN_KEY); if(token) headers.set('Authorization',`Bearer ${token}`);
  const response=await fetch(`${API_BASE_URL}${path}`,{...init,headers});
  if(!response.ok) throw new Error((await response.text())||`API request failed (${response.status})`);
  if(response.status===204) return undefined as T;
  return response.json() as Promise<T>;
}

export const getGeofences=()=>request<{data:GeofenceApiRow[]}>('/geofences');
export const createGeofence=(input:Record<string,unknown>)=>request<{data:GeofenceApiRow}>('/geofences',{method:'POST',body:JSON.stringify(input)});
export const deleteGeofence=(id:string)=>request<void>(`/geofences/${encodeURIComponent(id)}`,{method:'DELETE'});
