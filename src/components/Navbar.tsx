import React from 'react';
import { 
  Shield, 
  Car, 
  MapPin, 
  Fuel, 
  UserCheck, 
  AlertTriangle, 
  FileText, 
  Wrench, 
  Cpu, 
  FileCheck2, 
  Smartphone, 
  Radio, 
  Search,
  Zap,
  Flame,
  ChevronDown
} from 'lucide-react';
import { UserRole, GovernmentAgency, AlertEvent } from '../types/fleet';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  selectedAgency: GovernmentAgency;
  setSelectedAgency: (agency: GovernmentAgency) => void;
  activeRole?: UserRole;
  currentRole?: UserRole;
  setActiveRole?: (role: UserRole) => void;
  setCurrentRole?: (role: UserRole) => void;
  activeAlerts?: AlertEvent[];
  alertCount?: number;
  onOpenAlerts?: () => void;
  onOpenMobileApp?: () => void;
  onTriggerSOS?: () => void;
  onSimulateSOS?: () => void;
  onTriggerFuelTheft?: () => void;
  onSimulateFuelTheft?: () => void;
  simulationSpeed?: number;
  setSimulationSpeed?: (speed: number) => void;
}

const AGENCIES: GovernmentAgency[] = [
  'All Agencies',
  'Ministry of Transport',
  'Ministry of Health',
  'Gambia Police Force',
  'Ministry of Finance',
  'State House VIP Fleet',
  'National Disaster Mgmt Agency',
];

const ROLES: { id: UserRole; label: string; badge: string; desc: string }[] = [
  { id: 'super_admin', label: 'Super Administrator', badge: 'Full Access', desc: 'System-wide governance, device configs & organizations' },
  { id: 'fleet_admin', label: 'Gov Fleet Administrator', badge: 'Fleet Admin', desc: 'Vehicle registration, driver assignments & reports' },
  { id: 'fleet_manager', label: 'Ministry Fleet Manager', badge: 'Manager', desc: 'Assigned agency vehicles, trips & fuel monitoring' },
  { id: 'security_police', label: 'Security / Police User', badge: 'Police / Law Enf.', desc: 'High-priority tracking, SOS dispatch & vehicle search' },
  { id: 'driver', label: 'Authorized Driver', badge: 'Driver View', desc: 'Assigned vehicle status & maintenance reporting' },
  { id: 'auditor', label: 'State Auditor General', badge: 'Auditor (Read-Only)', desc: 'Tamper-proof logs, utilization & fuel audit reports' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedAgency,
  setSelectedAgency,
  activeRole,
  currentRole,
  setActiveRole,
  setCurrentRole,
  activeAlerts = [],
  alertCount,
  onOpenAlerts,
  onOpenMobileApp,
  onTriggerSOS,
  onSimulateSOS,
  onTriggerFuelTheft,
  onSimulateFuelTheft,
  simulationSpeed = 1,
  setSimulationSpeed,
}) => {
  const alertsList = Array.isArray(activeAlerts) ? activeAlerts : [];
  const criticalCount = alertsList.filter(a => a && a.severity === 'critical' && !a.acknowledged).length;
  const displayAlertCount = alertCount !== undefined ? alertCount : alertsList.length;

  const effectiveRole = activeRole || currentRole || 'fleet_admin';
  const handleRoleChange = (role: UserRole) => {
    if (setActiveRole) setActiveRole(role);
    if (setCurrentRole) setCurrentRole(role);
  };

  const handleSOS = () => {
    if (onTriggerSOS) onTriggerSOS();
    else if (onSimulateSOS) onSimulateSOS();
  };

  const handleFuelTheft = () => {
    if (onTriggerFuelTheft) onTriggerFuelTheft();
    else if (onSimulateFuelTheft) onSimulateFuelTheft();
  };

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 text-slate-100">
      {/* Top Utility & System Security Bar */}
      <div className="px-4 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono font-medium tracking-tight">QTS TELEMATICS NOC — LIVE</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-mono">TLS 1.3 AES-256</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-cyan-400 hidden sm:inline">GovNet Secure Gateway</span>
        </div>

        {/* Quick Simulation Trigger Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-800/90 rounded border border-slate-700 px-1.5 py-0.5 space-x-1">
            <span className="text-slate-400 text-[10px] uppercase font-mono">Sim Speed:</span>
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                id={`btn-speed-${spd}x`}
                onClick={() => setSimulationSpeed && setSimulationSpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  simulationSpeed === spd 
                    ? 'bg-cyan-500 text-slate-950 font-bold' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            id="btn-trigger-sos"
            onClick={handleSOS}
            title="Simulate driver pressing emergency panic switch"
            className="flex items-center space-x-1 px-2 py-1 bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-200 rounded text-[11px] font-medium transition-colors"
          >
            <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />
            <span>Simulate SOS</span>
          </button>

          <button
            id="btn-trigger-theft"
            onClick={handleFuelTheft}
            title="Simulate sudden siphoning event while parked"
            className="flex items-center space-x-1 px-2 py-1 bg-amber-900/60 hover:bg-amber-800 border border-amber-700 text-amber-200 rounded text-[11px] font-medium transition-colors"
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Simulate Fuel Siphon</span>
          </button>

          <button
            id="btn-open-mobile"
            onClick={onOpenMobileApp}
            className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded text-[11px] font-medium transition-colors"
          >
            <Smartphone className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">Mobile App View</span>
          </button>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-800 p-0.5 shadow-lg shadow-cyan-900/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                QTS FLEET INTELLIGENCE
                <span className="px-1.5 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono rounded">GOV-OPS</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">National Fleet GPS Telematics & Security Network</p>
          </div>
        </div>

        {/* Selectors: Multi-Agency & RBAC Role Switcher */}
        <div className="flex items-center space-x-3">
          {/* Agency Filter */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-[11px] text-slate-400">Agency:</span>
            <select
              id="select-agency-filter"
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value as GovernmentAgency)}
              aria-label="Filter by Government Agency"
              className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer pr-2"
            >
              {AGENCIES.map((agency) => (
                <option key={agency} value={agency} className="bg-slate-900 text-slate-100">
                  {agency}
                </option>
              ))}
            </select>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-[11px] text-slate-400">Role:</span>
            <select
              id="select-user-role"
              value={effectiveRole}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              aria-label="Select User Role"
              className="bg-transparent text-xs text-cyan-300 font-semibold focus:outline-none cursor-pointer pr-2"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-slate-100">
                  {r.label} ({r.badge})
                </option>
              ))}
            </select>
          </div>

          {/* Active Alerts Pill */}
          <button
            id="btn-navbar-alerts"
            onClick={onOpenAlerts}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
              criticalCount > 0
                ? 'bg-red-950/80 text-red-300 border-red-700 hover:bg-red-900 animate-pulse'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${criticalCount > 0 ? 'text-red-400' : 'text-slate-400'}`} />
            <span>Alerts</span>
            {displayAlertCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                criticalCount > 0 ? 'bg-red-600 text-white font-bold' : 'bg-slate-700 text-slate-200'
              }`}>
                {displayAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="px-4 flex items-center overflow-x-auto scrollbar-none border-t border-slate-800/80 bg-slate-950/60 gap-1 text-xs font-medium">
        <button
          id="nav-tab-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'dashboard'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Dashboard Overview</span>
        </button>

        <button
          id="nav-tab-tracking"
          onClick={() => setActiveTab('tracking')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'tracking'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Live GPS Tracking</span>
        </button>

        <button
          id="nav-tab-fleet"
          onClick={() => setActiveTab('fleet')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'fleet'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Fleet Registry</span>
        </button>

        <button
          id="nav-tab-fuel"
          onClick={() => setActiveTab('fuel')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'fuel'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Fuel className="w-3.5 h-3.5" />
          <span>Fuel Intelligence (Trimago)</span>
        </button>

        <button
          id="nav-tab-geofences"
          onClick={() => setActiveTab('geofences')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'geofences'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Geofencing Zones</span>
        </button>

        <button
          id="nav-tab-driver"
          onClick={() => setActiveTab('driver')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'driver'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Driver Safety Scores</span>
        </button>

        <button
          id="nav-tab-maintenance"
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'maintenance'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Maintenance</span>
        </button>

        <button
          id="nav-tab-intelligence"
          onClick={() => setActiveTab('intelligence')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'intelligence'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Vehicle Intelligence</span>
        </button>

        <button
          id="nav-tab-reports"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'reports'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Reports & Exports</span>
        </button>

        <button
          id="nav-tab-devices"
          onClick={() => setActiveTab('devices')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'devices'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>GPS Devices & IoT</span>
        </button>

        <button
          id="nav-tab-audit"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'audit'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Audit Logs</span>
        </button>

        <button
          id="nav-tab-api"
          onClick={() => setActiveTab('api')}
          className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'api'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>API Explorer</span>
        </button>
      </div>
    </header>
  );
};
