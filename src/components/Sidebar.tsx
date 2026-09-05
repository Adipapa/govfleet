import React, { useState } from 'react';
import { Shield, LayoutDashboard, MapPin, Car, Fuel, Radio, UserCheck, Wrench, Cpu, AlertTriangle, FileText, FileCheck2, Smartphone, ChevronLeft, ChevronRight, Building2, User, LogOut, LockKeyhole, WalletCards, BarChart3 } from 'lucide-react';
import type { AlertEvent } from '../types/fleet';
import type { ApiUser } from '../services/api';

interface SidebarProps { activeTab:string; setActiveTab:(tab:any)=>void; selectedAgency?:string; currentUser:ApiUser; activeAlerts?:AlertEvent[]; alertCount?:number; onOpenAlerts?:()=>void; onOpenMobileApp?:()=>void; onTriggerSOS?:()=>void; onTriggerFuelTheft?:()=>void; simulationSpeed?:number; setSimulationSpeed?:(speed:number)=>void; onLogout?:()=>void; }
const ROLE_LABELS:Record<string,string>={super_admin:'Super Administrator',fleet_admin:'Government Fleet Administrator',fleet_manager:'Fleet Manager',security_police:'Security / Police',driver:'Authorized Driver',auditor:'State Auditor'};

export const Sidebar:React.FC<SidebarProps>=({activeTab,setActiveTab,currentUser,activeAlerts=[],alertCount,onOpenMobileApp,onLogout})=>{
 const[collapsed,setCollapsed]=useState(false);
 const criticalCount=activeAlerts.filter(a=>a?.severity==='critical'&&!a.acknowledged).length;
 const displayAlertCount=alertCount!==undefined?alertCount:activeAlerts.length;
 const primaryRole=currentUser.roles[0]||'user';
 const roleLabel=ROLE_LABELS[primaryRole]||primaryRole.replaceAll('_',' ');
 const agencyLabel=currentUser.agencyId?'Assigned Government Agency':'All Government Agencies';
 const navSections=[
  {group:'Executive',items:[{id:'executive',label:'Executive KPI Dashboard',icon:BarChart3},{id:'overview',label:'Operations Dashboard',icon:LayoutDashboard}]},
  {group:'Core Operations',items:[{id:'tracking',label:'Live GPS Map',icon:MapPin},{id:'fleet',label:'Fleet Registry',icon:Car}]},
  {group:'Monitoring & Safety',items:[{id:'fuel',label:'Fuel & Theft',icon:Fuel},{id:'geofences',label:'Geofence Zones',icon:Radio},{id:'safety',label:'Driver Safety',icon:UserCheck},{id:'alerts',label:'Alerts & SOS',icon:AlertTriangle,badge:displayAlertCount,badgeCritical:criticalCount>0}]},
  {group:'Assets & Hardware',items:[{id:'maintenance',label:'Maintenance',icon:Wrench},{id:'devices',label:'GPS & IoT Devices',icon:Cpu}]},
  {group:'Financial Intelligence',items:[{id:'cost',label:'Cost & Financial Intelligence',icon:WalletCards}]},
  {group:'Governance',items:[{id:'reports',label:'Reports & Analytics',icon:FileText},{id:'audit',label:'Audit & Compliance',icon:FileCheck2}]}
 ];
 return <aside className={`relative flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-300 z-40 shrink-0 ${collapsed?'w-20':'w-64'}`}>
  <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 bg-white">
   <div className="flex items-center space-x-3 cursor-pointer overflow-hidden" onClick={()=>setActiveTab('executive')}>
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 p-0.5 shadow-sm flex items-center justify-center shrink-0"><div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center"><Shield className="w-5 h-5 text-cyan-600"/></div></div>
    {!collapsed&&<div className="min-w-0"><div className="flex items-center space-x-1.5"><span className="font-bold text-sm tracking-tight text-slate-900 font-mono">QTS FLEET</span><span className="text-[9px] font-mono px-1 py-0.2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded font-semibold">GOV</span></div><p className="text-[11px] text-slate-500 truncate">Government Telematics</p></div>}
   </div>
   <button onClick={()=>setCollapsed(!collapsed)} title={collapsed?'Expand Sidebar':'Collapse Sidebar'} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100">{collapsed?<ChevronRight className="w-4 h-4"/>:<ChevronLeft className="w-4 h-4"/>}</button>
  </div>
  {!collapsed?<div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2">
   <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"><div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-cyan-700"/></div><div className="min-w-0"><p className="text-xs font-semibold text-slate-800 truncate">{currentUser.fullName}</p><p className="text-[10px] text-cyan-700 truncate">{roleLabel}</p></div></div>
   <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-500 font-mono"><Building2 className="w-3 h-3 text-cyan-600 shrink-0"/><span className="truncate">{agencyLabel}</span></div>
   <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-emerald-700 font-mono"><LockKeyhole className="w-3 h-3"/><span>RBAC ENFORCED BY SERVER</span></div>
  </div>:<div className="py-3 border-b border-slate-200 flex flex-col items-center gap-2"><div title={roleLabel} className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-cyan-700"><User className="w-4 h-4"/></div></div>}
  <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-300">
   {navSections.map(section=><div key={section.group} className="space-y-1">{!collapsed&&<h4 className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold mb-1">{section.group}</h4>}{section.items.map(item=>{const Icon=item.icon;const isActive=activeTab===item.id;return <button key={item.id} onClick={()=>setActiveTab(item.id)} title={collapsed?item.label:undefined} className={`w-full flex items-center ${collapsed?'justify-center px-0 py-2.5':'px-3 py-2 space-x-3'} rounded-lg text-xs font-medium transition-all group relative ${isActive?'bg-cyan-50 text-cyan-800 border border-cyan-200 shadow-sm':'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}><Icon className={`w-4 h-4 shrink-0 ${isActive?'text-cyan-700':'text-slate-500 group-hover:text-slate-700'}`}/>{!collapsed&&<span className="truncate">{item.label}</span>}{'badge'in item&&item.badge!==undefined&&item.badge>0&&<span className={`ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-mono ${collapsed?'absolute top-1 right-2':''} ${item.badgeCritical?'bg-red-600 text-white font-bold animate-pulse':'bg-slate-100 text-slate-600 border border-slate-200'}`}>{item.badge}</span>}</button>})}</div>)}
  </div>
  <div className="p-3 border-t border-slate-200 bg-white space-y-2">{!collapsed&&onOpenMobileApp&&<button onClick={onOpenMobileApp} className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-medium"><Smartphone className="w-3.5 h-3.5 text-cyan-600"/><span>Driver App Companion</span></button>}{onLogout&&<button onClick={onLogout} title="Sign out" className={`w-full flex items-center ${collapsed?'justify-center':'justify-center space-x-1.5'} py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded text-[11px] font-medium`}><LogOut className="w-3.5 h-3.5"/>{!collapsed&&<span>Sign Out</span>}</button>}</div>
 </aside>;
};
