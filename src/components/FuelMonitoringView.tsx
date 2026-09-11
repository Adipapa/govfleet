import React, { useState } from 'react';
import { Fuel, AlertTriangle, CheckCircle2, TrendingDown, Flame, ShieldAlert } from 'lucide-react';
import { Vehicle, FuelLogEvent } from '../types/fleet';

interface FuelMonitoringViewProps { vehicles: Vehicle[]; fuelLogs: FuelLogEvent[]; onSelectVehicle: (vehicleId: string) => void; }

export const FuelMonitoringView: React.FC<FuelMonitoringViewProps> = ({ vehicles, fuelLogs, onSelectVehicle }) => {
  const [filterType, setFilterType] = useState('all');
  const theftLogs = fuelLogs.filter((l) => l.type === 'theft');
  const refuelLogs = fuelLogs.filter((l) => l.type === 'refuel');
  const totalTheftLiters = theftLogs.reduce((sum, log) => sum + Math.abs(log.deltaLiters), 0);
  const totalTheftGMD = theftLogs.reduce((sum, log) => sum + log.estimatedCostGMD, 0);
  const totalRefuelLiters = refuelLogs.reduce((sum, log) => sum + log.deltaLiters, 0);
  const filteredLogs = fuelLogs.filter((log) => filterType === 'all' || log.type === filterType);
  const vehiclesWithFuel = vehicles.filter((v) => Number.isFinite(v.currentFuelPercentage) && Number.isFinite(v.currentFuelLiters) && Number.isFinite(v.tankCapacityLiters));

  return <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 space-y-6">
    <div className="border-b border-slate-800 pb-4">
      <div className="flex items-center space-x-2"><div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-400"><Fuel className="w-5 h-5" /></div><h1 className="text-xl font-bold text-white tracking-tight">Fuel Monitoring & Loss Intelligence</h1></div>
      <p className="text-xs sm:text-sm text-slate-400 mt-1">Live fuel telemetry, consumption analysis, refuelling records, and abnormal fuel-loss events from connected vehicles.</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Metric label="Siphoning / Theft Alerts" value={theftLogs.length.toLocaleString()} suffix="recorded events" icon={<AlertTriangle className="w-4 h-4 text-red-400" />} />
      <Metric label="Recorded Theft Loss" value={`GMD ${totalTheftGMD.toLocaleString()}`} suffix={`${totalTheftLiters.toLocaleString()} L recorded`} icon={<TrendingDown className="w-4 h-4 text-red-400" />} />
      <Metric label="Recorded Refuelling" value={`+${totalRefuelLiters.toLocaleString()} L`} suffix="from live events" icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} />
      <Metric label="Fleet Consumption" value="—" suffix="Requires sufficient telemetry" icon={<Fuel className="w-4 h-4 text-cyan-400" />} />
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4"><div><h2 className="text-sm font-bold text-white flex items-center space-x-2"><Fuel className="w-4 h-4 text-cyan-400" /><span>Live Vehicle Fuel Telemetry</span></h2><p className="text-xs text-slate-400">Only vehicles with current fuel telemetry are shown.</p></div><span className="text-xs font-mono text-slate-400">{vehiclesWithFuel.length} reporting</span></div>
      {vehiclesWithFuel.length === 0 ? <EmptyState title="No fuel telemetry is currently available." detail="Connect a compatible tracker and fuel sensor, then wait for telemetry to be received." icon={<Fuel className="mx-auto h-8 w-8 text-slate-700" />} /> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {vehiclesWithFuel.map((v) => { const percentage = Math.max(0, Math.min(100, v.currentFuelPercentage)); return <div key={v.id} onClick={() => onSelectVehicle(v.id)} className="p-3.5 bg-slate-950/70 hover:bg-slate-800/60 transition-all rounded-xl border border-slate-800 cursor-pointer space-y-2.5"><div className="flex items-start justify-between"><div><span className="font-mono font-bold text-xs text-white">{v.regNumber}</span><span className="text-[11px] text-slate-400 block truncate max-w-[140px]">{v.department}</span></div><span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">{percentage.toFixed(0)}%</span></div><div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${percentage}%` }} /></div><div className="flex justify-between text-[10px] text-slate-400 font-mono"><span>Vol: {v.currentFuelLiters}L / {v.tankCapacityLiters}L</span><span>{v.fuelType || 'Fuel'}</span></div></div>; })}
      </div>}
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2"><div><h2 className="text-sm font-bold text-white flex items-center space-x-2"><ShieldAlert className="w-4 h-4 text-amber-400" /><span>Fuel Event Ledger</span></h2><p className="text-xs text-slate-400">Recorded fuel events received from the live system.</p></div><div className="flex items-center space-x-1.5">{['all', 'theft', 'refuel'].map((type) => <button key={type} onClick={() => setFilterType(type)} className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${filterType === type ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{type}</button>)}</div></div>
      {filteredLogs.length === 0 ? <EmptyState title="No fuel events recorded." detail="Fuel events will appear here when the backend receives and processes them." icon={<Flame className="mx-auto h-8 w-8 text-slate-700" />} /> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800"><tr><th className="py-2.5 px-3">Vehicle</th><th className="py-2.5 px-3">Event</th><th className="py-2.5 px-3">Fuel Delta</th><th className="py-2.5 px-3">Ignition</th><th className="py-2.5 px-3">Location</th><th className="py-2.5 px-3">Financial Impact</th><th className="py-2.5 px-3">Timestamp</th></tr></thead><tbody className="divide-y divide-slate-800/60">{filteredLogs.map((log) => <tr key={log.id} className="hover:bg-slate-800/30"><td className="py-2.5 px-3 font-mono font-bold text-white">{log.vehicleReg}</td><td className="py-2.5 px-3">{log.type === 'theft' ? <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 inline-flex items-center gap-1"><Flame className="w-3 h-3" />Siphoning / Theft</span> : <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Refuel</span>}</td><td className="py-2.5 px-3 font-mono font-bold"><span className={log.deltaLiters < 0 ? 'text-red-400' : 'text-emerald-400'}>{log.deltaLiters > 0 ? `+${log.deltaLiters}` : log.deltaLiters} L</span></td><td className="py-2.5 px-3 font-mono">{log.ignitionState ? 'ON' : 'OFF'}</td><td className="py-2.5 px-3 text-slate-300 max-w-[200px] truncate">{log.location}</td><td className="py-2.5 px-3 font-mono">GMD {log.estimatedCostGMD.toLocaleString()}</td><td className="py-2.5 px-3 text-slate-500 font-mono">{log.timestamp}</td></tr>)}</tbody></table></div>}
    </div>
  </div>;
};

const Metric: React.FC<{ label: string; value: string; suffix: string; icon: React.ReactNode }> = ({ label, value, suffix, icon }) => <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl"><div className="flex items-center justify-between text-slate-400 text-xs"><span>{label}</span>{icon}</div><div className="text-2xl font-mono font-bold text-white mt-2">{value}</div><span className="text-[11px] text-slate-500 mt-1 block">{suffix}</span></div>;
const EmptyState: React.FC<{ title: string; detail: string; icon: React.ReactNode }> = ({ title, detail, icon }) => <div className="rounded-lg border border-dashed border-slate-800 p-10 text-center">{icon}<p className="mt-3 text-sm text-slate-400">{title}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></div>;
export default FuelMonitoringView;
