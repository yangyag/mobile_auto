import { AuthStore } from '../auth/storage';
import { refreshApi } from './auth';
import { ApiError } from './types';

const BASE = process.env.EXPO_PUBLIC_API_BASE ?? '';

type Listener = () => void;
const listeners: Record<string, Listener[]> = { logout: [] };

export const AuthEvents = {
  on(event: 'logout', cb: Listener) {
    listeners[event].push(cb);
    return () => {
      listeners[event] = listeners[event].filter((l) => l !== cb);
    };
  },
  emit(event: 'logout') {
    listeners[event].forEach((cb) => cb());
  },
};

let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refresh = await AuthStore.getRefreshToken();
  if (!refresh) throw new ApiError('no refresh token', 401, 'session-expired');
  const resp = await refreshApi(refresh);
  await AuthStore.setTokens({ access: resp.access_token, refresh: resp.refresh_token });
  return resp.access_token;
}

async function ensureFreshAccess(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = AuthStore.getAccessToken();
    if (cached) return cached;
  }
  refreshPromise ??= doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${BASE}${path}`;
  let token: string;
  try {
    token = await ensureFreshAccess();
  } catch (e) {
    await AuthStore.clearAll();
    AuthEvents.emit('logout');
    throw new ApiError('session expired', 401, 'session-expired');
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...(init?.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError('network failure', 0, 'network');
  }

  if (res.status !== 401) return res;

  // 401 → refresh once
  await AuthStore.clearAccessToken();
  let newToken: string;
  try {
    newToken = await ensureFreshAccess(true);
  } catch {
    await AuthStore.clearAll();
    AuthEvents.emit('logout');
    throw new ApiError('session expired', 401, 'session-expired');
  }

  try {
    res = await fetch(url, {
      ...init,
      headers: { ...(init?.headers as Record<string, string> | undefined), Authorization: `Bearer ${newToken}` },
    });
  } catch {
    throw new ApiError('network failure', 0, 'network');
  }

  if (res.status === 401) {
    await AuthStore.clearAll();
    AuthEvents.emit('logout');
    throw new ApiError('session expired', 401, 'session-expired');
  }
  return res;
}

export async function apiGetJson<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as T) : (undefined as T);
  if (!res.ok) {
    const code = res.status >= 500 ? 'server' : 'client';
    throw new ApiError((parsed as any)?.detail ?? `HTTP ${res.status}`, res.status, code, parsed);
  }
  return parsed;
}

export function __resetClientForTest() {
  refreshPromise = null;
  listeners.logout = [];
}
