import React, { useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useManualQuery, combineLastUpdated } from '../../src/hooks/useManualQuery';
import { getBotStatus, getMarketPrice, getGridSummary, getPnlRealized, getPendingOrders, getOpenSells } from '../../src/api/endpoints';
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
  const openSells = useManualQuery(getOpenSells);

  const anyError = status.error ?? price.error ?? summary.error ?? pending.error ?? todayPnl.error ?? openSells.error;
  const loading = status.loading || price.loading || summary.loading || pending.loading || todayPnl.loading || openSells.loading;
  const lastUpdatedAt = combineLastUpdated([
    status.lastUpdatedAt, price.lastUpdatedAt, summary.lastUpdatedAt,
    pending.lastUpdatedAt, todayPnl.lastUpdatedAt, openSells.lastUpdatedAt,
  ]);

  const refreshAll = useCallback(() => {
    status.refresh(); price.refresh(); summary.refresh(); pending.refresh(); todayPnl.refresh(); openSells.refresh();
  }, [status, price, summary, pending, todayPnl, openSells]);

  const todayBucket = todayPnl.data?.buckets?.[0];
  const todayNet = todayBucket?.realized_pnl_krw;
  const todayNetNum = todayNet != null ? Number(todayNet) : null;

  const openSellsCount = openSells.data?.summary?.total_count ?? 0;
  const openSellsPnl = openSells.data?.summary?.total_unrealized_krw;
  const openSellsPnlNum = openSellsPnl != null ? Number(openSellsPnl) : null;

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
          loading={summary.loading}
        />
        <StatCard
          label="오늘 손익"
          value={todayNet != null ? formatSigned(todayNet) : '—'}
          tone={
            todayNetNum == null ? 'default'
            : todayNetNum > 0 ? 'positive'
            : todayNetNum < 0 ? 'negative' : 'default'
          }
          loading={todayPnl.loading}
        />
        <StatCard
          label="미체결"
          value={pending.data ? `${pending.data.length}건` : '—'}
          loading={pending.loading}
        />
        <StatCard
          label="매도 대기"
          value={openSellsPnl != null ? formatSigned(openSellsPnl) : '—'}
          subtitle={
            openSells.data
              ? `${openSellsCount}건`
              : undefined
          }
          tone={
            openSellsPnlNum == null ? 'default'
            : openSellsPnlNum > 0 ? 'positive'
            : openSellsPnlNum < 0 ? 'negative' : 'default'
          }
          loading={openSells.loading}
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
