import { ApiError, LoginRequest, TokenResponse } from './types';

const BASE = process.env.EXPO_PUBLIC_API_BASE ?? '';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError('network failure', 0, 'network');
  }
  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;
  if (!res.ok) {
    const code = res.status === 401 ? 'auth' : res.status >= 500 ? 'server' : 'client';
    const message = (parsed as any)?.detail ?? `HTTP ${res.status}`;
    throw new ApiError(message, res.status, code, parsed);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

export async function loginApi(req: LoginRequest): Promise<TokenResponse> {
  const body: LoginRequest = { username: req.username, password: req.password };
  if (req.totp_code && req.totp_code.length > 0) body.totp_code = req.totp_code;
  return postJson<TokenResponse>('/v1/auth/login', body);
}

export async function refreshApi(refresh: string): Promise<TokenResponse> {
  return postJson<TokenResponse>('/v1/auth/refresh', { refresh_token: refresh });
}

export async function logoutApi(refresh: string): Promise<void> {
  try {
    await postJson<unknown>('/v1/auth/logout', { refresh_token: refresh });
  } catch {
    // 서버 logout 실패해도 클라이언트 상태는 비운다
  }
}
