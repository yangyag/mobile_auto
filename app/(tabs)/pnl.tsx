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
