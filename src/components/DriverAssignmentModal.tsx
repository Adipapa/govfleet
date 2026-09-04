import React, { useEffect, useMemo, useState } from 'react';
import { UserRound, X, UserPlus, UserMinus, History, Loader2, AlertTriangle } from 'lucide-react';
import { assignDriverToVehicle, endDriverVehicleAssignment, getDrivers, getVehicleDriverAssignments, type DriverApiRow, type DriverAssignment } from '../services/api';
import type { Vehicle } from '../types/fleet';

interface Props {
  vehicle: Vehicle;
  onClose: () => void;
  onChanged: () => void;
}

export const DriverAssignmentModal: React.FC<Props> = ({ vehicle, onClose, onChanged }) => {
  const [drivers, setDrivers] = useState<DriverApiRow[]>([]);
  const [history, setHistory] = useState<DriverAssignment[]>([]);
  const [driverId, setDriverId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = useMemo(() => history.find((item) => item.active) || null, [history]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [driverResult, assignmentResult] = await Promise.all([getDrivers(), getVehicleDriverAssignments(vehicle.id)]);
      setDrivers(driverResult.data.filter((driver) => driver.active));
      setHistory(assignmentResult.data);
      setDriverId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load driver assignments');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [vehicle.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!driverId) return;
    setSaving(true); setError(null);
    try {
      await assignDriverToVehicle(vehicle.id, driverId, startsAt ? new Date(startsAt).toISOString() : undefined, endsAt ? new Date(endsAt).toISOString() : undefined);
      setStartsAt(''); setEndsAt('');
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to assign driver');
    } finally { setSaving(false); }
  };

  const endAssignment = async (assignment: DriverAssignment) => {
    if (!window.confirm(`End the current assignment for ${assignment.full_name}?`)) return;
    setSaving(true); setError(null);
    try {
      await endDriverVehicleAssignment(assignment.id);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to end assignment');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-slate-100">
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2"><UserRound className="w-5 h-5 text-cyan-400" /><h2 className="text-base font-bold text-white">Driver Assignment</h2></div>
            <p className="text-xs text-slate-400 mt-1 font-mono">{vehicle.regNumber} · {vehicle.make} {vehicle.model}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {error && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs"><AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}

          {loading ? (
            <div className="py-10 flex justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Current Driver</span>
                  {current && <span className="text-[10px] px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">ACTIVE</span>}
                </div>
                {current ? (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{current.full_name}</p>
                      <p className="text-xs text-slate-400">{current.employee_number || 'No employee number'} · Licence {current.licence_number || 'N/A'}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Assigned {new Date(current.starts_at).toLocaleString()}</p>
                    </div>
                    <button disabled={saving} onClick={() => void endAssignment(current)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-950 border border-red-800 text-red-200 text-xs font-semibold disabled:opacity-50"><UserMinus className="w-3.5 h-3.5" />End Assignment</button>
                  </div>
                ) : <p className="text-sm text-slate-500">No active driver is assigned to this vehicle.</p>}
              </div>

              <form onSubmit={submit} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-cyan-400" /><span className="text-xs font-bold uppercase tracking-wider">Assign Driver</span></div>
                <select required value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500">
                  <option value="">Select an active driver...</option>
                  {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name}{driver.employee_number ? ` · ${driver.employee_number}` : ''}</option>)}
                </select>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-[10px] text-slate-500 uppercase font-semibold">Start (optional)
                    <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200" />
                  </label>
                  <label className="text-[10px] text-slate-500 uppercase font-semibold">End (optional)
                    <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200" />
                  </label>
                </div>
                <button disabled={saving || !driverId} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Assign Driver to Vehicle
                </button>
              </form>

              <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center gap-2"><History className="w-4 h-4 text-cyan-400" /><span className="text-xs font-bold uppercase tracking-wider">Assignment History</span></div>
                {history.length === 0 ? <p className="p-4 text-xs text-slate-500">No assignment history.</p> : <div className="divide-y divide-slate-800">{history.map((item) => <div key={item.id} className="p-4 flex items-center justify-between gap-4"><div><p className="text-xs font-semibold text-slate-200">{item.full_name}</p><p className="text-[10px] text-slate-500">{new Date(item.starts_at).toLocaleString()} → {item.ends_at ? new Date(item.ends_at).toLocaleString() : 'Present'}</p></div><span className={`text-[10px] px-2 py-1 rounded border ${item.active ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>{item.active ? 'ACTIVE' : 'ENDED'}</span></div>)}</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
