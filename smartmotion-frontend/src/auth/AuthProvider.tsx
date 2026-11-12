import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, getToken } from '@/lib/api';

export interface AuthUser { id: string; email: string; full_name: string; role: 'doctor' | 'patient' }
interface AuthContextValue { user: AuthUser | null; loading: boolean; login: (email: string, password: string) => Promise<void>; registerDoctor: (name: string, email: string, password: string) => Promise<void>; registerPatient: (name: string, email: string, password: string, token: string) => Promise<void>; logout: () => void }
const AuthContext = createContext<AuthContextValue | null>(null);
type AuthResponse = { access_token: string; user: AuthUser };
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const accept = useCallback((data: AuthResponse) => { localStorage.setItem('sm_access_token', data.access_token); setUser(data.user); }, []);
  useEffect(() => { const token = getToken(); if (!token) { setLoading(false); return; } apiRequest<AuthUser>('/auth/me').then(setUser).catch(() => { localStorage.removeItem('sm_access_token'); setUser(null); }).finally(() => setLoading(false)); }, []);
  const login = useCallback(async (email: string, password: string) => accept(await apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false)), [accept]);
  const registerDoctor = useCallback(async (full_name: string, email: string, password: string) => accept(await apiRequest<AuthResponse>('/auth/register-doctor', { method: 'POST', body: JSON.stringify({ full_name, email, password }) }, false)), [accept]);
  const registerPatient = useCallback(async (full_name: string, email: string, password: string, invitation_token: string) => accept(await apiRequest<AuthResponse>('/auth/register-patient', { method: 'POST', body: JSON.stringify({ full_name, email, password, invitation_token }) }, false)), [accept]);
  const logout = useCallback(() => { localStorage.removeItem('sm_access_token'); setUser(null); }, []);
  const value = useMemo(() => ({ user, loading, login, registerDoctor, registerPatient, logout }), [user, loading, login, registerDoctor, registerPatient, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
