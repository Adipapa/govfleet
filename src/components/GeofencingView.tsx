import React, { useEffect, useState } from 'react';
import { Eye, MapPin, Plus, RefreshCw, Shield, Trash2 } from 'lucide-react';
import { createGeofence, deleteGeofence, getGeofences, type GeofenceApiRow } from '../services/geofenceApi';

export const GeofencingView: React.FC<{ onViewOnMap: () => void }> = ({ onViewOnMap }) => {
  const [geofences, setGeofences] = useState<GeofenceApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('government');
  const [speed, setSpeed] = useState('40');
  const [lat, setLat] = useState('13.4549');
  const [lng, setLng] = useState('-16.5790');
  const [radius, setRadius] = useState('500');
  const [restricted, setRestricted] = useState(false);
  const [entry, setEntry] = useState(true);
  const [exit, setExit] = useState(true);

  const load = async () => { setLoading(true); setError(''); try { setGeofences((await getGeofences()).data); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load geofences.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try {
      const result = await createGeofence({ name, category, speedLimitKmh: Number(speed), centerLat: Number(lat), centerLng: Number(lng), radiusM: Number(radius), restricted, alertOnEntry: entry, alertOnExit: exit });
      setGeofences(current => [...current, result.data].sort((a,b) => a.name.localeCompare(b.name)));
      setShowCreate(false); setName('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create geofence.'); }
  };

  const remove = async (id: string) => { if (!window.confirm('Deactivate this geofence?')) return; try { await deleteGeofence(id); setGeofences(current => current.filter(item => item.id !== id)); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to deactivate geofence.'); } };

  return <div className="h-full overflow-y-auto p-4 sm:p-6 bg-slate-50 text-slate-900 space-y-5">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4"><div><div className="flex items-center gap-2 text-cyan-700"><Shield className="w-5 h-5"/><span className="text-[10px] uppercase tracking-wider font-mono font-semibold">Operations Control</span></div><h1 className="text-2xl font-bold text-slate-950 mt-1">Geofence Zones</h1><p className="text-xs text-slate-500 mt-1">Administrative and security boundaries stored in the fleet database.</p></div><div className="flex gap-2"><button onClick={() => void load()} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/></button><button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold"><Plus className="w-4 h-4"/>Create Zone</button><button onClick={onViewOnMap} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold"><Eye className="w-4 h-4"/>Map</button></div></header>
    {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
    {loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Loading geofence records…</div> : geofences.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><MapPin className="w-7 h-7 mx-auto text-slate-300"/><div className="mt-2 text-sm font-semibold text-slate-700">No active geofences</div><p className="text-xs text-slate-500 mt-1">Create a zone to begin recording boundary events.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{geofences.map(geo => <section key={geo.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">{geo.name}</h2><p className="text-[10px] text-slate-500 mt-1">{geo.category}</p></div><span className={`px-2 py-1 rounded text-[10px] font-semibold ${geo.restricted ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{geo.restricted ? 'Restricted' : 'Active'}</span></div><div className="grid grid-cols-2 gap-2 mt-4 text-xs"><Metric label="Center" value={`${Number(geo.center_lat).toFixed(4)}, ${Number(geo.center_lng).toFixed(4)}`}/><Metric label="Radius" value={`${Number(geo.radius_m).toLocaleString()} m`}/><Metric label="Speed limit" value={geo.speed_limit_kmh ? `${geo.speed_limit_kmh} km/h` : 'None'}/><Metric label="Entry / Exit" value={`${geo.alert_on_entry ? 'On' : 'Off'} / ${geo.alert_on_exit ? 'On' : 'Off'}`}/></div><div className="mt-4 pt-3 border-t border-slate-100 flex justify-end"><button onClick={() => void remove(geo.id)} className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5"/>Deactivate</button></div></section>)}</div>}

    {showCreate && <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4"><form onSubmit={create} className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4"><h2 className="text-lg font-bold text-slate-900">Create Geofence Zone</h2><div><label className="text-xs font-semibold text-slate-600">Name</label><input required value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="e.g. Government Complex"/></div><div className="grid grid-cols-2 gap-3"><Field label="Category" value={category} onChange={setCategory} options={['government','police','hospital','airport','restricted','fuel_depot']}/><Field label="Speed limit" value={speed} onChange={setSpeed} suffix="km/h"/><Field label="Latitude" value={lat} onChange={setLat}/><Field label="Longitude" value={lng} onChange={setLng}/><Field label="Radius" value={radius} onChange={setRadius} suffix="m"/></div><label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={restricted} onChange={e => setRestricted(e.target.checked)}/> Restricted zone</label><div className="grid grid-cols-2 gap-3"><label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={entry} onChange={e => setEntry(e.target.checked)}/> Alert on entry</label><label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={exit} onChange={e => setExit(e.target.checked)}/> Alert on exit</label></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-xs">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold">Create Zone</button></div></form></div>}
  </div>;
};
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-lg bg-slate-50 border border-slate-100 p-2"><div className="text-[9px] uppercase text-slate-400">{label}</div><div className="mt-1 text-[11px] font-mono text-slate-800">{value}</div></div>}
function Field({label,value,onChange,suffix,options}:{label:string;value:string;onChange:(v:string)=>void;suffix?:string;options?:string[]}){return <label className="text-xs font-semibold text-slate-600">{label}{options ? <select value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-normal">{options.map(o=><option key={o}>{o}</option>)}</select> : <div className="mt-1 flex"><input value={value} onChange={e=>onChange(e.target.value)} className="w-full px-3 py-2 rounded-l-lg border border-slate-200 font-normal"/>{suffix&&<span className="px-2 py-2 border border-l-0 border-slate-200 rounded-r-lg text-[10px] text-slate-400">{suffix}</span>}</div>}</label>}
