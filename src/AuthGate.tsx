import React, { useEffect, useState } from 'react';
import App from './App';
import { clearAccessToken, getAccessToken, getCurrentUser, type ApiUser } from './services/api';
import { LoginScreen } from './components/LoginScreen';

export const AuthGate: React.FC = () => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [checking, setChecking] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    if (!getAccessToken()) {
      setChecking(false);
      return;
    }

    let mounted = true;
    void getCurrentUser()
      .then((currentUser) => {
        if (mounted) setUser(currentUser);
      })
      .catch(() => {
        clearAccessToken();
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm font-mono text-slate-400">VERIFYING GOVERNMENT SESSION...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onAuthenticated={() => window.location.reload()} />;
  }

  return <App authUser={user} />;
};
