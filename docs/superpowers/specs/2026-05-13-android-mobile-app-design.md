# Android Mobile App Design

자동매매 봇(`auto/`)을 모니터링하기 위한 React Native(Expo) Android 앱 설계 문서다.

## 목표

`auto/docs/mobile-api.md`에 정의된 FastAPI(`auto-api.service`, 포트 8086)에 붙는 안드로이드 클라이언트를 만든다. 첫 버전(MVP)은 로그인과 읽기 전용 모니터링만 지원한다. 명령 API(`POST /v1/commands/*`)는 범위 밖이며, 이후 버전에서 점진적으로 추가한다.

## 결정 사항 요약

| 항목 | 결정 |
|---|---|
| 기술 스택 | React Native (Expo, Managed Workflow) |
| 언어 | TypeScript |
| MVP 범위 | 로그인 + 읽기 전용 API (`GET /v1/bot/status`, `GET /v1/market/price`, `GET /v1/grid/state`, `GET /v1/grid/summary`, `GET /v1/orders/pending`, `GET /v1/orders/recent`, `GET /v1/pnl/realized`) |
| 프로젝트 위치 | `C:/dev/mobileAuto/mobile-app/` |
| API URL 관리 | `EXPO_PUBLIC_API_BASE` 환경변수, 기본 `http://43.202.113.123:8086` |
| 네비게이션 | Bottom Tabs (대시보드 / 그리드 / 주문 / 손익) |
| 테마 | 다크 고정 |
| 데이터 갱신 | 폴 투 리프레시 + 화면 활성 시 10초 자동 폴링 (손익/최근 주문은 30초) |
| 인증 유지 | Expo SecureStore + refresh_token 자동 재로그인 |

## 대상 독자

운영 서버 1대를 관리하는 1인 운영자. 외부에서도 봇 상태를 빠르게 확인할 필요가 있고, 자산에 영향을 주는 명령은 별도 안전장치를 거쳐 별도 버전에서 도입한다.

## 범위

포함:
- Expo 프로젝트 초기 셋업 (`mobile-app/` 신규 폴더)
- 로그인 화면 (id/비밀번호, 옵션 TOTP)
- 4개 탭의 모니터링 화면
- 토큰 자동 갱신과 자동 재로그인
- 자동 폴링과 pull-to-refresh
- 다크 테마
- 단위 테스트와 수동 검증 절차

범위 밖:
- 명령 API (bot stop/start, reset, adjust-budget, reset-stop-loss)
- 푸시 알림
- iOS 빌드
- 차트/그래프 시각화
- 다국어 지원
- 생체 인증

## 아키텍처

### 폴더 구조

```
mobile-app/
├─ app/                          # expo-router 라우팅
│  ├─ _layout.tsx                # AuthProvider, 테마, 부팅 시퀀스
│  ├─ login.tsx                  # 로그인 화면
│  └─ (tabs)/                    # Bottom Tabs 그룹
│     ├─ _layout.tsx             # 탭 4개 정의
│     ├─ index.tsx               # 대시보드
│     ├─ grid.tsx                # 그리드 슬롯 상세
│     ├─ orders.tsx              # 미체결/최근 주문
│     └─ pnl.tsx                 # 실현 손익
├─ src/
│  ├─ api/
│  │  ├─ client.ts               # fetch wrapper + 토큰 헤더 + 401 시 refresh
│  │  ├─ auth.ts                 # login / refresh / logout
│  │  └─ endpoints.ts            # bot status / grid / orders / pnl
│  ├─ auth/
│  │  ├─ AuthContext.tsx         # 토큰 상태 React Context
│  │  └─ storage.ts              # SecureStore wrapper
│  ├─ hooks/
│  │  └─ useAutoRefresh.ts       # 화면 활성 시 폴링 훅
│  ├─ components/
│  │  ├─ StatCard.tsx            # 대시보드 카드
│  │  ├─ SlotRow.tsx             # 그리드 슬롯 한 줄
│  │  └─ ErrorBanner.tsx
│  ├─ theme/
│  │  └─ colors.ts               # 다크 팔레트 단일 소스
│  └─ utils/
│     └─ format.ts               # 통화/시간 포맷
├─ .env
├─ .env.example
├─ .gitignore
├─ app.config.ts
├─ package.json
└─ tsconfig.json
```

### 데이터 흐름

```
[화면] -> useAutoRefresh / pull-to-refresh
        -> api/endpoints.ts -> api/client.ts (Bearer 토큰)
                                |
                                ├ 200 -> 화면에 표시
                                └ 401 -> auth/refresh -> 재시도 -> 실패 시 로그인 화면
```

### 핵심 원칙

- 라우팅은 `expo-router`(파일 기반). Bottom Tabs는 `(tabs)` 그룹.
- 인증은 단일 `AuthContext`. 토큰은 SecureStore에만 영속, 메모리 캐시(`AuthStore`)가 1차 소스.
- 모든 fetch는 `api/client.ts`를 거쳐 401 → refresh → 한 번 재시도 루프를 통일 처리.
- 화면 컴포넌트는 데이터 패칭 로직을 직접 가지지 않고 `endpoints.ts`의 함수만 호출.
- 상태 관리 라이브러리(redux/zustand)와 데이터 패칭 라이브러리(react-query/swr)는 도입하지 않음. AuthContext + `useAutoRefresh`로 충분.

## API 클라이언트와 토큰 갱신

### `api/client.ts` 책임

1. 메모리 캐시된 `access_token`을 `Authorization: Bearer ...`로 자동 첨부
2. 401 응답 시 한 번만 `refresh_token`으로 새 access token 발급 후 재시도
3. refresh 실패 시 토큰 폐기 + AuthContext에 알려 로그인 화면으로 이동
4. 동시 요청이 401을 받았을 때 refresh를 한 번만 실행하도록 in-flight Promise 공유

### 의사 코드

```ts
let refreshPromise: Promise<string> | null = null;

async function ensureFreshAccessToken(): Promise<string> {
  const access = AuthStore.getAccessToken();
  if (access) return access;
  refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const token = await ensureFreshAccessToken();
  let res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
  if (res.status !== 401) return res;

  AuthStore.clearAccessToken();
  const newToken = await ensureFreshAccessToken();
  res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${newToken}` },
  });
  if (res.status === 401) {
    await AuthStore.clearAll();
    AuthEvents.emit('logout');
    throw new ApiError('session-expired');
  }
  return res;
}
```

### `api/auth.ts`

- `POST /v1/auth/login` → access/refresh 받아 SecureStore에 저장
- `POST /v1/auth/refresh` → 새 access(+ 가능 시 새 refresh) 저장
- `POST /v1/auth/logout` → 서버에 refresh 무효화 통지 후 SecureStore 비움

### `auth/storage.ts`

- `setTokens({access, refresh})`, `getRefreshToken()`, `clearAll()`
- SecureStore 키: `mobile_api.access_token`, `mobile_api.refresh_token`
- access_token은 SecureStore에 영속 저장하되, 만료가 짧으므로 메모리 캐시가 1차 소스

### 부팅 시퀀스 (`app/_layout.tsx`)

1. SecureStore에서 `refresh_token` 읽기 → 없으면 `/login`
2. 있으면 `refreshAccessToken()` 시도
   - 성공 → `/(tabs)` 진입
   - 실패 → SecureStore 비우고 `/login`
3. 부팅 중에는 스플래시(로딩 인디케이터)만 표시

### TOTP 처리

- 현재 운영 `.env`에 `MOBILE_API_TOTP_SECRET`이 없어 TOTP 비활성
- 로그인 화면은 TOTP 입력 칸을 기본 숨김. "TOTP 사용" 토글로 펼치면 입력 가능
- `totp_code`가 비어 있으면 login body에서 키 자체를 제외
- 향후 서버가 TOTP를 켜면 로그인 실패 응답을 기반으로 자동 안내(향후 작업)

### 에러 처리 분류

| 케이스 | 처리 |
|---|---|
| 네트워크 실패 (timeout, DNS) | ErrorBanner: "서버 연결 실패. 다시 시도" + 재시도 버튼 |
| 401 (post-refresh) | 자동 로그아웃 + 로그인 화면 |
| 503 (Upbit 키 미설정 등) | 화면별 부분 에러: "이 데이터는 일시 사용 불가" |
| 5xx 일반 | ErrorBanner: 서버 일시 오류 |
| 4xx 기타 | 응답 body의 `detail`을 그대로 표시 |

## 화면별 데이터 매핑

### 자동 폴링 훅 (`useAutoRefresh`)

화면 진입/포커스 시 폴링, 이탈 시 자동 정지. `useFocusEffect`로 cleanup, `AppState`로 백그라운드 진입 시도 정지.

```ts
function useAutoRefresh<T>(fetcher: () => Promise<T>, intervalMs = 10_000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try { setData(await fetcher()); setError(null); }
    catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, [fetcher]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    load();
    const id = setInterval(() => { if (alive) load(); }, intervalMs);
    return () => { alive = false; clearInterval(id); };
  }, [load, intervalMs]));

  return { data, loading, error, refresh: load };
}
```

### 탭별 endpoint와 폴링 간격

| 탭 | 호출 API | 폴링 | 핵심 표시 |
|---|---|---|---|
| 대시보드 | `GET /v1/bot/status`, `GET /v1/market/price`, `GET /v1/grid/summary`, `GET /v1/pnl/realized?period=d` | 10s | 봇 alive·heartbeat 경과, 현재가, 보유 슬롯 비율, 평단, 오늘 손익, 미체결 카운트 |
| 그리드 | `GET /v1/grid/state` | 10s | 슬롯 리스트: `buy_price` / `planned_qty·planned_buy_krw` / `held_qty·inventory_cost_krw` / `sell_price·effective_sell_price` / `pending_order` 뱃지 |
| 주문 | `GET /v1/orders/pending`, `GET /v1/orders/recent?limit=50` | pending 10s / recent 30s | 상단 미체결 카드, 하단 최근 50개(체결/취소) |
| 손익 | `GET /v1/pnl/realized?period={d\|w\|m\|y\|all}` | 30s | 기간 토글 + 매도주문수·체결건수·순손익 |

### 컴포넌트 패턴

```tsx
export default function Dashboard() {
  const status = useAutoRefresh(getBotStatus, 10_000);
  const price  = useAutoRefresh(getMarketPrice, 10_000);
  const summary = useAutoRefresh(getGridSummary, 10_000);
  const pnl    = useAutoRefresh(() => getPnl('d'), 30_000);

  return (
    <ScrollView refreshControl={<RefreshControl ... onRefresh={refreshAll} />}>
      <StatusHeader status={status.data} price={price.data} />
      <StatCard title="보유" value={summary.data?.held_btc} />
      <StatCard title="오늘 손익" value={pnl.data?.net_krw} />
      <StatCard title="미체결" value={summary.data?.pending_count} />
    </ScrollView>
  );
}
```

- 각 카드는 자체 로딩/에러 상태. 한 API 실패가 다른 카드를 가리지 않음.
- 첫 로딩은 스켈레톤, 갱신 중에는 기존 값을 유지하며 백그라운드 fetch.

### 그리드 슬롯 화면

- `FlatList`로 가상화
- 행 레이아웃: `buy_price | held / planned | sell` 컴팩트
- 행 탭 시 모달로 상세 (`pending_order` uuid·식별자·상태 포함)
- 상단 고정 헤더에 그리드 요약(슬롯 수, 보유 비율)
- 기본 정렬: `buy_price` 내림차순(상단=비싼 슬롯)

### 통화/시간 포맷 (`utils/format.ts`)

| 데이터 | 포맷 예 |
|---|---|
| KRW 금액 | `95,420,000` (천 단위 콤마, 원 기호는 헤더에만) |
| BTC 수량 | `0.04320000` (소수점 8자리 고정) |
| heartbeat 경과 | `12s ago`, `3m ago`, `2h ago` |
| 손익 부호 | `+12,400` 녹색 / `-12,400` 빨강 |

## 의존성

| 패키지 | 용도 |
|---|---|
| `expo` (현재 stable SDK) | Expo SDK |
| `expo-router` | 파일 기반 라우팅 + Bottom Tabs |
| `expo-secure-store` | 토큰 저장 (Android Keystore 백엔드) |
| `expo-status-bar`, `expo-font` | 기본 |
| `react-native-safe-area-context` | 노치/제스처 영역 |
| `@react-navigation/bottom-tabs` | expo-router 의존성 |
| `@expo/vector-icons` | 탭 아이콘 |
| dev: `typescript`, `@types/react` | 타입 |
| dev: `jest-expo`, `@testing-library/react-native` | 테스트 |

## 환경 변수

`mobile-app/.env` (gitignore 대상):
```env
EXPO_PUBLIC_API_BASE=http://43.202.113.123:8086
```

`mobile-app/.env.example` (커밋 대상):
```env
EXPO_PUBLIC_API_BASE=http://<EC2_IP>:8086
```

`EXPO_PUBLIC_` prefix는 Expo 표준 — 런타임 번들에 포함된다.

운영 서버 자격증명(`MOBILE_API_USERNAME`, `MOBILE_API_PASSWORD`)은 앱 코드에 절대 포함하지 않는다. 사용자가 로그인 화면에서 직접 입력한다. 루트 `C:/dev/mobileAuto/.env`의 admin 자격증명은 개발 중 수동 테스트용으로만 사용한다.

## 테스트 전략

### 단위 테스트 (`jest-expo`)

- `api/client.ts`: 401 → refresh → 재시도 / refresh 실패 → logout 이벤트
- `auth/storage.ts`: SecureStore mock으로 set/get/clear
- `utils/format.ts`: 통화·시간 포맷

### 컴포넌트 스모크 (`@testing-library/react-native`)

- 로그인 화면: 잘못된 비밀번호 → 에러 메시지
- 대시보드: mock fetcher로 데이터 표시 확인

### 수동 검증 (실제 운영 API 대상)

- admin 계정 로그인 → 4개 탭 데이터 표시
- 폴링 동작 (10초 후 갱신)
- 토큰 만료 시뮬레이션 (SecureStore에서 `access_token` 삭제) → 자동 refresh 동작
- 비행기 모드 → 에러 배너 → 복귀 시 자동 회복
- APK 빌드(`eas build -p android --profile preview`) 후 실기기 설치 검증

### 검증 절차 (구현 완료 기준)

`mobile-app/` 작업 위치에서:

```powershell
npm install
npx expo start --android      # Android Studio 에뮬레이터로 실행
npm test                      # Jest 통과
npx tsc --noEmit              # 타입 에러 없음
```

기능 체크리스트:

- [ ] 첫 실행 시 로그인 화면 노출
- [ ] admin 계정 로그인 성공 → 대시보드 진입
- [ ] 앱 재시작 시 로그인 화면 안 거치고 자동 진입
- [ ] 4개 탭 데이터 표시 (대시보드/그리드/주문/손익)
- [ ] pull-to-refresh 작동
- [ ] 화면 활성 시 10초마다 자동 갱신
- [ ] 백그라운드 진입 시 폴링 정지
- [ ] 손익 기간 토글 d/w/m/y/all 작동
- [ ] 그리드 슬롯 탭 → 상세 모달
- [ ] 로그아웃 → 토큰 폐기 + 로그인 화면

## 보안 기준

- 운영 자격증명을 코드/저장소에 포함하지 않는다.
- 토큰은 SecureStore(Android Keystore 백엔드)에만 영속 저장한다.
- access_token은 단기(15분)로 운영. 재발급은 refresh로만.
- 현재 API는 HTTP다. 향후 외부 사용 확대 시 HTTPS reverse proxy가 별도 작업으로 필요하다(이번 범위 밖).

## 완료 기준

- `mobile-app/` 폴더에 Expo + TypeScript 프로젝트가 셋업되어 있다.
- 위 검증 절차의 기능 체크리스트가 모두 통과한다.
- 단위 테스트와 타입 검사가 통과한다.
- 실제 운영 API와 통신하여 4개 탭이 데이터를 표시한다.
- 토큰 자동 갱신과 자동 재로그인이 동작한다.

## 향후 작업 (범위 밖)

- 명령 API 통합 (`POST /v1/commands/*`)
- 확인 다이얼로그와 TOTP 강제 (위험 명령)
- 푸시 알림 (체결, 손절)
- 차트/그래프 시각화
- 생체 인증 옵션
- iOS 빌드
