import React, { useState } from 'react';
import { 
  Fuel, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  DollarSign, 
  Flame, 
  ShieldAlert, 
  Filter, 
  ArrowDownRight, 
  ArrowUpRight,
  Info,
  Car
} from 'lucide-react';
import { Vehicle, FuelLogEvent } from '../types/fleet';

interface FuelMonitoringViewProps {
  vehicles: Vehicle[];
  fuelLogs: FuelLogEvent[];
  onTriggerFuelTheft: (vehicleId: string) => void;
  onTriggerRefuel: (vehicleId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
}

export const FuelMonitoringView: React.FC<FuelMonitoringViewProps> = ({
  vehicles,
  fuelLogs,
  onTriggerFuelTheft,
  onTriggerRefuel,
  onSelectVehicle,
}) => {
  const [selectedVehicleForSim, setSelectedVehicleForSim] = useState<string>(vehicles[0]?.id || '');
  const [filterType, setFilterType] = useState<string>('all');

  const totalTheftLiters = fuelLogs
    .filter(l => l.type === 'theft')
    .reduce((acc, curr) => acc + Math.abs(curr.deltaLiters), 0);

  const totalTheftGMD = fuelLogs
    .filter(l => l.type === 'theft')
    .reduce((acc, curr) => acc + curr.estimatedCostGMD, 0);

  const totalRefuelLiters = fuelLogs
    .filter(l => l.type === 'refuel')
    .reduce((acc, curr) => acc + curr.deltaLiters, 0);

  const filteredLogs = fuelLogs.filter((log) => {
    if (filterType === 'theft') return log.type === 'theft';
    if (filterType === 'refuel') return log.type === 'refuel';
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-400">
              <Fuel className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Fuel Monitoring & Loss Intelligence Engine
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-mono border border-amber-800">
              TRIMAGO INTEGRATED
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time ultrasonic fuel sensor telemetry, automated anti-siphoning alerts, refuel audits, and government expenditure analytics.
          </p>
        </div>

        {/* Interactive Sensor Test Bar */}
        <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
          <select
            id="select-fuel-sim-vehicle"
            value={selectedVehicleForSim}
            onChange={(e) => setSelectedVehicleForSim(e.target.value)}
            className="bg-slate-800 text-xs text-white px-2 py-1.5 rounded border border-slate-700 font-medium"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.regNumber} ({v.currentFuelPercentage}% - {v.currentFuelLiters}L)
              </option>
            ))}
          </select>

          <button
            id="btn-simulate-theft-view"
            onClick={() => onTriggerFuelTheft(selectedVehicleForSim)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-red-200 text-xs font-semibold rounded transition-colors cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Simulate Theft</span>
          </button>

          <button
            id="btn-simulate-refuel-view"
            onClick={() => onTriggerRefuel(selectedVehicleForSim)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold rounded transition-colors cursor-pointer"
          >
            <Fuel className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulate Refuel</span>
          </button>
        </div>
      </div>

      {/* Fuel KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Siphoning / Theft Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-mono font-bold text-red-400">
              {fuelLogs.filter(l => l.type === 'theft').length}
            </span>
            <span className="text-xs text-slate-400">events flagged</span>
          </div>
          <span className="text-[11px] text-red-400 font-mono mt-1 block">
            -{totalTheftLiters} Liters siphoned
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Audited Theft Losses (GMD)</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-mono font-bold text-white">
              GMD {totalTheftGMD.toLocaleString()}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Referred to Internal Audit & Police
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Audited Refuel Deliveries</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-mono font-bold text-emerald-300">
              +{totalRefuelLiters}
            </span>
            <span className="text-xs text-emerald-500 font-mono">Liters verified</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Cross-referenced with fuel depot coupons
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Fleet Average Consumption</span>
            <Fuel className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-mono font-bold text-cyan-300">
              9.4 L
            </span>
            <span className="text-xs text-slate-400">/ 100 KM</span>
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            Optimal engine burn efficiency
          </span>
        </div>
      </div>

      {/* Real-time Tank Levels for All Vehicles */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Fuel className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Vehicle Tank Gauges (Ultrasonic Probe Stream)</span>
            </h2>
            <p className="text-xs text-slate-400">Calibrated percentage and volume readings updated continuously</p>
          </div>
          <span className="text-xs font-mono text-slate-400">{vehicles.length} Units Online</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {vehicles.map((v) => {
            const isLowFuel = v.currentFuelPercentage < 25;
            return (
              <div 
                key={v.id} 
                onClick={() => onSelectVehicle(v.id)}
                className="p-3.5 bg-slate-950/70 hover:bg-slate-800/60 transition-all rounded-xl border border-slate-800 cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-xs text-white">{v.regNumber}</span>
                    <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">{v.department}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isLowFuel ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {v.currentFuelPercentage}%
                  </span>
                </div>

                {/* Progress bar fuel indicator */}
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-700 ${
                      v.currentFuelPercentage > 50 ? 'bg-emerald-500' :
                      v.currentFuelPercentage > 25 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${v.currentFuelPercentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Vol: {v.currentFuelLiters}L / {v.tankCapacityLiters}L</span>
                  <span>{v.fuelType}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fuel Audit Log Table (SRS Section 10 Examples) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Fuel Audit Ledger & Sensor Event Logs</span>
            </h2>
            <p className="text-xs text-slate-400">Chronological ledger of sudden fuel drops, siphoning, and verified refuel events</p>
          </div>

          <div className="flex items-center space-x-1.5">
            {['all', 'theft', 'refuel'].map((type) => (
              <button
                key={type}
                id={`btn-fuel-filter-${type}`}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                  filterType === type 
                    ? 'bg-amber-500 text-slate-950 font-bold' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3">Event Classification</th>
                <th className="py-2.5 px-3">Probe Delta</th>
                <th className="py-2.5 px-3">Ignition State</th>
                <th className="py-2.5 px-3">Detected Location</th>
                <th className="py-2.5 px-3">Est. Financial Impact</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-white">
                    {log.vehicleReg}
                  </td>
                  <td className="py-2.5 px-3">
                    {log.type === 'theft' ? (
                      <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-semibold inline-flex items-center gap-1">
                        <Flame className="w-3 h-3 text-red-400" /> Siphoning / Theft
                      </span>
                    ) : log.type === 'refuel' ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified Refuel
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Transit Burn
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold">
                    <span className={log.deltaLiters < 0 ? 'text-red-400' : 'text-emerald-400'}>
                      {log.deltaLiters > 0 ? `+${log.deltaLiters}` : log.deltaLiters} L ({log.percentageBefore}% &rarr; {log.percentageAfter}%)
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span className={log.ignitionState ? 'text-emerald-400' : 'text-slate-400'}>
                      {log.ignitionState ? 'Ignition ON' : 'Ignition OFF'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 max-w-[200px] truncate">
                    {log.location}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold">
                    GMD {log.estimatedCostGMD.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">
                    {log.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
