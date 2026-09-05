import { getAccessToken } from './api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
export type CostSummary = { vehicles:number; fuel_litres:number; fuel_cost:number; maintenance_cost:number; total_cost:number; distance_km:number; cost_per_km:number; fuel_cost_per_km:number; maintenance_cost_per_km:number; open_fuel_anomalies:number; from:string|null; to:string|null };
export type VehicleCost = { id:string; registration_number:string; asset_number:string|null; fuel_cost:number|string; fuel_litres:number|string; maintenance_cost:number|string; total_cost:number|string; distance_km:number|string; cost_per_km:number|string; fuel_cost_per_km:number|string; open_fuel_anomalies:number|string };
async function request<T>(path:string):Promise<T>{const token=getAccessToken();const response=await fetch(`${API_BASE_URL}${path}`,{headers:{Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}});if(!response.ok)throw new Error((await response.text())||`Request failed (${response.status})`);return response.json() as Promise<T>;}
export async function getCostSummary(params:{from?:string;to?:string}={}){const q=new URLSearchParams();if(params.from)q.set('from',params.from);if(params.to)q.set('to',params.to);return request<{data:CostSummary}>(`/cost/summary?${q}`);}
export async function getVehicleCosts(params:{from?:string;to?:string}={}){const q=new URLSearchParams();if(params.from)q.set('from',params.from);if(params.to)q.set('to',params.to);return request<{data:VehicleCost[]}>(`/cost/vehicles?${q}`);}
