import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Car, CircleDollarSign, Fuel, Gauge, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { getCostSummary, type CostSummary } from '../services/costApi';
import { getExecutiveKpi, getFleetRecommendations, type ExecutiveKpi, type FleetRecommendation } from '../services/intelligenceApi';
import type { AlertEvent } from '../types/fleet';

const money = (v: number) => `GMD ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const number = (v: number) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString() : '—';

export const ExecutiveKpiDashboard: React.FC<{ vehicles: unknown[]; alerts: AlertEvent[]; onNavigate: (tab: string) => void }> = ({ alerts, onNavigate }) => {
  const [kpi, setKpi] = useState<ExecutiveKpi | null>(null);
  const [cost, setCost] = useState<CostSummary | null>(null);
  const [recommendations, setRecommendations] = useState<FleetRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [kpiResult, costResult, recommendationResult] = await Promise.all([
        getExecutiveKpi(),
        getCostSummary(),
        getFleetRecommendations(),
      ]);
      setKpi(kpiResult.data);
      setCost(costResult.data);
      setRecommendations(recommendationResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load executive data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const hasFleet = Boolean(kpi && kpi.fleet.total > 0);
  const unacknowledged = kpi?.safetyExposure ?? 0;
  const topRecommendations = recommendations.slice(0, 5);

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-slate-50 text-slate-900 space-y-5">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-cyan-700 font-mono font-semibold">Government Fleet Executive View</div>
          <h1 className="text-2xl font-bold text-slate-950 mt-1">Executive KPI Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Authoritative KPIs calculated from fleet records, telemetry, trips, alerts, fuel and maintenance data.</p>
        </div>
        <button onClick={() => void load()} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50" title="Refresh live data">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {error && <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">Unable to load executive data: {error}</section>}

      {!loading && !error && !hasFleet && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-sm font-semibold text-amber-900">Platform is connected but no fleet records are available</div>
          <p className="text-xs text-amber-700 mt-1">This dashboard intentionally does not manufacture operational KPIs. Register vehicles and receive telemetry to populate the executive view.</p>
          <button onClick={() => onNavigate('fleet')} className="mt-3 text-xs font-semibold text-cyan-700 hover:text-cyan-800">Open Fleet Registry →</button>
        </section>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <K label="Fleet" value={kpi ? kpi.fleet.total : '—'} sub={kpi ? `${kpi.fleet.moving} moving` : 'No KPI data'} icon={Car} />
        <K label="Utilization" value={kpi && hasFleet ? `${kpi.utilization.toFixed(1)}%` : '—'} sub={kpi ? 'Moving / fleet in scope' : 'No telemetry-derived KPI'} icon={Activity} />
        <K label="Availability" value={kpi && hasFleet ? `${kpi.availability.toFixed(1)}%` : '—'} sub={kpi ? `${kpi.fleet.offline} offline / no GPS` : 'No fleet KPI'} icon={Gauge} />
        <K label="Safety exposure" value={kpi ? unacknowledged : '—'} sub={kpi ? 'Unacknowledged alerts' : 'No alert data'} icon={ShieldCheck} />
        <K label="Fleet cost" value={cost ? money(cost.total_cost) : '—'} sub={cost ? `${money(cost.cost_per_km)} / km` : 'No financial data'} icon={CircleDollarSign} />
        <K label="Fuel integrity" value={kpi ? kpi.fuelIntegrity.openAnomalies : '—'} sub={kpi ? 'Open fuel anomalies' : 'No fuel KPI'} icon={Fuel} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div><h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Operational Readiness</h2><p className="text-[10px] text-slate-500 mt-1">Calculated by the backend intelligence engine.</p></div>
            <button onClick={() => onNavigate('tracking')} className="text-[10px] text-cyan-700 hover:text-cyan-800 font-semibold">Open Live Map →</button>
          </div>
          {kpi && hasFleet ? <div className="space-y-4">
            <Bar label="Moving" value={kpi.fleet.moving} total={kpi.fleet.total} text={`${kpi.fleet.moving} vehicles`} />
            <Bar label="Available" value={kpi.fleet.total - kpi.fleet.offline} total={kpi.fleet.total} text={`${kpi.fleet.total - kpi.fleet.offline} vehicles`} />
            <Bar label="Offline / no GPS" value={kpi.fleet.offline} total={kpi.fleet.total} text={`${kpi.fleet.offline} vehicles`} />
            <Bar label="Emergency" value={kpi.fleet.emergency} total={kpi.fleet.total} text={`${kpi.fleet.emergency} vehicles`} />
          </div> : <Empty text={loading ? 'Loading operational KPIs…' : 'No vehicle telemetry is available.'} />}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Executive Actions</h2>
          <div className="mt-3 space-y-2">
            <Action title="Cost & Financial Intelligence" detail="Actual expenditure, budgets and ROI assumptions" onClick={() => onNavigate('cost')} icon={CircleDollarSign} />
            <Action title="Fuel & Loss Intelligence" detail="Recorded fuel transactions and anomalies" onClick={() => onNavigate('fuel')} icon={Fuel} />
            <Action title="Maintenance Control" detail="Due, overdue and completed work" onClick={() => onNavigate('maintenance')} icon={Wrench} />
            <Action title="Alerts & Security" detail={`${unacknowledged} unacknowledged recorded events`} onClick={() => onNavigate('alerts')} icon={AlertTriangle} />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Operations</h2><p className="text-[10px] text-slate-500 mt-1">Selected KPI period: {kpi ? `${dateLabel(kpi.period.from)} – ${dateLabel(kpi.period.to)}` : '—'}</p></div><Activity className="w-4 h-4 text-cyan-600" /></div>
          <div className="grid grid-cols-3 gap-3 mt-4"><Metric label="Trips" value={kpi ? number(kpi.operations.trips) : '—'} /><Metric label="Distance" value={kpi ? `${number(kpi.operations.distanceKm)} km` : '—'} /><Metric label="Trip hours" value={kpi ? number(kpi.operations.tripHours) : '—'} /></div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Financial Performance</h2><p className="text-[10px] text-slate-500 mt-1">Actual recorded fuel and maintenance expenditure.</p></div><button onClick={() => onNavigate('cost')} className="text-[10px] text-cyan-700 font-semibold">Open →</button></div>
          {cost ? <div className="grid grid-cols-3 gap-3 mt-4"><Metric label="Fuel" value={money(cost.fuel_cost)} /><Metric label="Maintenance" value={money(cost.maintenance_cost)} /><Metric label="Total" value={money(cost.total_cost)} /></div> : <Empty text="No financial records are available." />}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Recommended Actions</h2><p className="text-[10px] text-slate-500 mt-1">Actions generated from recorded fleet conditions.</p></div><span className="text-[10px] font-mono text-slate-400">{recommendations.length} recorded recommendations</span></div>
        {topRecommendations.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mt-4">{topRecommendations.map((item, index) => <button key={`${item.vehicleId}-${item.action}-${index}`} onClick={() => onNavigate(item.action.includes('maintenance') ? 'maintenance' : item.action.includes('fuel') ? 'fuel' : item.action.includes('GPS') ? 'devices' : 'safety')} className="text-left rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-white"><div className="flex justify-between gap-2"><span className="text-[10px] font-bold uppercase text-cyan-700">{item.priority}</span><span className="text-[10px] font-mono text-slate-400">{item.registrationNumber}</span></div><div className="mt-2 text-xs font-semibold text-slate-900">{item.action}</div><p className="mt-1 text-[10px] text-slate-500">{item.reason}</p></button>)}</div> : <Empty text={loading ? 'Loading recommendations…' : 'No recommendations have been generated from the recorded fleet data.'} />}
      </section>
    </div>
  );
};

function K({ label, value, sub, icon: Icon }: { label: string; value: React.ReactNode; sub: string; icon: React.ElementType }) { return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between text-[10px] uppercase text-slate-500"><span>{label}</span><Icon className="w-4 h-4 text-cyan-600" /></div><div className="mt-2 text-2xl font-mono font-bold text-slate-950">{value}</div><div className="mt-1 text-[10px] text-slate-500">{sub}</div></div>; }
function Bar({ label, value, total, text }: { label: string; value: number; total: number; text: string }) { const width = total ? Math.max(0, Math.min(100, value / total * 100)) : 0; return <div><div className="flex justify-between text-[11px] mb-1"><span className="text-slate-700">{label}</span><span className="font-mono text-slate-500">{text}</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-cyan-600" style={{ width: `${width}%` }} /></div></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-[10px] uppercase text-slate-500">{label}</div><div className="mt-1 font-mono font-bold text-slate-900">{value}</div></div>; }
function Action({ title, detail, onClick, icon: Icon }: { title: string; detail: string; onClick: () => void; icon: React.ElementType }) { return <button onClick={onClick} className="w-full flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left hover:bg-white hover:border-slate-300 transition-colors"><Icon className="w-4 h-4 text-cyan-600" /><span className="min-w-0"><span className="block text-xs font-semibold text-slate-900">{title}</span><span className="block text-[10px] text-slate-500">{detail}</span></span></button>; }
function Empty({ text }: { text: string }) { return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">{text}</div>; }
