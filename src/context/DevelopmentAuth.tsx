import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import config from '../config/environment';

export const LOCAL_AUTH = import.meta.env.DEV && import.meta.env.VITE_AUTH_MODE === 'local';
export type PortalRole = 'admin' | 'master_admin' | 'teacher' | 'student' | 'hod' | 'dean' | 'assistant_dean' | 'programme_coordinator' | 'coe';
export interface PortalUser { id: string; email: string; name?: string; role: PortalRole; firstName?: string; lastName?: string; }
export const portalHome = (role: string) => role === 'admin' || role === 'master_admin' ? '/dashboard/master-admin' : role === 'coe' ? '/dashboard/coe' : role === 'student' ? '/dashboard/student' : '/dashboard/faculty';
interface AuthState {
  currentUser: PortalUser | null; loading: boolean; error: string | null; isSignedIn: boolean;
  logout: () => Promise<void>; updateUser: (data: Partial<PortalUser>) => void;
  setError: (error: string | null) => void; reload: () => Promise<void>;
}
const Context = createContext<AuthState | null>(null);
export function DevelopmentAuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = async () => {
    setLoading(true);
    const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
    try {
      if (!token) { setUser(null); return; }
      const res = await fetch(`${config.API_BASE_URL}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Please sign in again.');
      const profile = await res.json();
      setUser(profile);
      localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(profile));
      localStorage.setItem('userRole', profile.role);
      setError(null);
    } catch (err) { setUser(null); setError(err instanceof Error ? err.message : 'Unable to verify session'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, []);
  const logout = async () => {
    const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
    try { if (token) await fetch(`${config.API_BASE_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); }
    finally {
      for (const key of [config.AUTH.TOKEN_STORAGE_KEY, config.AUTH.CURRENT_USER_KEY, 'currentUser', 'authToken', 'userRole']) localStorage.removeItem(key);
      setUser(null);
    }
  };
  return <Context.Provider value={{ currentUser, loading, error, isSignedIn: !!currentUser, logout, updateUser: data => setUser(user => user ? { ...user, ...data } : null), setError, reload }}>{children}</Context.Provider>;
}
export function useDevelopmentAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('Development auth provider missing');
  return value;
}
