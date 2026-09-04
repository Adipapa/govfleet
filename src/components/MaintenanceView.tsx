import React, { useState } from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Plus, 
  Car, 
  ShieldAlert,
  Search
} from 'lucide-react';
import { MaintenanceItem, Vehicle } from '../types/fleet';

interface MaintenanceViewProps {
  maintenanceList: MaintenanceItem[];
  vehicles: Vehicle[];
  onAddMaintenance: (item: MaintenanceItem) => void;
  onSelectVehicle: (vehicleId: string) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  maintenanceList,
  vehicles,
  onAddMaintenance,
  onSelectVehicle,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // New item form
  const [formVehicleId, setFormVehicleId] = useState(vehicles[0]?.id || '');
  const [formCategory, setFormCategory] = useState<MaintenanceItem['category']>('Oil change');
  const [formDueMileage, setFormDueMileage] = useState<number>(50000);
  const [formDueDate, setFormDueDate] = useState<string>('2026-10-15');
  const [formCost, setFormCost] = useState<number>(5500);
  const [formServiceCenter, setFormServiceCenter] = useState('Central Government Mechanical Depot, Kanifing');
  const [formNotes, setFormNotes] = useState('');

  const filteredItems = maintenanceList.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchStat = selectedStatus === 'all' || item.status === selectedStatus;
    return matchCat && matchStat;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = vehicles.find(v => v.id === formVehicleId);
    if (!veh) return;

    const newItem: MaintenanceItem = {
      id: `mnt-${Date.now()}`,
      vehicleId: veh.id,
      vehicleReg: veh.regNumber,
      category: formCategory,
      status: 'Scheduled',
      dueMileageKm: formDueMileage,
      dueDate: formDueDate,
      costEstimated: formCost,
      serviceCenter: formServiceCenter,
      notes: formNotes || `${formCategory} scheduled for ${veh.regNumber}`,
    };

    onAddMaintenance(newItem);
    setShowModal(false);
    setFormNotes('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Government Fleet Maintenance & Compliance Management
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
              PREDICTIVE TELEMATICS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Automated mileage tracking, engine-hour triggers, expiring registration/insurance, and mechanical service work orders.
          </p>
        </div>

        <button
          id="btn-open-create-maintenance"
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Book Service Work Order</span>
        </button>
      </div>

      {/* Expiry Warning Callout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-red-900/60 rounded-xl">
          <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider block">Overdue Service</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-mono font-bold text-red-400">
              {maintenanceList.filter(m => m.status === 'Overdue').length}
            </span>
            <span className="text-xs text-slate-400">vehicles</span>
          </div>
          <span className="text-[10px] text-red-400/80 mt-1 block">Requires immediate grounding</span>
        </div>

        <div className="p-4 bg-slate-900 border border-amber-900/60 rounded-xl">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">Due Within 1,000 KM</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-mono font-bold text-amber-400">
              {maintenanceList.filter(m => m.status === 'Due Soon').length}
            </span>
            <span className="text-xs text-slate-400">upcoming</span>
          </div>
          <span className="text-[10px] text-amber-400/80 mt-1 block">Scheduled for this month</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block">Scheduled Orders</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-mono font-bold text-cyan-300">
              {maintenanceList.filter(m => m.status === 'Scheduled').length}
            </span>
            <span className="text-xs text-slate-400">queued</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Assigned to Gov Workshop</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">Registration / Insurance</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-mono font-bold text-emerald-300">
              98.2%
            </span>
            <span className="text-xs text-emerald-500 font-mono">Compliant</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">1 vehicle expired</span>
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span>Active Maintenance & Service Registry</span>
          </h2>

          <div className="flex items-center space-x-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-800 text-xs text-white px-2.5 py-1 rounded border border-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="Overdue">Overdue</option>
              <option value="Due Soon">Due Soon</option>
              <option value="Scheduled">Scheduled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Trigger Mileage</th>
                <th className="py-2.5 px-3">Target Date</th>
                <th className="py-2.5 px-3">Service Center</th>
                <th className="py-2.5 px-3">Est. Cost</th>
                <th className="py-2.5 px-3">Work Order Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td 
                    onClick={() => onSelectVehicle(item.vehicleId)}
                    className="py-2.5 px-3 font-mono font-bold text-cyan-400 hover:underline cursor-pointer"
                  >
                    {item.vehicleReg}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {item.category}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'Overdue' ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse' :
                      item.status === 'Due Soon' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {item.dueMileageKm.toLocaleString()} KM
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">
                    {item.dueDate}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 truncate max-w-[180px]">
                    {item.serviceCenter}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-white">
                    GMD {item.costEstimated.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 truncate max-w-[200px]">
                    {item.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Service Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <h2 className="text-base font-bold text-white">Book Government Maintenance Work Order</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-slate-300 block mb-1">Target Government Vehicle</label>
                <select
                  value={formVehicleId}
                  onChange={(e) => setFormVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.regNumber} — {v.make} {v.model} ({v.mileageKm.toLocaleString()} KM)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Service Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="Oil change">Oil change</option>
                    <option value="Tire replacement">Tire replacement</option>
                    <option value="Brake service">Brake service</option>
                    <option value="Engine service">Engine service</option>
                    <option value="Battery replacement">Battery replacement</option>
                    <option value="General servicing">General servicing</option>
                    <option value="Inspection">Periodic Inspection</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Trigger Mileage (KM)</label>
                  <input
                    type="number"
                    value={formDueMileage}
                    onChange={(e) => setFormDueMileage(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Target Service Date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Estimated Budget (GMD)</label>
                  <input
                    type="number"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Workshop / Service Facility</label>
                <input
                  type="text"
                  value={formServiceCenter}
                  onChange={(e) => setFormServiceCenter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Work Order Directives</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Mandatory brake pads overhaul & fluid flush before rainy season mission."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg"
                >
                  Confirm Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
