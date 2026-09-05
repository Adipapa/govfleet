import React, { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Fuel, MapPin, Play, Route, Gauge } from 'lucide-react';
import { getTrip, getTrips, type TripApiRow } from '../services/api';

interface Props { onPlayTrip: (trip: any) => void; }

function toTrip(row: TripApiRow) {
  return {
    id: row.id, vehicleId: row.vehicle_id, vehicleReg: row.registration_number || '',
    driverName: row.driver_name || 'Unassigned', startTime: row.started_at, endTime: row.ended_at || '',
    startLocation: row.start_lat != null ? `${Number(row.start_lat).toFixed(5)}, ${Number(row.start_lng).toFixed(5)}` : 'Unknown',
    endLocation: row.end_lat != null ? `${Number(row.end_lat).toFixed(5)}, ${Number(row.end_lng).toFixed(5)}` : 'In progress',
    distanceKm: Number(row.distance_km || 0), durationMinutes: Math.round(Number(row.duration_seconds || 0) / 60),
    maxSpeedKmh: Number(row.max_speed_kmh || 0), avgSpeedKmh: Number(row.average_speed_kmh || 0),
    idleMinutes: Math.round(Number(row.idle_seconds || 0) / 60), fuelConsumedLiters: Number(row.fuel_consumed_litres || 0), waypoints: [],
  };
}

export const TripHistoryView: React.FC<Props> = ({ onPlayTrip }) => {
  const [rows, setRows] = useState<TripApiRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [vehicleId, setVehicleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    void getTrips({ page, limit: 25, vehicleId: vehicleId || undefined })
      .then((result) => { setRows(result.data); setPages(result.pagination.pages || 1); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load trips'))
      .finally(() => setLoading(false));
  }, [page, vehicleId]);

  const openPlayback = async (row: TripApiRow) => {
    try {
      const detail = await getTrip(row.id);
      const trip = { ...toTrip(detail), waypoints: detail.points.map((p) => ({ lat: Number(p.latitude), lng: Number(p.longitude), speed: Number(p.speed_kmh || 0), timestamp: p.recorded_at })) };
      setSelected(trip); onPlayTrip(trip);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load trip playback'); }
  };

  return <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
      <div><div className="flex items-center gap-2"><Route className="w-5 h-5 text-cyan-400" /><h1 className="text-xl font-bold">Trip History & Playback</h1></div><p className="text-xs text-slate-400 mt-1">Recorded journeys generated from GPS telemetry — not simulated data.</p></div>
      <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-500" /><input type="date" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs" /></div>
    </div>
    {error && <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">{error}</div>}
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400 uppercase font-mono"><tr><th className="p-3">Vehicle</th><th className="p-3">Driver</th><th className="p-3">Start</th><th className="p-3">Distance</th><th className="p-3">Duration</th><th className="p-3">Max Speed</th><th className="p-3">Fuel</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
      <tbody className="divide-y divide-slate-800">{loading ? <tr><td colSpan={9} className="p-8 text-center text-slate-500">Loading recorded trips...</td></tr> : rows.map((row) => <tr key={row.id} className="hover:bg-slate-800/30"><td className="p-3 font-mono font-bold">{row.registration_number}</td><td className="p-3">{row.driver_name || 'Unassigned'}</td><td className="p-3 text-slate-400">{new Date(row.started_at).toLocaleString()}</td><td className="p-3 font-mono text-cyan-300">{Number(row.distance_km || 0).toFixed(1)} km</td><td className="p-3"><Clock className="inline w-3 h-3 mr-1" />{Math.round(Number(row.duration_seconds || 0)/60)} min</td><td className="p-3"><Gauge className="inline w-3 h-3 mr-1" />{Number(row.max_speed_kmh || 0).toFixed(0)} km/h</td><td className="p-3"><Fuel className="inline w-3 h-3 mr-1" />{Number(row.fuel_consumed_litres || 0).toFixed(1)} L</td><td className="p-3">{row.ended_at ? <span className="text-emerald-400">Completed</span> : <span className="text-amber-400">Open</span>}</td><td className="p-3"><button onClick={() => void openPlayback(row)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-semibold"><Play className="w-3 h-3" />Replay</button></td></tr>)}</tbody></table></div>
      <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400"><span>{rows.length} trips on this page</span><div className="flex gap-2"><button disabled={page<=1} onClick={() => setPage((p)=>p-1)} className="p-1.5 bg-slate-800 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button><span className="px-2 py-1">Page {page} / {pages}</span><button disabled={page>=pages} onClick={() => setPage((p)=>p+1)} className="p-1.5 bg-slate-800 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button></div></div>
    </div>
    {selected && <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><div className="p-3 bg-slate-900 border border-slate-800 rounded-lg"><MapPin className="w-4 h-4 text-cyan-400" /><div className="text-[10px] text-slate-500 mt-2">ROUTE POINTS</div><div className="font-mono font-bold">{selected.waypoints.length}</div></div><div className="p-3 bg-slate-900 border border-slate-800 rounded-lg"><Route className="w-4 h-4 text-cyan-400" /><div className="text-[10px] text-slate-500 mt-2">DISTANCE</div><div className="font-mono font-bold">{selected.distanceKm.toFixed(1)} km</div></div></div>}
  </div>;
};
