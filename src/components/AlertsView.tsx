import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Flame, 
  MapPin, 
  CheckCircle, 
  Radio, 
  PhoneCall, 
  Send, 
  Volume2, 
  VolumeX, 
  ShieldCheck,
  Clock,
  Car
} from 'lucide-react';
import { AlertEvent } from '../types/fleet';

interface AlertsViewProps {
  alerts: AlertEvent[];
  onAcknowledgeAlert: (alertId: string) => void;
  onDispatchPolice: (alertId: string) => void;
  onLocateOnMap: (vehicleId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onAcknowledgeAlert,
  onDispatchPolice,
  onLocateOnMap,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const filteredAlerts = alerts.filter((alt) => {
    if (selectedSeverity === 'all') return true;
    return alt.severity === selectedSeverity;
  });

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-red-950/80 border border-red-800 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Centralized Incident Command & Emergency Dispatch Engine
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-red-950 text-red-300 font-mono border border-red-800">
              {alerts.length} ALERTS LOGGED
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time triage of panic SOS triggers, Trimago fuel theft detection, geofence breaches, and unauthorized movement.
          </p>
        </div>

        {/* Alarm Sound Toggle */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-toggle-alarm-sound"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              soundEnabled ? 'bg-red-950 text-red-300 border-red-700' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-red-400 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Emergency Siren Armed' : 'Audio Muted'}</span>
          </button>
        </div>
      </div>

      {/* Triage Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: `All Alerts (${alerts.length})` },
          { id: 'critical', label: `Critical / SOS (${criticalCount})` },
          { id: 'high', label: 'High Priority' },
          { id: 'medium', label: 'Medium' },
          { id: 'low', label: 'Low / Informational' },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-severity-${tab.id}`}
            onClick={() => setSelectedSeverity(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedSeverity === tab.id
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert Feed List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">
            No alerts match the selected severity criteria.
          </div>
        ) : (
          filteredAlerts.map((alt) => {
            const isCritical = alt.severity === 'critical';
            return (
              <div 
                key={alt.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCritical 
                    ? 'bg-red-950/30 border-red-800 shadow-lg shadow-red-950/30' 
                    : alt.severity === 'high'
                    ? 'bg-amber-950/20 border-amber-800/80'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-xl mt-0.5 ${
                      isCritical ? 'bg-red-900/60 text-red-300 animate-pulse' :
                      alt.type === 'fuel_theft' ? 'bg-amber-900/60 text-amber-300' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {alt.type === 'emergency_sos' ? <AlertTriangle className="w-5 h-5 text-red-400" /> :
                       alt.type === 'fuel_theft' ? <Flame className="w-5 h-5 text-amber-400" /> :
                       <ShieldAlert className="w-5 h-5 text-cyan-400" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-white tracking-tight">{alt.title}</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                          {alt.vehicleReg}
                        </span>
                        <span className="text-xs text-slate-400">({alt.department})</span>
                        {alt.dispatchedToPolice && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono font-bold border border-blue-700 flex items-center gap-1">
                            <Radio className="w-3 h-3 text-blue-400" /> POLICE DISPATCHED
                          </span>
                        )}
                        {alt.acknowledged && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> ACKNOWLEDGED
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        {alt.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono mt-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          {alt.location.address}
                        </span>
                        {alt.speedKmh !== undefined && (
                          <span>Speed: {alt.speedKmh} km/h</span>
                        )}
                        {alt.fuelDropAmount !== undefined && (
                          <span className="text-amber-400 font-bold">Theft: -{alt.fuelDropAmount} Liters</span>
                        )}
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {alt.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-start">
                    <button
                      id={`btn-locate-alt-${alt.id}`}
                      onClick={() => onLocateOnMap(alt.vehicleId)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Locate on Map</span>
                    </button>

                    {!alt.dispatchedToPolice && (
                      <button
                        id={`btn-dispatch-police-${alt.id}`}
                        onClick={() => onDispatchPolice(alt.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-lg cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Dispatch Police Unit</span>
                      </button>
                    )}

                    {!alt.acknowledged && (
                      <button
                        id={`btn-ack-alert-${alt.id}`}
                        onClick={() => onAcknowledgeAlert(alt.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
