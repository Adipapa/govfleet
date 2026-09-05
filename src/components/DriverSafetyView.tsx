import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Search, ShieldAlert, UserCheck } from 'lucide-react';
import { getDriverSafety, type DriverSafetyRow } from '../services/api';

interface DriverSafetyViewProps { onSelectVehicle: (vehicleId:string)=>void; }

export const DriverSafetyView: React.FC<DriverSafetyViewProps> = ({onSelectVehicle}) => {
  const [rows,setRows]=useState<DriverSafetyRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const [grade,setGrade]=useState('all');

  const load=async()=>{setLoading(true);setError('');try{const result=await getDriverSafety();setRows(Array.isArray(result.data)?result.data:[])}catch(e){setError(e instanceof Error?e.message:'Unable to load driver safety data')}finally{setLoading(false)}};
  useEffect(()=>{void load()},[]);

  const filtered=useMemo(()=>rows.filter(r=>{const q=search.toLowerCase();const match=!q||r.full_name.toLowerCase().includes(q)||(r.registration_number||'').toLowerCase().includes(q)||(r.employee_number||'').toLowerCase().includes(q);return match&&(grade==='all'||r.grade===grade)}),[rows,search,grade]);
  const assigned=rows.filter(r=>r.vehicle_id).length;
  const avg=rows.length?Math.round(rows.reduce((s,r)=>s+r.safety_score,0)/rows.length):null;
  const events=rows.reduce((s,r)=>s+r.event_count,0);

  return <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 text-slate-900 space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <div><div className="flex items-center gap-2"><div className="p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700"><UserCheck className="w-5 h-5"/></div><h1 className="text-xl font-bold text-slate-900">Driver Safety</h1></div><p className="text-sm text-slate-500 mt-1">Safety performance calculated from recorded driver events during the last 30 days.</p></div>
      <button onClick={()=>void load()} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">Refresh</button>
    </div>

    {error&&<div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><div className="font-semibold">Unable to load driver safety</div><div className="mt-1">{error}</div></div>}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[['Drivers',rows.length],['Assigned',assigned],['Average score',avg===null?'—':`${avg}/100`],['Recorded events',events]].map(([label,value])=><div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="text-2xl font-bold text-slate-900 mt-1">{value}</div></div>)}
    </div>

    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search driver, employee number or vehicle" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-cyan-500"/></div>
      <select value={grade} onChange={e=>setGrade(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"><option value="all">All grades</option><option value="A">Grade A</option><option value="B">Grade B</option><option value="C">Grade C</option><option value="warning">Warning</option></select>
    </div>

    {loading?<div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">Loading recorded driver safety data…</div>:filtered.length===0?<div className="bg-white border border-slate-200 rounded-xl p-12 text-center"><ShieldAlert className="w-8 h-8 mx-auto text-slate-300"/><div className="font-semibold text-slate-700 mt-3">No recorded driver safety data</div><p className="text-sm text-slate-500 mt-1">Driver safety scores appear after drivers are assigned and telemetry events are recorded.</p></div>:<div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>{['Driver','Vehicle','Safety score','Events','Event breakdown','Action'].map(h=><th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(r=><tr key={`${r.driver_id}-${r.vehicle_id||'unassigned'}`} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="font-semibold text-slate-900">{r.full_name}</div><div className="text-xs text-slate-500">{r.employee_number||'No employee number'}</div></td><td className="px-4 py-3">{r.vehicle_id?<button className="font-medium text-cyan-700 hover:underline" onClick={()=>onSelectVehicle(r.vehicle_id!)}>{r.registration_number}</button>:<span className="text-slate-400">Unassigned</span>}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-semibold ${r.grade==='A'?'bg-emerald-50 text-emerald-700':r.grade==='B'?'bg-cyan-50 text-cyan-700':r.grade==='C'?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'}`}>{r.grade==='A'?<CheckCircle className="w-3.5 h-3.5"/>:<AlertTriangle className="w-3.5 h-3.5"/>}{r.safety_score}/100 · {r.grade}</span></td><td className="px-4 py-3 font-semibold">{r.event_count}</td><td className="px-4 py-3 text-xs text-slate-600">Overspeed {r.overspeed_count} · Braking {r.harsh_braking_count} · Accel. {r.harsh_acceleration_count} · After-hours {r.after_hours_count}</td><td className="px-4 py-3">{r.vehicle_id&&<button onClick={()=>onSelectVehicle(r.vehicle_id!)} className="text-cyan-700 font-medium hover:underline">Inspect vehicle →</button>}</td></tr>)}</tbody></table></div></div>}
  </div>;
};
