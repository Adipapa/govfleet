import React, { useState } from 'react';
import { 
  UserCheck, 
  ShieldAlert, 
  Award, 
  AlertTriangle, 
  Gauge, 
  Clock, 
  Car, 
  TrendingUp, 
  Search,
  CheckCircle,
  FileBadge
} from 'lucide-react';
import { Vehicle } from '../types/fleet';

interface DriverSafetyViewProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicleId: string) => void;
}

export const DriverSafetyView: React.FC<DriverSafetyViewProps> = ({
  vehicles,
  onSelectVehicle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');

  const driversList = vehicles.map((v) => ({
    vehicle: v,
    driver: v.assignedDriver,
    dailyKm: v.dailyKm,
    afterHours: v.afterHoursUsageDetected,
    speedingCount: v.speedKmh > 80 ? 1 : 0,
    status: v.status,
  }));

  const filteredDrivers = driversList.filter((item) => {
    const matchesSearch = 
      item.driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vehicle.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vehicle.department.toLowerCase().includes(searchQuery.toLowerCase());

    const score = item.driver.safetyScore;
    let matchesGrade = true;
    if (selectedGrade === 'a') matchesGrade = score >= 90;
    if (selectedGrade === 'b') matchesGrade = score >= 80 && score < 90;
    if (selectedGrade === 'c') matchesGrade = score >= 70 && score < 80;
    if (selectedGrade === 'warning') matchesGrade = score < 70;

    return matchesSearch && matchesGrade;
  });

  const avgFleetScore = Math.round(
    driversList.reduce((acc, curr) => acc + curr.driver.safetyScore, 0) / driversList.length
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Driver Behavior Monitoring & Telematics Safety Index
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono border border-emerald-800">
              FLEET AVERAGE: {avgFleetScore}/100
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Algorithmic scoring assessing harsh braking, aggressive cornering, overspeeding, and unauthorized after-hours usage.
          </p>
        </div>

        {/* Filter / Search */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search driver name or reg..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Safety Score Scoring Metric Legend Card */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
          <span className="text-emerald-400 font-bold block text-sm">Grade A (90 - 100)</span>
          <p className="text-slate-400 text-[11px] mt-0.5">Exemplary Government Driver. Zero harsh telemetry incidents.</p>
        </div>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
          <span className="text-cyan-400 font-bold block text-sm">Grade B (80 - 89)</span>
          <p className="text-slate-400 text-[11px] mt-0.5">Standard Compliant. Minor idling or occasional moderate braking.</p>
        </div>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
          <span className="text-amber-400 font-bold block text-sm">Grade C (70 - 79)</span>
          <p className="text-slate-400 text-[11px] mt-0.5">Advisory Review. Multiple harsh maneuvers or low-speed overspeed.</p>
        </div>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
          <span className="text-red-400 font-bold block text-sm">Critical Warning (&lt; 70)</span>
          <p className="text-slate-400 text-[11px] mt-0.5">Mandatory Retraining. Flagged for unauthorized hours or reckless transit.</p>
        </div>
      </div>

      {/* Drivers Roster */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map((item) => {
          const score = item.driver.safetyScore;
          return (
            <div 
              key={item.driver.id}
              onClick={() => onSelectVehicle(item.vehicle.id)}
              className="p-4 bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-xl transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base border ${
                    score >= 90 ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                    score >= 80 ? 'bg-cyan-950 text-cyan-300 border-cyan-800' :
                    score >= 70 ? 'bg-amber-950 text-amber-300 border-amber-800' :
                    'bg-red-950 text-red-300 border-red-800'
                  }`}>
                    {score}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">{item.driver.name}</span>
                    <span className="text-xs text-slate-400">{item.vehicle.department}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  score >= 90 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  score >= 80 ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                  score >= 70 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  'bg-red-950 text-red-400 border border-red-800'
                }`}>
                  {score >= 90 ? 'EXEMPLARY' : score >= 80 ? 'COMPLIANT' : score >= 70 ? 'MODERATE' : 'SUSPENDED'}
                </span>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950 rounded-lg text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Vehicle</span>
                  <span className="text-white font-bold">{item.vehicle.regNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Daily Mileage</span>
                  <span className="text-slate-300">{item.dailyKm} km</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">After Hours</span>
                  <span className={item.afterHours ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                    {item.afterHours ? 'FLAGGED' : 'CLEAR'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                <span>License: {item.driver.licenseNumber}</span>
                <span className="text-cyan-400 hover:underline">Inspect Vehicle &rarr;</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
