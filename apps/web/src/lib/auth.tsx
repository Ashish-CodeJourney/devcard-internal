import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch, clearTokens, getAccessToken, storeTokens } from './api';

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  authRole: 'SUPERADMIN' | 'ADMIN' | 'USER';
  avatarUrl: string | null;
  accentColor: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (provider: 'github' | 'google') => void;
  logout: () => void;
  /** Exchanges a one-time code from /auth/callback for tokens. */
  completeLogin: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiFetch<SessionUser>('/auth/me');
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback((provider: 'github' | 'google') => {
    // Full-page redirect; the browser returns to /auth/callback with a code.
    window.location.href = `${(import.meta.env.VITE_API_URL ?? 'https://devcard-internal-backend.onrender.com')}/auth/${provider}?state=web_${provider}`;
  }, []);

  const completeLogin = useCallback(async (code: string) => {
    const tokens = await apiFetch<{ accessToken: string; refreshToken: string }>('/auth/mobile/exchange', {
      method: 'POST',
      body: { code },
      auth: false,
    });
    storeTokens(tokens.accessToken, tokens.refreshToken);
    const me = await apiFetch<SessionUser>('/auth/me');
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.authRole === 'ADMIN' || user?.authRole === 'SUPERADMIN',
        loading,
        login,
        logout,
        completeLogin,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
