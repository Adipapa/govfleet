import React, { useState } from 'react';
import { 
  Car, 
  Search, 
  Filter, 
  Download, 
  Fuel, 
  Gauge, 
  Battery, 
  MapPin, 
  FileText, 
  ShieldCheck, 
  AlertTriangle,
  User,
  Building2,
  Calendar,
  Eye
} from 'lucide-react';
import { Vehicle, GovernmentAgency, VehicleStatus } from '../types/fleet';

interface FleetRegistryViewProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicleId: string) => void;
  onOpenDossier: (vehicle: Vehicle) => void;
  onNavigateToMap: (vehicleId: string) => void;
}

export const FleetRegistryView: React.FC<FleetRegistryViewProps> = ({
  vehicles = [],
  onSelectVehicle,
  onOpenDossier,
  onNavigateToMap,
}) => {
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAgency, setSelectedAgency] = useState<string>('all');

  const filteredVehicles = safeVehicles.filter((v) => {
    if (!v) return false;
    const matchSearch =
      v.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.assetNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.assignedDriver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = selectedStatus === 'all' || v.status === selectedStatus;
    const matchType = selectedType === 'all' || v.type === selectedType;
    const matchAgency = selectedAgency === 'all' || v.department === selectedAgency;

    return matchSearch && matchStatus && matchType && matchAgency;
  });

  const exportCSV = () => {
    const headers = [
      'Registration Number',
      'Asset Tag',
      'Make & Model',
      'Type',
      'Department / Agency',
      'Driver Name',
      'Driver License',
      'Mileage (km)',
      'Fuel (%)',
      'Status',
      'GPS Device IMEI',
      'Insurance Expiry',
      'Registration Expiry',
    ];

    const rows = filteredVehicles.map((v) => [
      v.regNumber,
      v.assetNumber,
      `${v.make} ${v.model} (${v.year})`,
      v.type,
      v.department,
      v.assignedDriver.name,
      v.assignedDriver.licenseNumber,
      v.mileageKm,
      v.currentFuelPercentage,
      v.status.toUpperCase(),
      v.deviceId,
      v.insuranceExpiry,
      v.registrationExpiry,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `qts_government_fleet_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case 'moving':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700">Moving</span>;
      case 'stopped':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-700">Stopped</span>;
      case 'parked':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Parked</span>;
      case 'idling':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700">Idling</span>;
      case 'emergency':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-950/80 text-red-300 border border-red-700 animate-pulse">EMERGENCY</span>;
      case 'offline':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-slate-500 border border-slate-200">Offline</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 text-slate-900 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Car className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Government Vehicle Fleet Registry</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official asset catalog, telematics hardware assignments & driver authorizations
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            id="btn-export-fleet-registry"
            onClick={exportCSV}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Registry (CSV)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-mono">Total Registered</span>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-1">{safeVehicles.length}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-mono">Active In Operation</span>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {safeVehicles.filter((v) => v.status === 'moving' || v.status === 'stopped' || v.status === 'idling').length}
          </p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-mono">Emergency / SOS</span>
          <p className="text-2xl font-bold text-red-400 font-mono mt-1">
            {safeVehicles.filter((v) => v.status === 'emergency').length}
          </p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 uppercase font-mono">Avg Safety Rating</span>
          <p className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            {safeVehicles.length > 0
              ? Math.round(
                  safeVehicles.reduce((acc, v) => acc + v.assignedDriver.safetyScore, 0) / safeVehicles.length
                )
              : 0}
            <span className="text-sm font-normal text-slate-500">/100</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              id="input-search-registry"
              type="text"
              placeholder="Search by license plate, asset ID, make, driver, or ministry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              id="select-status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Statuses</option>
              <option value="moving">Moving</option>
              <option value="stopped">Stopped</option>
              <option value="idling">Idling</option>
              <option value="parked">Parked</option>
              <option value="emergency">Emergency</option>
              <option value="offline">Offline</option>
            </select>

            <select
              id="select-agency-registry-filter"
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Ministries & Agencies</option>
              <option value="Ministry of Transport">Ministry of Transport</option>
              <option value="Ministry of Health">Ministry of Health</option>
              <option value="Gambia Police Force">Gambia Police Force</option>
              <option value="Ministry of Finance">Ministry of Finance</option>
              <option value="State House VIP Fleet">State House VIP Fleet</option>
              <option value="National Disaster Mgmt Agency">National Disaster Mgmt Agency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Fleet Vehicles */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                <th className="p-3">Vehicle Details</th>
                <th className="p-3">Ministry / Agency</th>
                <th className="p-3">Assigned Driver</th>
                <th className="p-3">Telemetry / Speed</th>
                <th className="p-3">Fuel Level</th>
                <th className="p-3">Odometer</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No vehicles found matching current filter parameters.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-100/40 transition-colors cursor-pointer group"
                    onClick={() => onSelectVehicle(v.id)}
                  >
                    <td className="p-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded bg-cyan-950/60 border border-cyan-800/80 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs shrink-0">
                          {v.regNumber.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-mono font-bold text-slate-900 tracking-wide text-xs group-hover:text-cyan-300">
                            {v.regNumber}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {v.make} {v.model} • {v.type} ({v.year})
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">Tag: {v.assetNumber}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-slate-600 font-medium">{v.department}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-500" />
                          <span className="font-medium text-slate-700">{v.assignedDriver.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Lic: {v.assignedDriver.licenseNumber}
                        </p>
                        <span className={`inline-block mt-0.5 text-[10px] font-mono px-1 rounded ${
                          v.assignedDriver.safetyScore >= 85 ? 'bg-emerald-950 text-emerald-400' :
                          v.assignedDriver.safetyScore >= 70 ? 'bg-amber-950 text-amber-400' : 'bg-red-950 text-red-400'
                        }`}>
                          Safety: {v.assignedDriver.safetyScore}/100
                        </span>
                      </div>
                    </td>

                    <td className="p-3 font-mono">
                      <div className="flex items-center space-x-1 text-slate-700 font-bold">
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        <span>{v.speedKmh} km/h</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-1">
                        <Battery className="w-3 h-3 text-slate-500" />
                        <span>{v.batteryVoltage}V</span>
                        <span>•</span>
                        <span>{v.gpsStatus}</span>
                      </div>
                    </td>

                    <td className="p-3 font-mono">
                      <div className="flex items-center space-x-1 text-slate-700 font-semibold">
                        <Fuel className="w-3 h-3 text-cyan-400" />
                        <span>{v.currentFuelPercentage}%</span>
                      </div>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            v.currentFuelPercentage < 20 ? 'bg-red-500' :
                            v.currentFuelPercentage < 40 ? 'bg-amber-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${v.currentFuelPercentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">{v.currentFuelLiters} / {v.tankCapacityLiters}L</span>
                    </td>

                    <td className="p-3 font-mono text-slate-600">
                      <span>{v.mileageKm.toLocaleString()} km</span>
                      <p className="text-[10px] text-slate-500">+{v.dailyKm} km today</p>
                    </td>

                    <td className="p-3">
                      {getStatusBadge(v.status)}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          id={`btn-track-vehicle-${v.id}`}
                          onClick={() => onNavigateToMap(v.id)}
                          title="Track Live on Map"
                          className="p-1.5 bg-slate-100 hover:bg-cyan-950 hover:text-cyan-300 text-slate-600 border border-slate-200 rounded transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-inspect-vehicle-${v.id}`}
                          onClick={() => onOpenDossier(v)}
                          title="Open Comprehensive Vehicle Dossier"
                          className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded text-[11px] font-medium transition-colors flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Dossier</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
