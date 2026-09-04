export type VehicleStatus = 
  | 'moving' 
  | 'stopped' 
  | 'idling' 
  | 'parked' 
  | 'offline' 
  | 'no_gps' 
  | 'emergency' 
  | 'unauthorized';

export type UserRole = 
  | 'super_admin' 
  | 'fleet_admin' 
  | 'fleet_manager' 
  | 'driver' 
  | 'security_police' 
  | 'auditor';

export type GovernmentAgency = 
  | 'All Agencies'
  | 'Ministry of Transport' 
  | 'Ministry of Health' 
  | 'Gambia Police Force' 
  | 'Ministry of Finance' 
  | 'State House VIP Fleet' 
  | 'National Disaster Mgmt Agency';

export type VehicleType = 
  | 'Patrol SUV' 
  | 'Executive Sedan' 
  | 'Ambulance' 
  | 'Heavy Transport Truck' 
  | 'Utility Pickup' 
  | 'Government Bus';

export type FuelType = 'Diesel' | 'Petrol';

export interface Vehicle {
  id: string;
  regNumber: string; // e.g. GG-0124-23
  assetNumber: string; // e.g. ASSET-GOV-2024-8841
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  department: GovernmentAgency;
  assignedDriver: {
    id: string;
    name: string;
    phone: string;
    licenseNumber: string;
    safetyScore: number; // 0 - 100
  };
  deviceId: string;
  hardwareModel?: string;
  simNumber: string;
  fuelType: FuelType;
  tankCapacityLiters: number;
  currentFuelLiters: number;
  currentFuelPercentage: number;
  mileageKm: number;
  status: VehicleStatus;
  
  // Real-time telemetry
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  speedKmh: number;
  heading: number; // 0 - 360
  ignition: boolean;
  gpsStatus: 'Connected' | 'Weak' | 'Offline';
  satellites: number;
  gsmSignal: number; // 0 - 100%
  lastCommunication: string;
  batteryVoltage: number; // e.g. 12.8V
  
  // Compliance & Maintenance
  insuranceExpiry: string;
  registrationExpiry: string;
  nextServiceKm: number;
  lastServiceDate: string;
  
  // Utilization
  dailyKm: number;
  workingHoursToday: number;
  idleHoursToday: number;
  afterHoursUsageDetected: boolean;
}

export interface Geofence {
  id: string;
  name: string;
  category: 'Government Office' | 'Hospital' | 'Police Station' | 'Airport' | 'Fuel Depot' | 'Restricted Zone' | 'Border Post';
  coordinates: [number, number][]; // Polygon coordinates [lat, lng]
  center: [number, number];
  radiusMeters?: number;
  departmentScope?: GovernmentAgency | 'All Agencies';
  alertOnEntry: boolean;
  alertOnExit: boolean;
  restrictedZone: boolean;
  speedLimitKmh: number;
}

export interface AlertEvent {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  department: GovernmentAgency;
  type: 
    | 'emergency_sos'
    | 'fuel_theft'
    | 'overspeed'
    | 'geofence_breach'
    | 'unauthorized_movement'
    | 'after_hours_movement'
    | 'excessive_idling'
    | 'device_offline'
    | 'tampering';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  speedKmh?: number;
  fuelDropAmount?: number;
  acknowledged: boolean;
  dispatchedToPolice: boolean;
}

export interface Trip {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  driverName: string;
  startTime: string;
  endTime: string;
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  durationMinutes: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  idleMinutes: number;
  fuelConsumedLiters: number;
  waypoints: {
    lat: number;
    lng: number;
    speed: number;
    timestamp: string;
    event?: string;
  }[];
}

export interface FuelLogEvent {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  type: 'refuel' | 'theft' | 'normal_consumption';
  timestamp: string;
  fuelBeforeLiters: number;
  fuelAfterLiters: number;
  percentageBefore: number;
  percentageAfter: number;
  deltaLiters: number;
  ignitionState: boolean;
  location: string;
  estimatedCostGMD: number; // Gambian Dalasi or USD
  verified: boolean;
}

export interface MaintenanceItem {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  category: 'Oil change' | 'Tire replacement' | 'Brake service' | 'Engine service' | 'Battery replacement' | 'General servicing' | 'Inspection';
  status: 'Scheduled' | 'Due Soon' | 'Overdue' | 'Completed';
  dueMileageKm: number;
  dueDate: string;
  costEstimated: number;
  serviceCenter: string;
  notes: string;
}

export interface AuditLog {
  id: string;
  username: string;
  role: string;
  department: string;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  tamperVerified: boolean;
}

export interface DeviceTelemetry {
  deviceId: string;
  serialNumber: string;
  model: string;
  protocol: 'TCP' | 'UDP' | 'HTTP' | 'MQTT';
  assignedVehicleReg: string;
  status: 'Active' | 'Standby' | 'Offline' | 'Maintenance';
  firmware: string;
  pingIntervalSec: number;
  batteryHealth: number; // %
  storageBufferCount: number; // buffered offline records
  lastHeartbeat: string;
}
