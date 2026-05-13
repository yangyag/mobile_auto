import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { getPnlRealized, PnlPeriod } from '../../src/api/endpoints';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { StatCard } from '../../src/components/StatCard';
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
  const pnl = useAutoRefresh(fetcher, 30_000);

  const bucket = pnl.data?.buckets?.[0];
  const realizedNum = bucket ? Number(bucket.realized_pnl_krw) : null;

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={pnl.refreshing} onRefresh={pnl.refresh} tintColor={colors.accent} />}
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
