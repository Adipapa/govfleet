import React, { FormEvent, useState } from 'react';
import { Shield, LockKeyhole, User, AlertCircle, Loader2 } from 'lucide-react';
import { login } from '../services/api';

interface LoginViewProps {
  onAuthenticated: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError('Username/email and password are required.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await login(username.trim(), password);
      onAuthenticated();
    } catch {
      setError('Invalid username/email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-950/40">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Shield className="w-6 h-6 text-cyan-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white tracking-tight">
                    QTS FLEET
                  </h1>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                    GOV
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Government Fleet Telematics
                </p>
              </div>
            </div>

            <div className="mt-7">
              <h2 className="text-xl font-semibold text-white">
                Secure Sign In
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Sign in with your authorized government account.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-800/80 bg-red-950/40 px-3 py-2.5 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-medium text-slate-400 mb-2"
              >
                USERNAME OR EMAIL
              </label>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter username or email"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-400 mb-2"
              >
                PASSWORD
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-slate-950 font-semibold py-3 text-sm transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LockKeyhole className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="px-8 py-4 border-t border-slate-800 bg-slate-950/50">
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-500">
              <Shield className="w-3 h-3 text-cyan-500" />
              AUTHORIZED ACCESS ONLY
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-4 font-mono">
          QTS Government Fleet Management Platform
        </p>
      </div>
    </div>
  );
};