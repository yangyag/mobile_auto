# 자동 조회 → 수동 조회 버튼 전환 설계

날짜: 2026-05-21

## 배경 / 문제

현재 앱의 모든 탭 화면(`index`, `grid`, `orders`, `pnl`)은 공용 훅 `useAutoRefresh`를
사용해 다음 3가지 자동 동작을 수행한다.

1. 화면 진입 시(`useFocusEffect`) 자동 조회
2. N초마다 폴링(`setInterval`, 10초 또는 30초)
3. 앱이 foreground로 복귀할 때(`AppState`) 재조회

자동 조회는 편하지만 **메뉴 이동이 불편하다.** 메뉴를 클릭하면 조회가 끝날 때까지
(약 5초) 기다려야 다른 메뉴로 매끄럽게 넘어갈 수 있다.

## 목표

조회 시점을 사용자가 직접 제어한다. 메뉴 진입은 즉시 이루어지고, 데이터는
사용자가 **조회 버튼**을 눌렀을 때만 갱신된다.

## 확정된 동작 규칙

- **완전 수동**: 화면 진입 시 자동 조회하지 않는다. 조회 버튼을 눌러야만 데이터가 뜬다.
  - 폴링·foreground 재조회도 모두 제거한다.
  - 한 번 조회한 화면은 다시 들어가도 이전 데이터를 그대로 보여준다(탭 화면은
    mount 상태가 유지되므로 state가 보존된다).
- **손익 화면 기간 탭**: 오늘/이번주/이번달/올해/전체 탭을 누르면 `period` 선택값만
  바뀌고 조회는 하지 않는다. 조회 버튼을 눌러야 해당 기간을 조회한다.
- **당겨서 새로고침(pull-to-refresh) 유지**: `RefreshControl`은 그대로 둔다.
  사용자가 직접 트리거하는 수동 방식이라 "5초 대기" 불편함과 무관하다.
  조회 버튼과 당겨서 새로고침 둘 다 사용 가능하다.

## 구현 방식

기존 `useAutoRefresh`를 수동 조회 훅으로 교체하고, 화면별로 동일하게 쓰는
`QueryBar` 컴포넌트를 화면 상단에 배치한다(접근 방식 A).

### 1. 훅 교체 — `useManualQuery`

`src/hooks/useAutoRefresh.ts` → `src/hooks/useManualQuery.ts`로 교체.

- `useFocusEffect`, `setInterval`, `AppState` 리스너를 **전부 제거**한다.
- `intervalMs` 인자를 제거한다. 시그니처: `useManualQuery<T>(fetcher: () => Promise<T>)`.
- 반환값: `{ data, loading, error, refresh, lastUpdatedAt }`
  - `data: T | null` — 첫 조회 전에는 `null`.
  - `loading: boolean` — 조회가 진행 중일 때만 `true`. 초기값 `false`.
    (기존의 `loading`/`refreshing` 구분은 불필요해 `loading` 하나로 통합한다.)
  - `error: Error | null`
  - `refresh: () => void` — 조회를 트리거하는 함수.
  - `lastUpdatedAt: number | null` — 마지막 **성공** 조회 시각(`Date.now()`).
    수동 모드에서는 데이터가 stale해질 수 있으므로 사용자에게 노출한다.
- `aliveRef` 패턴(언마운트 후 setState 방지)은 `useManualQuery` 내부 `useEffect`
  cleanup으로 유지한다.

### 2. 공용 컴포넌트 — `QueryBar`

신규 파일 `src/components/QueryBar.tsx`.

- props: `{ onQuery: () => void; loading: boolean; lastUpdatedAt: number | null }`
- 화면 상단 고정 행. 구성:
  - `[ 조회 ]` 버튼 (`Pressable`). `loading`이면 비활성화(`disabled`) +
    텍스트를 "조회 중..."으로, 흐리게 표시.
  - 마지막 조회 시각 텍스트: `lastUpdatedAt`이 있으면 "마지막 조회: HH:MM:SS",
    없으면 "조회 전".
- 스타일은 `colors` 테마(`accent`, `surface`, `textMuted` 등)를 따른다.

### 3. 화면별 수정 (4개)

각 화면 공통:
- `useAutoRefresh` import → `useManualQuery`로 교체.
- 화면 상단(헤더 영역 또는 그 바로 아래)에 `QueryBar` 추가.
- `QueryBar`의 `onQuery`에 해당 화면의 조회 함수를 연결한다. 화면 안에
  쿼리가 여러 개면 한 버튼이 전부 동시에 조회한다.
- `loading` prop은 화면 내 쿼리들의 `loading` OR 결합값.
- `lastUpdatedAt` prop은 화면 내 쿼리들 중 가장 이른(min) 값 — 모두 조회됐을 때만
  시각이 뜨도록. (쿼리가 1개인 화면은 그 값 그대로.)
- 첫 조회 전 빈 상태 문구를 "로딩 중..." → **"조회 버튼을 눌러주세요"**로 변경.

화면별 세부:

- **`app/(tabs)/index.tsx`** (대시보드): 쿼리 5개
  (`getBotStatus`, `getMarketPrice`, `getGridSummary`, `getPendingOrders`,
  `getPnlRealized('d')`). 기존 `refreshAll`을 `QueryBar.onQuery`에 연결.
  각 `StatCard`의 `loading` prop은 `loading && !data` 패턴 유지.
- **`app/(tabs)/grid.tsx`**: 쿼리 1개(`getGridState`). `ListEmptyComponent`의
  "로딩 중..." 분기를 "조회 버튼을 눌러주세요"로 변경(첫 조회 전).
- **`app/(tabs)/orders.tsx`**: 쿼리 2개(`getPendingOrders`, `getRecentOrders(50)`).
  기존 `refreshAll`을 `QueryBar.onQuery`에 연결. 화면에 헤더가 없으므로
  `SectionList` 위에 `QueryBar`를 둔다.
- **`app/(tabs)/pnl.tsx`**: 쿼리 1개. 기간 탭 `onPress`는 `setPeriod`만 호출
  (이미 그러함 — 추가 조회 트리거를 넣지 않음). `QueryBar.onQuery`에 `pnl.refresh`
  연결. 빈 상태 "로딩 중..."을 "조회 버튼을 눌러주세요"로 변경.

### 4. 테스트

`src/hooks/useAutoRefresh.test.tsx` → `src/hooks/useManualQuery.test.tsx`로 교체.

- 검증 항목:
  - 마운트 시 자동 조회하지 **않는다**(`fetcher`가 호출되지 않음).
  - `refresh()` 호출 시 `fetcher`가 호출되고 `data`가 채워진다.
  - 조회 중에는 `loading`이 `true`, 완료 후 `false`.
  - `fetcher`가 throw하면 `error` 상태가 된다.
  - 성공 조회 후 `lastUpdatedAt`이 설정된다.
- `expo-router` mock과 fake timer는 더 이상 필요 없으므로 제거한다.

## 영향 범위

- 신규: `src/hooks/useManualQuery.ts`, `src/hooks/useManualQuery.test.tsx`,
  `src/components/QueryBar.tsx`
- 삭제: `src/hooks/useAutoRefresh.ts`, `src/hooks/useAutoRefresh.test.tsx`
- 수정: `app/(tabs)/index.tsx`, `grid.tsx`, `orders.tsx`, `pnl.tsx`

## 비목표 (YAGNI)

- 자동 폴링을 옵션으로 남기지 않는다(완전 제거).
- 화면별 조회 버튼을 쿼리 단위로 쪼개지 않는다(화면당 1개 버튼).
- stale 데이터 자동 만료/경고 배지는 만들지 않는다("마지막 조회: HH:MM:SS"
  표기로 충분).
