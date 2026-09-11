import React, { useState, useEffect } from 'react';
import { LogOut, UserCircle } from 'lucide-react';
import { TelemetryEngine } from './services/telemetryEngine';
import { Vehicle, Geofence, AlertEvent, Trip, FuelLogEvent, MaintenanceItem, AuditLog, UserRole, GovernmentAgency } from './types/fleet';
import { ApiUser, getAccessToken, getCurrentUser, logout } from './services/api';
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
import { DeviceRegistrationView } from './components/DeviceRegistrationView';
import { DriverMobileModal } from './components/DriverMobileModal';
import { LoginView } from './components/LoginView';

export function App() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
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
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [activePlaybackTrip, setActivePlaybackTrip] = useState<Trip | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setAuthLoading(false); return; }
    void getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      if (currentUser.agencyId) setSelectedAgency('All Agencies');
    }).catch(() => setUser(null)).finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = engine.subscribe((state) => {
      setVehicles(state.vehicles); setAlerts(state.alerts); setFuelLogs(state.fuelLogs); setAuditLogs(state.auditLogs); setGeofences(state.geofences); setMaintenance(state.maintenance);
      if (state.trips) setTrips(state.trips);
    });
    return () => unsubscribe();
  }, [engine, user]);

  const canSelectAnyAgency = user?.roles.includes('super_admin') ?? false;
  const effectiveAgency = canSelectAnyAgency || !user?.agencyId ? selectedAgency : 'All Agencies';
  const filteredVehicles = vehicles.filter((vehicle) => effectiveAgency === 'All Agencies' || vehicle.department === effectiveAgency);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null;

  const handleAuthenticated = async () => {
    try { const currentUser = await getCurrentUser(); setUser(currentUser); if (!currentUser.agencyId) setSelectedAgency('All Agencies'); setActiveTab('overview'); } catch { setUser(null); }
  };
  const handleLogout = async () => { await logout(); setUser(null); setSelectedVehicleId(null); setIsDossierOpen(false); setActivePlaybackTrip(null); setActiveTab('overview'); };
  const handleSelectVehicle = (id: string) => { setSelectedVehicleId(id); setIsDossierOpen(true); };
  const handleNavigateToTracking = (vehicleId?: string) => { if (vehicleId) setSelectedVehicleId(vehicleId); setActiveTab('tracking'); };
  const handleTriggerSOS = (vehicleId: string) => { engine.triggerSOS(vehicleId); };
  const handleTriggerFuelTheft = (vehicleId: string) => { engine.simulateFuelDrop(vehicleId, 28); };
  const handleTriggerRefuel = (vehicleId: string) => { engine.simulateRefuel(vehicleId, 45); };
  const handleAcknowledgeAlert = (alertId: string) => { engine.acknowledgeAlert(alertId, user?.fullName || 'Authenticated User'); };
  const handleDispatchPolice = (alertId: string) => { engine.dispatchPolice(alertId); };
  const handleAddGeofence = (geo: Geofence) => { engine.addGeofence(geo); };
  const handleDeleteGeofence = (id: string) => { engine.deleteGeofence(id); };
  const handleAddMaintenance = (item: MaintenanceItem) => { engine.addMaintenance(item); };
  const handleReplayVehicleTrip = (vehicle: Vehicle) => { const existingTrip = trips.find((trip) => trip.vehicleReg === vehicle.regNumber) || trips[0]; setIsDossierOpen(false); setActivePlaybackTrip(existingTrip); };
  const handleSetSimulationSpeed = (speed: number) => { setSimulationSpeed(speed); engine.setSimulationSpeed(speed); };

  if (authLoading) return <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center text-slate-400"><div className="flex items-center gap-3 text-sm"><div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />Verifying secure session...</div></div>;
  if (!user) return <LoginView onAuthenticated={handleAuthenticated} />;

  return (
    <div className="flex flex-row h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} selectedAgency={effectiveAgency} setSelectedAgency={canSelectAnyAgency ? setSelectedAgency : () => undefined} currentRole={(user.roles[0] || 'fleet_admin') as UserRole} setCurrentRole={() => undefined} activeAlerts={alerts} alertCount={alerts.length} onOpenAlerts={() => setActiveTab('alerts')} onOpenMobileApp={() => setIsMobileModalOpen(true)} onTriggerSOS={() => { const target = filteredVehicles[0] || vehicles[0]; if (target) handleTriggerSOS(target.id); }} onSimulateSOS={() => { const target = filteredVehicles[0] || vehicles[0]; if (target) handleTriggerSOS(target.id); }} onTriggerFuelTheft={() => { const target = filteredVehicles[1] || filteredVehicles[0] || vehicles[0]; if (target) handleTriggerFuelTheft(target.id); }} onSimulateFuelTheft={() => { const target = filteredVehicles[1] || filteredVehicles[0] || vehicles[0]; if (target) handleTriggerFuelTheft(target.id); }} simulationSpeed={simulationSpeed} setSimulationSpeed={handleSetSimulationSpeed} />
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 bg-slate-950">
        {(activeTab === 'overview' || activeTab === 'dashboard') && <DashboardOverview vehicles={filteredVehicles} alerts={alerts} fuelLogs={fuelLogs} selectedAgency={effectiveAgency} onNavigateToTracking={handleNavigateToTracking} onOpenAlerts={() => setActiveTab('alerts')} onOpenFuelIntelligence={() => setActiveTab('fuel')} onOpenDriverSafety={() => setActiveTab('safety')} />}
        {activeTab === 'tracking' && <div className="flex-1 flex flex-col md:flex-row h-full w-full overflow-hidden relative"><div className="w-full md:w-80 lg:w-96 h-64 md:h-full z-10 shrink-0 border-r border-slate-800 bg-slate-950 shadow-2xl"><FleetListPanel vehicles={filteredVehicles} selectedVehicleId={selectedVehicleId} onSelectVehicle={(id) => setSelectedVehicleId(id)} onOpenDossier={(vehicle) => { setSelectedVehicleId(vehicle.id); setIsDossierOpen(true); }} onInspectVehicle={handleSelectVehicle} /></div><div className="flex-1 h-full relative"><MapView vehicles={filteredVehicles} geofences={geofences} selectedVehicleId={selectedVehicleId} onSelectVehicle={(id) => setSelectedVehicleId(id)} onOpenVehicleDossier={(vehicle) => { setSelectedVehicleId(vehicle.id); setIsDossierOpen(true); }} onReplayTrip={handleReplayVehicleTrip} /></div></div>}
        {(activeTab === 'fleet' || activeTab === 'intelligence') && <FleetRegistryView vehicles={filteredVehicles} onSelectVehicle={handleSelectVehicle} onOpenDossier={(vehicle) => { setSelectedVehicleId(vehicle.id); setIsDossierOpen(true); }} onNavigateToMap={handleNavigateToTracking} />}
        {activeTab === 'fuel' && <FuelMonitoringView vehicles={filteredVehicles} fuelLogs={fuelLogs} onTriggerFuelTheft={handleTriggerFuelTheft} onTriggerRefuel={handleTriggerRefuel} onSelectVehicle={handleSelectVehicle} />}
        {activeTab === 'geofences' && <GeofencingView geofences={geofences} onAddGeofence={handleAddGeofence} onDeleteGeofence={handleDeleteGeofence} onViewOnMap={() => setActiveTab('tracking')} />}
        {(activeTab === 'safety' || activeTab === 'driver') && <DriverSafetyView vehicles={filteredVehicles} onSelectVehicle={handleSelectVehicle} />}
        {activeTab === 'maintenance' && <MaintenanceView maintenanceList={maintenance} vehicles={filteredVehicles} onAddMaintenance={handleAddMaintenance} onSelectVehicle={handleSelectVehicle} />}
        {activeTab === 'devices' && <div className="flex-1 overflow-y-auto"><DeviceRegistrationView /><GpsDevicesView vehicles={filteredVehicles} /></div>}
        {activeTab === 'alerts' && <AlertsView alerts={alerts} onAcknowledgeAlert={handleAcknowledgeAlert} onDispatchPolice={handleDispatchPolice} onLocateOnMap={handleNavigateToTracking} />}
        {activeTab === 'reports' && <ReportsView trips={trips} vehicles={filteredVehicles} onPlayTrip={(trip) => setActivePlaybackTrip(trip)} />}
        {(activeTab === 'audit' || activeTab === 'api') && <AuditSecurityView auditLogs={auditLogs} />}
      </main>
      <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2"><div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl"><UserCircle className="w-5 h-5 text-cyan-400" /><div className="leading-tight"><div className="text-xs font-semibold text-white">{user.fullName}</div><div className="text-[9px] text-slate-400 font-mono">{user.roles.join(' · ')}</div></div></div><button type="button" onClick={handleLogout} title="Sign out" aria-label="Sign out" className="flex items-center gap-2 px-3 py-2 bg-red-950/80 border border-red-800 rounded-lg text-red-300 hover:bg-red-900 hover:text-white transition-colors shadow-2xl"><LogOut className="w-4 h-4" /><span className="text-xs font-semibold">Logout</span></button></div>
      {isDossierOpen && selectedVehicle && <VehicleDetailModal vehicle={selectedVehicle} onClose={() => setIsDossierOpen(false)} onTriggerSOS={handleTriggerSOS} onTriggerFuelTheft={handleTriggerFuelTheft} onTriggerRefuel={handleTriggerRefuel} onPlayTrip={handleReplayVehicleTrip} />}
      {activePlaybackTrip && <TripPlaybackModal trip={activePlaybackTrip} vehicle={vehicles.find((vehicle) => vehicle.regNumber === activePlaybackTrip.vehicleReg)} onClose={() => setActivePlaybackTrip(null)} />}
      {isMobileModalOpen && <DriverMobileModal vehicle={selectedVehicle || filteredVehicles[0] || vehicles[0]} onClose={() => setIsMobileModalOpen(false)} onTriggerSOS={handleTriggerSOS} />}
    </div>
  );
}

export default App;
