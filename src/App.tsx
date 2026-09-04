import React, { useState, useEffect } from 'react';
import { TelemetryEngine } from './services/telemetryEngine';
import { getAccessToken, getVehicles, getLatestTelemetry, getAlerts, mapVehicle, subscribeToFleetEvents, acknowledgeAlert as apiAcknowledgeAlert } from './services/api';
import { Vehicle, Geofence, AlertEvent, Trip, FuelLogEvent, MaintenanceItem, AuditLog, GovernmentAgency, UserRole } from './types/fleet';
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

function mapApiAlert(row: any): AlertEvent {
  return { id: String(row.id), vehicleId: String(row.vehicleId), vehicleReg: String(row.registrationNumber || ''), department: 'All Agencies', type: row.type, severity: row.severity, title: String(row.title || row.type), message: String(row.message || ''), timestamp: String(row.occurredAt), location: { lat: Number(row.metadata?.latitude || 0), lng: Number(row.metadata?.longitude || 0), address: '' }, acknowledged: Boolean(row.acknowledgedAt), dispatchedToPolice: Boolean(row.metadata?.dispatchedToPolice) };
}

export function App() {
  const [engine] = useState(() => new TelemetryEngine());
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => engine.getVehicles());
  const [alerts, setAlerts] = useState<AlertEvent[]>(() => engine.getAlerts());
  const [fuelLogs, setFuelLogs] = useState<FuelLogEvent[]>(() => engine.getFuelLogs());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => engine.getAuditLogs());
  const [geofences, setGeofences] = useState<Geofence[]>(() => engine.getGeofences());
  const [trips, setTrips] = useState<Trip[]>(() => engine.getTrips());
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>(() => engine.getMaintenance());
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedAgency, setSelectedAgency] = useState<GovernmentAgency>('All Agencies');
  const [currentRole, setCurrentRole] = useState<UserRole>('fleet_admin');
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [activePlaybackTrip, setActivePlaybackTrip] = useState<Trip | null>(null);
  const realMode = Boolean(getAccessToken());

  useEffect(() => {
    if (realMode) return;
    return engine.subscribe((state) => { setVehicles(state.vehicles); setAlerts(state.alerts); setFuelLogs(state.fuelLogs); setAuditLogs(state.auditLogs); setGeofences(state.geofences); setMaintenance(state.maintenance); if (state.trips) setTrips(state.trips); });
  }, [engine, realMode]);

  useEffect(() => {
    if (!realMode) return;
    let disposed = false;
    const load = async () => {
      try {
        const [vehicleResult, telemetryResult, alertResult] = await Promise.all([getVehicles({ page: 1, limit: 100 }), getLatestTelemetry(), getAlerts({ page: 1, limit: 100 })]);
        if (disposed) return;
        const telemetryByVehicle = new Map(telemetryResult.data.map((row) => [String(row.vehicle_id), row]));
        setVehicles(vehicleResult.data.map((row) => mapVehicle(row, telemetryByVehicle.get(row.id))));
        setAlerts(alertResult.data.map(mapApiAlert));
      } catch (error) { console.error('QTS backend load failed', error); }
    };
    void load();
    const unsubscribe = subscribeToFleetEvents((event) => {
      if (event.type === 'telemetry.updated' || event.type === 'vehicle.updated') void load();
      if (event.type === 'alert.created') setAlerts((current) => [mapApiAlert(event.payload), ...current].slice(0, 100));
    }, (error) => console.error('QTS realtime stream error', error));
    return () => { disposed = true; unsubscribe(); };
  }, [realMode]);

  const filteredVehicles = vehicles.filter((v) => selectedAgency === 'All Agencies' || v.department === selectedAgency);
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;
  const handleSelectVehicle = (id: string) => { setSelectedVehicleId(id); setIsDossierOpen(true); };
  const handleNavigateToTracking = (vehicleId?: string) => { if (vehicleId) setSelectedVehicleId(vehicleId); setActiveTab('tracking'); };
  const handleTriggerSOS = (vehicleId: string) => { if (!realMode) engine.triggerSOS(vehicleId); };
  const handleTriggerFuelTheft = (vehicleId: string) => { if (!realMode) engine.simulateFuelDrop(vehicleId, 28); };
  const handleTriggerRefuel = (vehicleId: string) => { if (!realMode) engine.simulateRefuel(vehicleId, 45); };
  const handleAcknowledgeAlert = (alertId: string) => {
    if (realMode) void apiAcknowledgeAlert(alertId).then(() => setAlerts((items) => items.map((a) => a.id === alertId ? { ...a, acknowledged: true } : a))).catch(console.error);
    else engine.acknowledgeAlert(alertId, 'Col. Ousman Touray');
  };
  const handleDispatchPolice = (alertId: string) => { if (!realMode) engine.dispatchPolice(alertId); };
  const handleAddGeofence = (geo: Geofence) => { if (!realMode) engine.addGeofence(geo); };
  const handleDeleteGeofence = (id: string) => { if (!realMode) engine.deleteGeofence(id); };
  const handleAddMaintenance = (item: MaintenanceItem) => { if (!realMode) engine.addMaintenance(item); };
  const handleReplayVehicleTrip = (vehicle: Vehicle) => { const existingTrip = trips.find(t => t.vehicleReg === vehicle.regNumber) || trips[0]; setIsDossierOpen(false); setActivePlaybackTrip(existingTrip); };
  const handleSetSimulationSpeed = (spd: number) => { setSimulationSpeed(spd); if (!realMode) engine.setSimulationSpeed(spd); };

  return <div className="flex flex-row h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} selectedAgency={selectedAgency} setSelectedAgency={setSelectedAgency} currentRole={currentRole} setCurrentRole={setCurrentRole} activeAlerts={alerts} alertCount={alerts.length} onOpenAlerts={() => setActiveTab('alerts')} onOpenMobileApp={() => setIsMobileModalOpen(true)} onTriggerSOS={() => { const target = filteredVehicles[0] || vehicles[0]; if (target) handleTriggerSOS(target.id); }} onSimulateSOS={() => { const target = filteredVehicles[0] || vehicles[0]; if (target) handleTriggerSOS(target.id); }} onTriggerFuelTheft={() => { const target = filteredVehicles[1] || filteredVehicles[0] || vehicles[0]; if (target) handleTriggerFuelTheft(target.id); }} onSimulateFuelTheft={() => { const target = filteredVehicles[1] || filteredVehicles[0] || vehicles[0]; if (target) handleTriggerFuelTheft(target.id); }} simulationSpeed={simulationSpeed} setSimulationSpeed={handleSetSimulationSpeed} />
    <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 bg-slate-950">
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
    {activePlaybackTrip && <TripPlaybackModal trip={activePlaybackTrip} vehicle={vehicles.find(v => v.regNumber === activePlaybackTrip.vehicleReg)} onClose={() => setActivePlaybackTrip(null)} />}
    {isMobileModalOpen && <DriverMobileModal vehicle={selectedVehicle || filteredVehicles[0] || vehicles[0]} onClose={() => setIsMobileModalOpen(false)} onTriggerSOS={handleTriggerSOS} />}
  </div>;
}

export default App;
