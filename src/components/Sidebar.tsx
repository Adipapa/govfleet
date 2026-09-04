import React, { useState } from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  MapPin, 
  Car, 
  Fuel, 
  Radio, 
  UserCheck, 
  Wrench, 
  Cpu, 
  AlertTriangle, 
  FileText, 
  FileCheck2, 
  Smartphone, 
  Flame, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  User,
  Zap,
  Activity
} from 'lucide-react';
import { UserRole, GovernmentAgency, AlertEvent } from '../types/fleet';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  selectedAgency: GovernmentAgency;
  setSelectedAgency: (agency: GovernmentAgency) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
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

const ROLES: { id: UserRole; label: string; badge: string }[] = [
  { id: 'super_admin', label: 'Super Admin', badge: 'Full Access' },
  { id: 'fleet_admin', label: 'Gov Fleet Admin', badge: 'Fleet Admin' },
  { id: 'fleet_manager', label: 'Ministry Manager', badge: 'Manager' },
  { id: 'security_police', label: 'Police / Law Enf.', badge: 'Security' },
  { id: 'driver', label: 'Authorized Driver', badge: 'Driver' },
  { id: 'auditor', label: 'State Auditor', badge: 'Read-Only' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedAgency,
  setSelectedAgency,
  currentRole,
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
  const [collapsed, setCollapsed] = useState(false);

  const alertsList = Array.isArray(activeAlerts) ? activeAlerts : [];
  const criticalCount = alertsList.filter((a) => a && a.severity === 'critical' && !a.acknowledged).length;
  const displayAlertCount = alertCount !== undefined ? alertCount : alertsList.length;

  const handleSOS = () => {
    if (onTriggerSOS) onTriggerSOS();
    else if (onSimulateSOS) onSimulateSOS();
  };

  const handleFuelTheft = () => {
    if (onTriggerFuelTheft) onTriggerFuelTheft();
    else if (onSimulateFuelTheft) onSimulateFuelTheft();
  };

  const navSections = [
    {
      group: 'Core Operations',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'tracking', label: 'Live GPS Map', icon: MapPin },
        { id: 'fleet', label: 'Fleet Registry', icon: Car },
      ],
    },
    {
      group: 'Monitoring & Safety',
      items: [
        { id: 'fuel', label: 'Fuel & Theft', icon: Fuel },
        { id: 'geofences', label: 'Geofence Zones', icon: Radio },
        { id: 'safety', label: 'Driver Safety', icon: UserCheck },
        { 
          id: 'alerts', 
          label: 'Alerts & SOS', 
          icon: AlertTriangle, 
          badge: displayAlertCount,
          badgeCritical: criticalCount > 0 
        },
      ],
    },
    {
      group: 'Assets & Hardware',
      items: [
        { id: 'maintenance', label: 'Maintenance', icon: Wrench },
        { id: 'devices', label: 'SinoTrack GPS & IoT', icon: Cpu },
      ],
    },
    {
      group: 'Governance',
      items: [
        { id: 'reports', label: 'Reports & Analytics', icon: FileText },
        { id: 'audit', label: 'Audit & Compliance', icon: FileCheck2 },
      ],
    },
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen bg-slate-950 border-r border-slate-800 transition-all duration-300 z-40 shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/80">
        <div 
          className="flex items-center space-x-3 cursor-pointer overflow-hidden"
          onClick={() => setActiveTab('overview')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 p-0.5 shadow-lg shadow-cyan-950/50 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm tracking-tight text-white font-mono">QTS FLEET</span>
                <span className="text-[9px] font-mono px-1 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-semibold">
                  GOV
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">Telematics Network</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          id="btn-toggle-sidebar"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Agency & Role Scope (Compact or Expanded) */}
      {!collapsed ? (
        <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 space-y-2">
          {/* Agency Selector */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-cyan-400" />
                MINISTRY / AGENCY
              </span>
            </div>
            <select
              id="select-agency-sidebar"
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value as GovernmentAgency)}
              aria-label="Filter by Government Agency"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {AGENCIES.map((agency) => (
                <option key={agency} value={agency} className="bg-slate-900 text-slate-100">
                  {agency}
                </option>
              ))}
            </select>
          </div>

          {/* Role Switcher */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-cyan-400" />
                ACTIVE ROLE
              </span>
            </div>
            <select
              id="select-role-sidebar"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as UserRole)}
              aria-label="Select User Role"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-slate-100">
                  {r.label} ({r.badge})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="py-2 border-b border-slate-800/80 flex flex-col items-center gap-2">
          <div 
            title={`Agency: ${selectedAgency}`}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 cursor-pointer hover:bg-slate-800"
          >
            <Building2 className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Main Navigation Links List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {navSections.map((section) => (
          <div key={section.group} className="space-y-1">
            {!collapsed && (
              <h4 className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold mb-1">
                {section.group}
              </h4>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'overview' && activeTab === 'dashboard');
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2 space-x-3'
                  } rounded-lg text-xs font-medium transition-all group relative ${
                    isActive
                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}

                  {/* Notification Badge */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        collapsed ? 'absolute top-1 right-2' : ''
                      } ${
                        item.badgeCritical
                          ? 'bg-red-600 text-white font-bold animate-pulse'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Quick Simulation & Live Ops Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2">
        {!collapsed ? (
          <>
            {/* Live Status & Speed */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center space-x-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-semibold text-[10px]">NOC CONNECTED</span>
              </div>

              {/* Sim Speed */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-1 py-0.5 space-x-1">
                <span className="text-[10px] text-slate-500">SPD:</span>
                {[1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    id={`sidebar-speed-${spd}x`}
                    onClick={() => setSimulationSpeed && setSimulationSpeed(spd)}
                    className={`px-1 rounded text-[10px] font-mono transition-colors ${
                      simulationSpeed === spd
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Action Triggers */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                id="sidebar-btn-sos"
                onClick={handleSOS}
                title="Simulate SOS emergency panic alert"
                className="flex items-center justify-center space-x-1 py-1.5 bg-red-950/50 hover:bg-red-900/80 border border-red-800/80 text-red-300 rounded text-[10px] font-semibold transition-colors"
              >
                <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                <span>Simulate SOS</span>
              </button>

              <button
                id="sidebar-btn-theft"
                onClick={handleFuelTheft}
                title="Simulate sudden fuel siphoning event"
                className="flex items-center justify-center space-x-1 py-1.5 bg-amber-950/50 hover:bg-amber-900/80 border border-amber-800/80 text-amber-300 rounded text-[10px] font-semibold transition-colors"
              >
                <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Sim Theft</span>
              </button>
            </div>

            {/* Companion App Button */}
            <button
              id="sidebar-btn-mobile"
              onClick={onOpenMobileApp}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded text-[11px] font-medium transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Driver App Companion</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={handleSOS}
              title="Simulate SOS"
              className="p-2 bg-red-950/80 border border-red-800 text-red-300 rounded-lg"
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </button>
            <button
              onClick={onOpenMobileApp}
              title="Driver Mobile View"
              className="p-2 bg-slate-900 border border-slate-800 text-cyan-400 rounded-lg"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
