import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clipboard, Cpu, KeyRound, Plus, RefreshCw, Shield, X } from 'lucide-react';
import {
  DeviceApiRow,
  generateDeviceCredential,
  getDevices,
  registerDevice,
} from '../services/api';

const protocols = ['SinoTrack TCP', 'GT06 TCP', 'HTTP', 'MQTT', 'Other'];

export const DeviceRegistrationView: React.FC = () => {
  const [devices, setDevices] = useState<DeviceApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    deviceIdentifier: '',
    serialNumber: '',
    manufacturer: '',
    model: '',
    protocol: 'SinoTrack TCP',
    firmwareVersion: '',
  });

  const loadDevices = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getDevices();
      setDevices(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load registered devices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDevices(); }, []);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.deviceIdentifier.trim()) {
      setError('Device ID / IMEI is required.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await registerDevice({
        deviceIdentifier: form.deviceIdentifier.trim(),
        serialNumber: form.serialNumber.trim() || undefined,
        manufacturer: form.manufacturer.trim() || undefined,
        model: form.model.trim() || undefined,
        protocol: form.protocol || undefined,
        firmwareVersion: form.firmwareVersion.trim() || undefined,
      });

      setDevices((current) => [...current, result.data].sort((a, b) => a.device_identifier.localeCompare(b.device_identifier)));
      setForm({ deviceIdentifier: '', serialNumber: '', manufacturer: '', model: '', protocol: 'SinoTrack TCP', firmwareVersion: '' });
      setShowForm(false);
      setNotice(`Device ${result.data.device_identifier} registered successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Device registration failed.');
    } finally {
      setSaving(false);
    }
  };

  const issueCredential = async (deviceId: string) => {
    setError('');
    setNotice('');
    setToken('');
    try {
      const result = await generateDeviceCredential(deviceId);
      setToken(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate device credential.');
    }
  };

  const copyToken = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="mx-4 sm:mx-6 mt-4 max-w-7xl lg:mx-auto w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)]">
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Device Registration</h2>
              <span className="rounded border border-cyan-800 bg-cyan-950/60 px-2 py-0.5 text-[9px] font-mono text-cyan-300">DEVICE MANAGEMENT</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Register a physical tracker before assigning it to a government vehicle.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void loadDevices()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => { setShowForm((value) => !value); setError(''); }} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400">
              <Plus className="h-3.5 w-3.5" /> Register Device
            </button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">{error}</div>}
        {notice && <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">{notice}</div>}

        {showForm && (
          <form onSubmit={submit} className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Register new tracker</h3>
                <p className="text-[11px] text-slate-500">Use the identifier printed on the device or its IMEI.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded p-1 text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Device ID / IMEI *" value={form.deviceIdentifier} onChange={(v) => update('deviceIdentifier', v)} placeholder="e.g. 868123456789012" />
              <Field label="Serial Number" value={form.serialNumber} onChange={(v) => update('serialNumber', v)} placeholder="Optional" />
              <Field label="Manufacturer" value={form.manufacturer} onChange={(v) => update('manufacturer', v)} placeholder="e.g. Tracker manufacturer" />
              <Field label="Model" value={form.model} onChange={(v) => update('model', v)} placeholder="e.g. ST-906L" />
              <label className="block text-[11px] font-medium text-slate-400">
                Protocol
                <select value={form.protocol} onChange={(e) => update('protocol', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500">
                  {protocols.map((protocol) => <option key={protocol}>{protocol}</option>)}
                </select>
              </label>
              <Field label="Firmware Version" value={form.firmwareVersion} onChange={(v) => update('firmwareVersion', v)} placeholder="Optional" />
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {saving ? 'Registering...' : 'Register Device'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-950 text-[10px] uppercase tracking-wider text-slate-500">
              <tr><th className="px-3 py-2">Device</th><th className="px-3 py-2">Hardware</th><th className="px-3 py-2">Protocol</th><th className="px-3 py-2">Vehicle</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Credential</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {devices.map((device) => (
                <tr key={device.id} className="bg-slate-900/40 hover:bg-slate-900">
                  <td className="px-3 py-3"><div className="font-mono font-semibold text-white">{device.device_identifier}</div><div className="text-[10px] text-slate-500">{device.serial_number || 'No serial number'}</div></td>
                  <td className="px-3 py-3 text-slate-300">{device.manufacturer || '—'} {device.model ? `• ${device.model}` : ''}</td>
                  <td className="px-3 py-3 font-mono text-cyan-300">{device.protocol || '—'}</td>
                  <td className="px-3 py-3 text-slate-300">{device.registration_number || <span className="text-amber-400">Unassigned</span>}</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${device.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{device.status}</span></td>
                  <td className="px-3 py-3 text-right"><button onClick={() => void issueCredential(device.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 hover:border-cyan-600 hover:text-cyan-300"><KeyRound className="h-3 w-3" /> Generate</button></td>
                </tr>
              ))}
              {!loading && devices.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">No devices registered yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-500"><Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />Device credentials are shown only once. Store the token securely and never place it in screenshots, source code, or public configuration.</div>
      </div>

      {token && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-cyan-800 bg-slate-950 p-5 shadow-2xl">
            <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-cyan-400" /><h3 className="font-bold text-white">Device Credential Generated</h3></div>
            <p className="mt-2 text-xs text-amber-300">This credential will not be shown again. Copy it now and store it in your secure device configuration process.</p>
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-white break-all">{token}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => void copyToken()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"><Clipboard className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy Token'}</button>
              <button onClick={() => setToken('')} className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400">Done</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const Field: React.FC<{ label: string; value: string; onChange: (value: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
  <label className="block text-[11px] font-medium text-slate-400">
    {label}
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-500" />
  </label>
);

export default DeviceRegistrationView;
