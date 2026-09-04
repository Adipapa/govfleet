import { 
  Vehicle, 
  AlertEvent, 
  FuelLogEvent, 
  AuditLog, 
  Geofence, 
  Trip, 
  MaintenanceItem 
} from '../types/fleet';
import { 
  INITIAL_VEHICLES, 
  INITIAL_ALERTS, 
  INITIAL_FUEL_LOGS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_GEOFENCES, 
  INITIAL_TRIPS, 
  INITIAL_MAINTENANCE 
} from '../data/initialData';

export interface TelemetryState {
  vehicles: Vehicle[];
  alerts: AlertEvent[];
  fuelLogs: FuelLogEvent[];
  auditLogs: AuditLog[];
  geofences: Geofence[];
  trips: Trip[];
  maintenance: MaintenanceItem[];
}

type Listener = (state: TelemetryState) => void;

export class TelemetryEngine {
  private vehicles: Vehicle[];
  private alerts: AlertEvent[];
  private fuelLogs: FuelLogEvent[];
  private auditLogs: AuditLog[];
  private geofences: Geofence[];
  private trips: Trip[];
  private maintenance: MaintenanceItem[];

  private listeners: Set<Listener> = new Set();
  private timerId: number | null = null;
  private isSimulating: boolean = true;
  private simulationSpeed: number = 1; // 1x

  constructor(initialVehicles?: Vehicle[]) {
    this.vehicles = JSON.parse(JSON.stringify(initialVehicles || INITIAL_VEHICLES));
    this.alerts = JSON.parse(JSON.stringify(INITIAL_ALERTS));
    this.fuelLogs = JSON.parse(JSON.stringify(INITIAL_FUEL_LOGS));
    this.auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    this.geofences = JSON.parse(JSON.stringify(INITIAL_GEOFENCES));
    this.trips = JSON.parse(JSON.stringify(INITIAL_TRIPS));
    this.maintenance = JSON.parse(JSON.stringify(INITIAL_MAINTENANCE));

    this.start();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState: TelemetryState = {
      vehicles: [...this.vehicles],
      alerts: [...this.alerts],
      fuelLogs: [...this.fuelLogs],
      auditLogs: [...this.auditLogs],
      geofences: [...this.geofences],
      trips: [...this.trips],
      maintenance: [...this.maintenance],
    };

    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Telemetry subscriber error', err);
      }
    });
  }

  public getSimulationSpeed(): number {
    return this.simulationSpeed;
  }

  public setSimulationSpeed(speed: number) {
    this.simulationSpeed = Math.max(0.5, speed);
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
      this.start();
    }
  }

  public start() {
    if (this.timerId !== null) return;
    this.timerId = window.setInterval(() => {
      this.tick();
    }, 2500 / this.simulationSpeed);
  }

  public stop() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public getVehicles(): Vehicle[] {
    return this.vehicles;
  }

  public getAlerts(): AlertEvent[] {
    return this.alerts;
  }

  public getFuelLogs(): FuelLogEvent[] {
    return this.fuelLogs;
  }

  public getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  public getGeofences(): Geofence[] {
    return this.geofences;
  }

  public getTrips(): Trip[] {
    return this.trips;
  }

  public getMaintenance(): MaintenanceItem[] {
    return this.maintenance;
  }

  private tick() {
    if (!this.isSimulating) return;

    this.vehicles = this.vehicles.map((veh) => {
      if (veh.status === 'moving') {
        const rad = (veh.heading * Math.PI) / 180;
        const stepDistance = 0.00035 * this.simulationSpeed;

        let newLat = veh.currentLocation.lat + Math.cos(rad) * stepDistance;
        let newLng = veh.currentLocation.lng + Math.sin(rad) * stepDistance;

        // Keep simulated vehicles inside realistic boundary (Banjul / Kombo region)
        let newHeading = veh.heading;
        if (newLat > 13.52 || newLat < 13.28) {
          newHeading = (newHeading + 140 + Math.random() * 40) % 360;
        }
        if (newLng > -16.55 || newLng < -16.78) {
          newHeading = (newHeading + 140 + Math.random() * 40) % 360;
        }

        const headingWobble = (Math.random() - 0.5) * 6;
        newHeading = (newHeading + headingWobble + 360) % 360;

        const baseSpeed = veh.department.includes('Police') ? 68 : 52;
        const speedOscillation = Math.max(15, Math.min(115, baseSpeed + (Math.random() - 0.5) * 14));

        const distancePerTick = 0.02 * this.simulationSpeed;
        const fuelConsumedPerTick = 0.0035 * this.simulationSpeed;
        const newFuelLiters = Math.max(2, veh.currentFuelLiters - fuelConsumedPerTick);
        const newFuelPercentage = Math.round((newFuelLiters / veh.tankCapacityLiters) * 100);

        return {
          ...veh,
          currentLocation: {
            ...veh.currentLocation,
            lat: Number(newLat.toFixed(6)),
            lng: Number(newLng.toFixed(6)),
          },
          speedKmh: Math.round(speedOscillation),
          heading: Math.round(newHeading),
          mileageKm: Number((veh.mileageKm + distancePerTick).toFixed(2)),
          dailyKm: Number((veh.dailyKm + distancePerTick).toFixed(1)),
          currentFuelLiters: Number(newFuelLiters.toFixed(2)),
          currentFuelPercentage: newFuelPercentage,
          lastCommunication: 'Just now (live stream)',
        };
      } else if (veh.status === 'idling') {
        const idleFuelUsed = 0.001 * this.simulationSpeed;
        const newFuelLiters = Math.max(5, veh.currentFuelLiters - idleFuelUsed);
        return {
          ...veh,
          currentFuelLiters: Number(newFuelLiters.toFixed(2)),
          currentFuelPercentage: Math.round((newFuelLiters / veh.tankCapacityLiters) * 100),
          idleHoursToday: Number((veh.idleHoursToday + 0.002 * this.simulationSpeed).toFixed(2)),
          lastCommunication: 'Just now (idle)',
        };
      }

      return veh;
    });

    this.notify();
  }

  // Action methods
  public triggerSOS(vehicleId: string) {
    const veh = this.vehicles.find((v) => v.id === vehicleId);
    if (!veh) return;

    veh.status = 'emergency';
    veh.speedKmh = Math.max(veh.speedKmh, 80);

    const alert: AlertEvent = {
      id: `alt-${Date.now()}`,
      vehicleId: veh.id,
      vehicleReg: veh.regNumber,
      department: veh.department,
      type: 'emergency_sos',
      severity: 'critical',
      title: '🚨 EMERGENCY / SOS PANIC BUTTON ACTIVATED',
      message: `Emergency signal transmitted from ${veh.regNumber} (${veh.assignedDriver.name}) on ${veh.currentLocation.address}. Immediate police unit dispatch recommended.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      location: { ...veh.currentLocation },
      speedKmh: veh.speedKmh,
      acknowledged: false,
      dispatchedToPolice: true,
    };

    const audit: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: 'Automated GPS Telematics Server',
      role: 'System Daemon',
      department: 'Central Operations',
      action: 'EMERGENCY_SOS_TRIGGERED',
      details: `Hardware panic button depressed on ${veh.regNumber}. Location: ${veh.currentLocation.address}`,
      ipAddress: '10.200.0.12 (Internal APN)',
      tamperVerified: true,
    };

    this.alerts.unshift(alert);
    this.auditLogs.unshift(audit);
    this.notify();
  }

  public simulateFuelDrop(vehicleId: string, dropLiters: number = 28) {
    const veh = this.vehicles.find((v) => v.id === vehicleId);
    if (!veh) return;

    const oldFuel = veh.currentFuelLiters;
    const newFuel = Math.max(3, oldFuel - dropLiters);
    veh.currentFuelLiters = Number(newFuel.toFixed(1));
    veh.currentFuelPercentage = Math.round((newFuel / veh.tankCapacityLiters) * 100);

    const fuelLog: FuelLogEvent = {
      id: `fl-${Date.now()}`,
      vehicleId: veh.id,
      vehicleReg: veh.regNumber,
      type: 'theft',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      fuelBeforeLiters: oldFuel,
      fuelAfterLiters: newFuel,
      percentageBefore: Math.round((oldFuel / veh.tankCapacityLiters) * 100),
      percentageAfter: veh.currentFuelPercentage,
      deltaLiters: -dropLiters,
      ignitionState: veh.ignition,
      location: veh.currentLocation.address,
      estimatedCostGMD: Math.round(dropLiters * 77),
      verified: false,
    };

    const alert: AlertEvent = {
      id: `alt-${Date.now()}`,
      vehicleId: veh.id,
      vehicleReg: veh.regNumber,
      department: veh.department,
      type: 'fuel_theft',
      severity: 'critical',
      title: '🚨 FUEL THEFT DETECTED (TRIMAGO ULTRASONIC SENSOR)',
      message: `Sudden fuel loss of ${dropLiters} Liters detected on ${veh.regNumber} while parked with ignition ${veh.ignition ? 'ON' : 'OFF'}. Est financial loss GMD ${Math.round(dropLiters * 77).toLocaleString()}.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      location: { ...veh.currentLocation },
      fuelDropAmount: dropLiters,
      acknowledged: false,
      dispatchedToPolice: false,
    };

    const audit: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: 'Trimago Fuel Telemetry Probe',
      role: 'Sensor Daemon',
      department: veh.department,
      action: 'FUEL_THEFT_DETECTED',
      details: `Ultrasonic sensor delta -${dropLiters}L on ${veh.regNumber}. Referred to Anti-Fraud unit.`,
      ipAddress: '10.200.0.18 (CAN-Bus Gateway)',
      tamperVerified: true,
    };

    this.fuelLogs.unshift(fuelLog);
    this.alerts.unshift(alert);
    this.auditLogs.unshift(audit);
    this.notify();
  }

  public simulateRefuel(vehicleId: string, addedLiters: number = 45) {
    const veh = this.vehicles.find((v) => v.id === vehicleId);
    if (!veh) return;

    const oldFuel = veh.currentFuelLiters;
    const actualAdd = Math.min(veh.tankCapacityLiters - oldFuel, addedLiters);
    const newFuel = oldFuel + actualAdd;
    veh.currentFuelLiters = Number(newFuel.toFixed(1));
    veh.currentFuelPercentage = Math.round((newFuel / veh.tankCapacityLiters) * 100);

    const fuelLog: FuelLogEvent = {
      id: `fl-${Date.now()}`,
      vehicleId: veh.id,
      vehicleReg: veh.regNumber,
      type: 'refuel',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      fuelBeforeLiters: oldFuel,
      fuelAfterLiters: newFuel,
      percentageBefore: Math.round((oldFuel / veh.tankCapacityLiters) * 100),
      percentageAfter: veh.currentFuelPercentage,
      deltaLiters: actualAdd,
      ignitionState: false,
      location: 'Government Fuel Depot, Mile 2',
      estimatedCostGMD: Math.round(actualAdd * 77),
      verified: true,
    };

    const audit: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: 'Mile 2 Fuel Depot Dispatcher',
      role: 'Depot Officer',
      department: 'Ministry of Transport',
      action: 'REFUEL_RECORDED',
      details: `Delivered +${actualAdd}L to ${veh.regNumber}. Tank now at ${veh.currentFuelPercentage}%.`,
      ipAddress: '192.168.10.45',
      tamperVerified: true,
    };

    this.fuelLogs.unshift(fuelLog);
    this.auditLogs.unshift(audit);
    this.notify();
  }

  public acknowledgeAlert(alertId: string, userName: string = 'Col. Ousman Touray') {
    const alt = this.alerts.find(a => a.id === alertId);
    if (!alt) return;

    alt.acknowledged = true;

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: userName,
      role: 'Operations Dispatcher',
      department: 'Central Operations',
      action: 'ACKNOWLEDGE_ALERT',
      details: `Alert "${alt.title}" on ${alt.vehicleReg} acknowledged and triaged.`,
      ipAddress: '192.168.1.104',
      tamperVerified: true,
    });

    this.notify();
  }

  public dispatchPolice(alertId: string) {
    const alt = this.alerts.find(a => a.id === alertId);
    if (!alt) return;

    alt.dispatchedToPolice = true;

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: 'Police CAD Gateway API',
      role: 'Gambia Police Force',
      department: 'Gambia Police Force',
      action: 'DISPATCH_POLICE',
      details: `Police Unit 4 dispatched to intercept ${alt.vehicleReg} at ${alt.location.address}.`,
      ipAddress: '10.150.4.88 (Police Network)',
      tamperVerified: true,
    });

    this.notify();
  }

  public addGeofence(geo: Geofence) {
    this.geofences.push(geo);

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: 'Director of Transport',
      role: 'Fleet Administrator',
      department: 'Ministry of Transport',
      action: 'GEOFENCE_CREATED',
      details: `Created perimeter "${geo.name}" (${geo.category}, ${geo.speedLimitKmh} km/h limit).`,
      ipAddress: '192.168.1.102',
      tamperVerified: true,
    });

    this.notify();
  }

  public deleteGeofence(id: string) {
    const target = this.geofences.find(g => g.id === id);
    this.geofences = this.geofences.filter(g => g.id !== id);

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: 'Director of Transport',
      role: 'Fleet Administrator',
      department: 'Ministry of Transport',
      action: 'GEOFENCE_DELETED',
      details: `Deleted perimeter "${target?.name || id}".`,
      ipAddress: '192.168.1.102',
      tamperVerified: true,
    });

    this.notify();
  }

  public addMaintenance(item: MaintenanceItem) {
    this.maintenance.unshift(item);

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: 'Fleet Workshop Manager',
      role: 'Fleet Administrator',
      department: 'Ministry of Transport',
      action: 'MAINTENANCE_ORDER_CREATED',
      details: `Booked ${item.category} for ${item.vehicleReg} at ${item.serviceCenter}.`,
      ipAddress: '192.168.1.115',
      tamperVerified: true,
    });

    this.notify();
  }
}
