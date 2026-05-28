import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useManualQuery } from '../../src/hooks/useManualQuery';
import { getPnlRealized, PnlPeriod } from '../../src/api/endpoints';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { StatCard } from '../../src/components/StatCard';
import { QueryBar } from '../../src/components/QueryBar';
import { colors } from '../../src/theme/colors';
import { formatBtc, formatSigned, getBaseCurrency } from '../../src/utils/format';

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
        {pnl.loading || pnl.data ? (
          bucket || pnl.loading ? (
            <>
              {bucket?.key && !pnl.loading ? <Text style={styles.range}>{bucket.key}</Text> : null}
              <StatCard
                label="순손익"
                value={bucket ? formatSigned(bucket.realized_pnl_krw) : '—'}
                tone={
                  realizedNum == null ? 'default'
                  : realizedNum > 0 ? 'positive'
                  : realizedNum < 0 ? 'negative' : 'default'
                }
                loading={pnl.loading}
              />
              <StatCard
                label={`매수/매도 ${getBaseCurrency(pnl.data?.market ?? 'KRW-USDT')}`}
                value={bucket ? formatBtc(bucket.matched_qty_btc, pnl.data?.market ?? 'KRW-USDT') : '—'}
                loading={pnl.loading}
              />
              <StatCard
                label="주문 수"
                value={bucket ? String(bucket.order_count) : '—'}
                loading={pnl.loading}
              />
              <StatCard
                label="체결 건수"
                value={bucket ? String(bucket.trade_count) : '—'}
                loading={pnl.loading}
              />
            </>
          ) : (
            <Text style={styles.loading}>해당 기간 손익 없음</Text>
          )
        ) : (
          <Text style={styles.loading}>조회 버튼을 눌러주세요</Text>
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
