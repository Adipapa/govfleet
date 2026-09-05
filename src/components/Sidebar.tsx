import React, { useState } from 'react';
import { Shield, LayoutDashboard, MapPin, Car, Fuel, Radio, UserCheck, Wrench, Cpu, AlertTriangle, FileText, FileCheck2, Smartphone, ChevronLeft, ChevronRight, Building2, User, LogOut, LockKeyhole } from 'lucide-react';
import type { AlertEvent } from '../types/fleet';
import type { ApiUser } from '../services/api';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  selectedAgency?: string;
  currentUser: ApiUser;
  activeAlerts?: AlertEvent[];
  alertCount?: number;
  onOpenAlerts?: () => void;
  onOpenMobileApp?: () => void;
  onTriggerSOS?: () => void;
  onTriggerFuelTheft?: () => void;
  simulationSpeed?: number;
  setSimulationSpeed?: (speed: number) => void;
  onLogout?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrator',
  fleet_admin: 'Government Fleet Administrator',
  fleet_manager: 'Fleet Manager',
  security_police: 'Security / Police',
  driver: 'Authorized Driver',
  auditor: 'State Auditor',
};

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, activeAlerts = [], alertCount, onOpenMobileApp, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const criticalCount = activeAlerts.filter((a) => a?.severity === 'critical' && !a.acknowledged).length;
  const displayAlertCount = alertCount !== undefined ? alertCount : activeAlerts.length;
  const primaryRole = currentUser.roles[0] || 'user';
  const roleLabel = ROLE_LABELS[primaryRole] || primaryRole.replaceAll('_', ' ');
  const agencyLabel = currentUser.agencyId ? 'Assigned Government Agency' : 'All Government Agencies';

  const navSections = [
    { group: 'Core Operations', items: [{ id: 'overview', label: 'Dashboard', icon: LayoutDashboard }, { id: 'tracking', label: 'Live GPS Map', icon: MapPin }, { id: 'fleet', label: 'Fleet Registry', icon: Car }] },
    { group: 'Monitoring & Safety', items: [{ id: 'fuel', label: 'Fuel & Theft', icon: Fuel }, { id: 'geofences', label: 'Geofence Zones', icon: Radio }, { id: 'safety', label: 'Driver Safety', icon: UserCheck }, { id: 'alerts', label: 'Alerts & SOS', icon: AlertTriangle, badge: displayAlertCount, badgeCritical: criticalCount > 0 }] },
    { group: 'Assets & Hardware', items: [{ id: 'maintenance', label: 'Maintenance', icon: Wrench }, { id: 'devices', label: 'GPS & IoT Devices', icon: Cpu }] },
    { group: 'Governance', items: [{ id: 'reports', label: 'Reports & Analytics', icon: FileText }, { id: 'audit', label: 'Audit & Compliance', icon: FileCheck2 }] },
  ];

  return <aside className={`relative flex flex-col h-screen bg-slate-950 border-r border-slate-800 transition-all duration-300 z-40 shrink-0 ${collapsed ? 'w-20' : 'w-64'}`}>
    <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/80">
      <div className="flex items-center space-x-3 cursor-pointer overflow-hidden" onClick={() => setActiveTab('overview')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 p-0.5 shadow-lg shadow-cyan-950/50 flex items-center justify-center shrink-0"><div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center"><Shield className="w-5 h-5 text-cyan-400" /></div></div>
        {!collapsed && <div className="min-w-0"><div className="flex items-center space-x-1.5"><span className="font-bold text-sm tracking-tight text-white font-mono">QTS FLEET</span><span className="text-[9px] font-mono px-1 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-semibold">GOV</span></div><p className="text-[11px] text-slate-400 truncate">Government Telematics</p></div>}
      </div>
      <button onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">{collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}</button>
    </div>

    {!collapsed ? <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 p-2.5"><div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-cyan-400" /></div><div className="min-w-0"><p className="text-xs font-semibold text-slate-100 truncate">{currentUser.fullName}</p><p className="text-[10px] text-cyan-400 truncate">{roleLabel}</p></div></div>
      <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-400 font-mono"><Building2 className="w-3 h-3 text-cyan-400 shrink-0" /><span className="truncate">{agencyLabel}</span></div>
      <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-emerald-400 font-mono"><LockKeyhole className="w-3 h-3" /><span>RBAC ENFORCED BY SERVER</span></div>
    </div> : <div className="py-3 border-b border-slate-800/80 flex flex-col items-center gap-2"><div title={roleLabel} className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400"><User className="w-4 h-4" /></div></div>}

    <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
      {navSections.map((section) => <div key={section.group} className="space-y-1">
        {!collapsed && <h4 className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold mb-1">{section.group}</h4>}
        {section.items.map((item) => { const Icon = item.icon; const isActive = activeTab === item.id || (item.id === 'overview' && activeTab === 'dashboard'); return <button key={item.id} onClick={() => setActiveTab(item.id)} title={collapsed ? item.label : undefined} className={`w-full flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2 space-x-3'} rounded-lg text-xs font-medium transition-all group relative ${isActive ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'}`}><Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />{!collapsed && <span className="truncate">{item.label}</span>}{'badge' in item && item.badge !== undefined && item.badge > 0 && <span className={`ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-mono ${collapsed ? 'absolute top-1 right-2' : ''} ${item.badgeCritical ? 'bg-red-600 text-white font-bold animate-pulse' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>{item.badge}</span>}</button>; })}
      </div>)}
    </div>

    <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2">
      {!collapsed && onOpenMobileApp && <button onClick={onOpenMobileApp} className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded text-[11px] font-medium"><Smartphone className="w-3.5 h-3.5 text-cyan-400" /><span>Driver App Companion</span></button>}
      {onLogout && <button onClick={onLogout} title="Sign out" className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-center space-x-1.5'} py-1.5 bg-red-950/30 hover:bg-red-950/70 border border-red-900/70 text-red-300 rounded text-[11px] font-medium`}><LogOut className="w-3.5 h-3.5" />{!collapsed && <span>Sign Out</span>}</button>}
    </div>
  </aside>;
};
