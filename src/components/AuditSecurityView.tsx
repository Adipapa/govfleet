import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileCode, Lock, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { getAuditLogs, type AuditApiRow } from '../services/auditApi';

export const AuditSecurityView: React.FC = () => {
  const [logs, setLogs] = useState<AuditApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState('all');
  const [tab, setTab] = useState<'logs' | 'api' | 'security'>('logs');

  const load = async () => {
    setLoading(true); setError('');
    try { setLogs((await getAuditLogs({ limit: 500, result: result === 'all' ? undefined : result })).data); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load audit records.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [result]);

  const filtered = useMemo(() => logs.filter(log => {
    const text = `${log.username || ''} ${log.full_name || ''} ${log.action} ${log.resource_type || ''} ${log.resource_id || ''} ${log.details || ''} ${log.ip_address || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  }), [logs, search]);

  return <div className="h-full overflow-y-auto p-4 sm:p-6 bg-slate-50 text-slate-900 space-y-5">
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <div><div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-cyan-700"/><div className="text-[10px] uppercase tracking-wider text-cyan-700 font-mono font-semibold">Governance & Security</div></div><h1 className="text-2xl font-bold text-slate-950 mt-1">Audit & Compliance</h1><p className="text-xs text-slate-500 mt-1">Security information shown here is limited to controls and audit records actually implemented by the platform.</p></div>
      <button onClick={() => void load()} className="self-start p-2 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
    </header>

    <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl w-fit text-xs shadow-sm">
      {([['logs','Audit Records'],['api','Implemented API'],['security','Security Controls']] as const).map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={`px-3 py-1.5 rounded-lg font-semibold ${tab === key ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{label}</button>)}
    </div>

    {tab === 'logs' && <>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">Unable to load audit records: {error}</div>}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, action, resource, IP…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"/></div>
          <select value={result} onChange={e => setResult(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"><option value="all">All results</option><option value="success">Success</option><option value="failure">Failure</option></select>
        </div>
        {loading ? <div className="p-8 text-center text-xs text-slate-500">Loading audit records…</div> : filtered.length === 0 ? <div className="p-8 text-center text-xs text-slate-500">No audit records match the current filters.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Time</th><th className="p-3">User</th><th className="p-3">Action</th><th className="p-3">Resource</th><th className="p-3">Result</th><th className="p-3">IP</th><th className="p-3">Details</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(log => <tr key={log.id} className="hover:bg-slate-50"><td className="p-3 font-mono whitespace-nowrap text-slate-500">{new Date(log.created_at).toLocaleString()}</td><td className="p-3 font-semibold text-slate-900">{log.full_name || log.username || 'System'}</td><td className="p-3 font-mono text-cyan-700">{log.action}</td><td className="p-3 text-slate-600">{log.resource_type || '—'}{log.resource_id ? ` / ${log.resource_id}` : ''}</td><td className="p-3">{log.result === 'success' ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5"/>success</span> : <span className="inline-flex items-center gap-1 text-rose-700"><AlertCircle className="w-3.5 h-3.5"/>{log.result}</span>}</td><td className="p-3 font-mono text-slate-500">{log.ip_address || '—'}</td><td className="p-3 text-slate-600 max-w-xs">{log.details || log.reason || '—'}</td></tr>)}</tbody></table></div>}
      </section>
    </>}

    {tab === 'api' && <section className="grid grid-cols-1 md:grid-cols-2 gap-4"><Info title="Authentication" text="JWT authentication with server-side session validation is implemented."/><Info title="Fleet API" text="Vehicles, drivers, devices, telemetry, trips, fuel, maintenance, alerts, geofences, reports and cost endpoints are implemented in the backend."/><Info title="Realtime" text="Authenticated Server-Sent Events are implemented for fleet telemetry, vehicle updates and alert creation."/><Info title="Audit API" text="Authenticated audit log retrieval is implemented at /api/v1/audit and is permission controlled."/></section>}

    {tab === 'security' && <section className="grid grid-cols-1 md:grid-cols-3 gap-4"><Info icon={<Lock className="w-4 h-4 text-cyan-700"/>} title="RBAC & Scope" text="Access is permission controlled and vehicle data is restricted by the authenticated user's scope."/><Info icon={<ShieldCheck className="w-4 h-4 text-cyan-700"/>} title="Sessions" text="Sessions are stored server-side, tokens are hashed for session lookup, and logout revokes the active session."/><Info icon={<FileCode className="w-4 h-4 text-cyan-700"/>} title="Auditability" text="Authenticated administrative and operational actions can be recorded with user, session, request and resource metadata."/><Info title="Not yet claimed" text="External government integrations, HSM deployment, sovereign hosting, mTLS, FIPS validation and production monitoring are not represented as active controls until they are actually deployed."/></section>}
  </div>;
};

function Info({ title, text, icon }: { title: string; text: string; icon?: React.ReactNode }) { return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-sm font-bold text-slate-900">{icon}<span>{title}</span></div><p className="mt-2 text-xs leading-relaxed text-slate-500">{text}</p></div>; }
