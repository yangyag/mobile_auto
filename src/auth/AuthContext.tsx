import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthStore } from './storage';
import { loginApi, logoutApi, refreshApi } from '../api/auth';
import { AuthEvents } from '../api/client';
import { LoginRequest } from '../api/types';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated'; error?: string }
  | { status: 'authenticated' };

interface AuthValue {
  state: AuthState;
  login(req: LoginRequest): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const boot = useCallback(async () => {
    const refresh = await AuthStore.getRefreshToken();
    if (!refresh) {
      setState({ status: 'unauthenticated' });
      return;
    }
    try {
      const resp = await refreshApi(refresh);
      await AuthStore.setTokens({ access: resp.access_token, refresh: resp.refresh_token });
      setState({ status: 'authenticated' });
    } catch {
      await AuthStore.clearAll();
      setState({ status: 'unauthenticated' });
    }
  }, []);

  useEffect(() => { boot(); }, [boot]);

  useEffect(() => {
    const off = AuthEvents.on('logout', () => {
      setState({ status: 'unauthenticated' });
    });
    return off;
  }, []);

  const login = useCallback(async (req: LoginRequest) => {
    try {
      const resp = await loginApi(req);
      await AuthStore.setTokens({ access: resp.access_token, refresh: resp.refresh_token });
      setState({ status: 'authenticated' });
    } catch (e: any) {
      setState({ status: 'unauthenticated', error: e?.message ?? '로그인 실패' });
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    const refresh = await AuthStore.getRefreshToken();
    if (refresh) await logoutApi(refresh);
    await AuthStore.clearAll();
    setState({ status: 'unauthenticated' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
