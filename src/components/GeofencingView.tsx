import React, { useState } from 'react';
import { 
  Shield, 
  MapPin, 
  Plus, 
  AlertTriangle, 
  Check, 
  Trash2, 
  Eye, 
  Building2, 
  Lock, 
  Compass,
  AlertCircle
} from 'lucide-react';
import { Geofence, GovernmentAgency } from '../types/fleet';

interface GeofencingViewProps {
  geofences: Geofence[];
  onAddGeofence: (newGeo: Geofence) => void;
  onDeleteGeofence: (id: string) => void;
  onViewOnMap: () => void;
}

export const GeofencingView: React.FC<GeofencingViewProps> = ({
  geofences,
  onAddGeofence,
  onDeleteGeofence,
  onViewOnMap,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newCategory, setNewCategory] = useState<Geofence['category']>('Government Office');
  const [newDepartment, setNewDepartment] = useState<GovernmentAgency | 'All Agencies'>('All Agencies');
  const [speedLimit, setSpeedLimit] = useState<number>(40);
  const [isRestricted, setIsRestricted] = useState<boolean>(false);
  const [alertEntry, setAlertEntry] = useState<boolean>(true);
  const [alertExit, setAlertExit] = useState<boolean>(true);
  const [centerLat, setCenterLat] = useState<number>(13.44);
  const [centerLng, setCenterLng] = useState<number>(-16.65);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;

    // Create a bounding box polygon around the center point
    const delta = 0.006;
    const coords: [number, number][] = [
      [centerLat + delta, centerLng - delta],
      [centerLat + delta, centerLng + delta],
      [centerLat - delta, centerLng + delta],
      [centerLat - delta, centerLng - delta],
    ];

    const newGeo: Geofence = {
      id: `geo-${Date.now()}`,
      name: newZoneName,
      category: newCategory,
      coordinates: coords,
      center: [centerLat, centerLng],
      departmentScope: newDepartment,
      alertOnEntry: alertEntry,
      alertOnExit: alertExit,
      restrictedZone: isRestricted,
      speedLimitKmh: speedLimit,
    };

    onAddGeofence(newGeo);
    setShowCreateModal(false);
    setNewZoneName('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Government Geofencing & Perimeter Security Engine
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
              {geofences.length} ACTIVE PERIMETERS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Define administrative borders, ministries, hospitals, restricted security zones, and statutory speed perimeters.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-open-create-geofence"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Geofence Zone</span>
          </button>

          <button
            id="btn-geofence-map-view"
            onClick={onViewOnMap}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>View All On Map</span>
          </button>
        </div>
      </div>

      {/* Geofence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {geofences.map((geo) => (
          <div 
            key={geo.id} 
            className={`p-4 rounded-xl border transition-all ${
              geo.restrictedZone 
                ? 'bg-red-950/20 border-red-900/60 hover:border-red-600' 
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-bold text-sm text-white block">{geo.name}</span>
                <span className="text-[11px] text-slate-400">{geo.departmentScope || 'All Agencies'}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                geo.restrictedZone ? 'bg-red-900/60 text-red-300 border border-red-700' :
                geo.category === 'Hospital' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                'bg-blue-950 text-blue-300 border border-blue-800'
              }`}>
                {geo.category}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 p-2.5 bg-slate-950/60 rounded-lg text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Speed Limit</span>
                <span className="text-white font-bold">{geo.speedLimitKmh} km/h</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Security Clearance</span>
                <span className={geo.restrictedZone ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {geo.restrictedZone ? 'RESTRICTED' : 'PUBLIC GOV'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Entry Alert</span>
                <span className={geo.alertOnEntry ? 'text-cyan-300 font-semibold' : 'text-slate-500'}>
                  {geo.alertOnEntry ? 'ENABLED' : 'MUTED'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Exit Alert</span>
                <span className={geo.alertOnExit ? 'text-cyan-300 font-semibold' : 'text-slate-500'}>
                  {geo.alertOnExit ? 'ENABLED' : 'MUTED'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-500 font-mono">
                Lat: {geo.center[0].toFixed(4)}, Lng: {geo.center[1].toFixed(4)}
              </span>
              <button
                id={`btn-delete-geo-${geo.id}`}
                onClick={() => onDeleteGeofence(geo.id)}
                title="Delete Geofence"
                className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white">Create Government Geofencing Zone</h2>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Zone Title / Landmark</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Banjul Port Container Terminal"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="Government Office">Government Office</option>
                    <option value="Hospital">Hospital</option>
                    <option value="Police Station">Police Station</option>
                    <option value="Airport">Airport</option>
                    <option value="Fuel Depot">Fuel Depot</option>
                    <option value="Restricted Zone">Restricted Zone</option>
                    <option value="Border Post">Border Post</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Department Scope</label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="All Agencies">All Agencies</option>
                    <option value="Ministry of Transport">Ministry of Transport</option>
                    <option value="Ministry of Health">Ministry of Health</option>
                    <option value="Gambia Police Force">Gambia Police Force</option>
                    <option value="State House VIP Fleet">State House VIP Fleet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Speed Limit (km/h)</label>
                  <input
                    type="number"
                    value={speedLimit}
                    onChange={(e) => setSpeedLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Center Lat</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={centerLat}
                    onChange={(e) => setCenterLat(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Center Lng</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={centerLng}
                    onChange={(e) => setCenterLng(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRestricted}
                    onChange={(e) => setIsRestricted(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-red-500 focus:ring-0"
                  />
                  <span>Mark as High-Security Restricted Military/State Zone</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertEntry}
                    onChange={(e) => setAlertEntry(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Dispatch Alert on Vehicle Entry</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertExit}
                    onChange={(e) => setAlertExit(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Dispatch Alert on Vehicle Exit</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg"
                >
                  Deploy Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
