import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable, Modal, useWindowDimensions } from 'react-native';
import { useManualQuery, combineLastUpdated } from '../../src/hooks/useManualQuery';
import { getBotStatus, getMarketPrice, getGridSummary, getPnlRealized, getPendingOrders, getOpenSells } from '../../src/api/endpoints';
import { StatCard } from '../../src/components/StatCard';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { QueryBar } from '../../src/components/QueryBar';
import { colors } from '../../src/theme/colors';
import { formatKrw, formatBtc, formatRelativeTime, formatSigned, getBaseCurrency } from '../../src/utils/format';
import { useAuth } from '../../src/auth/AuthContext';

export default function Dashboard() {
  const { logout } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const [detailsVisible, setDetailsVisible] = useState(false);
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

  const symbol = price.data?.symbol ?? status.data?.symbol ?? summary.data?.symbol ?? 'KRW-USDT';
  const baseCurrency = getBaseCurrency(symbol);

  const openSellRows = (openSells.data?.rows ?? []).slice().sort((a, b) => (a.slot_index ?? Infinity) - (b.slot_index ?? Infinity));

  return (
    <>
      <ScrollView
        style={styles.root}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshAll} tintColor={colors.accent} />}
      >
        <QueryBar onQuery={refreshAll} loading={loading} lastUpdatedAt={lastUpdatedAt} />

        <View style={styles.header}>
          <Text style={styles.symbol}>{symbol}</Text>
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
            label={`보유 (${baseCurrency})`}
            value={summary.data ? formatBtc(summary.data.total_inventory_btc, symbol) : '—'}
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
            onPress={() => setDetailsVisible(true)}
          />

          <Pressable onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={detailsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailsVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>매도 대기 세부 사항</Text>
            
            {openSells.data?.summary ? (
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>총 대기 건수</Text>
                    <Text style={styles.summaryValue}>{openSells.data.summary.total_count}건</Text>
                  </View>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>매칭 / 미매칭</Text>
                    <Text style={styles.summaryValue}>
                      {openSells.data.summary.matched_count}건 / {openSells.data.summary.unmatched_count}건
                    </Text>
                  </View>
                </View>
                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>수익 / 손실</Text>
                    <Text style={styles.summaryValue}>
                      <Text style={{ color: colors.positive }}>{openSells.data.summary.profit_count}건</Text>
                      {' / '}
                      <Text style={{ color: colors.negative }}>{openSells.data.summary.loss_count}건</Text>
                    </Text>
                  </View>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>총 미실현 손익</Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        {
                          color:
                            Number(openSells.data.summary.total_unrealized_krw) >= 0
                              ? colors.positive
                              : colors.negative,
                        },
                      ]}
                    >
                      {formatSigned(openSells.data.summary.total_unrealized_krw)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            <ScrollView nestedScrollEnabled style={[styles.modalScroll, { maxHeight: windowHeight * 0.6 }]}>
              {openSellRows.length > 0 ? (
                openSellRows.map((row, index) => {
                  const isProfit = row.unrealized_at_current != null ? Number(row.unrealized_at_current) >= 0 : true;
                  const pnlColor = isProfit ? colors.positive : colors.negative;
                  return (
                    <View key={row.slot_index ?? index} style={styles.detailCard}>
                      <View style={styles.detailCardHeader}>
                        <Text style={styles.detailCardSlot}>슬롯 #{row.slot_index ?? '—'}</Text>
                        <Text style={[styles.detailCardPnl, { color: pnlColor }]}>
                          {row.unrealized_at_current != null ? formatSigned(row.unrealized_at_current) : '—'}
                        </Text>
                      </View>
                      
                      <View style={styles.detailCardGrid}>
                        <View style={styles.detailCardCol}>
                          <Text style={styles.detailLabel}>수량</Text>
                          <Text style={styles.detailValue}>
                            {formatBtc(row.qty, symbol)}
                          </Text>
                        </View>
                        <View style={styles.detailCardCol}>
                          <Text style={styles.detailLabel}>매수가 / 목표가</Text>
                          <Text style={styles.detailValue}>
                            {row.buy_unit_cost != null ? formatKrw(row.buy_unit_cost) : '—'} / {formatKrw(row.sell_limit_price)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.detailCardGrid}>
                        <View style={styles.detailCardCol}>
                          <Text style={styles.detailLabel}>현재가</Text>
                          <Text style={styles.detailValue}>
                            {formatKrw(row.current_price)}
                          </Text>
                        </View>
                        <View style={styles.detailCardCol}>
                          <Text style={styles.detailLabel}>목표 대비 차이</Text>
                          <Text style={styles.detailValue}>
                            {formatKrw(row.gap_to_fill_krw)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noDataText}>매도 대기 건이 없습니다.</Text>
              )}
            </ScrollView>

            <Pressable style={styles.closeBtn} onPress={() => setDetailsVisible(false)}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  summaryContainer: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryCol: { flex: 1 },
  summaryLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 2 },
  summaryValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  modalScroll: { marginTop: 4 },
  detailCard: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailCardHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 6, marginBottom: 6 },
  detailCardSlot: { color: colors.text, fontSize: 12, fontWeight: '700' },
  detailCardPnl: { fontSize: 12, fontWeight: '700' },
  detailCardGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  detailCardCol: { flex: 1 },
  detailLabel: { color: colors.textDim, fontSize: 9 },
  detailValue: { color: colors.text, fontSize: 11, fontWeight: '500', marginTop: 1, fontFamily: 'monospace' },
  noDataText: { color: colors.textMuted, textAlign: 'center', marginVertical: 20 },
  closeBtn: { marginTop: 12, padding: 10, backgroundColor: colors.bg, borderRadius: 6, alignItems: 'center' },
  closeBtnText: { color: colors.text, fontSize: 13, fontWeight: '600' },
});
