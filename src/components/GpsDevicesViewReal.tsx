import React, { useEffect, useMemo, useState } from 'react';
import { Cpu, Link2, RefreshCw, ShieldCheck, Wifi, KeyRound } from 'lucide-react';
import type { Vehicle } from '../types/fleet';
import { assignDevice, getDevices, rotateDeviceCredential, type DeviceApiRow } from '../services/deviceApi';

export const GpsDevicesViewReal: React.FC<{ vehicles: Vehicle[] }> = ({ vehicles }) => {
  const [devices, setDevices] = useState<DeviceApiRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [credential, setCredential] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const result = await getDevices();
      setDevices(result.data);
      setSelectedId(current => current || result.data[0]?.id || '');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load devices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const selected = devices.find(d => d.id === selectedId) || null;
  const assignedVehicle = useMemo(() => selected?.vehicle_id ? vehicles.find(v => v.id === selected.vehicle_id) : undefined, [selected, vehicles]);

  const handleAssign = async (vehicleId: string) => {
    if (!selected) return;
    setBusy(selected.id); setError(null);
    try { await assignDevice(selected.id, vehicleId); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to assign device'); }
    finally { setBusy(null); }
  };

  const handleRotate = async () => {
    if (!selected) return;
    setBusy(selected.id); setCredential(null); setError(null);
    try { const result = await rotateDeviceCredential(selected.id); setCredential(result.token); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to rotate device credential'); }
    finally { setBusy(null); }
  };

  const statusLabel = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2"><Cpu className="w-6 h-6 text-cyan-700" /><h1 className="text-xl font-bold">GPS & IoT Devices</h1></div>
            <p className="text-sm text-slate-500 mt-1">Device inventory, vehicle assignment, connectivity and credential management.</p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold hover:bg-slate-100"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </header>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {credential && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"><p className="text-xs font-semibold text-amber-800">New device credential — copy it now; it will not be shown again.</p><code className="block mt-1 break-all text-xs text-slate-900">{credential}</code></div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="Registered Devices" value={devices.length} />
          <Metric label="Assigned" value={devices.filter(d => d.vehicle_id).length} />
          <Metric label="Unassigned" value={devices.filter(d => !d.vehicle_id).length} />
          <Metric label="Recent Heartbeat" value={devices.filter(d => d.last_heartbeat_at).length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Device Inventory</h2>
            {loading ? <p className="text-sm text-slate-500">Loading devices…</p> : devices.length === 0 ? <p className="text-sm text-slate-500">No devices registered in the backend.</p> : <div className="space-y-2 max-h-[620px] overflow-y-auto">
              {devices.map(device => <button key={device.id} onClick={() => { setSelectedId(device.id); setCredential(null); }} className={`w-full text-left rounded-lg border p-3 transition ${selectedId === device.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-bold truncate">{device.device_identifier}</span><span className={`text-[10px] px-2 py-0.5 rounded-full ${device.last_heartbeat_at ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{device.last_heartbeat_at ? 'Heartbeat' : 'No heartbeat'}</span></div>
                <p className="text-xs text-slate-600 mt-1">{device.manufacturer || 'Manufacturer not recorded'} {device.model || ''}</p>
                <p className="text-[11px] text-slate-400 mt-1">{device.vehicle_id ? device.registration_number || 'Assigned vehicle' : 'Unassigned'}</p>
              </button>)}
            </div>}
          </section>

          <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
            {!selected ? <div className="py-16 text-center text-slate-500">Select a registered device.</div> : <>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div><p className="text-xs uppercase tracking-wider text-slate-500">Device</p><h2 className="text-lg font-bold font-mono mt-1">{selected.device_identifier}</h2><p className="text-sm text-slate-500 mt-1">{selected.manufacturer || '—'} {selected.model || ''}</p></div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700"><Wifi className="w-3.5 h-3.5" /> {statusLabel(selected.status || 'unknown')}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <Info label="Serial Number" value={selected.serial_number || '—'} />
                <Info label="Protocol" value={selected.protocol || '—'} />
                <Info label="Firmware" value={selected.firmware_version || '—'} />
                <Info label="Vehicle" value={selected.registration_number || 'Unassigned'} />
                <Info label="Last Heartbeat" value={selected.last_heartbeat_at ? new Date(selected.last_heartbeat_at).toLocaleString() : 'No heartbeat recorded'} />
                <Info label="Assignment Started" value={selected.starts_at ? new Date(selected.starts_at).toLocaleString() : '—'} />
              </div>

              <div className="mt-6 border-t border-slate-200 pt-5 space-y-4">
                <div className="flex items-center gap-2"><Link2 className="w-4 h-4 text-cyan-700" /><h3 className="font-semibold">Vehicle Assignment</h3></div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select disabled={busy === selected.id} value={selected.vehicle_id || ''} onChange={e => e.target.value && void handleAssign(e.target.value)} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">Unassigned</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.regNumber} — {v.make} {v.model}</option>)}
                  </select>
                </div>
                {assignedVehicle && <p className="text-xs text-slate-500">Current platform record: <span className="font-semibold text-slate-700">{assignedVehicle.regNumber}</span></p>}
              </div>

              <div className="mt-6 border-t border-slate-200 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div><h3 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-cyan-700" /> Device authentication</h3><p className="text-xs text-slate-500 mt-1">Rotate the ingestion credential when required. The secret is never displayed from the database.</p></div>
                <button disabled={busy === selected.id} onClick={() => void handleRotate()} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"><KeyRound className="w-4 h-4" /> Rotate Credential</button>
              </div>
            </>}
          </section>
        </div>
      </div>
    </div>
  );
};

function Metric({ label, value }: { label: string; value: number }) { return <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 border border-slate-100 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p><p className="text-sm font-semibold mt-1 break-words">{value}</p></div>; }
