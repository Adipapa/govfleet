import React, { useMemo, useState } from 'react';
import { Car, Search, Download, Plus, Eye, MapPin, Gauge, Fuel, ShieldCheck, Wrench, Wifi, AlertTriangle } from 'lucide-react';
import { Vehicle, VehicleStatus } from '../types/fleet';
import { createVehicle, VehicleWriteInput } from '../services/api';

interface FleetRegistryViewProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicleId: string) => void;
  onOpenDossier: (vehicle: Vehicle) => void;
  onNavigateToMap: (vehicleId: string) => void;
}

const statusLabel: Record<VehicleStatus, string> = { moving: 'Moving', stopped: 'Stopped', idling: 'Idling', parked: 'Parked', offline: 'Offline', no_gps: 'No GPS', emergency: 'Emergency', unauthorized: 'Unauthorized' };

export const FleetRegistryView: React.FC<FleetRegistryViewProps> = ({ vehicles = [], onSelectVehicle, onOpenDossier, onNavigateToMap }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Record<string, string>>({ registrationNumber: '', assetNumber: '', vin: '', engineNumber: '', make: '', model: '', modelYear: '', vehicleType: '', fuelType: '', tankCapacityLitres: '', odometerKm: '', baseLocation: '', color: '', transmission: '' });

  const agencies = useMemo(() => Array.from(new Set(vehicles.map((v: any) => v.agencyId).filter(Boolean))), [vehicles]);
  const filtered = useMemo(() => vehicles.filter(v => {
    const q = search.toLowerCase();
    const matchesSearch = !q || [v.regNumber, v.assetNumber, v.make, v.model, v.department, v.assignedDriver.name].some(x => String(x || '').toLowerCase().includes(q));
    return matchesSearch && (status === 'all' || v.status === status) && (type === 'all' || v.type === type);
  }), [vehicles, search, status, type]);

  const active = vehicles.filter(v => ['moving','stopped','idling','parked'].includes(v.status)).length;
  const offline = vehicles.filter(v => ['offline','no_gps'].includes(v.status)).length;
  const emergency = vehicles.filter(v => v.status === 'emergency').length;
  const connected = vehicles.filter(v => v.gpsStatus === 'Connected').length;

  const exportCSV = () => {
    const headers = ['Registration','Asset Number','VIN','Make','Model','Year','Type','Agency/Department','Driver','Status','Odometer KM','Fuel %','Insurance Expiry','Registration Expiry','Next Service KM'];
    const rows = filtered.map(v => [v.regNumber,v.assetNumber,'',v.make,v.model,v.year,v.type,v.department,v.assignedDriver.name,v.status,v.mileageKm,v.currentFuelPercentage,v.insuranceExpiry,v.registrationExpiry,v.nextServiceKm]);
    const csv = [headers, ...rows].map(r => r.map(x => `"${String(x ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `govfleet-vehicle-registry-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const agencyId = (vehicles[0] as any)?.agencyId;
    if (!agencyId) { setError('No agency is available in the current fleet scope.'); return; }
    setSaving(true);
    try {
      const payload: VehicleWriteInput = { agencyId, registrationNumber: form.registrationNumber.trim(), assetNumber: form.assetNumber || undefined, vin: form.vin || undefined, engineNumber: form.engineNumber || undefined, make: form.make || undefined, model: form.model || undefined, modelYear: form.modelYear ? Number(form.modelYear) : undefined, vehicleType: form.vehicleType || undefined, fuelType: form.fuelType || undefined, tankCapacityLitres: form.tankCapacityLitres ? Number(form.tankCapacityLitres) : undefined, odometerKm: form.odometerKm ? Number(form.odometerKm) : 0, baseLocation: form.baseLocation || undefined, color: form.color || undefined, transmission: form.transmission || undefined };
      await createVehicle(payload); setShowCreate(false); window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create vehicle'); } finally { setSaving(false); }
  };

  return <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
      <div><div className="flex items-center gap-2"><Car className="w-6 h-6 text-cyan-400"/><h2 className="text-xl font-bold text-white">Vehicle Registry</h2></div><p className="text-xs text-slate-400 mt-1">Government fleet master records, operational status, compliance and telematics readiness.</p></div>
      <div className="flex gap-2"><button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"><Plus className="w-4 h-4"/>Add Vehicle</button><button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs"><Download className="w-4 h-4"/>Export</button></div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {[['Total', vehicles.length, 'text-white'],['Operational', active, 'text-emerald-400'],['Offline / No GPS', offline, 'text-amber-400'],['Emergency', emergency, 'text-red-400'],['GPS Connected', connected, 'text-cyan-400']].map(([label,value,color]) => <div key={String(label)} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800"><div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div><div className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</div></div>)}
    </div>

    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col lg:flex-row gap-3">
      <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search registration, asset, VIN, make, model, driver..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs outline-none focus:border-cyan-600"/></div>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"><option value="all">All statuses</option>{Object.keys(statusLabel).map(s=><option key={s} value={s}>{statusLabel[s as VehicleStatus]}</option>)}</select>
      <select value={type} onChange={e=>setType(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"><option value="all">All vehicle types</option>{Array.from(new Set(vehicles.map(v=>v.type))).filter(Boolean).map(t=><option key={t} value={t}>{t}</option>)}</select>
      <label className="flex items-center gap-2 px-2 text-xs text-slate-400"><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/> Include inactive</label>
    </div>

    <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-900 text-slate-500 uppercase text-[10px]"><tr>{['Vehicle','Organization','Driver','Telematics','Utilization','Compliance','Status',''].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-800/70">{filtered.map(v => <tr key={v.id} className="hover:bg-slate-800/40">
        <td className="p-3"><button onClick={()=>onOpenDossier(v)} className="text-left"><div className="font-mono font-bold text-white hover:text-cyan-300">{v.regNumber}</div><div className="text-[11px] text-slate-400">{v.year || '—'} {v.make} {v.model}</div><div className="text-[10px] text-slate-600">{v.assetNumber || 'No asset number'}</div></button></td>
        <td className="p-3"><div className="text-slate-200">{v.department}</div><div className="text-[10px] text-slate-500">Government fleet</div></td>
        <td className="p-3"><div className="text-slate-200">{v.assignedDriver.name}</div><div className="text-[10px] text-slate-500">{v.assignedDriver.licenseNumber || 'No active assignment'}</div></td>
        <td className="p-3"><div className="flex items-center gap-1"><Wifi className={`w-3 h-3 ${v.gpsStatus==='Connected'?'text-emerald-400':'text-slate-600'}`}/><span>{v.gpsStatus}</span></div><div className="text-[10px] text-slate-500 font-mono">{v.lastCommunication || 'No telemetry'}</div></td>
        <td className="p-3 font-mono"><div className="flex items-center gap-1"><Gauge className="w-3 h-3 text-cyan-400"/>{v.mileageKm.toLocaleString()} km</div><div className="text-[10px] text-slate-500">{v.speedKmh} km/h now</div></td>
        <td className="p-3"><div className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-slate-500"/>{v.registrationExpiry || 'Not recorded'}</div><div className="text-[10px] text-slate-500">Service: {v.nextServiceKm ? `${v.nextServiceKm.toLocaleString()} km` : 'Not recorded'}</div></td>
        <td className="p-3"><span className={`px-2 py-1 rounded-md border text-[10px] font-semibold ${v.status==='moving'?'bg-emerald-950 text-emerald-300 border-emerald-800':v.status==='emergency'||v.status==='unauthorized'?'bg-red-950 text-red-300 border-red-800':v.status==='offline'||v.status==='no_gps'?'bg-slate-950 text-slate-500 border-slate-800':'bg-blue-950 text-blue-300 border-blue-800'}`}>{statusLabel[v.status]}</span></td>
        <td className="p-3"><div className="flex gap-1"><button title="Open dossier" onClick={()=>onOpenDossier(v)} className="p-2 rounded bg-slate-800 hover:bg-slate-700"><Eye className="w-3.5 h-3.5"/></button><button title="Locate" onClick={()=>onNavigateToMap(v.id)} className="p-2 rounded bg-slate-800 hover:bg-slate-700"><MapPin className="w-3.5 h-3.5"/></button></div></td>
      </tr>)}</tbody></table></div>
      {!filtered.length && <div className="p-10 text-center text-slate-500">No vehicles match the current filters.</div>}
    </div>

    {showCreate && <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"><form onSubmit={submitCreate} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-5"><div className="flex justify-between"><div><h3 className="text-lg font-bold text-white">Register Vehicle</h3><p className="text-xs text-slate-400">Create the official master record. Telematics and driver assignments are managed separately.</p></div><button type="button" onClick={()=>setShowCreate(false)} className="text-slate-400">✕</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[['registrationNumber','Registration *'],['assetNumber','Asset number'],['vin','VIN / chassis number'],['engineNumber','Engine number'],['make','Make'],['model','Model'],['modelYear','Model year'],['vehicleType','Vehicle type'],['fuelType','Fuel type'],['tankCapacityLitres','Tank capacity (L)'],['odometerKm','Current odometer (km)'],['baseLocation','Base location'],['color','Color'],['transmission','Transmission']].map(([key,label])=><label key={key} className="text-xs text-slate-400">{label}<input required={key==='registrationNumber'} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white outline-none focus:border-cyan-600"/></label>)}</div>{error&&<div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs"><AlertTriangle className="inline w-4 h-4 mr-1"/>{error}</div>}<div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowCreate(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-xs">Cancel</button><button disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-xs font-semibold">{saving?'Saving…':'Register Vehicle'}</button></div></form></div>}
  </div>;
};
