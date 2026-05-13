import React, { useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, SectionList } from 'react-native';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { getPendingOrders, getRecentOrders } from '../../src/api/endpoints';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { colors } from '../../src/theme/colors';
import { formatKrw, formatBtc, formatRelativeTime } from '../../src/utils/format';
import { PendingOrder, RecentOrder } from '../../src/api/types';

export default function OrdersScreen() {
  const pending = useAutoRefresh(getPendingOrders, 10_000);
  const recent = useAutoRefresh(useCallback(() => getRecentOrders(50), []), 30_000);

  const refreshing = pending.refreshing || recent.refreshing;
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
        keyExtractor={(item, index) => `${item.uuid}:${index}`}
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
