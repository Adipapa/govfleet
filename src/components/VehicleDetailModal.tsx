import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Calendar, Car, Clock3, Cpu, Fuel, Gauge, MapPin, Phone, Play, Radio, ShieldCheck, User, Wrench, X } from 'lucide-react';
import { Vehicle } from '../types/fleet';
import { getAlerts, getTrips, getVehicleDevice, getVehicleDriverAssignments, type AlertListResponse, type DeviceApiRow, type DriverAssignment, type TripApiRow } from '../services/api';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onTriggerSOS: (vehicleId: string) => void;
  onTriggerFuelTheft: (vehicleId: string) => void;
  onTriggerRefuel: (vehicleId: string) => void;
  onPlayTrip?: (vehicle: Vehicle) => void;
}

const statusClasses: Record<Vehicle['status'], string> = {
  moving: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  stopped: 'bg-blue-950 text-blue-300 border-blue-800',
  idling: 'bg-amber-950 text-amber-300 border-amber-800',
  parked: 'bg-slate-800 text-slate-300 border-slate-700',
  offline: 'bg-slate-800 text-slate-400 border-slate-700',
  no_gps: 'bg-orange-950 text-orange-300 border-orange-800',
  emergency: 'bg-red-950 text-red-300 border-red-800 animate-pulse',
  unauthorized: 'bg-red-950 text-red-300 border-red-800',
};

function formatDuration(seconds: number | string | null | undefined) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function Metric({ label, value, suffix, icon: Icon }: { label: string; value: React.ReactNode; suffix?: string; icon: React.ElementType }) {
  return <div className="bg-slate-950 rounded-xl border border-slate-800 p-3">
    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-semibold"><Icon className="w-3.5 h-3.5 text-cyan-400" />{label}</div>
    <div className="mt-1 text-xl font-mono font-bold text-white">{value}<span className="ml-1 text-xs text-slate-500 font-normal">{suffix}</span></div>
  </div>;
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return <section className="bg-slate-950 rounded-xl border border-slate-800 p-4">
    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white mb-3"><Icon className="w-4 h-4 text-cyan-400" />{title}</h3>
    {children}
  </section>;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({ vehicle, onClose, onTriggerSOS, onTriggerFuelTheft, onTriggerRefuel, onPlayTrip }) => {
  const [driver, setDriver] = useState<DriverAssignment | null>(null);
  const [device, setDevice] = useState<DeviceApiRow | null>(null);
  const [trips, setTrips] = useState<TripApiRow[]>([]);
  const [alerts, setAlerts] = useState<AlertListResponse['data']>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!vehicle) return;
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    Promise.allSettled([
      getVehicleDriverAssignments(vehicle.id),
      getVehicleDevice(vehicle.id),
      getTrips({ vehicleId: vehicle.id, limit: 5 }),
      getAlerts({ vehicleId: vehicle.id, limit: 5 }),
    ]).then(([driverResult, deviceResult, tripsResult, alertsResult]) => {
      if (cancelled) return;
      if (driverResult.status === 'fulfilled') setDriver(driverResult.value.data.find((item) => item.active) || null);
      if (deviceResult.status === 'fulfilled') setDevice(deviceResult.value);
      if (tripsResult.status === 'fulfilled') setTrips(tripsResult.value.data);
      if (alertsResult.status === 'fulfilled') setAlerts(alertsResult.value.data);
      const failures = [driverResult, deviceResult, tripsResult, alertsResult].filter((result) => result.status === 'rejected');
      if (failures.length === 4) setLoadError('Operational history could not be loaded. Live telemetry remains available.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [vehicle?.id]);

  const compliance = useMemo(() => {
    if (!vehicle) return { registrationExpired: false, serviceKm: 0 };
    return { registrationExpired: Boolean(vehicle.registrationExpiry) && new Date(vehicle.registrationExpiry) < new Date(), serviceKm: vehicle.nextServiceKm - vehicle.mileageKm };
  }, [vehicle]);

  if (!vehicle) return null;
  const assignedName = driver?.full_name || vehicle.assignedDriver.name || 'Unassigned';
  const fuelPercent = Math.max(0, Math.min(100, vehicle.currentFuelPercentage));

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
    <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
      <header className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700 flex items-center justify-center"><Car className="w-5 h-5 text-cyan-400" /></div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold font-mono text-white">{vehicle.regNumber}</h2><span className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono">{vehicle.assetNumber || 'NO ASSET ID'}</span><span className={`px-2 py-1 rounded border text-[10px] font-bold uppercase ${statusClasses[vehicle.status]}`}>{vehicle.status.replace('_', ' ')}</span></div><p className="text-xs text-slate-400 mt-0.5">{vehicle.year} {vehicle.make} {vehicle.model} • {vehicle.department}</p></div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"><X className="w-5 h-5" /></button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {loadError && <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs text-amber-300">{loadError}</div>}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Metric label="Speed" value={Math.round(vehicle.speedKmh)} suffix="km/h" icon={Gauge} />
          <Metric label="Fuel" value={`${fuelPercent}%`} suffix={`${vehicle.currentFuelLiters}L`} icon={Fuel} />
          <Metric label="Odometer" value={vehicle.mileageKm.toLocaleString()} suffix="km" icon={Activity} />
          <Metric label="Ignition" value={vehicle.ignition ? 'ON' : 'OFF'} icon={Radio} />
          <Metric label="GPS" value={vehicle.gpsStatus} icon={MapPin} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><Section title="Live vehicle location" icon={MapPin}><div className="rounded-lg border border-slate-800 bg-slate-900 p-4"><div className="text-sm text-white">{vehicle.currentLocation.address || 'Coordinate position'}</div><div className="mt-2 flex flex-wrap gap-4 text-[11px] font-mono text-slate-400"><span>LAT {vehicle.currentLocation.lat.toFixed(6)}</span><span>LNG {vehicle.currentLocation.lng.toFixed(6)}</span><span>HEADING {Math.round(vehicle.heading)}°</span><span>UPDATED {formatDate(vehicle.lastCommunication)}</span></div></div></Section></div>
          <Section title="Connectivity" icon={Radio}><div className="space-y-2 text-xs"><Info label="GPS status" value={vehicle.gpsStatus} /><Info label="Satellites" value={String(vehicle.satellites)} /><Info label="Cellular signal" value={`${vehicle.gsmSignal}%`} /><Info label="Battery" value={`${vehicle.batteryVoltage || '—'} V`} /></div></Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Assigned driver" icon={User}><div className="flex items-center justify-between gap-4"><div><div className="font-semibold text-white">{assignedName}</div><div className="text-xs text-slate-400 mt-1">Employee: {driver?.employee_number || '—'}</div><div className="text-xs text-slate-400">Licence: {driver?.licence_number || vehicle.assignedDriver.licenseNumber || '—'}</div><div className="flex items-center gap-1 text-xs text-slate-400 mt-1"><Phone className="w-3 h-3" />{driver?.phone || vehicle.assignedDriver.phone || '—'}</div></div><div className="text-right"><div className="text-[10px] text-slate-500 uppercase">Safety score</div><div className="text-2xl font-mono font-bold text-emerald-400">{vehicle.assignedDriver.safetyScore}/100</div><div className="text-[10px] text-slate-500">Live scoring module</div></div></div></Section>
          <Section title="Telematics device" icon={Cpu}><div className="space-y-2 text-xs"><Info label="Identifier" value={device?.device_identifier || vehicle.deviceId || 'Unassigned'} mono /><Info label="Manufacturer" value={device?.manufacturer || '—'} /><Info label="Model" value={device?.model || vehicle.hardwareModel || '—'} /><Info label="Protocol" value={device?.protocol || '—'} /><Info label="Firmware" value={device?.firmware_version || '—'} /><Info label="Device status" value={device?.status || '—'} /><Info label="Last heartbeat" value={formatDate(device?.last_heartbeat_at)} /></div></Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Trip history" icon={Clock3}>{loading ? <p className="text-xs text-slate-500">Loading trips…</p> : trips.length === 0 ? <p className="text-xs text-slate-500">No recorded trips for this vehicle.</p> : <div className="space-y-2">{trips.map((trip) => <div key={trip.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs"><div><div className="font-mono text-white">{formatDate(trip.started_at)}</div><div className="text-slate-500">{trip.driver_name || 'Unassigned driver'} • {formatDuration(trip.duration_seconds)}</div></div><div className="text-right"><div className="font-mono text-cyan-300">{Number(trip.distance_km).toFixed(1)} km</div><div className="text-slate-500">Max {Number(trip.max_speed_kmh || 0).toFixed(0)} km/h</div></div></div>)}</div>}</Section>
          <Section title="Recent alerts" icon={AlertTriangle}>{loading ? <p className="text-xs text-slate-500">Loading alerts…</p> : alerts.length === 0 ? <p className="text-xs text-slate-500">No recent alerts.</p> : <div className="space-y-2">{alerts.map((alert) => <div key={alert.id} className="rounded-lg border border-slate-800 bg-slate-900 p-2.5"><div className="flex justify-between gap-2"><span className="text-xs font-semibold text-white">{alert.title}</span><span className="text-[10px] uppercase text-amber-300">{alert.severity}</span></div><div className="text-[11px] text-slate-500 mt-1">{formatDate(alert.timestamp)}</div></div>)}</div>}</Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Compliance & service" icon={ShieldCheck}><div className="space-y-2 text-xs"><Info label="Registration expiry" value={`${vehicle.registrationExpiry || '—'}${compliance.registrationExpired ? ' • EXPIRED' : ''}`} /><Info label="Insurance expiry" value={vehicle.insuranceExpiry || '—'} /><Info label="Next service" value={vehicle.nextServiceKm ? `${vehicle.nextServiceKm.toLocaleString()} km` : 'Not configured'} /><Info label="Service countdown" value={vehicle.nextServiceKm ? `${Math.max(0, compliance.serviceKm).toLocaleString()} km remaining` : 'Not configured'} /><Info label="Last service" value={vehicle.lastServiceDate || '—'} /></div></Section>
          <Section title="Utilization snapshot" icon={Activity}><div className="grid grid-cols-2 gap-3"><Mini label="Today distance" value={`${vehicle.dailyKm} km`} /><Mini label="Working hours" value={`${vehicle.workingHoursToday} h`} /><Mini label="Idle hours" value={`${vehicle.idleHoursToday} h`} /><Mini label="After-hours use" value={vehicle.afterHoursUsageDetected ? 'Detected' : 'None'} /></div></Section>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80"><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Fleet operations</div><div className="flex flex-wrap gap-2"><button onClick={() => onTriggerSOS(vehicle.id)} className="flex items-center gap-1.5 px-3 py-2 bg-red-950 border border-red-700 text-red-200 rounded-lg text-xs font-semibold"><AlertTriangle className="w-3.5 h-3.5" />Emergency SOS</button><button onClick={() => onTriggerFuelTheft(vehicle.id)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-950 border border-amber-700 text-amber-200 rounded-lg text-xs font-semibold"><Fuel className="w-3.5 h-3.5" />Fuel event test</button><button onClick={() => onTriggerRefuel(vehicle.id)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950 border border-emerald-700 text-emerald-200 rounded-lg text-xs font-semibold"><Fuel className="w-3.5 h-3.5" />Refuel test</button>{onPlayTrip && <button onClick={() => onPlayTrip(vehicle)} className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-cyan-950 border border-cyan-700 text-cyan-200 rounded-lg text-xs font-semibold"><Play className="w-3.5 h-3.5" />Replay trip</button>}</div></div>
      </main>

      <footer className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono"><span>QTS-GOV-FLEET • VEHICLE {vehicle.id}</span><button onClick={onClose} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-sans text-xs">Close dossier</button></footer>
    </div>
  </div>;
};

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{label}</span><span className={`${mono ? 'font-mono' : ''} text-slate-200 text-right truncate max-w-[65%]`}>{value}</span></div>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-900 border border-slate-800 p-3"><div className="text-[10px] text-slate-500 uppercase">{label}</div><div className="text-sm font-mono font-semibold text-white mt-1">{value}</div></div>; }

export default VehicleDetailModal;
