import React, { FormEvent, useState } from 'react';
import { LockKeyhole, ShieldCheck, Loader2 } from 'lucide-react';
import { login } from '../services/api';

export const LoginScreen: React.FC<{ onAuthenticated: () => void }> = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      onAuthenticated();
    } catch {
      setError('Authentication failed. Check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-cyan-400" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">QTS Government Fleet</h1>
          <p className="mt-2 text-sm text-slate-400">Secure fleet telematics operations platform</p>
        </div>

        <form onSubmit={submit} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Username or email</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Password</label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="w-full rounded-lg bg-slate-950 border border-slate-700 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-cyan-500" />
            </div>
          </div>
          {error && <div role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">{error}</div>}
          <button disabled={loading} className="w-full rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-bold text-sm py-2.5 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-600 mt-5">Authorized government personnel only.</p>
      </div>
    </div>
  );
};
