import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Fuel, 
  Radio, 
  ChevronRight, 
  AlertCircle, 
  Zap, 
  BatteryCharging, 
  ShieldAlert,
  Car,
  Activity
} from 'lucide-react';
import { Vehicle, VehicleStatus } from '../types/fleet';

interface FleetListPanelProps {
  vehicles?: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  onOpenDossier?: (vehicle: Vehicle) => void;
  onInspectVehicle?: (vehicleId: string) => void;
}

export const FleetListPanel: React.FC<FleetListPanelProps> = ({
  vehicles = [],
  selectedVehicleId,
  onSelectVehicle,
  onOpenDossier,
  onInspectVehicle,
}) => {
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredVehicles = safeVehicles.filter((veh) => {
    if (!veh) return false;
    const matchesSearch = 
      veh.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      veh.assetNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      veh.assignedDriver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      veh.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      veh.type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || veh.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case 'moving':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">MOVING</span>;
      case 'idling':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">IDLING</span>;
      case 'parked':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">PARKED</span>;
      case 'emergency':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800 animate-pulse">EMERGENCY</span>;
      case 'unauthorized':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800">UNAUTHORIZED</span>;
      case 'offline':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">OFFLINE</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">UNKNOWN</span>;
    }
  };

  return (
    <div className={`relative flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 z-10 ${
      isCollapsed ? 'w-12' : 'w-80 sm:w-96'
    } h-full select-none overflow-hidden shrink-0`}>
      {/* Header & Collapse Toggle */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        {!isCollapsed && (
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <Car className="w-4 h-4 text-cyan-400" />
              <span>Fleet Inventory</span>
              <span className="text-xs px-1.5 py-0.2 bg-cyan-950 text-cyan-400 font-mono rounded ml-1">
                {filteredVehicles.length}/{vehicles.length}
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">Live Telemetry & Status Stream</p>
          </div>
        )}
        <button
          id="btn-toggle-fleet-collapse"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Fleet List' : 'Collapse Fleet List'}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Search Input */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-900">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                id="input-fleet-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Reg, Asset #, Driver..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Quick Status Chips */}
            <div className="flex items-center space-x-1 mt-2 overflow-x-auto scrollbar-none pb-1 text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'moving', label: 'Moving' },
                { id: 'idling', label: 'Idling' },
                { id: 'parked', label: 'Parked' },
                { id: 'emergency', label: 'Emergency' },
                { id: 'offline', label: 'Offline' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  id={`filter-${filter.id}`}
                  onClick={() => setStatusFilter(filter.id)}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${
                    statusFilter === filter.id
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1.5 space-y-1">
            {filteredVehicles.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No government vehicles match current filter criteria.
              </div>
            ) : (
              filteredVehicles.map((veh) => {
                const isSelected = veh.id === selectedVehicleId;
                return (
                  <div
                    key={veh.id}
                    id={`vehicle-card-${veh.id}`}
                    onClick={() => onSelectVehicle(veh.id)}
                    className={`p-2.5 rounded-lg transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                        : veh.status === 'emergency'
                        ? 'bg-red-950/30 border-red-800/80 hover:bg-red-950/50'
                        : 'bg-slate-950/40 border-slate-800/70 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-xs text-white tracking-wide">
                            {veh.regNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">({veh.assetNumber})</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium truncate max-w-[180px]">
                          {veh.make} {veh.model} • {veh.type}
                        </p>
                      </div>
                      <div>{getStatusBadge(veh.status)}</div>
                    </div>

                    {/* Telemetry quick metrics */}
                    <div className="mt-2 grid grid-cols-3 gap-1.5 py-1.5 px-2 bg-slate-900/80 rounded border border-slate-800/60 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Speed</span>
                        <span className="font-mono font-bold text-slate-200">{veh.speedKmh} km/h</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase flex items-center gap-0.5">
                          <Fuel className="w-2.5 h-2.5 text-cyan-400" /> Fuel
                        </span>
                        <span className="font-mono font-bold text-slate-200">{veh.currentFuelPercentage}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Driver Score</span>
                        <span className={`font-mono font-bold ${
                          veh.assignedDriver.safetyScore >= 85 ? 'text-emerald-400' :
                          veh.assignedDriver.safetyScore >= 70 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {veh.assignedDriver.safetyScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate max-w-[170px] text-slate-400">
                        {veh.department}
                      </span>
                      <button
                        id={`btn-view-dossier-${veh.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenDossier) onOpenDossier(veh);
                          else if (onInspectVehicle) onInspectVehicle(veh.id);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center text-[10px] hover:underline"
                      >
                        Inspect Dossier &rarr;
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
