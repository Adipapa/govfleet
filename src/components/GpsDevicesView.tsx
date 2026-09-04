import React, { useState } from 'react';
import { 
  Cpu, 
  Radio, 
  Terminal, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  Activity,
  Send,
  Sliders,
  Shield,
  PhoneCall,
  HardDrive,
  Info
} from 'lucide-react';
import { Vehicle } from '../types/fleet';

interface GpsDevicesViewProps {
  vehicles: Vehicle[];
}

interface CommandLog {
  id: string;
  timestamp: string;
  command: string;
  direction: 'outbound' | 'inbound';
  payload: string;
  success?: boolean;
}

export const GpsDevicesView: React.FC<GpsDevicesViewProps> = ({ vehicles = [] }) => {
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(safeVehicles[0]?.deviceId || '');
  const [customCommand, setCustomCommand] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'wiring' | 'config'>('console');

  const selectedVehicle = safeVehicles.find((v) => v.deviceId === selectedDeviceId) || safeVehicles[0];

  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([
    {
      id: 'log-001',
      timestamp: '11:42:15',
      direction: 'inbound',
      command: 'HEARTBEAT_ACK',
      payload: `[SNT-GATEWAY:8090] TCP CONNECTED from IMEI ${selectedVehicle?.deviceId || 'SNT-906L-88421'} • LAT: ${selectedVehicle?.currentLocation.lat} LNG: ${selectedVehicle?.currentLocation.lng} SPEED: ${selectedVehicle?.speedKmh}km/h ACC: ${selectedVehicle?.ignition ? 'ON' : 'OFF'}`,
    },
    {
      id: 'log-002',
      timestamp: '11:42:20',
      direction: 'inbound',
      command: 'CXZT_DIAGNOSTIC',
      payload: `BAT:98%, ACC:${selectedVehicle?.ignition ? 'ON' : 'OFF'}, GPS:A, GPRS:OK, IP:197.234.112.50:8090, SPD:${selectedVehicle?.speedKmh}KM/H, SATS:${selectedVehicle?.satellites}`,
    },
  ]);

  const executeSinoTrackCommand = (cmdCode: string, friendlyLabel: string) => {
    setIsSending(true);
    const now = new Date().toLocaleTimeString('en-GB');

    // Add outbound command to log
    const outboundLog: CommandLog = {
      id: `out-${Date.now()}`,
      timestamp: now,
      direction: 'outbound',
      command: friendlyLabel,
      payload: `>>> [SinoTrack GPRS TCP Port 8090] TX -> ${selectedVehicle?.deviceId}: "${cmdCode}"`,
    };

    setCommandLogs((prev) => [outboundLog, ...prev]);

    setTimeout(() => {
      setIsSending(false);
      let replyPayload = '';

      if (cmdCode === '9400000') {
        replyPayload = `<<< [RX] SET OK! RELAY ACTIVATED (ENGINE IMMOBILIZED). ACC: OFF, VCC: ${selectedVehicle?.batteryVoltage}V, STATUS: STOPPED.`;
      } else if (cmdCode === '9410000') {
        replyPayload = `<<< [RX] SET OK! RELAY RELEASED (ENGINE RESTORED). ACC: READY, VCC: ${selectedVehicle?.batteryVoltage}V, STATUS: NORMAL.`;
      } else if (cmdCode === 'CXZT' || cmdCode === 'CQ') {
        replyPayload = `<<< [RX] BAT:${selectedVehicle?.batteryVoltage > 13 ? '100%' : '94%'}, ACC:${selectedVehicle?.ignition ? 'ON' : 'OFF'}, GPS:A(3D-FIX), GPRS:OK, IP:197.234.112.50:8090, SPD:${selectedVehicle?.speedKmh}KM/H, SATS:${selectedVehicle?.satellites}, GSM:${selectedVehicle?.gsmSignal}%`;
      } else if (cmdCode === '6690000' || cmdCode === 'RCONF') {
        replyPayload = `<<< [RX] APN:qts.gov.gm, IP:197.234.112.50:8090, TIMER:10S, SLEEP:OFF, CENT:1, VER:${selectedVehicle?.hardwareModel || 'ST-906L_4G_v2.41'}`;
      } else if (cmdCode.startsWith('8050000')) {
        replyPayload = `<<< [RX] SET OK! LIVE UPLOAD INTERVAL SET TO ${cmdCode.split(' ')[1] || '10'} SECONDS.`;
      } else if (cmdCode === 'RESTART') {
        replyPayload = `<<< [RX] RESET SYSTEM! REBOOTING SINOTRACK MCU & 4G MODEM... OK (RECONNECT IN 15S).`;
      } else {
        replyPayload = `<<< [RX] ACK: SINOTRACK CMD "${cmdCode}" PROCESSED. STATUS: 200 OK.`;
      }

      const inboundLog: CommandLog = {
        id: `in-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-GB'),
        direction: 'inbound',
        command: `${friendlyLabel} ACK`,
        payload: replyPayload,
        success: true,
      };

      setCommandLogs((prev) => [inboundLog, ...prev]);
    }, 850);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommand.trim()) return;
    executeSinoTrackCommand(customCommand.trim(), `CUSTOM (${customCommand.trim()})`);
    setCustomCommand('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 text-slate-100 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              SinoTrack GPS Trackers & Telematics Hardware
            </h1>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-800">
              ST-906L / ST-901L / ST-902L / ST-907L / ST-915
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Standardized government fleet hardware diagnostics, GPRS socket listener (Port 8090 TCP/UDP), and OTA SinoTrack command console.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 rounded-lg font-mono text-xs flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>SinoTrack GPRS: Port 8090 TCP Listening</span>
          </span>
        </div>
      </div>

      {/* Device Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Hardware Standard</span>
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-sm font-bold text-white font-mono mt-1">SinoTrack Global 4G LTE</p>
          <span className="text-[10px] text-slate-500">Dual GNSS + BDS + LBS</span>
        </div>

        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Server Protocol</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-sm font-bold text-emerald-400 font-mono mt-1">SinoTrack TCP / Port 8090</p>
          <span className="text-[10px] text-slate-500">Bi-directional socket keep-alive</span>
        </div>

        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Remote Engine Immobilizer</span>
            <Lock className="w-3.5 h-3.5 text-red-400" />
          </div>
          <p className="text-sm font-bold text-white font-mono mt-1">12V/24V Cut-Off Relay</p>
          <span className="text-[10px] text-slate-500">SinoTrack command 9400000</span>
        </div>

        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>SOS Panic Wire</span>
            <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-sm font-bold text-white font-mono mt-1">DIN 2 Physical Duress</p>
          <span className="text-[10px] text-slate-500">Auto emergency SMS & police dispatch</span>
        </div>
      </div>

      {/* Main Grid: Left Connected SinoTrack Units, Right Diagnostic Console & Hardware Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: SinoTrack Device Catalog */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase font-mono text-slate-400 tracking-wider">
              Installed SinoTrack Units ({safeVehicles.length})
            </h2>
            <span className="text-[10px] font-mono text-cyan-400">All 4G LTE</span>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {safeVehicles.map((veh) => {
              const isSelected = (selectedVehicle && selectedVehicle.deviceId === veh.deviceId);
              return (
                <div
                  key={veh.deviceId}
                  id={`sinotrack-card-${veh.deviceId}`}
                  onClick={() => setSelectedDeviceId(veh.deviceId)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-white">IMEI: {veh.deviceId}</span>
                        <span className="px-1.5 py-0.2 bg-cyan-950 text-[9px] font-mono text-cyan-300 border border-cyan-800/80 rounded font-semibold">
                          {veh.hardwareModel?.includes('906L') ? 'ST-906L' :
                           veh.hardwareModel?.includes('901L') ? 'ST-901L' :
                           veh.hardwareModel?.includes('902L') ? 'ST-902L' :
                           veh.hardwareModel?.includes('907L') ? 'ST-907L' :
                           veh.hardwareModel?.includes('915') ? 'ST-915' : 'ST-906L'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 font-semibold">{veh.regNumber} • {veh.make} {veh.model}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{veh.hardwareModel || 'SinoTrack Telematics'}</p>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                      veh.gpsStatus === 'Connected' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'
                    }`} />
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1 py-1 px-2 bg-slate-900 rounded text-[10px] font-mono text-slate-400">
                    <div>4G: <span className="text-white font-bold">{veh.gsmSignal}%</span></div>
                    <div>Sats: <span className="text-white font-bold">{veh.satellites}</span></div>
                    <div>VCC: <span className="text-white font-bold">{veh.batteryVoltage}V</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Unit Details, Controls, and Live SinoTrack Terminal */}
        <div className="lg:col-span-2 space-y-4">
          {selectedVehicle ? (
            <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-5">
              {/* Unit Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-white">
                      {selectedVehicle.hardwareModel || 'SinoTrack ST-906L 4G Fleet GPS Tracker'}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Vehicle: <span className="text-white font-semibold">{selectedVehicle.regNumber}</span> ({selectedVehicle.make} {selectedVehicle.model}) • {selectedVehicle.department}
                  </p>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
                  <button
                    onClick={() => setActiveTab('console')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'console' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    OTA Console
                  </button>
                  <button
                    onClick={() => setActiveTab('wiring')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'wiring' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Wiring & Pinout
                  </button>
                  <button
                    onClick={() => setActiveTab('config')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'config' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Parameters
                  </button>
                </div>
              </div>

              {/* Hardware Quick Status Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">SinoTrack IMEI</span>
                  <span className="font-mono text-xs text-cyan-300 font-bold">{selectedVehicle.deviceId}</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">SIM Card Phone / ICCID</span>
                  <span className="font-mono text-xs text-slate-200">{selectedVehicle.simNumber}</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">ACC Ignition (DIN 1)</span>
                  <span className={`font-mono text-xs font-bold ${selectedVehicle.ignition ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {selectedVehicle.ignition ? 'ACC HIGH (Engine Running)' : 'ACC LOW (Engine Stopped)'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Cut-Off Relay (DOUT 1)</span>
                  <span className="font-mono text-xs text-emerald-400 font-bold">NORMAL (CIRCUIT CLOSED)</span>
                </div>
              </div>

              {/* Tab 1: OTA Command Console */}
              {activeTab === 'console' && (
                <div className="space-y-4">
                  {/* SinoTrack Quick Command Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        SinoTrack Instant Telematics Commands
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Protocol Password: 0000</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        id="btn-cmd-cut-engine"
                        disabled={isSending}
                        onClick={() => executeSinoTrackCommand('9400000', 'Cut Off Engine (9400000)')}
                        className="p-2 bg-red-950/70 hover:bg-red-900 border border-red-800/80 rounded-lg text-left transition-colors text-red-200 disabled:opacity-50"
                      >
                        <div className="flex items-center space-x-1.5 font-mono text-xs font-bold">
                          <Lock className="w-3 h-3 text-red-400" />
                          <span>9400000</span>
                        </div>
                        <p className="text-[10px] text-red-300/80 mt-0.5">Cut Off Fuel Relay (Stop Engine)</p>
                      </button>

                      <button
                        id="btn-cmd-restore-engine"
                        disabled={isSending}
                        onClick={() => executeSinoTrackCommand('9410000', 'Restore Engine (9410000)')}
                        className="p-2 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/80 rounded-lg text-left transition-colors text-emerald-200 disabled:opacity-50"
                      >
                        <div className="flex items-center space-x-1.5 font-mono text-xs font-bold">
                          <Unlock className="w-3 h-3 text-emerald-400" />
                          <span>9410000</span>
                        </div>
                        <p className="text-[10px] text-emerald-300/80 mt-0.5">Restore Engine Relay (Resume)</p>
                      </button>

                      <button
                        id="btn-cmd-query-status"
                        disabled={isSending}
                        onClick={() => executeSinoTrackCommand('CXZT', 'Query Status (CXZT)')}
                        className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-left transition-colors text-slate-200 disabled:opacity-50"
                      >
                        <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-cyan-300">
                          <RefreshCw className="w-3 h-3 text-cyan-400" />
                          <span>CXZT</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Check GPS, ACC & Battery Status</p>
                      </button>

                      <button
                        id="btn-cmd-read-config"
                        disabled={isSending}
                        onClick={() => executeSinoTrackCommand('6690000', 'Read Config (6690000)')}
                        className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-left transition-colors text-slate-200 disabled:opacity-50"
                      >
                        <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-amber-300">
                          <Sliders className="w-3 h-3 text-amber-400" />
                          <span>6690000</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Read APN, Server IP & Port</p>
                      </button>

                      <button
                        id="btn-cmd-ping-interval"
                        disabled={isSending}
                        onClick={() => executeSinoTrackCommand('8050000 10', 'Set Interval (8050000 10)')}
                        className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-left transition-colors text-slate-200 disabled:opacity-50"
                      >
                        <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-blue-300">
                          <Activity className="w-3 h-3 text-blue-400" />
                          <span>8050000 10</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Set 10s Live Update Interval</p>
                      </button>

                      <button
                        id="btn-cmd-reboot-mcu"
                        disabled={isSending}
                        onClick={() => executeSinoTrackCommand('RESTART', 'Reboot MCU (RESTART)')}
                        className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-left transition-colors text-slate-200 disabled:opacity-50"
                      >
                        <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-violet-300">
                          <Zap className="w-3 h-3 text-violet-400" />
                          <span>RESTART</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Soft Reboot SinoTrack Modem</p>
                      </button>
                    </div>
                  </div>

                  {/* Custom Command Input Form */}
                  <form onSubmit={handleCustomSubmit} className="flex gap-2">
                    <input
                      id="input-sinotrack-command"
                      type="text"
                      value={customCommand}
                      onChange={(e) => setCustomCommand(e.target.value)}
                      placeholder="Type SinoTrack command (e.g., CXZT, 9400000, 8040000 197.234.112.50 8090)..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      id="btn-send-custom-command"
                      type="submit"
                      disabled={isSending || !customCommand.trim()}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to SinoTrack</span>
                    </button>
                  </form>

                  {/* Live Terminal Log */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <Terminal className="w-3 h-3" />
                        SinoTrack TCP Gateway Socket Feed (Port 8090)
                      </span>
                      <span>{isSending ? 'Transmitting GPRS packet...' : 'Idle • Socket Open'}</span>
                    </div>

                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {commandLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-2 rounded text-[11px] leading-relaxed ${
                            log.direction === 'outbound'
                              ? 'bg-slate-900/90 text-cyan-300 border-l-2 border-cyan-400'
                              : 'bg-emerald-950/20 text-emerald-300 border-l-2 border-emerald-400'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                            <span className="font-bold uppercase tracking-wider">{log.command}</span>
                            <span>{log.timestamp}</span>
                          </div>
                          <p className="break-all">{log.payload}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: SinoTrack ST-906L Wiring & Hardware Pinout Diagram */}
              {activeTab === 'wiring' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>SinoTrack ST-906L 4G Wire Harness Pinout Guide</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-950 text-cyan-300 rounded">
                          Government Vehicle Standard
                        </span>
                      </h3>
                    </div>
                    <p className="text-slate-400">
                      Standardized telematics installation harness for government sedans, police interceptors, and emergency ambulances.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-start space-x-3">
                        <div className="w-4 h-4 rounded-full bg-red-500 shrink-0 mt-0.5 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        <div>
                          <span className="font-bold text-white block">Red Wire — Power (+) 9V-80V DC</span>
                          <span className="text-slate-400 text-[11px]">
                            Direct continuous feed from vehicle battery positive terminal with 2A inline fuse.
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-start space-x-3">
                        <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">Black Wire — Ground (-) Chassis GND</span>
                          <span className="text-slate-400 text-[11px]">
                            Connect securely to vehicle metallic chassis ground bolt.
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-start space-x-3">
                        <div className="w-4 h-4 rounded-full bg-amber-500 shrink-0 mt-0.5 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                        <div>
                          <span className="font-bold text-white block">Orange Wire — ACC Key Ignition (DIN 1)</span>
                          <span className="text-slate-400 text-[11px]">
                            Connects to ignition switch ON line (detects 12V when key is turned). Triggers idling & working hours.
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-start space-x-3">
                        <div className="w-4 h-4 rounded-full bg-yellow-400 shrink-0 mt-0.5 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                        <div>
                          <span className="font-bold text-white block">Yellow Wire — Relay Immobilizer (DOUT 1)</span>
                          <span className="text-slate-400 text-[11px]">
                            Connects to 86 pin of 12V/24V 40A fuel pump relay. Controls engine cut-off remotely via command 9400000.
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-start space-x-3">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 shrink-0 mt-0.5 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <div>
                          <span className="font-bold text-white block">Green / White Wire — SOS Panic Wire (DIN 2)</span>
                          <span className="text-slate-400 text-[11px]">
                            Hidden driver dashboard pushbutton. Holding for 3s broadcasts immediate SOS to National Police Ops Center.
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-start space-x-3">
                        <div className="w-4 h-4 rounded-full bg-blue-500 shrink-0 mt-0.5 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                        <div>
                          <span className="font-bold text-white block">External Audio Port — Surveillance Mic</span>
                          <span className="text-slate-400 text-[11px]">
                            Omni-directional electret mic for authorized voice eavesdropping during hijack or security emergencies.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: SinoTrack Configuration Parameters */}
              {activeTab === 'config' && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <span>SinoTrack GPRS & Network Configuration</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">APN Configuration</span>
                        <span className="text-white font-bold">8030000 qts.gov.gm</span>
                        <p className="text-[10px] text-slate-400 mt-1 font-sans">GovNet APN for encrypted private SIMs</p>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Telematics Server IP & Port</span>
                        <span className="text-emerald-400 font-bold">8040000 197.234.112.50 8090</span>
                        <p className="text-[10px] text-slate-400 mt-1 font-sans">SinoTrack TCP Protocol default port 8090</p>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Active Upload Interval</span>
                        <span className="text-cyan-300 font-bold">8050000 10 (10 Seconds)</span>
                        <p className="text-[10px] text-slate-400 mt-1 font-sans">Real-time turn-by-turn waypoint telemetry</p>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Overspeed Alarm Limit</span>
                        <span className="text-amber-400 font-bold">1220000 080 (80 km/h)</span>
                        <p className="text-[10px] text-slate-400 mt-1 font-sans">Dispatches audible in-cab beep and police alert</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
              Select a SinoTrack device from the catalog to open diagnostics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
