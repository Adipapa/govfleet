import React, { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { TelemetryEngine } from './services/telemetryEngine';
import { getVehicles, getLatestTelemetry, getAlerts, mapVehicle, subscribeToFleetEvents, acknowledgeAlert as apiAcknowledgeAlert, logout as apiLogout, type ApiUser, type FleetEvent } from './services/api';
import { Vehicle, Geofence, AlertEvent, Trip, FuelLogEvent, MaintenanceItem, AuditLog, GovernmentAgency } from './types/fleet';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { FleetListPanel } from './components/FleetListPanel';
import { DashboardOverview } from './components/DashboardOverview';
import { VehicleDetailModal } from './components/VehicleDetailModal';
import { TripPlaybackModal } from './components/TripPlaybackModal';
import { FuelMonitoringView } from './components/FuelMonitoringView';
import { GeofencingView } from './components/GeofencingView';
import { DriverSafetyView } from './components/DriverSafetyView';
import { MaintenanceView } from './components/MaintenanceView';
import { AlertsView } from './components/AlertsView';
import { ReportsView } from './components/ReportsView';
import { AuditSecurityView } from './components/AuditSecurityView';
import { FleetRegistryView } from './components/FleetRegistryView';
import { GpsDevicesView } from './components/GpsDevicesView';
import { DriverMobileModal } from './components/DriverMobileModal';
import { DriverAssignmentModal } from './components/DriverAssignmentModal';

function mapApiAlert(row: any): AlertEvent {
  return {
    id: String(row.id), vehicleId: String(row.vehicleId), vehicleReg: String(row.registrationNumber || ''), department: 'All Agencies',
    type: row.type, severity: row.severity, title: String(row.title || row.type), message: String(row.message || ''), timestamp: String(row.occurredAt),
    location: { lat: Number(row.metadata?.latitude || 0), lng: Number(row.metadata?.longitude || 0), address: '' },
    acknowledged: Boolean(row.acknowledgedAt), dispatchedToPolice: Boolean(row.metadata?.dispatchedToPolice),
  };
}

const VEHICLE_STATUSES: Vehicle['status'][] = ['moving', 'stopped', 'idling', 'parked', 'offline', 'no_gps', 'emergency', 'unauthorized'];

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
}

function applyTelemetryEvent(vehicle: Vehicle, event: FleetEvent): Vehicle {
  const payload = event.payload;
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const speedKmh = Number(payload.speedKmh);
  const heading = Number(payload.heading);
  const odometerKm = Number(payload.odometerKm);
  const fuelLitres = Number(payload.fuelLitres);
  const status = typeof payload.status === 'string' && VEHICLE_STATUSES.includes(payload.status as Vehicle['status'])
    ? payload.status as Vehicle['status']
    : vehicle.status;
  const ignition = asBoolean(payload.ignition, vehicle.ignition);
  const fuel = Number.isFinite(fuelLitres) ? fuelLitres : vehicle.currentFuelLiters;

  return {
    ...vehicle,
    status,
    currentLocation: {
      ...vehicle.currentLocation,
      lat: Number.isFinite(latitude) ? latitude : vehicle.currentLocation.lat,
      lng: Number.isFinite(longitude) ? longitude : vehicle.currentLocation.lng,
    },
    speedKmh: Number.isFinite(speedKmh) ? speedKmh : vehicle.speedKmh,
    heading: Number.isFinite(heading) ? heading : vehicle.heading,
    ignition,
    mileageKm: Number.isFinite(odometerKm) ? odometerKm : vehicle.mileageKm,
    currentFuelLiters: fuel,
    currentFuelPercentage: vehicle.tankCapacityLiters > 0
      ? Math.max(0, Math.min(100, Math.round((fuel / vehicle.tankCapacityLiters) * 100)))
      : vehicle.currentFuelPercentage,
    gpsStatus: 'Connected',
    lastCommunication: event.occurredAt,
  };
}

export function App({ authUser }: { authUser: ApiUser }) {
  const [engine] = useState(() => new TelemetryEngine());
  const realMode = true;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLogEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedAgency] = useState<GovernmentAgency>('All Agencies');
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [isAssignmentOpen, setIsAssignmentOpen] = useState<boolean>(false);
  const [activePlaybackTrip, setActivePlaybackTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFleet = async () => {
    setLoadError(null);
    try {
      const [vehicleResult, telemetryResult, alertResult] = await Promise.all([
        getVehicles({ page: 1, limit: 100 }), getLatestTelemetry(), getAlerts({ page: 1, limit: 100 }),
      ]);
      const telemetryByVehicle = new Map(telemetryResult.data.map((row) => [String(row.vehicle_id), row]));
      setVehicles(vehicleResult.data.map((row) => mapVehicle(row, telemetryByVehicle.get(row.id))));
      setAlerts(alertResult.data.map(mapApiAlert));
    } catch (error) {
      console.error('QTS backend load failed', error);
      setLoadError(error instanceof Error ? error.message : 'Unable to load fleet data');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void loadFleet();
    const unsubscribe = subscribeToFleetEvents((event) => {
      if (event.type === 'telemetry.updated') {
        const vehicleId = String(event.payload.vehicleId || '');
        if (!vehicleId) return;
        setVehicles((current) => current.map((vehicle) => (
          vehicle.id === vehicleId ? applyTelemetryEvent(vehicle, event) : vehicle
        )));
        return;
      }

      if (event.type === 'vehicle.updated') {
        void loadFleet();
        return;
      }

      if (event.type === 'alert.created') {
        setAlerts((current) => [mapApiAlert(event.payload), ...current].slice(0, 100));
      }
    }, (error) => console.error('QTS realtime stream error', error));
    return unsubscribe;
  }, []);

  const filteredVehicles = vehicles;
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;
  const handleSelectVehicle = (id: string) => { setSelectedVehicleId(id); setIsDossierOpen(true); };
  const handleNavigateToTracking = (vehicleId?: string) => { if (vehicleId) setSelectedVehicleId(vehicleId); setActiveTab('tracking'); };
  const handleTriggerSOS = (vehicleId: string) => { if (!realMode) engine.triggerSOS(vehicleId); };
  const handleTriggerFuelTheft = (vehicleId: string) => { if (!realMode) engine.simulateFuelDrop(vehicleId, 28); };
  const handleTriggerRefuel = (vehicleId: string) => { if (!realMode) engine.simulateRefuel(vehicleId, 45); };
  const handleAcknowledgeAlert = (alertId: string) => {
    void apiAcknowledgeAlert(alertId).then(() => setAlerts((items) => items.map((a) => a.id === alertId ? { ...a, acknowledged: true } : a))).catch(console.error);
  };
  const handleDispatchPolice = (_alertId: string) => { /* Backend workflow placeholder. */ };
  const handleAddGeofence = (_geo: Geofence) => { /* API integration pending. */ };
  const handleDeleteGeofence = (_id: string) => { /* API integration pending. */ };
  const handleAddMaintenance = (_item: MaintenanceItem) => { /* API integration pending. */ };
  const handleReplayVehicleTrip = (vehicle: Vehicle) => { const existingTrip = trips.find((t) => t.vehicleReg === vehicle.regNumber) || trips[0]; if (existingTrip) { setIsDossierOpen(false); setActivePlaybackTrip(existingTrip); } };
  const handleSetSimulationSpeed = (spd: number) => { setSimulationSpeed(spd); };
  const handleLogout = async () => { await apiLogout(); window.location.reload(); };
  const refreshAfterAssignment = () => { void loadFleet(); };

  return <div className="flex flex-row h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} selectedAgency={selectedAgency} currentUser={authUser} activeAlerts={alerts} alertCount={alerts.length}
      onOpenAlerts={() => setActiveTab('alerts')} onOpenMobileApp={() => setIsMobileModalOpen(true)}
      onTriggerSOS={() => { const target = filteredVehicles[0]; if (target) handleTriggerSOS(target.id); }}
      onTriggerFuelTheft={() => { const target = filteredVehicles[1] || filteredVehicles[0]; if (target) handleTriggerFuelTheft(target.id); }}
      simulationSpeed={simulationSpeed} setSimulationSpeed={handleSetSimulationSpeed} onLogout={handleLogout} />
    <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 bg-slate-950">
      {loading && <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-cyan-500 animate-pulse" />}
      {loadError && <div className="absolute top-3 right-3 z-30 max-w-md px-4 py-3 rounded-lg border border-red-800 bg-red-950/90 text-red-200 text-xs shadow-xl">Backend connection error: {loadError}</div>}
      {(activeTab === 'overview' || activeTab === 'dashboard') && <DashboardOverview vehicles={filteredVehicles} alerts={alerts} fuelLogs={fuelLogs} selectedAgency={selectedAgency} onNavigateToTracking={handleNavigateToTracking} onOpenAlerts={() => setActiveTab('alerts')} onOpenFuelIntelligence={() => setActiveTab('fuel')} onOpenDriverSafety={() => setActiveTab('safety')} />}
      {activeTab === 'tracking' && <div className="flex-1 flex flex-col md:flex-row h-full w-full overflow-hidden relative"><div className="w-full md:w-80 lg:w-96 h-64 md:h-full z-10 shrink-0 border-r border-slate-800 bg-slate-950 shadow-2xl"><FleetListPanel vehicles={filteredVehicles} selectedVehicleId={selectedVehicleId} onSelectVehicle={(id) => setSelectedVehicleId(id)} onOpenDossier={(veh) => { setSelectedVehicleId(veh.id); setIsDossierOpen(true); }} onInspectVehicle={(id) => handleSelectVehicle(id)} /></div><div className="flex-1 h-full relative"><MapView vehicles={filteredVehicles} geofences={geofences} selectedVehicleId={selectedVehicleId} onSelectVehicle={(id) => setSelectedVehicleId(id)} onOpenVehicleDossier={(veh) => { setSelectedVehicleId(veh.id); setIsDossierOpen(true); }} onReplayTrip={(veh) => handleReplayVehicleTrip(veh)} /></div></div>}
      {(activeTab === 'fleet' || activeTab === 'intelligence') && <FleetRegistryView vehicles={filteredVehicles} onSelectVehicle={handleSelectVehicle} onOpenDossier={(veh) => { setSelectedVehicleId(veh.id); setIsDossierOpen(true); }} onNavigateToMap={handleNavigateToTracking} />}
      {activeTab === 'fuel' && <FuelMonitoringView vehicles={filteredVehicles} fuelLogs={fuelLogs} onTriggerFuelTheft={handleTriggerFuelTheft} onTriggerRefuel={handleTriggerRefuel} onSelectVehicle={handleSelectVehicle} />}
      {activeTab === 'geofences' && <GeofencingView geofences={geofences} onAddGeofence={handleAddGeofence} onDeleteGeofence={handleDeleteGeofence} onViewOnMap={() => setActiveTab('tracking')} />}
      {(activeTab === 'safety' || activeTab === 'driver') && <DriverSafetyView vehicles={filteredVehicles} onSelectVehicle={handleSelectVehicle} />}
      {activeTab === 'maintenance' && <MaintenanceView maintenanceList={maintenance} vehicles={filteredVehicles} onAddMaintenance={handleAddMaintenance} onSelectVehicle={handleSelectVehicle} />}
      {activeTab === 'devices' && <GpsDevicesView vehicles={filteredVehicles} />}
      {activeTab === 'alerts' && <AlertsView alerts={alerts} onAcknowledgeAlert={handleAcknowledgeAlert} onDispatchPolice={handleDispatchPolice} onLocateOnMap={handleNavigateToTracking} />}
      {activeTab === 'reports' && <ReportsView trips={trips} vehicles={filteredVehicles} onPlayTrip={(trip) => setActivePlaybackTrip(trip)} />}
      {(activeTab === 'audit' || activeTab === 'api') && <AuditSecurityView auditLogs={auditLogs} />}
    </main>
    {isDossierOpen && selectedVehicle && <VehicleDetailModal vehicle={selectedVehicle} onClose={() => setIsDossierOpen(false)} onTriggerSOS={handleTriggerSOS} onTriggerFuelTheft={handleTriggerFuelTheft} onTriggerRefuel={handleTriggerRefuel} onPlayTrip={handleReplayVehicleTrip} />}
    {isDossierOpen && selectedVehicle && <button id="btn-manage-driver-assignment" onClick={() => setIsAssignmentOpen(true)} className="fixed bottom-6 right-6 z-[55] flex items-center gap-2 px-4 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-600 border border-cyan-500 text-white text-xs font-bold shadow-2xl"><UserRound className="w-4 h-4" />Manage Driver Assignment</button>}
    {isAssignmentOpen && selectedVehicle && <DriverAssignmentModal vehicle={selectedVehicle} onClose={() => setIsAssignmentOpen(false)} onChanged={refreshAfterAssignment} />}
    {activePlaybackTrip && <TripPlaybackModal trip={activePlaybackTrip} vehicle={vehicles.find((v) => v.regNumber === activePlaybackTrip.vehicleReg)} onClose={() => setActivePlaybackTrip(null)} />}
    {isMobileModalOpen && <DriverMobileModal vehicle={selectedVehicle || filteredVehicles[0] || vehicles[0]} onClose={() => setIsMobileModalOpen(false)} onTriggerSOS={handleTriggerSOS} />}
  </div>;
}

export default App;
