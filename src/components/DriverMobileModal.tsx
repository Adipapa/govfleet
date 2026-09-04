import React, { useState } from 'react';
import { 
  Smartphone, 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Fuel, 
  Gauge, 
  MapPin, 
  Clock, 
  User, 
  Car,
  FileCheck,
  Send
} from 'lucide-react';
import { Vehicle } from '../types/fleet';

interface DriverMobileModalProps {
  vehicle?: Vehicle;
  onClose: () => void;
  onTriggerSOS: (vehicleId: string) => void;
}

export const DriverMobileModal: React.FC<DriverMobileModalProps> = ({
  vehicle,
  onClose,
  onTriggerSOS,
}) => {
  const [checklist, setChecklist] = useState({
    tires: true,
    oilLevel: true,
    brakes: true,
    lights: true,
    firstAidKit: true,
  });
  const [sosSent, setSosSent] = useState(false);
  const [incidentReport, setIncidentReport] = useState('');
  const [incidentSent, setIncidentSent] = useState(false);

  const veh = vehicle || {
    id: 'veh-001',
    regNumber: 'GG-0124-23',
    assetNumber: 'ASSET-GOV-2024-8841',
    make: 'Toyota',
    model: 'Land Cruiser Prado TX',
    year: 2023,
    type: 'Patrol SUV',
    department: 'Gambia Police Force',
    assignedDriver: {
      name: 'Inspector Modou Jallow',
      phone: '+220 771 9920',
      licenseNumber: 'GM-DL-882194',
      safetyScore: 94,
    },
    currentFuelPercentage: 76,
    speedKmh: 42,
    mileageKm: 34120,
    status: 'moving',
    currentLocation: {
      address: 'Kairaba Avenue, Fajara, Kanifing Municipality',
    },
  };

  const handlePanicSOS = () => {
    onTriggerSOS(veh.id);
    setSosSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-slate-900 rounded-[36px] p-4 shadow-2xl border-4 border-slate-700 overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Phone Notch & Top Status */}
        <div className="flex items-center justify-between px-3 py-1 border-b border-slate-800 text-[10px] font-mono text-slate-400">
          <span>09:41 AM</span>
          <div className="w-20 h-3.5 bg-slate-950 rounded-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
          </div>
          <div className="flex items-center space-x-1">
            <span>GovNet LTE</span>
            <span>100%</span>
          </div>
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between mt-2 px-1 pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              QTS Driver Companion App
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Phone Screen Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1 text-xs">
          {/* Driver Card */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-300 font-bold text-xs">
                  MJ
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{veh.assignedDriver.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">{veh.assignedDriver.licenseNumber}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-mono font-bold">
                Score: {veh.assignedDriver.safetyScore}
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
              <span>{veh.regNumber} ({veh.model})</span>
              <span className="text-cyan-400 font-medium">{veh.department}</span>
            </div>
          </div>

          {/* Big Panic SOS Switch */}
          <div className="p-3 bg-red-950/40 rounded-2xl border border-red-800/60 text-center space-y-2">
            <div className="flex items-center justify-center space-x-1.5 text-red-400 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>EMERGENCY POLICE PANIC SWITCH</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Instantly transmits high-priority duress signal to National Police NOC
            </p>
            <button
              id="btn-mobile-panic"
              onClick={handlePanicSOS}
              className={`w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg transition-all ${
                sosSent
                  ? 'bg-emerald-600 text-white animate-bounce'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40'
              }`}
            >
              {sosSent ? '✓ SOS BEACON TRANSMITTED' : '🚨 PRESS SOS PANIC (HOLD 2s)'}
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-2">
              <Fuel className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-[9px] text-slate-500 block uppercase">Fuel Level</span>
                <span className="font-mono font-bold text-white text-xs">{veh.currentFuelPercentage}%</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[9px] text-slate-500 block uppercase">Odometer</span>
                <span className="font-mono font-bold text-white text-xs">{veh.mileageKm.toLocaleString()} km</span>
              </div>
            </div>
          </div>

          {/* Pre-Trip Inspection Digital Checklist */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-[11px] flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                Pre-Trip Vehicle Inspection
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Passed</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              {Object.entries(checklist).map(([key, val]) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={() => setChecklist({ ...checklist, [key]: !val })}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')} Verified</span>
                </label>
              ))}
            </div>
          </div>

          {/* Digital Incident / Fuel Receipt Form */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <span className="font-semibold text-white text-[11px]">Report Operational Discrepancy</span>
            <input
              type="text"
              placeholder="e.g. Fuel purchase coupon #8841..."
              value={incidentReport}
              onChange={(e) => setIncidentReport(e.target.value)}
              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => {
                if (!incidentReport) return;
                setIncidentSent(true);
                setTimeout(() => setIncidentSent(false), 2500);
                setIncidentReport('');
              }}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center space-x-1"
            >
              <Send className="w-3 h-3 text-cyan-400" />
              <span>{incidentSent ? 'Submitted to Fleet NOC' : 'Transmit Field Note'}</span>
            </button>
          </div>
        </div>

        {/* Phone Bottom Home Bar */}
        <div className="pt-2 flex justify-center">
          <div className="w-32 h-1 bg-slate-700 rounded-full" />
        </div>
      </div>
    </div>
  );
};
