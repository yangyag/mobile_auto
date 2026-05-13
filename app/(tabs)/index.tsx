import React, { useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { getBotStatus, getMarketPrice, getGridSummary, getPnlRealized, getPendingOrders } from '../../src/api/endpoints';
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
  const pending = useAutoRefresh(getPendingOrders, 10_000);
  const todayPnl = useAutoRefresh(useCallback(() => getPnlRealized('d'), []), 30_000);

  const anyError = status.error ?? price.error ?? summary.error ?? pending.error ?? todayPnl.error;
  const refreshing = status.refreshing || price.refreshing || summary.refreshing || pending.refreshing || todayPnl.refreshing;

  const refreshAll = useCallback(() => {
    status.refresh(); price.refresh(); summary.refresh(); pending.refresh(); todayPnl.refresh();
  }, [status, price, summary, pending, todayPnl]);

  const todayBucket = todayPnl.data?.buckets?.[0];
  const todayNet = todayBucket?.realized_pnl_krw;
  const todayNetNum = todayNet != null ? Number(todayNet) : null;

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
