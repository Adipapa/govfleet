import React from 'react';
import { 
  Car, 
  Activity, 
  Fuel, 
  AlertTriangle, 
  MapPin, 
  ShieldCheck, 
  ArrowUpRight, 
  Gauge, 
  CheckCircle2, 
  Clock,
  Building2,
  ChevronRight,
  Radio
} from 'lucide-react';
import { Vehicle, AlertEvent, FuelLogEvent, GovernmentAgency } from '../types/fleet';

interface DashboardOverviewProps {
  vehicles: Vehicle[];
  alerts: AlertEvent[];
  fuelLogs: FuelLogEvent[];
  selectedAgency: GovernmentAgency;
  onNavigateToTracking: (vehicleId?: string) => void;
  onOpenAlerts: () => void;
  onOpenFuelIntelligence: () => void;
  onOpenDriverSafety: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  vehicles = [],
  alerts = [],
  fuelLogs = [],
  selectedAgency,
  onNavigateToTracking,
  onOpenAlerts,
  onOpenFuelIntelligence,
  onOpenDriverSafety,
}) => {
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const safeFuelLogs = Array.isArray(fuelLogs) ? fuelLogs : [];

  // Core metrics calculation
  const totalCount = safeVehicles.length;
  const movingCount = safeVehicles.filter((v) => v.status === 'moving').length;
  const parkedCount = safeVehicles.filter((v) => v.status === 'parked').length;
  const idlingCount = safeVehicles.filter((v) => v.status === 'idling').length;
  const emergencyCount = safeVehicles.filter((v) => v.status === 'emergency').length;
  const offlineCount = safeVehicles.filter((v) => v.status === 'offline').length;

  const avgSpeed = movingCount > 0 
    ? Math.round(safeVehicles.filter((v) => v.status === 'moving').reduce((acc, v) => acc + v.speedKmh, 0) / movingCount) 
    : 0;

  const totalKmToday = safeVehicles.reduce((acc, v) => acc + (v.dailyKm || 0), 0);

  const avgFuelPct = totalCount > 0 
    ? Math.round(safeVehicles.reduce((acc, v) => acc + v.currentFuelPercentage, 0) / totalCount)
    : 0;

  const fuelTheftLogs = safeFuelLogs.filter((l) => l.type === 'theft');
  const criticalAlerts = safeAlerts.filter((a) => a.severity === 'critical');
  const unacknowledgedAlerts = safeAlerts.filter((a) => !a.acknowledged);

  // Status breakdown percentages
  const movingPct = totalCount > 0 ? Math.round((movingCount / totalCount) * 100) : 0;
  const idlingPct = totalCount > 0 ? Math.round((idlingCount / totalCount) * 100) : 0;
  const parkedPct = totalCount > 0 ? Math.round((parkedCount / totalCount) * 100) : 0;
  const offlinePct = totalCount > 0 ? Math.round((offlineCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100 space-y-6 max-w-7xl mx-auto w-full">
      {/* Clean, Focused Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800/80 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 text-xs font-mono font-medium border border-cyan-800/80">
              {selectedAgency}
            </span>
            <span className="text-xs text-slate-500 font-mono">Real-Time Telematics</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Fleet Overview
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status, vehicle locations, fuel integrity, and security alerts
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            id="btn-overview-tactical-map"
            onClick={() => onNavigateToTracking()}
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-lg shadow-cyan-950/50"
          >
            <MapPin className="w-4 h-4" />
            <span>Open Tactical Map</span>
          </button>
        </div>
      </div>

      {/* Emergency Alert Banner if Active */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-900/60 border border-red-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-wider bg-red-900/80 text-red-200 px-1.5 py-0.2 rounded font-bold">
                  Critical Incident
                </span>
                <span className="text-xs font-bold text-red-200">{criticalAlerts[0].title}</span>
              </div>
              <p className="text-xs text-red-300/90 mt-0.5">{criticalAlerts[0].message}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onNavigateToTracking(criticalAlerts[0].vehicleId)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors"
            >
              Locate Vehicle
            </button>
            <button
              onClick={onOpenAlerts}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
            >
              View All ({safeAlerts.length})
            </button>
          </div>
        </div>
      )}

      {/* Simplified, High-Signal 4-Card KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Fleet Status */}
        <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Fleet</span>
            <Car className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-mono font-bold text-white">{totalCount}</span>
            <span className="text-xs text-slate-500">vehicles</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span className="text-emerald-400 font-medium">{movingCount} active</span>
            <span>•</span>
            <span>{parkedCount} parked</span>
            <span>•</span>
            <span>{idlingCount} idle</span>
          </div>
        </div>

        {/* Card 2: Fleet in Motion */}
        <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Moving Now</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-mono font-bold text-emerald-400">{movingCount}</span>
            <span className="text-xs text-slate-500">units</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span>Avg {avgSpeed} km/h</span>
            <span>•</span>
            <span className="text-slate-300 font-mono">{totalKmToday.toLocaleString()} km today</span>
          </div>
        </div>

        {/* Card 3: Fuel Integrity */}
        <div 
          onClick={onOpenFuelIntelligence}
          className="p-4 bg-slate-900/70 hover:bg-slate-900 rounded-xl border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Fuel Level</span>
            <Fuel className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-mono font-bold text-white">{avgFuelPct}%</span>
            <span className="text-xs text-slate-500">avg tank</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
            <span className="text-slate-400">Trimago Sensor: Active</span>
            {fuelTheftLogs.length > 0 ? (
              <span className="text-red-400 font-semibold">{fuelTheftLogs.length} siphoning flags</span>
            ) : (
              <span className="text-emerald-400 font-medium">No siphoning</span>
            )}
          </div>
        </div>

        {/* Card 4: Security Alerts */}
        <div 
          onClick={onOpenAlerts}
          className={`p-4 rounded-xl border cursor-pointer transition-colors space-y-2 ${
            emergencyCount > 0 
              ? 'bg-red-950/40 border-red-700 hover:bg-red-950/60' 
              : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Operational Alerts</span>
            <AlertTriangle className={`w-4 h-4 ${emergencyCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl font-mono font-bold ${emergencyCount > 0 ? 'text-red-400' : 'text-white'}`}>
              {safeAlerts.length}
            </span>
            {emergencyCount > 0 ? (
              <span className="text-xs font-bold text-red-400 animate-pulse">{emergencyCount} EMERGENCY SOS</span>
            ) : (
              <span className="text-xs text-slate-500">total events</span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
            <span className="text-slate-400">{unacknowledgedAlerts.length} unacknowledged</span>
            <span className="text-cyan-400 font-medium flex items-center">
              Alert Center <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Fleet Status Distribution Visual Bar */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">Fleet Status Distribution</span>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Moving ({movingCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Idling ({idlingCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Parked ({parkedCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span> Offline ({offlineCount})
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
          <div 
            style={{ width: `${movingPct}%` }} 
            className="bg-emerald-500 h-full transition-all duration-500" 
            title={`Moving: ${movingCount} (${movingPct}%)`}
          />
          <div 
            style={{ width: `${idlingPct}%` }} 
            className="bg-amber-500 h-full transition-all duration-500" 
            title={`Idling: ${idlingCount} (${idlingPct}%)`}
          />
          <div 
            style={{ width: `${parkedPct}%` }} 
            className="bg-blue-500 h-full transition-all duration-500" 
            title={`Parked: ${parkedCount} (${parkedPct}%)`}
          />
          <div 
            style={{ width: `${offlinePct}%` }} 
            className="bg-slate-600 h-full transition-all duration-500" 
            title={`Offline: ${offlineCount} (${offlinePct}%)`}
          />
        </div>
      </div>

      {/* Main Two-Column Clean Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Active Vehicles in Field */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Car className="w-4 h-4 text-cyan-400" />
                <span>Active Vehicles in Motion</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time telemetry speed and locations</p>
            </div>
            <button
              onClick={() => onNavigateToTracking()}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>View On Map</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {safeVehicles.slice(0, 5).map((veh) => (
              <div
                key={veh.id}
                onClick={() => onNavigateToTracking(veh.id)}
                className="p-3 bg-slate-950/60 hover:bg-slate-900/80 rounded-lg border border-slate-800/80 hover:border-cyan-800/80 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    veh.status === 'moving' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' :
                    veh.status === 'idling' ? 'bg-amber-400' :
                    veh.status === 'emergency' ? 'bg-red-500 animate-ping' : 'bg-blue-400'
                  }`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-white">{veh.regNumber}</span>
                      <span className="text-[11px] text-slate-400">{veh.make} {veh.model}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {veh.assignedDriver.name} • <span className="text-slate-500">{veh.department}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end space-x-1 font-mono text-xs font-bold text-white">
                    <Gauge className="w-3 h-3 text-cyan-400" />
                    <span>{veh.speedKmh} km/h</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{veh.currentFuelPercentage}% Fuel</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Security Alerts & Incident Stream */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Security & Telemetry Alerts</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Automatic geo-breaches, siphoning, and speed violations</p>
            </div>
            <button
              onClick={onOpenAlerts}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>Alerts Center</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {safeAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                onClick={() => onNavigateToTracking(alert.vehicleId)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start justify-between ${
                  alert.severity === 'critical'
                    ? 'bg-red-950/30 border-red-800/80 hover:bg-red-950/50'
                    : alert.severity === 'high'
                    ? 'bg-amber-950/20 border-amber-800/60 hover:bg-amber-950/40'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  <div className="mt-1">
                    {alert.severity === 'critical' ? (
                      <span className="w-2 h-2 rounded-full bg-red-400 block animate-ping" />
                    ) : alert.severity === 'high' ? (
                      <span className="w-2 h-2 rounded-full bg-amber-400 block" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 block" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">{alert.title}</span>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                        {alert.vehicleReg}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{alert.message}</p>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      {alert.location.address} • {alert.timestamp}
                    </span>
                  </div>
                </div>

                <span className="text-cyan-400 hover:text-cyan-300 text-xs font-medium shrink-0 ml-2">
                  Track &rarr;
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
