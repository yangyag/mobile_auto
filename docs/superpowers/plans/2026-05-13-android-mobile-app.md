# Android Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `auto/docs/mobile-api.md` 기반의 React Native(Expo) Android 모니터링 앱(MVP)을 `C:/dev/mobileAuto/mobile-app/`에 구축한다. 로그인 + 4탭 읽기 전용(대시보드/그리드/주문/손익) 범위.

**Architecture:** Expo SDK + TypeScript + expo-router의 파일 기반 라우팅. 단일 AuthContext로 토큰 상태 관리, SecureStore에 토큰 영속, 메모리 캐시 1차 소스. 모든 fetch는 `api/client.ts` 거쳐 401 → refresh → 1회 재시도. 화면별 `useAutoRefresh` 훅으로 화면 활성 시 폴링.

**Tech Stack:** Expo (현 stable SDK), TypeScript, expo-router, expo-secure-store, jest-expo, @testing-library/react-native.

**작업 기준 위치:** PowerShell에서 `C:\dev\mobileAuto\mobile-app` (Task 1에서 생성)

---

## 파일 구조 개요

생성될 파일들 (Task별 매핑):

| 경로 | Task | 역할 |
|---|---|---|
| `mobile-app/.env`, `.env.example`, `.gitignore` | 1 | 환경변수, 비공개 토큰 분리 |
| `mobile-app/app.json` (수정), `tsconfig.json` | 1 | Expo 설정, TS 설정 |
| `mobile-app/src/theme/colors.ts` | 2 | 다크 팔레트 |
| `mobile-app/src/utils/format.ts`, `format.test.ts` | 2 | 통화/시간 포맷 + 테스트 |
| `mobile-app/src/auth/storage.ts`, `storage.test.ts` | 3 | SecureStore wrapper + 테스트 |
| `mobile-app/src/api/types.ts` | 4 | API 응답 타입 |
| `mobile-app/src/api/client.ts`, `client.test.ts` | 4 | fetch wrapper + 토큰 갱신 + 테스트 |
| `mobile-app/src/api/auth.ts` | 4 | login/refresh/logout |
| `mobile-app/src/api/endpoints.ts` | 5 | 읽기 API 호출 함수들 |
| `mobile-app/src/auth/AuthContext.tsx` | 6 | 토큰 상태 React Context |
| `mobile-app/src/hooks/useAutoRefresh.ts`, `.test.ts` | 7 | 폴링 훅 + 테스트 |
| `mobile-app/src/components/StatCard.tsx` | 8 | 대시보드 카드 |
| `mobile-app/src/components/SlotRow.tsx` | 8 | 그리드 슬롯 한 줄 |
| `mobile-app/src/components/ErrorBanner.tsx` | 8 | 공통 에러 배너 |
| `mobile-app/app/login.tsx`, `login.test.tsx` | 9 | 로그인 화면 + 테스트 |
| `mobile-app/app/_layout.tsx` | 10 | 루트 레이아웃, AuthProvider, 부팅 |
| `mobile-app/app/(tabs)/_layout.tsx` | 11 | 4 탭 정의 |
| `mobile-app/app/(tabs)/index.tsx` | 12 | 대시보드 |
| `mobile-app/app/(tabs)/grid.tsx` | 13 | 그리드 |
| `mobile-app/app/(tabs)/orders.tsx` | 14 | 주문 |
| `mobile-app/app/(tabs)/pnl.tsx` | 15 | 손익 |
| `mobile-app/jest.config.js`, `jest.setup.ts` | 4 | 테스트 환경 |

---

## Task 1: Expo 프로젝트 초기 셋업

**Files:**
- Create: `mobile-app/` (전체)
- Create: `mobile-app/.env`, `mobile-app/.env.example`, `mobile-app/.gitignore`
- Modify: `mobile-app/app.json`

- [ ] **Step 1.1: Node.js 설치 확인**

PowerShell:
```powershell
node --version
npm --version
```

Expected: Node v18.x 이상, npm v9 이상. 둘 다 안 잡히면 https://nodejs.org/ 에서 LTS 설치 후 PowerShell 재시작.

- [ ] **Step 1.2: Expo 프로젝트 생성**

PowerShell (`C:\dev\mobileAuto`에서):
```powershell
npx create-expo-app@latest mobile-app --template default
```

기본 템플릿은 TypeScript + expo-router + 예제 tabs를 포함한다. 설치 완료까지 1-3분.

Expected: `C:\dev\mobileAuto\mobile-app\` 폴더 생성, 안에 `app/`, `package.json`, `tsconfig.json` 등 존재.

- [ ] **Step 1.3: 예제 파일 제거**

PowerShell (`C:\dev\mobileAuto\mobile-app`에서):
```powershell
Remove-Item -Recurse -Force app
Remove-Item -Recurse -Force components -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force constants -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force hooks -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force scripts -ErrorAction SilentlyContinue
New-Item -ItemType Directory app | Out-Null
New-Item -ItemType Directory "app/(tabs)" | Out-Null
New-Item -ItemType Directory src | Out-Null
New-Item -ItemType Directory src/api | Out-Null
New-Item -ItemType Directory src/auth | Out-Null
New-Item -ItemType Directory src/components | Out-Null
New-Item -ItemType Directory src/hooks | Out-Null
New-Item -ItemType Directory src/theme | Out-Null
New-Item -ItemType Directory src/utils | Out-Null
```

Expected: 깨끗한 `app/`, `app/(tabs)/`, `src/...` 구조.

- [ ] **Step 1.4: 추가 의존성 설치**

PowerShell:
```powershell
npx expo install expo-secure-store
```

Expected: `package.json`에 `expo-secure-store` 추가.

- [ ] **Step 1.5: 테스트 의존성 설치**

```powershell
npm install --save-dev jest-expo jest @testing-library/react-native @types/jest react-test-renderer
```

Expected: `package.json` devDependencies에 추가.

- [ ] **Step 1.6: `app.json` 이름 변경**

`mobile-app/app.json` 파일에서 `name`과 `slug`를 변경:

```json
{
  "expo": {
    "name": "AutoMobile",
    "slug": "auto-mobile",
    "scheme": "automobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "ios": { "supportsTablet": true },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#0f0f0f"
      },
      "package": "com.automobile.app"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ],
    "experiments": { "typedRoutes": true }
  }
}
```

(기존 `app.json`의 `assetBundlePatterns`, splash 등은 보존. 위는 키 핵심만 표시.)

- [ ] **Step 1.7: `.env`와 `.env.example` 작성**

`mobile-app/.env`:
```
EXPO_PUBLIC_API_BASE=http://43.202.113.123:8086
```

`mobile-app/.env.example`:
```
EXPO_PUBLIC_API_BASE=http://<EC2_IP>:8086
```

- [ ] **Step 1.8: `.gitignore`에 `.env` 추가**

`mobile-app/.gitignore` 파일 끝에 다음 줄 추가:
```
.env
```

(`npx create-expo-app`이 생성한 기본 gitignore의 다른 항목은 유지.)

- [ ] **Step 1.9: `package.json`에 test 스크립트 추가**

`mobile-app/package.json`의 `"scripts"` 객체에 추가:
```json
"test": "jest",
"test:watch": "jest --watch",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 1.10: Jest 설정 파일 생성**

`mobile-app/jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo(nent)?/.*|expo-modules-core|expo-router|expo-secure-store|@unimodules/.*|sentry-expo|native-base|react-clone-referenced-element)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
```

`mobile-app/jest.setup.ts`:
```ts
import '@testing-library/react-native/matchers';
```

- [ ] **Step 1.11: 타입 검사 확인**

```powershell
npx tsc --noEmit
```

Expected: 에러 없음(또는 `app/` 비어 있어서 "no inputs found" 같은 경고만).

- [ ] **Step 1.12: 첫 커밋**

```powershell
git init
git add .
git commit -m "feat: Expo 프로젝트 초기 셋업"
```

(이 `mobile-app/`는 독립 git 저장소로 운영. 루트 `mobileAuto/`의 `.gitignore`가 `auto/`는 무시하지만 `mobile-app/`은 추적하지 않게 추가 처리 필요.)

루트로 이동해서 `mobile-app/`을 루트 gitignore에 추가:

PowerShell:
```powershell
Add-Content -Path C:\dev\mobileAuto\.gitignore -Value "mobile-app/"
```

---

## Task 2: 테마 + 포맷 유틸 (TDD)

**Files:**
- Create: `mobile-app/src/theme/colors.ts`
- Create: `mobile-app/src/utils/format.ts`
- Test: `mobile-app/src/utils/format.test.ts`

- [ ] **Step 2.1: `colors.ts` 작성**

`mobile-app/src/theme/colors.ts`:
```ts
export const colors = {
  bg: '#0f0f0f',
  surface: '#1a1a1a',
  border: '#222222',
  text: '#ffffff',
  textMuted: '#888888',
  textDim: '#666666',
  accent: '#60a5fa',
  positive: '#4ade80',
  negative: '#f87171',
} as const;

export type ColorKey = keyof typeof colors;
```

- [ ] **Step 2.2: 포맷 실패 테스트 작성**

`mobile-app/src/utils/format.test.ts`:
```ts
import { formatKrw, formatBtc, formatRelativeTime, formatSigned } from './format';

describe('formatKrw', () => {
  it('천 단위 콤마 적용', () => {
    expect(formatKrw(95420000)).toBe('95,420,000');
  });
  it('소수 버림', () => {
    expect(formatKrw(1234.7)).toBe('1,234');
  });
  it('음수도 콤마', () => {
    expect(formatKrw(-12400)).toBe('-12,400');
  });
  it('null/undefined는 빈 문자열', () => {
    expect(formatKrw(null)).toBe('');
    expect(formatKrw(undefined)).toBe('');
  });
});

describe('formatBtc', () => {
  it('소수점 8자리 고정', () => {
    expect(formatBtc(0.0432)).toBe('0.04320000');
    expect(formatBtc(1)).toBe('1.00000000');
  });
});

describe('formatSigned', () => {
  it('양수는 + 부호', () => {
    expect(formatSigned(12400)).toBe('+12,400');
  });
  it('음수는 - 부호 유지', () => {
    expect(formatSigned(-12400)).toBe('-12,400');
  });
  it('0은 부호 없음', () => {
    expect(formatSigned(0)).toBe('0');
  });
});

describe('formatRelativeTime', () => {
  it('초 단위', () => {
    const now = new Date('2026-05-13T10:00:00Z').getTime();
    const ts = new Date('2026-05-13T09:59:48Z').getTime();
    expect(formatRelativeTime(ts, now)).toBe('12s ago');
  });
  it('분 단위', () => {
    const now = new Date('2026-05-13T10:00:00Z').getTime();
    const ts = new Date('2026-05-13T09:57:00Z').getTime();
    expect(formatRelativeTime(ts, now)).toBe('3m ago');
  });
  it('시간 단위', () => {
    const now = new Date('2026-05-13T10:00:00Z').getTime();
    const ts = new Date('2026-05-13T08:00:00Z').getTime();
    expect(formatRelativeTime(ts, now)).toBe('2h ago');
  });
});
```

- [ ] **Step 2.3: 테스트 실행해서 실패 확인**

```powershell
npm test -- format.test
```

Expected: FAIL. `Cannot find module './format'`.

- [ ] **Step 2.4: `format.ts` 구현**

`mobile-app/src/utils/format.ts`:
```ts
export function formatKrw(value: number | null | undefined): string {
  if (value == null) return '';
  const n = Math.trunc(value);
  return n.toLocaleString('en-US');
}

export function formatBtc(value: number | null | undefined): string {
  if (value == null) return '';
  return value.toFixed(8);
}

export function formatSigned(value: number | null | undefined): string {
  if (value == null) return '';
  if (value === 0) return '0';
  const formatted = Math.abs(Math.trunc(value)).toLocaleString('en-US');
  return value > 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatRelativeTime(
  tsMs: number | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (tsMs == null) return '';
  const diff = Math.max(0, Math.floor((nowMs - tsMs) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
```

- [ ] **Step 2.5: 테스트 통과 확인**

```powershell
npm test -- format.test
```

Expected: PASS (모든 케이스).

- [ ] **Step 2.6: 커밋**

```powershell
git add src/theme src/utils
git commit -m "feat: 다크 팔레트와 포맷 유틸 추가"
```

---

## Task 3: SecureStore wrapper (TDD)

**Files:**
- Create: `mobile-app/src/auth/storage.ts`
- Test: `mobile-app/src/auth/storage.test.ts`

- [ ] **Step 3.1: SecureStore mock과 실패 테스트 작성**

`mobile-app/src/auth/storage.test.ts`:
```ts
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { AuthStore, KEY_ACCESS, KEY_REFRESH } from './storage';

const mockSet = SecureStore.setItemAsync as jest.Mock;
const mockGet = SecureStore.getItemAsync as jest.Mock;
const mockDel = SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  AuthStore.clearMemory();
});

describe('AuthStore', () => {
  it('setTokens는 SecureStore에 양쪽 저장', async () => {
    await AuthStore.setTokens({ access: 'a', refresh: 'r' });
    expect(mockSet).toHaveBeenCalledWith(KEY_ACCESS, 'a');
    expect(mockSet).toHaveBeenCalledWith(KEY_REFRESH, 'r');
  });

  it('setTokens 후 메모리 access 즉시 반환', async () => {
    await AuthStore.setTokens({ access: 'a', refresh: 'r' });
    expect(AuthStore.getAccessToken()).toBe('a');
  });

  it('getRefreshToken은 SecureStore에서 읽음', async () => {
    mockGet.mockResolvedValueOnce('r-from-store');
    const refresh = await AuthStore.getRefreshToken();
    expect(mockGet).toHaveBeenCalledWith(KEY_REFRESH);
    expect(refresh).toBe('r-from-store');
  });

  it('clearAccessToken은 메모리와 store 둘 다 비움', async () => {
    await AuthStore.setTokens({ access: 'a', refresh: 'r' });
    await AuthStore.clearAccessToken();
    expect(AuthStore.getAccessToken()).toBeNull();
    expect(mockDel).toHaveBeenCalledWith(KEY_ACCESS);
  });

  it('clearAll은 양쪽 키 삭제', async () => {
    await AuthStore.clearAll();
    expect(mockDel).toHaveBeenCalledWith(KEY_ACCESS);
    expect(mockDel).toHaveBeenCalledWith(KEY_REFRESH);
  });

  it('hydrate는 SecureStore의 access를 메모리에 로드', async () => {
    mockGet.mockImplementation((key: string) =>
      key === KEY_ACCESS ? Promise.resolve('a') : Promise.resolve('r')
    );
    await AuthStore.hydrate();
    expect(AuthStore.getAccessToken()).toBe('a');
  });
});
```

- [ ] **Step 3.2: 테스트 실패 확인**

```powershell
npm test -- storage.test
```

Expected: FAIL.

- [ ] **Step 3.3: `storage.ts` 구현**

`mobile-app/src/auth/storage.ts`:
```ts
import * as SecureStore from 'expo-secure-store';

export const KEY_ACCESS = 'mobile_api.access_token';
export const KEY_REFRESH = 'mobile_api.refresh_token';

let memAccess: string | null = null;

export const AuthStore = {
  getAccessToken(): string | null {
    return memAccess;
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEY_REFRESH);
  },

  async setTokens(tokens: { access: string; refresh: string }): Promise<void> {
    memAccess = tokens.access;
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS, tokens.access),
      SecureStore.setItemAsync(KEY_REFRESH, tokens.refresh),
    ]);
  },

  async setAccessToken(access: string): Promise<void> {
    memAccess = access;
    await SecureStore.setItemAsync(KEY_ACCESS, access);
  },

  async clearAccessToken(): Promise<void> {
    memAccess = null;
    await SecureStore.deleteItemAsync(KEY_ACCESS);
  },

  async clearAll(): Promise<void> {
    memAccess = null;
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
    ]);
  },

  async hydrate(): Promise<void> {
    const access = await SecureStore.getItemAsync(KEY_ACCESS);
    memAccess = access;
  },

  clearMemory(): void {
    memAccess = null;
  },
};
```

- [ ] **Step 3.4: 테스트 통과 확인**

```powershell
npm test -- storage.test
```

Expected: PASS.

- [ ] **Step 3.5: 커밋**

```powershell
git add src/auth
git commit -m "feat: SecureStore 기반 AuthStore"
```

---

## Task 4: API 타입 + 클라이언트 + Auth (TDD)

**Files:**
- Create: `mobile-app/src/api/types.ts`
- Create: `mobile-app/src/api/auth.ts`
- Create: `mobile-app/src/api/client.ts`
- Test: `mobile-app/src/api/client.test.ts`

- [ ] **Step 4.1: API 타입 작성**

`mobile-app/src/api/types.ts`:
```ts
export interface LoginRequest {
  username: string;
  password: string;
  totp_code?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface BotStatus {
  is_alive: boolean;
  last_heartbeat_at: string | null;
  last_heartbeat_age_seconds: number | null;
  stop_loss_active: boolean;
  breakout_guard_active: boolean;
}

export interface MarketPrice {
  symbol: string;
  price: number;
  source: 'ws' | 'rest';
  fetched_at: string;
}

export interface GridSummary {
  total_slots: number;
  held_slots: number;
  total_held_btc: number;
  inventory_cost_krw: number;
  average_buy_price: number | null;
  pending_orders_count: number;
}

export interface GridSlot {
  slot_index: number;
  buy_price: number;
  planned_qty: number;
  planned_buy_krw: number;
  held_qty: number;
  inventory_cost_krw: number;
  sell_price: number;
  effective_sell_price: number;
  filled_at: string | null;
  pending_order: PendingOrder | null;
}

export interface GridState {
  slots: GridSlot[];
}

export interface PendingOrder {
  uuid: string;
  identifier: string | null;
  side: 'bid' | 'ask';
  ord_type: string;
  price: number | null;
  volume: number | null;
  state: string;
  created_at: string;
  slot_index: number | null;
}

export interface RecentOrder extends PendingOrder {
  executed_volume: number;
  finished_at: string | null;
}

export interface PnlRealized {
  period: 'd' | 'w' | 'm' | 'y' | 'all';
  from: string;
  to: string;
  sell_order_count: number;
  fill_count: number;
  gross_krw: number;
  fee_krw: number;
  net_krw: number;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  code: 'network' | 'auth' | 'server' | 'client' | 'session-expired';
  constructor(message: string, status: number, code: ApiError['code'], body?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}
```

(필드 일부는 서버 응답을 보고 보강할 수 있음. MVP는 위 형태로 시작하고 endpoints.ts 사용 단계에서 모자라면 추가.)

- [ ] **Step 4.2: `auth.ts` 작성 (REST 호출만, 토큰 저장 책임은 client에서 분리)**

`mobile-app/src/api/auth.ts`:
```ts
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
```

- [ ] **Step 4.3: 클라이언트 실패 테스트 작성**

`mobile-app/src/api/client.test.ts`:
```ts
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('./auth', () => ({
  loginApi: jest.fn(),
  refreshApi: jest.fn(),
  logoutApi: jest.fn(),
}));

import { apiFetch, AuthEvents, __resetClientForTest } from './client';
import { AuthStore } from '../auth/storage';
import { refreshApi } from './auth';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  (refreshApi as jest.Mock).mockReset();
  AuthStore.clearMemory();
  __resetClientForTest();
});

describe('apiFetch', () => {
  it('access 있으면 Authorization 헤더 첨부', async () => {
    await AuthStore.setTokens({ access: 'a1', refresh: 'r1' });
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await apiFetch('/v1/bot/status');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/bot/status'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer a1' }),
      }),
    );
  });

  it('401 → refresh → 재시도 후 성공', async () => {
    await AuthStore.setTokens({ access: 'a1', refresh: 'r1' });
    (AuthStore.getRefreshToken as any) = jest.fn(async () => 'r1');
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    (refreshApi as jest.Mock).mockResolvedValueOnce({
      access_token: 'a2', refresh_token: 'r2', token_type: 'bearer', expires_in: 900,
    });

    const res = await apiFetch('/v1/bot/status');
    expect(res.status).toBe(200);
    expect(refreshApi).toHaveBeenCalledWith('r1');
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer a2' }),
      }),
    );
  });

  it('refresh 실패 시 logout 이벤트 발생 + 예외', async () => {
    await AuthStore.setTokens({ access: 'a1', refresh: 'r1' });
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    (refreshApi as jest.Mock).mockRejectedValueOnce(new Error('refresh failed'));

    const handler = jest.fn();
    AuthEvents.on('logout', handler);

    await expect(apiFetch('/v1/bot/status')).rejects.toMatchObject({
      code: 'session-expired',
    });
    expect(handler).toHaveBeenCalled();
  });

  it('동시 401 두 번에도 refresh는 한 번만', async () => {
    await AuthStore.setTokens({ access: 'a1', refresh: 'r1' });
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    (refreshApi as jest.Mock).mockResolvedValueOnce({
      access_token: 'a2', refresh_token: 'r2', token_type: 'bearer', expires_in: 900,
    });

    await Promise.all([apiFetch('/v1/bot/status'), apiFetch('/v1/market/price')]);
    expect(refreshApi).toHaveBeenCalledTimes(1);
  });

  it('네트워크 오류는 ApiError(network)', async () => {
    await AuthStore.setTokens({ access: 'a1', refresh: 'r1' });
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await expect(apiFetch('/v1/bot/status')).rejects.toMatchObject({ code: 'network' });
  });
});
```

- [ ] **Step 4.4: 테스트 실패 확인**

```powershell
npm test -- client.test
```

Expected: FAIL.

- [ ] **Step 4.5: `client.ts` 구현**

`mobile-app/src/api/client.ts`:
```ts
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
```

- [ ] **Step 4.6: 테스트 통과 확인**

```powershell
npm test -- client.test
```

Expected: PASS (5개 케이스).

- [ ] **Step 4.7: 커밋**

```powershell
git add src/api jest.config.js jest.setup.ts
git commit -m "feat: API 클라이언트 + 토큰 자동 갱신 + 타입"
```

---

## Task 5: 읽기 endpoint 함수들

**Files:**
- Create: `mobile-app/src/api/endpoints.ts`

- [ ] **Step 5.1: `endpoints.ts` 구현**

`mobile-app/src/api/endpoints.ts`:
```ts
import { apiGetJson } from './client';
import {
  BotStatus, MarketPrice, GridSummary, GridState,
  PendingOrder, RecentOrder, PnlRealized,
} from './types';

export function getBotStatus(): Promise<BotStatus> {
  return apiGetJson<BotStatus>('/v1/bot/status');
}

export function getMarketPrice(): Promise<MarketPrice> {
  return apiGetJson<MarketPrice>('/v1/market/price');
}

export function getGridSummary(): Promise<GridSummary> {
  return apiGetJson<GridSummary>('/v1/grid/summary');
}

export function getGridState(): Promise<GridState> {
  return apiGetJson<GridState>('/v1/grid/state');
}

export function getPendingOrders(): Promise<PendingOrder[]> {
  return apiGetJson<PendingOrder[]>('/v1/orders/pending');
}

export function getRecentOrders(limit = 50): Promise<RecentOrder[]> {
  return apiGetJson<RecentOrder[]>(`/v1/orders/recent?limit=${limit}`);
}

export type PnlPeriod = 'd' | 'w' | 'm' | 'y' | 'all';

export function getPnlRealized(period: PnlPeriod): Promise<PnlRealized> {
  return apiGetJson<PnlRealized>(`/v1/pnl/realized?period=${period}`);
}
```

- [ ] **Step 5.2: 타입 검사**

```powershell
npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 5.3: 커밋**

```powershell
git add src/api/endpoints.ts
git commit -m "feat: 읽기 endpoint 함수들"
```

---

## Task 6: AuthContext

**Files:**
- Create: `mobile-app/src/auth/AuthContext.tsx`

- [ ] **Step 6.1: 구현**

`mobile-app/src/auth/AuthContext.tsx`:
```tsx
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
```

- [ ] **Step 6.2: 타입 검사**

```powershell
npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 6.3: 커밋**

```powershell
git add src/auth/AuthContext.tsx
git commit -m "feat: AuthContext + 부팅 시퀀스"
```

---

## Task 7: useAutoRefresh 훅 (TDD)

**Files:**
- Create: `mobile-app/src/hooks/useAutoRefresh.ts`
- Test: `mobile-app/src/hooks/useAutoRefresh.test.tsx`

- [ ] **Step 7.1: 실패 테스트 작성**

`mobile-app/src/hooks/useAutoRefresh.test.tsx`:
```tsx
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useAutoRefresh } from './useAutoRefresh';

// expo-router의 useFocusEffect를 useEffect로 단순화 (테스트 환경)
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => any) => {
    const React = require('react');
    React.useEffect(() => cb(), []);
  },
}));

jest.useFakeTimers();

function Harness({ fetcher, interval }: { fetcher: () => Promise<number>; interval?: number }) {
  const { data, loading, error } = useAutoRefresh(fetcher, interval);
  return (
    <>
      <Text testID="loading">{loading ? '1' : '0'}</Text>
      <Text testID="data">{data == null ? '-' : String(data)}</Text>
      <Text testID="error">{error?.message ?? ''}</Text>
    </>
  );
}

afterEach(() => jest.clearAllTimers());

describe('useAutoRefresh', () => {
  it('마운트 시 한 번 호출 → 데이터 표시', async () => {
    const fetcher = jest.fn().mockResolvedValue(42);
    const view = render(<Harness fetcher={fetcher} />);
    await waitFor(() => expect(view.getByTestId('data').props.children).toBe('42'));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('interval 경과마다 재호출', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    const view = render(<Harness fetcher={fetcher} interval={1000} />);
    await waitFor(() => expect(view.getByTestId('data').props.children).toBe('1'));
    await act(async () => { jest.advanceTimersByTime(1000); });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    await act(async () => { jest.advanceTimersByTime(1000); });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
  });

  it('fetcher가 throw하면 error 상태', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));
    const view = render(<Harness fetcher={fetcher} />);
    await waitFor(() => expect(view.getByTestId('error').props.children).toBe('boom'));
  });
});
```

- [ ] **Step 7.2: 테스트 실패 확인**

```powershell
npm test -- useAutoRefresh
```

Expected: FAIL.

- [ ] **Step 7.3: 훅 구현**

`mobile-app/src/hooks/useAutoRefresh.ts`:
```ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';

export function useAutoRefresh<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 10_000,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const next = await fetcher();
      if (aliveRef.current) {
        setData(next);
        setError(null);
      }
    } catch (e) {
      if (aliveRef.current) setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [fetcher]);

  useFocusEffect(
    useCallback(() => {
      aliveRef.current = true;
      load();
      const id = setInterval(load, intervalMs);

      const subscription = AppState.addEventListener('change', (s: AppStateStatus) => {
        if (s === 'active') load();
      });

      return () => {
        aliveRef.current = false;
        clearInterval(id);
        subscription.remove();
      };
    }, [load, intervalMs]),
  );

  return { data, loading, error, refresh: load };
}
```

- [ ] **Step 7.4: 테스트 통과 확인**

```powershell
npm test -- useAutoRefresh
```

Expected: PASS (3개 케이스).

- [ ] **Step 7.5: 커밋**

```powershell
git add src/hooks
git commit -m "feat: useAutoRefresh 훅 (focus 기반 폴링)"
```

---

## Task 8: 공통 UI 컴포넌트

**Files:**
- Create: `mobile-app/src/components/StatCard.tsx`
- Create: `mobile-app/src/components/SlotRow.tsx`
- Create: `mobile-app/src/components/ErrorBanner.tsx`

- [ ] **Step 8.1: `StatCard.tsx`**

`mobile-app/src/components/StatCard.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  tone?: 'default' | 'positive' | 'negative';
  loading?: boolean;
}

export function StatCard({ label, value, subtitle, tone = 'default', loading }: Props) {
  const valueColor =
    tone === 'positive' ? colors.positive
    : tone === 'negative' ? colors.negative
    : colors.text;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{loading ? '—' : value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  label: {
    color: colors.textDim,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
```

- [ ] **Step 8.2: `SlotRow.tsx`**

`mobile-app/src/components/SlotRow.tsx`:
```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { GridSlot } from '../api/types';
import { formatKrw, formatBtc } from '../utils/format';

interface Props {
  slot: GridSlot;
  onPress?: (slot: GridSlot) => void;
}

export function SlotRow({ slot, onPress }: Props) {
  const isHeld = slot.held_qty > 0;
  return (
    <Pressable onPress={() => onPress?.(slot)} style={styles.row}>
      <View style={styles.col}>
        <Text style={styles.label}>매수</Text>
        <Text style={styles.value}>{formatKrw(slot.buy_price)}</Text>
      </View>
      <View style={styles.col}>
        <Text style={styles.label}>{isHeld ? '보유' : '계획'}</Text>
        <Text style={styles.value}>{formatBtc(isHeld ? slot.held_qty : slot.planned_qty)}</Text>
      </View>
      <View style={styles.col}>
        <Text style={styles.label}>매도</Text>
        <Text style={styles.value}>{formatKrw(slot.effective_sell_price)}</Text>
      </View>
      {slot.pending_order ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  col: { flex: 1 },
  label: { color: colors.textDim, fontSize: 9, textTransform: 'uppercase' },
  value: { color: colors.text, fontSize: 13, fontWeight: '500', marginTop: 2 },
  badge: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginLeft: 4,
  },
});
```

- [ ] **Step 8.3: `ErrorBanner.tsx`**

`mobile-app/src/components/ErrorBanner.tsx`:
```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <View style={styles.banner}>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonText}>재시도</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#2a1212',
    borderRadius: 6,
    padding: 10,
    margin: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: { color: colors.negative, flex: 1, fontSize: 12 },
  button: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: colors.surface, borderRadius: 4, marginLeft: 8,
  },
  buttonText: { color: colors.text, fontSize: 12 },
});
```

- [ ] **Step 8.4: 타입 검사 및 커밋**

```powershell
npx tsc --noEmit
git add src/components
git commit -m "feat: 공통 UI 컴포넌트 (StatCard, SlotRow, ErrorBanner)"
```

---

## Task 9: 로그인 화면

**Files:**
- Create: `mobile-app/app/login.tsx`

- [ ] **Step 9.1: 구현**

`mobile-app/app/login.tsx`:
```tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

export default function LoginScreen() {
  const { state, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [showTotp, setShowTotp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (state.status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  async function onSubmit() {
    if (!username || !password) {
      setErrorMsg('아이디와 비밀번호를 입력하세요');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await login({ username, password, totp_code: totp || undefined });
    } catch (e: any) {
      setErrorMsg(e?.message ?? '로그인 실패');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>AutoMobile</Text>
        <Text style={styles.subtitle}>자동매매 모니터링</Text>

        <TextInput
          style={styles.input}
          placeholder="아이디"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor={colors.textDim}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable onPress={() => setShowTotp((v) => !v)} style={styles.totpToggle}>
          <Text style={styles.totpToggleText}>
            {showTotp ? '▼' : '▶'} TOTP 사용
          </Text>
        </Pressable>
        {showTotp ? (
          <TextInput
            style={styles.input}
            placeholder="TOTP 6자리"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
            maxLength={6}
            value={totp}
            onChangeText={setTotp}
          />
        ) : null}

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          style={[styles.button, submitting && styles.buttonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.buttonText}>로그인</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 20 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 20 },
  input: {
    backgroundColor: colors.bg, color: colors.text,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6,
    marginBottom: 10, fontSize: 14,
  },
  totpToggle: { paddingVertical: 6 },
  totpToggleText: { color: colors.textMuted, fontSize: 12 },
  error: { color: colors.negative, fontSize: 12, marginVertical: 6, textAlign: 'center' },
  button: {
    backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 6,
    alignItems: 'center', marginTop: 10,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.bg, fontWeight: '600' },
});
```

- [ ] **Step 9.2: 커밋**

```powershell
git add app/login.tsx
git commit -m "feat: 로그인 화면 + TOTP 토글"
```

---

## Task 10: 루트 레이아웃 + 부팅

**Files:**
- Create: `mobile-app/app/_layout.tsx`

- [ ] **Step 10.1: 구현**

`mobile-app/app/_layout.tsx`:
```tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

function Gate() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {state.status === 'authenticated' ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="login" />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Gate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 10.2: 커밋**

```powershell
git add app/_layout.tsx
git commit -m "feat: 루트 레이아웃 + AuthGate"
```

---

## Task 11: Tabs 레이아웃

**Files:**
- Create: `mobile-app/app/(tabs)/_layout.tsx`

- [ ] **Step 11.1: 구현**

`mobile-app/app/(tabs)/_layout.tsx`:
```tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '대시보드',
          tabBarIcon: ({ color, size }) => <Ionicons name="speedometer" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="grid"
        options={{
          title: '그리드',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: '주문',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pnl"
        options={{
          title: '손익',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 11.2: 커밋**

```powershell
git add "app/(tabs)/_layout.tsx"
git commit -m "feat: Bottom Tabs 레이아웃"
```

---

## Task 12: 대시보드 화면

**Files:**
- Create: `mobile-app/app/(tabs)/index.tsx`

- [ ] **Step 12.1: 구현**

`mobile-app/app/(tabs)/index.tsx`:
```tsx
import React, { useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { getBotStatus, getMarketPrice, getGridSummary, getPnlRealized } from '../../src/api/endpoints';
import { StatCard } from '../../src/components/StatCard';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { colors } from '../../src/theme/colors';
import { formatKrw, formatBtc, formatRelativeTime, formatSigned } from '../../src/utils/format';
import { useAuth } from '../../src/auth/AuthContext';

export default function Dashboard() {
  const { logout } = useAuth();
  const status = useAutoRefresh(getBotStatus, 10_000);
  const price = useAutoRefresh(getMarketPrice, 10_000);
  const summary = useAutoRefresh(getGridSummary, 10_000);
  const todayPnl = useAutoRefresh(useCallback(() => getPnlRealized('d'), []), 30_000);

  const anyError = status.error ?? price.error ?? summary.error ?? todayPnl.error;
  const refreshing = status.loading && price.loading && summary.loading;

  const refreshAll = useCallback(() => {
    status.refresh(); price.refresh(); summary.refresh(); todayPnl.refresh();
  }, [status, price, summary, todayPnl]);

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.accent} />}
    >
      <View style={styles.header}>
        <Text style={styles.symbol}>KRW-BTC</Text>
        <Text style={styles.price}>{price.data ? formatKrw(price.data.price) : '—'}</Text>
        <Text style={styles.heartbeat}>
          {status.data?.is_alive ? '봇 Alive' : '봇 정지'}
          {status.data?.last_heartbeat_at
            ? ` · ${formatRelativeTime(Date.parse(status.data.last_heartbeat_at))}`
            : ''}
        </Text>
      </View>

      {anyError ? <ErrorBanner message={anyError.message} onRetry={refreshAll} /> : null}

      <View style={styles.body}>
        <StatCard
          label="보유"
          value={summary.data ? formatBtc(summary.data.total_held_btc) : '—'}
          subtitle={
            summary.data
              ? `${summary.data.held_slots}/${summary.data.total_slots} 슬롯 · 평단 ${formatKrw(summary.data.average_buy_price)}`
              : undefined
          }
          loading={summary.loading && !summary.data}
        />
        <StatCard
          label="오늘 손익"
          value={todayPnl.data ? formatSigned(todayPnl.data.net_krw) : '—'}
          tone={
            todayPnl.data
              ? todayPnl.data.net_krw > 0 ? 'positive'
              : todayPnl.data.net_krw < 0 ? 'negative' : 'default'
              : 'default'
          }
          loading={todayPnl.loading && !todayPnl.data}
        />
        <StatCard
          label="미체결"
          value={summary.data ? `${summary.data.pending_orders_count}건` : '—'}
          loading={summary.loading && !summary.data}
        />

        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  symbol: { color: colors.textMuted, fontSize: 12 },
  price: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 2 },
  heartbeat: { color: colors.positive, fontSize: 11, marginTop: 2 },
  body: { padding: 12 },
  logoutBtn: { padding: 12, marginTop: 12, alignItems: 'center' },
  logoutText: { color: colors.textMuted, fontSize: 12 },
});
```

- [ ] **Step 12.2: 커밋**

```powershell
git add "app/(tabs)/index.tsx"
git commit -m "feat: 대시보드 화면"
```

---

## Task 13: 그리드 화면

**Files:**
- Create: `mobile-app/app/(tabs)/grid.tsx`

- [ ] **Step 13.1: 구현**

`mobile-app/app/(tabs)/grid.tsx`:
```tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Modal, Pressable, ScrollView,
} from 'react-native';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { getGridState } from '../../src/api/endpoints';
import { SlotRow } from '../../src/components/SlotRow';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { colors } from '../../src/theme/colors';
import { GridSlot } from '../../src/api/types';
import { formatKrw, formatBtc } from '../../src/utils/format';

export default function GridScreen() {
  const grid = useAutoRefresh(getGridState, 10_000);
  const [selected, setSelected] = useState<GridSlot | null>(null);

  const sorted = (grid.data?.slots ?? []).slice().sort((a, b) => b.buy_price - a.buy_price);
  const heldCount = sorted.filter((s) => s.held_qty > 0).length;

  const onClose = useCallback(() => setSelected(null), []);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>슬롯 {sorted.length}개 · 보유 {heldCount}</Text>
      </View>
      {grid.error ? <ErrorBanner message={grid.error.message} onRetry={grid.refresh} /> : null}
      <FlatList
        data={sorted}
        keyExtractor={(s) => String(s.slot_index)}
        renderItem={({ item }) => <SlotRow slot={item} onPress={setSelected} />}
        refreshControl={<RefreshControl refreshing={grid.loading && !grid.data} onRefresh={grid.refresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          grid.loading ? <Text style={styles.empty}>로딩 중...</Text>
          : <Text style={styles.empty}>슬롯 없음</Text>
        }
      />

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={onClose}>
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <ScrollView>
              {selected ? (
                <>
                  <Text style={styles.modalTitle}>슬롯 #{selected.slot_index}</Text>
                  <DetailRow k="매수가" v={formatKrw(selected.buy_price)} />
                  <DetailRow k="계획 수량" v={formatBtc(selected.planned_qty)} />
                  <DetailRow k="계획 매수액" v={formatKrw(selected.planned_buy_krw)} />
                  <DetailRow k="보유 수량" v={formatBtc(selected.held_qty)} />
                  <DetailRow k="원가" v={formatKrw(selected.inventory_cost_krw)} />
                  <DetailRow k="기본 매도가" v={formatKrw(selected.sell_price)} />
                  <DetailRow k="유효 매도가" v={formatKrw(selected.effective_sell_price)} />
                  <DetailRow k="filled_at" v={selected.filled_at ?? '-'} />
                  {selected.pending_order ? (
                    <>
                      <Text style={styles.modalSection}>미체결</Text>
                      <DetailRow k="uuid" v={selected.pending_order.uuid} />
                      <DetailRow k="side" v={selected.pending_order.side} />
                      <DetailRow k="state" v={selected.pending_order.state} />
                      <DetailRow k="price" v={formatKrw(selected.pending_order.price ?? 0)} />
                      <DetailRow k="volume" v={formatBtc(selected.pending_order.volume ?? 0)} />
                    </>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DetailRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailKey}>{k}</Text>
      <Text style={styles.detailVal}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontSize: 13, fontWeight: '500' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 40 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, maxHeight: '80%' },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalSection: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailKey: { color: colors.textMuted, fontSize: 12 },
  detailVal: { color: colors.text, fontSize: 12, fontFamily: 'monospace' },
  closeBtn: { marginTop: 12, padding: 10, backgroundColor: colors.bg, borderRadius: 6, alignItems: 'center' },
  closeBtnText: { color: colors.text, fontSize: 13 },
});
```

- [ ] **Step 13.2: 커밋**

```powershell
git add "app/(tabs)/grid.tsx"
git commit -m "feat: 그리드 화면 + 슬롯 상세 모달"
```

---

## Task 14: 주문 화면

**Files:**
- Create: `mobile-app/app/(tabs)/orders.tsx`

- [ ] **Step 14.1: 구현**

`mobile-app/app/(tabs)/orders.tsx`:
```tsx
import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, SectionList } from 'react-native';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { getPendingOrders, getRecentOrders } from '../../src/api/endpoints';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { colors } from '../../src/theme/colors';
import { formatKrw, formatBtc, formatRelativeTime } from '../../src/utils/format';
import { PendingOrder, RecentOrder } from '../../src/api/types';

export default function OrdersScreen() {
  const pending = useAutoRefresh(getPendingOrders, 10_000);
  const recent = useAutoRefresh(useCallback(() => getRecentOrders(50), []), 30_000);

  const refreshing = (pending.loading && !pending.data) || (recent.loading && !recent.data);
  const refreshAll = useCallback(() => { pending.refresh(); recent.refresh(); }, [pending, recent]);

  const sections = [
    { title: `미체결 (${pending.data?.length ?? 0})`, data: pending.data ?? [] },
    { title: '최근 50건', data: (recent.data ?? []) as (PendingOrder | RecentOrder)[] },
  ];

  return (
    <View style={styles.root}>
      {(pending.error || recent.error) ? (
        <ErrorBanner message={(pending.error ?? recent.error)!.message} onRetry={refreshAll} />
      ) : null}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.uuid}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => <OrderRow order={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.accent} />}
        ListEmptyComponent={<Text style={styles.empty}>주문 없음</Text>}
      />
    </View>
  );
}

function OrderRow({ order }: { order: PendingOrder | RecentOrder }) {
  const isAsk = order.side === 'ask';
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.side, { color: isAsk ? colors.negative : colors.positive }]}>
          {isAsk ? 'SELL' : 'BUY'} · {order.state}
        </Text>
        <Text style={styles.meta}>
          {order.price != null ? formatKrw(order.price) : 'market'}
          {' · '}
          {order.volume != null ? formatBtc(order.volume) : '-'}
        </Text>
      </View>
      <Text style={styles.time}>{formatRelativeTime(Date.parse(order.created_at))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  sectionHeader: {
    color: colors.textMuted, fontSize: 11, textTransform: 'uppercase',
    padding: 12, backgroundColor: colors.bg,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  side: { fontSize: 12, fontWeight: '600' },
  meta: { color: colors.text, fontSize: 12, marginTop: 2 },
  time: { color: colors.textDim, fontSize: 10, marginLeft: 8 },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 40 },
});
```

- [ ] **Step 14.2: 커밋**

```powershell
git add "app/(tabs)/orders.tsx"
git commit -m "feat: 주문 화면 (미체결 + 최근 50건)"
```

---

## Task 15: 손익 화면

**Files:**
- Create: `mobile-app/app/(tabs)/pnl.tsx`

- [ ] **Step 15.1: 구현**

`mobile-app/app/(tabs)/pnl.tsx`:
```tsx
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { getPnlRealized, PnlPeriod } from '../../src/api/endpoints';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { StatCard } from '../../src/components/StatCard';
import { colors } from '../../src/theme/colors';
import { formatKrw, formatSigned } from '../../src/utils/format';

const PERIODS: { key: PnlPeriod; label: string }[] = [
  { key: 'd', label: '오늘' },
  { key: 'w', label: '이번주' },
  { key: 'm', label: '이번달' },
  { key: 'y', label: '올해' },
  { key: 'all', label: '전체' },
];

export default function PnlScreen() {
  const [period, setPeriod] = useState<PnlPeriod>('d');
  const fetcher = useCallback(() => getPnlRealized(period), [period]);
  const pnl = useAutoRefresh(fetcher, 30_000);

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={pnl.loading && !pnl.data} onRefresh={pnl.refresh} tintColor={colors.accent} />}
    >
      <View style={styles.tabs}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[styles.tab, period === p.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, period === p.key && styles.tabTextActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      {pnl.error ? <ErrorBanner message={pnl.error.message} onRetry={pnl.refresh} /> : null}

      <View style={styles.body}>
        {pnl.data ? (
          <>
            <Text style={styles.range}>
              {pnl.data.from} ~ {pnl.data.to}
            </Text>
            <StatCard
              label="순손익"
              value={formatSigned(pnl.data.net_krw)}
              tone={pnl.data.net_krw > 0 ? 'positive' : pnl.data.net_krw < 0 ? 'negative' : 'default'}
            />
            <StatCard label="총수익" value={formatKrw(pnl.data.gross_krw)} />
            <StatCard label="수수료" value={formatKrw(pnl.data.fee_krw)} />
            <StatCard label="매도 주문 수" value={String(pnl.data.sell_order_count)} />
            <StatCard label="체결 건수" value={String(pnl.data.fill_count)} />
          </>
        ) : (
          <Text style={styles.loading}>로딩 중...</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', padding: 8 },
  tab: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.accent },
  tabText: { color: colors.textMuted, fontSize: 12 },
  tabTextActive: { color: colors.accent, fontWeight: '600' },
  body: { padding: 12 },
  range: { color: colors.textMuted, fontSize: 11, marginBottom: 8 },
  loading: { color: colors.textDim, textAlign: 'center', marginTop: 40 },
});
```

- [ ] **Step 15.2: 커밋**

```powershell
git add "app/(tabs)/pnl.tsx"
git commit -m "feat: 손익 화면 + 기간 토글"
```

---

## Task 16: 통합 검증

**Files:**
- 검증 전용 (코드 변경 없음)

- [ ] **Step 16.1: 타입 검사 전체**

```powershell
npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 16.2: 단위 테스트 전체**

```powershell
npm test
```

Expected: 모든 테스트(`format`, `storage`, `client`, `useAutoRefresh`) PASS.

- [ ] **Step 16.3: 에뮬레이터 또는 실기기 준비**

Android Studio → AVD Manager → Pixel 7 이상의 에뮬레이터를 만들고 부팅. 또는 USB 디버깅 켠 실기기 연결.

확인:
```powershell
adb devices
```

Expected: 디바이스 1개 이상 `device` 상태로 표시.

- [ ] **Step 16.4: 개발 서버 실행 + 디바이스에 띄우기**

```powershell
npx expo start --android
```

자동으로 디바이스/에뮬레이터에 Expo Dev Client(또는 Expo Go) 설치 후 앱이 띄워진다. 첫 빌드는 2-5분.

Expected: 로그인 화면이 디바이스에 보임.

- [ ] **Step 16.5: 기능 체크리스트 수동 검증**

`auto/.env`의 admin 자격증명을 사용 (`MOBILE_API_USERNAME=admin`, `MOBILE_API_PASSWORD=<root .env 값>`):

- [ ] 로그인 화면이 첫 진입 시 노출
- [ ] admin 계정 + 비밀번호로 로그인 → 대시보드 진입
- [ ] 대시보드: 현재가, 봇 상태(Alive/heartbeat), 보유 BTC, 오늘 손익, 미체결 건수 표시
- [ ] 그리드 탭: 슬롯 목록 표시, 슬롯 탭 → 상세 모달 (`pending_order` 있으면 표시)
- [ ] 주문 탭: 미체결과 최근 50건 표시
- [ ] 손익 탭: d/w/m/y/all 전환 시 값 변경
- [ ] pull-to-refresh: 각 탭에서 아래로 끌면 즉시 갱신
- [ ] 화면 활성 시 약 10초마다 자동 갱신 (타임스탬프나 heartbeat 갱신 확인)
- [ ] 비행기 모드 토글 → 빨간 에러 배너 → 비행기 모드 해제 → 자동 회복
- [ ] 앱 종료 후 재실행: 로그인 화면 안 거치고 대시보드 진입 (refresh 토큰 자동 재로그인)
- [ ] 대시보드 하단 "로그아웃" 탭 → 로그인 화면 복귀
- [ ] 잘못된 비밀번호 → 에러 메시지 표시, 화면 이동 없음

- [ ] **Step 16.6: 토큰 만료 시뮬레이션 (개발자 도구)**

대시보드에 진입한 상태에서, 디바이스의 React DevTools 또는 콘솔에서 access_token만 강제 삭제하고 다음 폴링을 기다린다. 또는 어플리케이션 코드 임시로:

```ts
// 일시적으로 client.ts 맨 위에 추가해 401을 강제 (검증 후 제거)
// AuthStore.clearAccessToken();
```

Expected: refresh 자동 호출 → 화면 데이터 정상 유지.

검증 후 위 코드 줄 제거.

- [ ] **Step 16.7: APK 빌드 (선택)**

EAS 빌드용 사전 셋업:
```powershell
npm install -g eas-cli
eas login
eas build:configure
```

내부 테스트용 빌드:
```powershell
eas build -p android --profile preview
```

Expected: 클라우드 빌드 후 APK 다운로드 URL 출력. 디바이스에 APK 설치 후 동일 체크리스트 재확인.

- [ ] **Step 16.8: 최종 커밋**

`mobile-app/` 안에서:
```powershell
git status
```

작업 트리가 깨끗하면 OK. 미커밋 변경이 남아 있으면:
```powershell
git add -A
git commit -m "chore: 최종 정리"
```

---

## Self-Review

### Spec coverage 점검

| Spec 요구사항 | 구현 Task |
|---|---|
| Expo + TypeScript 프로젝트 셋업 | Task 1 |
| 다크 테마 단일 팔레트 | Task 2 |
| 통화/시간 포맷 유틸 | Task 2 |
| SecureStore 토큰 영속 + 메모리 캐시 1차 | Task 3 |
| API 응답 타입 | Task 4 |
| `apiFetch` 401 → refresh → 재시도 | Task 4 |
| In-flight Promise로 중복 refresh 방지 | Task 4 |
| login/refresh/logout API | Task 4 |
| 7개 읽기 endpoint 함수 | Task 5 |
| AuthContext + 부팅 시퀀스 (refresh로 자동 진입) | Task 6 |
| `AuthEvents.on('logout')` 구독 → 로그인 화면으로 | Task 6 |
| useAutoRefresh: useFocusEffect, AppState, cleanup | Task 7 |
| StatCard / SlotRow / ErrorBanner 공통 컴포넌트 | Task 8 |
| 로그인 화면 + TOTP 토글 | Task 9 |
| 루트 레이아웃 + 로딩 스플래시 | Task 10 |
| Bottom Tabs (4개) + 아이콘 | Task 11 |
| 대시보드 (상태/현재가/요약/오늘 손익/미체결) | Task 12 |
| 그리드 (FlatList + 상세 모달, 정렬) | Task 13 |
| 주문 (미체결 + 최근 50건) | Task 14 |
| 손익 (d/w/m/y/all 토글) | Task 15 |
| 검증 체크리스트 | Task 16 |
| 401 post-refresh → 자동 로그아웃 | Task 4, 6 |
| 네트워크 에러 → ErrorBanner + 재시도 | Task 8, 12-15 |
| 자격증명을 코드에 포함하지 않음 | Task 1 (.env gitignore) |

### Placeholder scan

검토 완료. "TBD", "TODO", "implement later" 없음. 각 코드 단계에 실행 가능한 완전 코드 포함.

### Type consistency

- `AuthStore.setTokens({ access, refresh })` 시그니처가 Task 3, 4, 6에서 일치.
- `ApiError`의 `code` union(`network|auth|server|client|session-expired`)가 Task 4의 의도와 일치.
- `useAutoRefresh<T>(fetcher, intervalMs?)` 시그니처가 Task 7 정의와 12-15 사용처 일치.
- `PnlPeriod` 타입이 Task 5에서 export, Task 15에서 import.
- `GridSlot.pending_order: PendingOrder | null` 정의가 Task 4 타입과 Task 13 사용처 일치.
- `formatRelativeTime(tsMs, nowMs?)` 시그니처가 Task 2 정의와 Task 12, 14 사용처 일치.

### Scope check

MVP 범위(읽기 전용 + 로그인)에 집중. 명령 API, 푸시, 차트 등 범위 밖 기능 없음.
