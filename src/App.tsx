import { useState, useEffect } from 'react';
import { AuthCard } from './components/AuthCard';
import { DashboardPreview } from './components/DashboardPreview';
import { apiGetMe, removeToken } from './api';
import type { UserProfile } from './api';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user has an active JWT token stored in localStorage
    const verifyUserSession = async () => {
      const res = await apiGetMe();
      if (res.success && res.user) {
        setUser(res.user);
        setIsAuthenticated(true);
      }
      setIsCheckingAuth(false);
    };

    verifyUserSession();
  }, []);

  const handleAuthSuccess = (authenticatedUser: UserProfile) => {
    setUser(authenticatedUser);
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    removeToken();
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#080711] flex items-center justify-center text-rose-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Connecting to Mathiyon Express Server...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <DashboardPreview user={user} onSignOut={handleSignOut} />;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-[#080711]">
      {/* Background ambient glowing orbs */}
      <div className="ambient-glow-1 top-0 left-1/4" />
      <div className="ambient-glow-2 bottom-0 right-1/4" />

      {/* Cyber Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Auth Card Container */}
      <AuthCard onSuccess={handleAuthSuccess} />

      {/* Footer copyright */}
      <footer className="absolute bottom-3 text-center w-full text-[11px] text-slate-500 font-medium">
        © 2026 Mathiyon AI Inc. • Express Node.js + MongoDB + JWT + PyTorch Backend Active
      </footer>
    </div>
  );
}

export default App;
