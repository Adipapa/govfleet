# QTS Government Fleet Telematics & SinoTrack IoT Intelligence Platform

A centralized, enterprise-grade telematics and fleet intelligence system built for government ministries, emergency response agencies, law enforcement, and municipal logistics operations.

---

## 🚀 Key Highlights & Architectural Overview

- **Vertical Collapsible Navigation**: Designed with a high-density, ergonomic vertical sidebar that scales cleanly from mobile command tablets to multi-monitor dispatch centers.
- **Streamlined Dashboard Metrics**: High-signal, executive overview tracking active fleet strength, real-time vehicle movement, fuel levels, and urgent operational alerts.
- **Dedicated SinoTrack Telematics Integration**: Full native support for SinoTrack 4G LTE IoT trackers with over-the-air (OTA) command consoles, remote relay immobilization, diagnostics, and wiring pinout guides.
- **Real-Time Geospatial Tracking**: Interactive map featuring turn-by-turn waypoint trails, geofence perimeters, driver assignment telemetry, and speed alerts.
- **Anti-Theft & Fuel Siphon Intelligence**: Real-time ultrasonic fuel sensors with automated sudden-drop detection to prevent illegal fuel siphoning.
- **Driver Safety Scoring & Curfews**: Algorithmic safety scoring (0–100) evaluating harsh braking, rapid acceleration, after-hours usage, and out-of-jurisdiction route violations.

---

## 📡 SinoTrack Hardware Integration

The platform features end-to-end integration with the **SinoTrack** product line, communicating via standard **SinoTrack GPRS/TCP Protocol (Port 8090)** and SMS fallback channels.

### Supported SinoTrack Hardware Models

| SinoTrack Model | Form Factor / Spec | Primary Application | Key Hardware Sensors |
|---|---|---|---|
| **SinoTrack ST-906L** | 4G LTE Wired Unit + 150mAh Battery | Government Sedans, Police Interceptors, Ambulances | 12V/24V Cut-Off Relay, SOS Button, ACC Ignition, Audio Mic |
| **SinoTrack ST-901L** | 4G LTE IP67 Waterproof Compact | Light Utility Vehicles, Escort Motorcycles, Marine Patrol | ACC Detection, Remote Relay Oil Cut, Internal Battery |
| **SinoTrack ST-902L** | 4G OBD-II Plug & Play | Ministry Executive Sedans, Pool Vehicles | 16-Pin OBD-II CAN Bus, DTC Faults, RPM & Speed Telemetry |
| **SinoTrack ST-907L** | Concealed Automotive Relay Tracker | Anti-Theft Protection, VIP Transport | Form-Factor of standard 12V/24V relay for zero-visibility concealment |
| **SinoTrack ST-915** | 10,000mAh Magnetic Asset Tracker | Heavy Cargo, Containers, Disaster Trailers (NDMA) | Industrial Magnets, IP65 Waterproof, Dismantle Light Sensor |

---

## ⚡ SinoTrack OTA Protocol & Command Reference

SinoTrack units accept standardized text commands transmitted either over TCP GPRS packets (Port 8090) or via direct SMS to the device's encrypted GovNet SIM card. The platform's default master passcode is configured as `0000`.

### Core SinoTrack Telematics Command Set

| Command Syntax | Function | Description & Expected Response |
|---|---|---|
| `9400000` | **Cut Off Engine / Fuel** | Triggers DOUT 1 (Yellow Wire) to open the fuel pump relay. Stops vehicle safely. <br>`SET OK! RELAY ACTIVATED. STATUS: STOPPED.` |
| `9410000` | **Restore Engine / Fuel** | Deactivates relay, restoring fuel pump circuit for normal operation. <br>`SET OK! RELAY RELEASED. STATUS: NORMAL.` |
| `CXZT` or `CQ` | **Query Device State** | Returns live operating diagnostics, voltage, satellite lock, and signal. <br>`BAT:98%, ACC:ON, GPS:A, GPRS:OK, IP:197.234.112.50:8090, SPD:52KM/H` |
| `6690000` or `RCONF` | **Read Configuration** | Reads APN parameters, telemetry IP address, port, and firmware version. <br>`APN:qts.gov.gm, IP:197.234.112.50:8090, TIMER:10S, VER:ST-906L_4G_v2.41` |
| `8050000 10` | **Set Telemetry Interval** | Sets active reporting frequency (e.g. 10 seconds for real-time tracking). <br>`SET OK! INTERVAL:10 SECONDS.` |
| `8040000 [IP] [Port]`| **Configure Server IP** | Points device to government telematics gateway (e.g., `8040000 197.234.112.50 8090`). <br>`SET IP & PORT OK!` |
| `8030000 [APN]` | **Configure APN** | Configures private cellular APN for government encrypted SIM cards. <br>`SET APN OK!` |
| `1220000 [Speed]` | **Overspeed Alarm** | Sets in-cabin audible buzzer and dispatch alert threshold (e.g. `1220000 080` for 80 km/h). |
| `RESTART` | **Soft Reboot Modem** | Cycles device micro-controller and 4G modem without losing persistent flash storage. |
| `RESET` | **Factory Reset** | Restores factory firmware defaults (restricted to Super Admin role). |

---

## 🔌 SinoTrack ST-906L Wire Harness & Installation Pinout

For fleet technicians and automotive electricians, the SinoTrack ST-906L wiring harness connects as follows:

```
                  +-----------------------------------+
                  |      SinoTrack ST-906L 4G         |
                  |     Telematics Control Unit       |
                  +-----------------------------------+
                         |   |   |   |   |   |
   +---------------------+   |   |   |   |   +-----------------------+
   | (Red)                   |   |   |   |                           | (Audio Port)
   v                         |   |   |   v                           v
Battery Positive             |   |   |  SOS Panic Button          External Mic
(9V - 80V DC, 2A Fuse)       |   |   |  (DIN 2, Green/White)      (Voice Surveillance)
                             |   |   |
              +--------------+   |   +-------------------+
              | (Black)          |                       | (Yellow)
              v                  v                       v
          Chassis GND       ACC Ignition Line       Relay Control DOUT 1
          (Metallic Body)   (DIN 1, Orange Wire)    (Pin 86 on Fuel Relay)
```

1. **Red Wire (`+VCC`)**: Connects to permanent `+12V` or `+24V` battery terminal with an inline 2A fast-blow fuse.
2. **Black Wire (`GND`)**: Connects to the vehicle chassis frame bolt to ensure ground continuity.
3. **Orange Wire (`ACC / DIN 1`)**: Connects to the ignition accessory circuit. Generates real-time events for engine crank, idling calculation, and operating hour audits.
4. **Yellow Wire (`Relay / DOUT 1`)**: Connects to pin 86 of the external 12V/24V 40A fuel cut-off relay. Driven low to trigger engine cut-off on command `9400000`.
5. **Green / White Wire (`SOS / DIN 2`)**: Routed to a discreet driver button. When held for 3 seconds, dispatches high-priority duress alarms to the National Command Center.
6. **External Mic Jack**: 3.5mm input for authorized acoustic verification during high-risk security incidents.

---

## 🛠️ Application Modules & Features

### 1. Unified Dashboard Overview
- **Four Core KPI Cards**: Total Fleet Size, Moving Now, Average Fuel Level, and Unresolved Critical Alerts.
- **Vehicle Status Distribution**: Real-time breakdown of Moving, Idling, Parked, Offline, and Unauthorized vehicles.
- **Quick Jump Actions**: 1-click filters to isolate moving units or active geofence exceptions.

### 2. Live Fleet Map & Telematics
- Interactive map featuring vehicle markers with directional heading indicators.
- Live speed, telemetry age (e.g. `2s ago`), assigned driver badge, and satellite count.
- Route replay with historical breadcrumb waypoints.

### 3. Fuel & Anti-Theft Telemetry
- Ultrasonic fuel level sensors with instant drop alarms (>8L sudden decrease triggers alert).
- Fuel consumption benchmarking per vehicle class and route efficiency analysis.

### 4. Geofencing & Curfew Enforcement
- Pre-configured government zones (State House, Banjul Port, EFSTH Hospital Corridor, Regional Depots).
- Automatic violation detection for unauthorized departures and after-hours operation.

### 5. Driver Safety & Compliance
- Algorithmic safety scoring calculated from harsh braking, over-speeding, and rapid acceleration.
- Driver safety ranking leaderboard and scheduled retraining alerts.

### 6. SinoTrack GPS & IoT Hardware Console
- Real-time SinoTrack TCP socket monitor (Port 8090).
- Interactive OTA console with instant response parsing (`9400000`, `9410000`, `CXZT`, `6690000`, `8050000`).
- Interactive installation pinout guide with color-coded wiring specs.

---

## 💻 Technical Stack & Environment

- **Frontend Framework**: React 18 with TypeScript
- **Styling & Design System**: Tailwind CSS with custom slate dark palette (`bg-slate-950`)
- **Icons**: Lucide React
- **Build Tool**: Vite with ESBuild compilation
- **State Management**: Reactive in-memory state with deep relational telemetry models
- **Target Runtime Port**: Port `3000` (mapped through reverse proxy)

---

## 📦 Setup & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

### 3. Production Build
```bash
npm run build
```
Creates an optimized static bundle in `dist/`.

---

## 🛡️ Security & Fail-Safe Architecture

1. **Relay Safety Interlock**: SinoTrack relay cut-off commands (`9400000`) should be dispatched when vehicle speed drops below 20 km/h to prevent dangerous sudden power loss at highway speeds.
2. **Offline Flash Buffering**: In remote regions with cellular fade, SinoTrack units buffer up to 5,000 waypoints in onboard SPI flash memory and automatically dump buffered packets to the central gateway upon reconnect.
3. **Encrypted Private APN**: Hardware SIM cards operate on isolated GovNet APN (`qts.gov.gm`) with static IP addressing and tamper-evident ICCIDs.
