# 자동 조회 → 수동 조회 버튼 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 탭 화면의 자동 조회(진입 시 조회·폴링·foreground 재조회)를 제거하고, 사용자가 조회 버튼을 눌렀을 때만 데이터를 조회하도록 전환한다.

**Architecture:** 공용 훅 `useAutoRefresh`를 자동 동작이 없는 `useManualQuery`로 교체한다. 화면 상단에 공용 `QueryBar`(조회 버튼 + 마지막 조회 시각)를 두고, 각 화면의 조회 함수를 버튼에 연결한다. 당겨서 새로고침(`RefreshControl`)은 유지한다.

**Tech Stack:** React Native 0.81, Expo Router 6, TypeScript, Jest + @testing-library/react-native (jest-expo preset).

---

## File Structure

- **신규** `src/hooks/useManualQuery.ts` — 수동 조회 훅 + `combineLastUpdated` 헬퍼.
- **신규** `src/hooks/useManualQuery.test.tsx` — 훅 단위 테스트.
- **신규** `src/components/QueryBar.tsx` — 조회 버튼 + 마지막 조회 시각 표시 행.
- **신규** `src/components/QueryBar.test.tsx` — QueryBar 단위 테스트.
- **수정** `app/(tabs)/index.tsx`, `app/(tabs)/grid.tsx`, `app/(tabs)/orders.tsx`, `app/(tabs)/pnl.tsx` — 훅 교체 + QueryBar 배치 + 빈 상태 문구 변경.
- **삭제** `src/hooks/useAutoRefresh.ts`, `src/hooks/useAutoRefresh.test.tsx` — 모든 화면 마이그레이션 후 마지막 태스크에서 제거.

기존 `useAutoRefresh` 파일은 Task 1~6 동안 그대로 둔다(중간 커밋이 항상 컴파일되도록). Task 7에서 삭제한다.

---

### Task 1: `useManualQuery` 훅

**Files:**
- Create: `src/hooks/useManualQuery.ts`
- Test: `src/hooks/useManualQuery.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/hooks/useManualQuery.test.tsx`:

```tsx
import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { useManualQuery, combineLastUpdated } from './useManualQuery';

function Harness({ fetcher }: { fetcher: () => Promise<number> }) {
  const { data, loading, error, refresh, lastUpdatedAt } = useManualQuery(fetcher);
  return (
    <>
      <Text testID="loading">{loading ? '1' : '0'}</Text>
      <Text testID="data">{data == null ? '-' : String(data)}</Text>
      <Text testID="error">{error?.message ?? ''}</Text>
      <Text testID="updated">{lastUpdatedAt == null ? '-' : 'set'}</Text>
      <Pressable testID="btn" onPress={refresh}><Text>go</Text></Pressable>
    </>
  );
}

describe('useManualQuery', () => {
  it('마운트만으로는 조회하지 않는다', async () => {
    const fetcher = jest.fn().mockResolvedValue(42);
    const view = render(<Harness fetcher={fetcher} />);
    await act(async () => {});
    expect(fetcher).not.toHaveBeenCalled();
    expect(view.getByTestId('data').props.children).toBe('-');
  });

  it('refresh 호출 시 조회되고 data·lastUpdatedAt이 채워진다', async () => {
    const fetcher = jest.fn().mockResolvedValue(42);
    const view = render(<Harness fetcher={fetcher} />);
    await act(async () => { fireEvent.press(view.getByTestId('btn')); });
    await waitFor(() => expect(view.getByTestId('data').props.children).toBe('42'));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('updated').props.children).toBe('set');
  });

  it('조회 중에는 loading이 true, 완료 후 false', async () => {
    let resolve: ((v: number) => void) | null = null;
    const fetcher = jest.fn().mockImplementation(
      () => new Promise<number>((r) => { resolve = r; }),
    );
    const view = render(<Harness fetcher={fetcher} />);
    await act(async () => { fireEvent.press(view.getByTestId('btn')); });
    await waitFor(() => expect(view.getByTestId('loading').props.children).toBe('1'));
    await act(async () => { resolve!(7); });
    await waitFor(() => expect(view.getByTestId('loading').props.children).toBe('0'));
  });

  it('fetcher가 throw하면 error 상태', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));
    const view = render(<Harness fetcher={fetcher} />);
    await act(async () => { fireEvent.press(view.getByTestId('btn')); });
    await waitFor(() => expect(view.getByTestId('error').props.children).toBe('boom'));
  });
});

describe('combineLastUpdated', () => {
  it('하나라도 null이면 null', () => {
    expect(combineLastUpdated([100, null, 300])).toBeNull();
  });
  it('모두 값이 있으면 가장 이른 값', () => {
    expect(combineLastUpdated([300, 100, 200])).toBe(100);
  });
  it('빈 배열이면 null', () => {
    expect(combineLastUpdated([])).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- useManualQuery`
Expected: FAIL — `Cannot find module './useManualQuery'`.

- [ ] **Step 3: 훅 구현**

Create `src/hooks/useManualQuery.ts`:

```ts
import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 수동 조회 훅. 마운트/포커스/폴링으로 자동 조회하지 않는다.
 * refresh()를 호출했을 때만 fetcher를 실행한다.
 */
export function useManualQuery<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetcher();
      if (aliveRef.current) {
        setData(next);
        setError(null);
        setLastUpdatedAt(Date.now());
      }
    } catch (e) {
      if (aliveRef.current) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [fetcher]);

  return { data, loading, error, refresh, lastUpdatedAt };
}

/**
 * 여러 쿼리의 lastUpdatedAt을 합친다.
 * 하나라도 아직 조회 전(null)이면 null, 모두 조회됐으면 가장 이른 시각.
 */
export function combineLastUpdated(values: (number | null)[]): number | null {
  if (values.length === 0) return null;
  if (values.some((v) => v == null)) return null;
  return Math.min(...(values as number[]));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- useManualQuery`
Expected: PASS — 7개 테스트 모두 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/hooks/useManualQuery.ts src/hooks/useManualQuery.test.tsx
git commit -m "feat: 수동 조회 훅 useManualQuery 추가"
```

---

### Task 2: `QueryBar` 컴포넌트

**Files:**
- Create: `src/components/QueryBar.tsx`
- Test: `src/components/QueryBar.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/components/QueryBar.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryBar } from './QueryBar';

describe('QueryBar', () => {
  it('조회 전에는 "조회 전" 표시', () => {
    const view = render(
      <QueryBar onQuery={() => {}} loading={false} lastUpdatedAt={null} />,
    );
    expect(view.getByText('조회 전')).toBeTruthy();
  });

  it('lastUpdatedAt이 있으면 HH:MM:SS 시각 표시', () => {
    const ts = new Date(2026, 4, 21, 9, 5, 3).getTime();
    const view = render(
      <QueryBar onQuery={() => {}} loading={false} lastUpdatedAt={ts} />,
    );
    expect(view.getByText('마지막 조회: 09:05:03')).toBeTruthy();
  });

  it('버튼을 누르면 onQuery 호출', () => {
    const onQuery = jest.fn();
    const view = render(
      <QueryBar onQuery={onQuery} loading={false} lastUpdatedAt={null} />,
    );
    fireEvent.press(view.getByText('조회'));
    expect(onQuery).toHaveBeenCalledTimes(1);
  });

  it('loading이면 "조회 중..."을 표시하고 눌러도 onQuery 미호출', () => {
    const onQuery = jest.fn();
    const view = render(
      <QueryBar onQuery={onQuery} loading={true} lastUpdatedAt={null} />,
    );
    fireEvent.press(view.getByText('조회 중...'));
    expect(onQuery).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- QueryBar`
Expected: FAIL — `Cannot find module './QueryBar'`.

- [ ] **Step 3: 컴포넌트 구현**

Create `src/components/QueryBar.tsx`:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  onQuery: () => void;
  loading: boolean;
  lastUpdatedAt: number | null;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function QueryBar({ onQuery, loading, lastUpdatedAt }: Props) {
  return (
    <View style={styles.bar}>
      <Text style={styles.status}>
        {lastUpdatedAt != null ? `마지막 조회: ${formatTime(lastUpdatedAt)}` : '조회 전'}
      </Text>
      <Pressable
        onPress={onQuery}
        disabled={loading}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{loading ? '조회 중...' : '조회'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  status: { color: colors.textMuted, fontSize: 11 },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.accent,
    borderRadius: 6,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.bg, fontSize: 13, fontWeight: '600' },
});
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- QueryBar`
Expected: PASS — 4개 테스트 모두 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/components/QueryBar.tsx src/components/QueryBar.test.tsx
git commit -m "feat: 조회 버튼 컴포넌트 QueryBar 추가"
```

---

### Task 3: 대시보드 화면(`index.tsx`) 마이그레이션

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: 화면 전체 교체**

`app/(tabs)/index.tsx` 전체를 아래 내용으로 교체:

```tsx
import React, { useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useManualQuery, combineLastUpdated } from '../../src/hooks/useManualQuery';
import { getBotStatus, getMarketPrice, getGridSummary, getPnlRealized, getPendingOrders } from '../../src/api/endpoints';
import { StatCard } from '../../src/components/StatCard';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { QueryBar } from '../../src/components/QueryBar';
import { colors } from '../../src/theme/colors';
import { formatKrw, formatBtc, formatRelativeTime, formatSigned } from '../../src/utils/format';
import { useAuth } from '../../src/auth/AuthContext';

export default function Dashboard() {
  const { logout } = useAuth();
  const status = useManualQuery(getBotStatus);
  const price = useManualQuery(getMarketPrice);
  const summary = useManualQuery(getGridSummary);
  const pending = useManualQuery(getPendingOrders);
  const todayPnl = useManualQuery(useCallback(() => getPnlRealized('d'), []));

  const anyError = status.error ?? price.error ?? summary.error ?? pending.error ?? todayPnl.error;
  const loading = status.loading || price.loading || summary.loading || pending.loading || todayPnl.loading;
  const lastUpdatedAt = combineLastUpdated([
    status.lastUpdatedAt, price.lastUpdatedAt, summary.lastUpdatedAt,
    pending.lastUpdatedAt, todayPnl.lastUpdatedAt,
  ]);

  const refreshAll = useCallback(() => {
    status.refresh(); price.refresh(); summary.refresh(); pending.refresh(); todayPnl.refresh();
  }, [status, price, summary, pending, todayPnl]);

  const todayBucket = todayPnl.data?.buckets?.[0];
  const todayNet = todayBucket?.realized_pnl_krw;
  const todayNetNum = todayNet != null ? Number(todayNet) : null;

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshAll} tintColor={colors.accent} />}
    >
      <QueryBar onQuery={refreshAll} loading={loading} lastUpdatedAt={lastUpdatedAt} />

      <View style={styles.header}>
        <Text style={styles.symbol}>KRW-BTC</Text>
        <Text style={styles.price}>{price.data ? formatKrw(price.data.price) : '—'}</Text>
        <Text style={styles.heartbeat}>
          {status.data
            ? (status.data.is_alive ? '봇 Alive' : '봇 정지')
            : '—'}
          {status.data?.last_heartbeat_at
            ? ` · ${formatRelativeTime(Date.parse(status.data.last_heartbeat_at))}`
            : ''}
        </Text>
      </View>

      {anyError ? <ErrorBanner message={anyError.message} onRetry={refreshAll} /> : null}

      <View style={styles.body}>
        <StatCard
          label="보유"
          value={summary.data ? formatBtc(summary.data.total_inventory_btc) : '—'}
          subtitle={
            summary.data
              ? `${summary.data.holding_count}/${summary.data.row_count} 슬롯 · 평단 ${formatKrw(summary.data.avg_buy_price)}`
              : undefined
          }
          loading={summary.loading && !summary.data}
        />
        <StatCard
          label="오늘 손익"
          value={todayNet != null ? formatSigned(todayNet) : '—'}
          tone={
            todayNetNum == null ? 'default'
            : todayNetNum > 0 ? 'positive'
            : todayNetNum < 0 ? 'negative' : 'default'
          }
          loading={todayPnl.loading && !todayPnl.data}
        />
        <StatCard
          label="미체결"
          value={pending.data ? `${pending.data.length}건` : '—'}
          loading={pending.loading && !pending.data}
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

변경 요점: `useAutoRefresh`→`useManualQuery`(인터벌 인자 제거), `refreshing`→`loading` 결합값, `QueryBar` 추가, 봇 상태 텍스트는 조회 전 `—` 표시.

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: 에러 없음 (exit 0).

- [ ] **Step 3: 커밋**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "feat: 대시보드 수동 조회 전환"
```

---

### Task 4: 그리드 화면(`grid.tsx`) 마이그레이션

**Files:**
- Modify: `app/(tabs)/grid.tsx`

- [ ] **Step 1: 화면 전체 교체**

`app/(tabs)/grid.tsx` 전체를 아래 내용으로 교체:

```tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Modal, Pressable, ScrollView,
} from 'react-native';
import { useManualQuery } from '../../src/hooks/useManualQuery';
import { getGridState } from '../../src/api/endpoints';
import { SlotRow } from '../../src/components/SlotRow';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { QueryBar } from '../../src/components/QueryBar';
import { colors } from '../../src/theme/colors';
import { GridSlot } from '../../src/api/types';
import { formatKrw, formatBtc } from '../../src/utils/format';

export default function GridScreen() {
  const grid = useManualQuery(getGridState);
  const [selected, setSelected] = useState<GridSlot | null>(null);

  const sorted = (grid.data?.slots ?? []).slice().sort((a, b) => Number(b.buy_price) - Number(a.buy_price));
  const heldCount = sorted.filter((s) => Number(s.held_qty) > 0).length;

  const onClose = useCallback(() => setSelected(null), []);

  return (
    <View style={styles.root}>
      <QueryBar onQuery={grid.refresh} loading={grid.loading} lastUpdatedAt={grid.lastUpdatedAt} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>슬롯 {sorted.length}개 · 보유 {heldCount}</Text>
      </View>
      {grid.error ? <ErrorBanner message={grid.error.message} onRetry={grid.refresh} /> : null}
      <FlatList
        data={sorted}
        keyExtractor={(s) => String(s.slot_index)}
        renderItem={({ item }) => <SlotRow slot={item} onPress={setSelected} />}
        refreshControl={<RefreshControl refreshing={grid.loading} onRefresh={grid.refresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          grid.loading ? <Text style={styles.empty}>조회 중...</Text>
          : grid.lastUpdatedAt == null ? <Text style={styles.empty}>조회 버튼을 눌러주세요</Text>
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
                      <DetailRow k="order_id" v={selected.pending_order.order_id} />
                      <DetailRow k="side" v={selected.pending_order.side} />
                      <DetailRow k="status" v={selected.pending_order.status} />
                      <DetailRow k="price" v={formatKrw(selected.pending_order.price ?? 0)} />
                      <DetailRow k="quantity" v={formatBtc(selected.pending_order.quantity ?? 0)} />
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

변경 요점: `useAutoRefresh`→`useManualQuery`, `QueryBar` 추가, `RefreshControl`의 `grid.refreshing`→`grid.loading`, 빈 상태에 "조회 버튼을 눌러주세요" 분기 추가.

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: 에러 없음 (exit 0).

- [ ] **Step 3: 커밋**

```bash
git add "app/(tabs)/grid.tsx"
git commit -m "feat: 그리드 화면 수동 조회 전환"
```

---

### Task 5: 주문 화면(`orders.tsx`) 마이그레이션

**Files:**
- Modify: `app/(tabs)/orders.tsx`

- [ ] **Step 1: 화면 전체 교체**

`app/(tabs)/orders.tsx` 전체를 아래 내용으로 교체:

```tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, SectionList } from 'react-native';
import { useManualQuery, combineLastUpdated } from '../../src/hooks/useManualQuery';
import { getPendingOrders, getRecentOrders } from '../../src/api/endpoints';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { QueryBar } from '../../src/components/QueryBar';
import { colors } from '../../src/theme/colors';
import { formatKrw, formatBtc, formatRelativeTime } from '../../src/utils/format';
import { PendingOrder, RecentOrder } from '../../src/api/types';

export default function OrdersScreen() {
  const pending = useManualQuery(getPendingOrders);
  const recent = useManualQuery(useCallback(() => getRecentOrders(50), []));

  const loading = pending.loading || recent.loading;
  const lastUpdatedAt = combineLastUpdated([pending.lastUpdatedAt, recent.lastUpdatedAt]);
  const refreshAll = useCallback(() => { pending.refresh(); recent.refresh(); }, [pending, recent]);

  const sections = [
    { title: `미체결 (${pending.data?.length ?? 0})`, data: pending.data ?? [] },
    { title: '최근 50건', data: (recent.data ?? []) as (PendingOrder | RecentOrder)[] },
  ];

  return (
    <View style={styles.root}>
      <QueryBar onQuery={refreshAll} loading={loading} lastUpdatedAt={lastUpdatedAt} />
      {(pending.error || recent.error) ? (
        <ErrorBanner message={(pending.error ?? recent.error)!.message} onRetry={refreshAll} />
      ) : null}
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.order_id}:${index}`}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => <OrderRow order={item} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshAll} tintColor={colors.accent} />}
        ListEmptyComponent={
          loading ? <Text style={styles.empty}>조회 중...</Text>
          : lastUpdatedAt == null ? <Text style={styles.empty}>조회 버튼을 눌러주세요</Text>
          : <Text style={styles.empty}>주문 없음</Text>
        }
      />
    </View>
  );
}

function OrderRow({ order }: { order: PendingOrder | RecentOrder }) {
  const isAsk = order.side === 'SELL';
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.side, { color: isAsk ? colors.negative : colors.positive }]}>
          {order.side} · {order.status}
        </Text>
        <Text style={styles.meta}>
          {order.price != null ? formatKrw(order.price) : 'market'}
          {' · '}
          {order.quantity != null ? formatBtc(order.quantity) : '-'}
        </Text>
      </View>
      <Text style={styles.time}>
        {order.created_at ? formatRelativeTime(Date.parse(order.created_at)) : ''}
      </Text>
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

변경 요점: `useAutoRefresh`→`useManualQuery`, `refreshing` 결합값을 `loading`으로, `combineLastUpdated`로 `lastUpdatedAt` 계산, `QueryBar` 추가, 빈 상태에 "조회 버튼을 눌러주세요" 분기 추가.

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: 에러 없음 (exit 0).

- [ ] **Step 3: 커밋**

```bash
git add "app/(tabs)/orders.tsx"
git commit -m "feat: 주문 화면 수동 조회 전환"
```

---

### Task 6: 손익 화면(`pnl.tsx`) 마이그레이션

**Files:**
- Modify: `app/(tabs)/pnl.tsx`

- [ ] **Step 1: 화면 전체 교체**

`app/(tabs)/pnl.tsx` 전체를 아래 내용으로 교체:

```tsx
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useManualQuery } from '../../src/hooks/useManualQuery';
import { getPnlRealized, PnlPeriod } from '../../src/api/endpoints';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { StatCard } from '../../src/components/StatCard';
import { QueryBar } from '../../src/components/QueryBar';
import { colors } from '../../src/theme/colors';
import { formatBtc, formatSigned } from '../../src/utils/format';

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
  const pnl = useManualQuery(fetcher);

  const bucket = pnl.data?.buckets?.[0];
  const realizedNum = bucket ? Number(bucket.realized_pnl_krw) : null;

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={pnl.loading} onRefresh={pnl.refresh} tintColor={colors.accent} />}
    >
      <QueryBar onQuery={pnl.refresh} loading={pnl.loading} lastUpdatedAt={pnl.lastUpdatedAt} />

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
          bucket ? (
            <>
              <Text style={styles.range}>{bucket.key}</Text>
              <StatCard
                label="순손익"
                value={formatSigned(bucket.realized_pnl_krw)}
                tone={
                  realizedNum == null ? 'default'
                  : realizedNum > 0 ? 'positive'
                  : realizedNum < 0 ? 'negative' : 'default'
                }
              />
              <StatCard label="매수/매도 BTC" value={formatBtc(bucket.matched_qty_btc)} />
              <StatCard label="주문 수" value={String(bucket.order_count)} />
              <StatCard label="체결 건수" value={String(bucket.trade_count)} />
            </>
          ) : (
            <Text style={styles.loading}>해당 기간 손익 없음</Text>
          )
        ) : (
          <Text style={styles.loading}>
            {pnl.loading ? '조회 중...' : '조회 버튼을 눌러주세요'}
          </Text>
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

변경 요점: `useAutoRefresh`→`useManualQuery`, `RefreshControl`의 `pnl.refreshing`→`pnl.loading`, `QueryBar` 추가, 빈 상태 문구를 조회 전 "조회 버튼을 눌러주세요"로 분기. 기간 탭 `onPress`는 `setPeriod`만 호출(조회 트리거 없음 — 기존과 동일).

- [ ] **Step 2: 타입 체크**

Run: `npm run typecheck`
Expected: 에러 없음 (exit 0).

- [ ] **Step 3: 커밋**

```bash
git add "app/(tabs)/pnl.tsx"
git commit -m "feat: 손익 화면 수동 조회 전환"
```

---

### Task 7: 구 `useAutoRefresh` 제거 및 전체 검증

**Files:**
- Delete: `src/hooks/useAutoRefresh.ts`
- Delete: `src/hooks/useAutoRefresh.test.tsx`

- [ ] **Step 1: 잔존 참조 확인**

Run: `grep -rn "useAutoRefresh" app src`
Expected: 출력 없음 (모든 화면이 이미 `useManualQuery`로 전환됨). 만약 참조가 남아 있으면 해당 화면을 먼저 마이그레이션할 것.

- [ ] **Step 2: 구 파일 삭제**

```bash
git rm src/hooks/useAutoRefresh.ts src/hooks/useAutoRefresh.test.tsx
```

- [ ] **Step 3: 전체 테스트**

Run: `npm test`
Expected: PASS — `useManualQuery`, `QueryBar` 및 기존 테스트(`client`, `storage`, `format`) 모두 통과. `useAutoRefresh` 테스트는 더 이상 존재하지 않음.

- [ ] **Step 4: 타입 체크**

Run: `npm run typecheck`
Expected: 에러 없음 (exit 0).

- [ ] **Step 5: 린트**

Run: `npm run lint`
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "refactor: 자동 조회 훅 useAutoRefresh 제거"
```

---

## Self-Review

**Spec coverage:**
- 완전 수동(진입 자동조회·폴링·foreground 재조회 제거) → Task 1 (`useManualQuery`에서 `useFocusEffect`/`setInterval`/`AppState` 미포함), Task 3~6 (각 화면 훅 교체).
- `QueryBar`(조회 버튼 + 마지막 조회 시각) → Task 2, Task 3~6에서 배치.
- 손익 기간 탭은 선택값만 변경 → Task 6 (`onPress`가 `setPeriod`만 호출).
- 당겨서 새로고침 유지 → Task 3~6에서 `RefreshControl` 유지.
- 첫 조회 전 "조회 버튼을 눌러주세요" → Task 4·5·6의 빈 상태 분기, Task 3은 헤더/StatCard가 `—` 표시.
- 테스트 교체 → Task 1 (신규 테스트), Task 7 (구 테스트 삭제).
- 신규/삭제/수정 파일 → 모두 태스크에 포함.

**Placeholder scan:** 모든 스텝에 실제 코드/명령/기대 출력 포함. 플레이스홀더 없음.

**Type consistency:** `useManualQuery`는 `{ data, loading, error, refresh, lastUpdatedAt }` 반환 — Task 3~6에서 동일 속성명 사용. `combineLastUpdated(values: (number|null)[]): number|null` — Task 3·5에서 동일 시그니처로 호출. `QueryBar` props `{ onQuery, loading, lastUpdatedAt }` — Task 3~6에서 동일하게 전달.
