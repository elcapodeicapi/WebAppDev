import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiPost, type AuthResponse } from '../lib/api';

export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  role: 'Admin' | 'Employee' | string;
};

export type AuthState = {
  user: AuthUser | null;
  sessionId: string | null;
  loading: boolean;
  initializing: boolean;
  message: string | null;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Rehydrate from localStorage
  useEffect(() => {
    async function init() {
      try {
        const raw = localStorage.getItem('auth');
        if (raw) {
          const parsed = JSON.parse(raw) as { user: AuthUser; sessionId: string };
          // validate with backend
          if (parsed.sessionId) {
            try {
              const session = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5217'}/api/auth/session?sid=${encodeURIComponent(parsed.sessionId)}`);
              if (session.ok) {
                const data = await session.json();
                if (data?.active) {
                  if (parsed.user) setUser(parsed.user);
                  setSessionId(parsed.sessionId);
                } else {
                  localStorage.removeItem('auth');
                }
              } else {
                localStorage.removeItem('auth');
              }
            } catch {
              // network error; keep local state as best effort
              setUser(parsed.user);
              setSessionId(parsed.sessionId);
            }
          }
        }
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, []);

  async function login(username: string, password: string) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiPost<{ username: string; password: string }, AuthResponse>(
        '/api/auth/login',
        { username, password }
      );
      if (!res.success || !res.userId || !res.email || !res.fullName) {
        throw new Error(res.message || 'Login failed');
      }
      const role = (res.role as AuthUser['role']) || 'Employee';
      const sid = res.sessionId || '';
      const u: AuthUser = { id: res.userId, email: res.email, fullName: res.fullName, role };
      setUser(u);
      setSessionId(sid);
      localStorage.setItem('auth', JSON.stringify({ user: u, sessionId: sid }));
      setMessage(res.message || 'Login successful');
      return u;
    } catch (e: any) {
      setMessage(e.message || 'Login failed');
      setUser(null);
      setSessionId(null);
      localStorage.removeItem('auth');
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      // Optional: await apiPost('/api/auth/logout', { sessionId });
    } finally {
      setUser(null);
      setSessionId(null);
      localStorage.removeItem('auth');
      setLoading(false);
    }
  }

  const value = useMemo<AuthState>(
    () => ({ user, sessionId, loading, initializing, message, login, logout }),
    [user, sessionId, loading, initializing, message]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
