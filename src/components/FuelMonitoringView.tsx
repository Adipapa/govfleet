import React, { useEffect, useMemo, useState } from 'react';
import { Fuel, AlertTriangle, CheckCircle2, TrendingDown, ShieldAlert, RefreshCw } from 'lucide-react';
import type { Vehicle } from '../types/fleet';
import { getFuelSummary, getVehicleFuel, type FuelAnomaly, type FuelTransaction } from '../services/api';

interface FuelMonitoringViewProps { vehicles: Vehicle[]; onSelectVehicle: (vehicleId: string) => void; }

const n=(v:number|string|null|undefined)=>Number(v??0);
const money=(v:number|string|null|undefined)=>`GMD ${n(v).toLocaleString(undefined,{maximumFractionDigits:2})}`;
const date=(v:string)=>new Date(v).toLocaleString();

export const FuelMonitoringView:React.FC<FuelMonitoringViewProps>=({vehicles,onSelectVehicle})=>{
  const [transactions,setTransactions]=useState<FuelTransaction[]>([]);
  const [anomalies,setAnomalies]=useState<(FuelAnomaly & {registration_number?:string})[]>([]);
  const [summary,setSummary]=useState({transactions:0,litres:0,cost:0,vehicles:0});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [filter,setFilter]=useState<'all'|'anomalies'|'refuels'>('all');

  const load=async()=>{setLoading(true);setError(null);try{const s=await getFuelSummary();setSummary({transactions:n(s.data.transactions),litres:n(s.data.litres),cost:n(s.data.cost),vehicles:n(s.data.vehicles)});const results=await Promise.all(vehicles.slice(0,100).map(async v=>{try{return await getVehicleFuel(v.id);}catch{return null;}}));setTransactions(results.flatMap(r=>r?.data.transactions??[]).sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at)));setAnomalies(results.flatMap(r=>r?.data.anomalies??[]).sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at)));}catch(e){setError(e instanceof Error?e.message:'Unable to load fuel data');}finally{setLoading(false);}};
  useEffect(()=>{void load();},[vehicles]);

  const visibleTransactions=useMemo(()=>filter==='anomalies'?[]:transactions, [filter,transactions]);
  const anomalyCount=anomalies.length;
  const theftLitres=anomalies.filter(a=>a.anomaly_type==='sudden_drop').reduce((x,a)=>x+Math.abs(n(a.litres_delta)),0);

  return <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
      <div><div className="flex items-center gap-2"><div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-400"><Fuel className="w-5 h-5"/></div><h1 className="text-xl font-bold text-white">Fuel Monitoring & Loss Intelligence</h1></div><p className="text-xs sm:text-sm text-slate-400 mt-1">Evidence-based fuel transactions, sensor anomalies and fleet expenditure. No simulated fuel events are shown.</p></div>
      <button onClick={()=>void load()} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold hover:bg-slate-800"><RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`}/>Refresh</button>
    </div>
    {error&&<div className="p-3 rounded-lg border border-red-800 bg-red-950/40 text-red-300 text-sm">{error}</div>}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl"><div className="text-xs text-slate-400">Fuel Anomalies</div><div className="text-2xl font-mono font-bold text-red-400 mt-2">{anomalyCount}</div><div className="text-[11px] text-slate-500 mt-1">{theftLitres.toFixed(1)} L sudden-drop events</div></div>
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl"><div className="text-xs text-slate-400">Recorded Refuels</div><div className="text-2xl font-mono font-bold text-emerald-300 mt-2">{summary.transactions}</div><div className="text-[11px] text-slate-500 mt-1">{summary.litres.toFixed(1)} L recorded</div></div>
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl"><div className="text-xs text-slate-400">Recorded Fuel Spend</div><div className="text-2xl font-mono font-bold text-white mt-2">{money(summary.cost)}</div><div className="text-[11px] text-slate-500 mt-1">Current reporting period</div></div>
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl"><div className="text-xs text-slate-400">Vehicles With Fuel Records</div><div className="text-2xl font-mono font-bold text-cyan-300 mt-2">{summary.vehicles}</div><div className="text-[11px] text-slate-500 mt-1">From audited transactions</div></div>
    </div>
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5"><div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4"><div><h2 className="text-sm font-bold">Live Vehicle Fuel Levels</h2><p className="text-xs text-slate-400">Current telemetry values; these are not fuel purchase records.</p></div><span className="text-xs font-mono text-slate-500">{vehicles.length} vehicles</span></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{vehicles.map(v=><button key={v.id} onClick={()=>onSelectVehicle(v.id)} className="text-left p-3.5 bg-slate-950/70 hover:bg-slate-800/60 rounded-xl border border-slate-800"><div className="flex justify-between"><div><span className="font-mono font-bold text-xs">{v.regNumber}</span><span className="text-[11px] text-slate-400 block">{v.department}</span></div><span className="text-xs font-mono">{v.currentFuelPercentage}%</span></div><div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3"><div className="h-full bg-emerald-500" style={{width:`${Math.min(100,Math.max(0,v.currentFuelPercentage))}%`}}/></div><div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2"><span>{v.currentFuelLiters.toFixed(1)} L</span><span>{v.fuelType}</span></div></button>)}</div></div>
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5"><div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4"><div><h2 className="text-sm font-bold flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-400"/>Fuel Audit Ledger</h2><p className="text-xs text-slate-400">Recorded refuels and automatically generated fuel anomalies.</p></div><div className="flex gap-1">{(['all','refuels','anomalies'] as const).map(x=><button key={x} onClick={()=>setFilter(x)} className={`px-2.5 py-1 rounded text-xs capitalize ${filter===x?'bg-amber-500 text-slate-950 font-bold':'bg-slate-800 text-slate-300'}`}>{x}</button>)}</div></div>
      {filter!=='anomalies'&&<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-400 uppercase text-[10px] border-b border-slate-800"><tr><th className="py-2 px-3">Vehicle</th><th className="py-2 px-3">Event</th><th className="py-2 px-3">Quantity</th><th className="py-2 px-3">Price/L</th><th className="py-2 px-3">Cost</th><th className="py-2 px-3">Station</th><th className="py-2 px-3">Time</th></tr></thead><tbody className="divide-y divide-slate-800/60">{visibleTransactions.map(t=>{const v=vehicles.find(x=>x.id===t.vehicle_id);return <tr key={t.id}><td className="py-2 px-3 font-mono font-bold">{v?.regNumber||t.vehicle_id}</td><td className="py-2 px-3 text-emerald-300"><CheckCircle2 className="w-3 h-3 inline mr-1"/>Recorded Refuel</td><td className="py-2 px-3 font-mono">{n(t.quantity_litres).toFixed(2)} L</td><td className="py-2 px-3 font-mono">{t.price_per_litre==null?'—':money(t.price_per_litre)}</td><td className="py-2 px-3 font-mono">{money(t.total_cost)}</td><td className="py-2 px-3 text-slate-400">{t.station_name||'—'}</td><td className="py-2 px-3 text-slate-500">{date(t.occurred_at)}</td></tr>})}</tbody></table></div>}
      {filter!=='refuels'&&<div className="mt-4 space-y-2">{anomalies.length===0?<div className="p-6 text-center text-slate-500 text-sm">No fuel anomalies recorded.</div>:anomalies.map(a=><div key={a.id} className="p-3 bg-slate-950/70 border border-red-900/60 rounded-lg flex items-center justify-between"><div><div className="text-xs font-semibold text-red-300"><AlertTriangle className="w-3.5 h-3.5 inline mr-1"/>{a.anomaly_type.replace('_',' ')}</div><div className="text-[11px] text-slate-500 mt-1">{date(a.occurred_at)} · {n(a.litres_delta).toFixed(2)} L delta</div></div><span className="text-[10px] uppercase font-mono text-red-400">{a.severity}</span></div>)}</div>}
    </div>
  </div>;
};
