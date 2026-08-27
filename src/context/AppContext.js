'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AppContext = createContext();

// Pages that are only accessible to managers
const MANAGER_ONLY_PATHS = ['/reports', '/analytics', '/admin'];

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load session from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('crm_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('crm_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Auth + config guard
  useEffect(() => {
    if (isLoading) return;

    if (!user && pathname !== '/login') {
      router.push('/login');
      return;
    }

    if (user) {
      // Role-based route guard
      const isManagerOnlyPath = MANAGER_ONLY_PATHS.some(p => pathname.startsWith(p));
      if (isManagerOnlyPath && user.role_id !== 'manager') {
        router.push('/');
        return;
      }

      // Check sheet config (only once, when first logged in)
      checkSetupStatus();
    }
  }, [user, isLoading, pathname]);

  const checkSetupStatus = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.notConfigured) {
        setIsConfigured(false);
        if (pathname !== '/setup') {
          router.push('/setup');
        }
      } else {
        setIsConfigured(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('crm_user', JSON.stringify(data.user));
        router.push('/');
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Authentication failed.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('crm_user');
    router.push('/login');
  };

  const isManager = user?.role_id === 'manager';

  return (
    <AppContext.Provider value={{
      user,
      isConfigured,
      isLoading,
      isManager,
      login,
      logout,
      checkSetupStatus
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
