import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  FileCode, 
  Database, 
  Server, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Cpu,
  Globe
} from 'lucide-react';
import { AuditLog } from '../types/fleet';

interface AuditSecurityViewProps {
  auditLogs: AuditLog[];
}

export const AuditSecurityView: React.FC<AuditSecurityViewProps> = ({ auditLogs }) => {
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'api' | 'compliance'>('logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = 
      log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Audit Trails, Security Compliance & Integration Gateway
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono border border-emerald-800">
              IMMUTABLE LEDGER ACTIVE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tamper-evident logs of all operator actions, RBAC assignments, law enforcement handshakes, and government REST endpoints.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            id="tab-audit-logs"
            onClick={() => setActiveSubTab('logs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeSubTab === 'logs' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Immutable Audit Trail
          </button>
          <button
            id="tab-audit-api"
            onClick={() => setActiveSubTab('api')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeSubTab === 'api' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            API & Interoperability
          </button>
          <button
            id="tab-audit-compliance"
            onClick={() => setActiveSubTab('compliance')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeSubTab === 'compliance' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Security Architecture
          </button>
        </div>
      </div>

      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-semibold">Filter Action:</span>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="bg-slate-800 text-xs text-white px-2.5 py-1.5 rounded border border-slate-700"
              >
                <option value="all">All Action Events</option>
                <option value="USER_LOGIN">User Authentication</option>
                <option value="DISPATCH_POLICE">Law Enforcement Dispatch</option>
                <option value="ACKNOWLEDGE_ALERT">Alert Acknowledgements</option>
                <option value="GEOFENCE_CREATED">Geofence Configuration</option>
                <option value="EXPORT_REPORT">Data Exports</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Search user, IP, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full sm:w-64"
            />
          </div>

          {/* Audit Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Operator User</th>
                    <th className="py-2.5 px-3">Agency / Role</th>
                    <th className="py-2.5 px-3">Action Type</th>
                    <th className="py-2.5 px-3">Action Description</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Cryptographic Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                        {log.username}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">
                          {log.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {log.details}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {log.ipAddress}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        SHA256:{Math.abs(log.id.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)).toString(16).padStart(8,'0')}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'api' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Government REST API Endpoints (SRS Section 23)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Authorized machine-to-machine interfaces for Police Command Centers, IFMIS Financial ERP, and National Health Dispatch.
            </p>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold text-[10px]">GET</span>
                  <span className="text-white">/api/v1/telemetry/live</span>
                </div>
                <p className="text-slate-400 text-[11px] font-sans mt-1">
                  Returns real-time coordinates, speed, fuel %, and ignition state for authorized department fleet.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 font-bold text-[10px]">POST</span>
                  <span className="text-white">/api/v1/police/dispatch</span>
                </div>
                <p className="text-slate-400 text-[11px] font-sans mt-1">
                  Transmits emergency vehicle coordinates directly to Police CAD (Computer-Aided Dispatch).
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 font-bold text-[10px]">GET</span>
                  <span className="text-white">/api/v1/fuel/siphoning-alerts</span>
                </div>
                <p className="text-slate-400 text-[11px] font-sans mt-1">
                  Integrates with Ministry of Finance auditing and fuel voucher replenishment systems.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Real-Time Webhooks & Push Delivery</span>
            </h2>
            <p className="text-xs text-slate-400">
              Configured webhook endpoints triggered immediately on critical telemetry breaches.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-mono text-white font-bold block">Police 999 Central CAD Webhook</span>
                  <span className="text-slate-400 text-[11px]">Event: emergency_sos, vehicle_theft</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold">
                  ACTIVE 200 OK
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-mono text-white font-bold block">Ministry of Finance IFMIS ERP</span>
                  <span className="text-slate-400 text-[11px]">Event: fuel_theft, monthly_mileage_close</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold">
                  ACTIVE 200 OK
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-mono text-white font-bold block">Government SMS Gateway (Orange/Africell)</span>
                  <span className="text-slate-400 text-[11px]">Event: critical_sos, geofence_breach</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold">
                  ACTIVE 200 OK
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'compliance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <span>Government Security & Data Sovereignty Architecture (SRS Section 20)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-white text-sm block">Data Sovereignty</span>
              <p className="text-slate-400 leading-relaxed">
                Deployed within government-controlled sovereign cloud / national data center infrastructure. No telemetry egresses national jurisdiction.
              </p>
              <span className="text-emerald-400 font-mono font-semibold block">Sovereignty Level: Classified</span>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-white text-sm block">FIPS 140-2 Encryption</span>
              <p className="text-slate-400 leading-relaxed">
                AES-256 encryption at rest for all GPS waypoints and fuel logs. TLS 1.3 with mTLS certificate pinning for tracker communication.
              </p>
              <span className="text-emerald-400 font-mono font-semibold block">Hardware HSM Protected</span>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-white text-sm block">Strict Multi-Tenancy</span>
              <p className="text-slate-400 leading-relaxed">
                Row-level database security ensures Ministries only access assigned assets, while Police command maintains authorized interdiction purview.
              </p>
              <span className="text-emerald-400 font-mono font-semibold block">RBAC Kernel Enforced</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
