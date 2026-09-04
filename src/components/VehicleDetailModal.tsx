import React from 'react';
import { 
  X, 
  Car, 
  User, 
  Phone, 
  ShieldCheck, 
  Fuel, 
  BatteryCharging, 
  Radio, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Wrench, 
  Cpu, 
  MapPin, 
  Gauge, 
  Flame, 
  Activity,
  Play
} from 'lucide-react';
import { Vehicle } from '../types/fleet';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onTriggerSOS: (vehicleId: string) => void;
  onTriggerFuelTheft: (vehicleId: string) => void;
  onTriggerRefuel: (vehicleId: string) => void;
  onPlayTrip?: (vehicle: Vehicle) => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  onClose,
  onTriggerSOS,
  onTriggerFuelTheft,
  onTriggerRefuel,
  onPlayTrip,
}) => {
  if (!vehicle) return null;

  const isRegistrationExpired = new Date(vehicle.registrationExpiry) < new Date();
  const kmToNextService = vehicle.nextServiceKm - vehicle.mileageKm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700 flex items-center justify-center">
              <Car className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono">{vehicle.regNumber}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {vehicle.assetNumber}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  vehicle.status === 'moving' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                  vehicle.status === 'emergency' ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse' :
                  vehicle.status === 'idling' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                  'bg-blue-950 text-blue-300 border border-blue-800'
                }`}>
                  {vehicle.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {vehicle.year} {vehicle.make} {vehicle.model} • {vehicle.department}
              </p>
            </div>
          </div>

          <button
            id="btn-close-vehicle-dossier"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Live Telemetry Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-medium block">Current Velocity</span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-2xl font-mono font-bold text-white">{vehicle.speedKmh}</span>
                <span className="text-xs text-slate-400">km/h</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Heading: {vehicle.heading}°</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-medium block">Trimago Fuel Sensor</span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-2xl font-mono font-bold text-cyan-300">{vehicle.currentFuelPercentage}%</span>
                <span className="text-xs text-slate-400">({vehicle.currentFuelLiters}L)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Capacity: {vehicle.tankCapacityLiters}L</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-medium block">Ignition & Power</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  vehicle.ignition ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                }`}>
                  {vehicle.ignition ? 'IGNITION ON' : 'IGNITION OFF'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">Batt: {vehicle.batteryVoltage}V</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-medium block">Satellites & Signal</span>
              <div className="flex items-center space-x-2 mt-1 text-xs font-mono text-emerald-400">
                <Radio className="w-3.5 h-3.5" />
                <span>{vehicle.satellites} Satellites</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">GSM 4G: {vehicle.gsmSignal}%</span>
            </div>
          </div>

          {/* Location details */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <span className="font-semibold text-white block">Current Geolocation Coordinate</span>
              <p className="text-slate-300 mt-0.5">{vehicle.currentLocation.address}</p>
              <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500 mt-1">
                <span>Lat: {vehicle.currentLocation.lat}</span>
                <span>Lng: {vehicle.currentLocation.lng}</span>
                <span>Updated: {vehicle.lastCommunication}</span>
              </div>
            </div>
          </div>

          {/* Assigned Driver Profile */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center space-x-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span>Assigned Government Driver</span>
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-base text-cyan-400">
                  {vehicle.assignedDriver.name.charAt(0)}
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">{vehicle.assignedDriver.name}</span>
                  <span className="text-xs text-slate-400">Driver License: {vehicle.assignedDriver.licenseNumber}</span>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{vehicle.assignedDriver.phone}</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-center sm:text-right">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Driver Safety Score</span>
                <div className="text-xl font-mono font-bold text-emerald-400">
                  {vehicle.assignedDriver.safetyScore}/100
                </div>
                <span className="text-[10px] text-slate-400">Class: Compliant Operator</span>
              </div>
            </div>
          </div>

          {/* Telematics Device & Compliance Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Device Hardware Info */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
              <h3 className="font-bold text-white flex items-center space-x-1.5 border-b border-slate-800 pb-2 mb-2">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>SinoTrack GPS Tracker & Telematics</span>
              </h3>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Hardware Model:</span>
                <span className="font-mono text-cyan-300 font-semibold text-right max-w-[200px] truncate">
                  {vehicle.hardwareModel || 'SinoTrack ST-906L 4G'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SinoTrack IMEI:</span>
                <span className="font-mono text-white">{vehicle.deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SIM Identifier:</span>
                <span className="font-mono text-white">{vehicle.simNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Odometer:</span>
                <span className="font-mono text-white">{vehicle.mileageKm.toLocaleString()} KM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Today's Distance:</span>
                <span className="font-mono text-white">{vehicle.dailyKm} KM</span>
              </div>
            </div>

            {/* Compliance & Expiries */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
              <h3 className="font-bold text-white flex items-center space-x-1.5 border-b border-slate-800 pb-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Statutory Compliance & Service</span>
              </h3>
              <div className="flex justify-between">
                <span className="text-slate-400">Registration Expiry:</span>
                <span className={`font-mono ${isRegistrationExpired ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                  {vehicle.registrationExpiry} {isRegistrationExpired && '(EXPIRED)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Insurance Expiry:</span>
                <span className="font-mono text-slate-300">{vehicle.insuranceExpiry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Next Scheduled Service:</span>
                <span className="font-mono text-cyan-300">{vehicle.nextServiceKm.toLocaleString()} KM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Countdown to Service:</span>
                <span className={`font-mono ${kmToNextService < 1000 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                  {kmToNextService.toLocaleString()} KM remaining
                </span>
              </div>
            </div>
          </div>

          {/* Quick Simulation & Action Buttons */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Fleet Operations & Intelligence Controls
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-dossier-sos"
                onClick={() => onTriggerSOS(vehicle.id)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Trigger Emergency SOS</span>
              </button>

              <button
                id="btn-dossier-siphon"
                onClick={() => onTriggerFuelTheft(vehicle.id)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Fuel Siphoning</span>
              </button>

              <button
                id="btn-dossier-refuel"
                onClick={() => onTriggerRefuel(vehicle.id)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                <span>Log +45L Refuel</span>
              </button>

              {onPlayTrip && (
                <button
                  id="btn-dossier-replay-trip"
                  onClick={() => onPlayTrip(vehicle)}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer ml-auto"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Replay Recorded Trip</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">Audit Serial: QTS-GOV-REG-{vehicle.id}</span>
          <button
            id="btn-close-dossier-bottom"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
