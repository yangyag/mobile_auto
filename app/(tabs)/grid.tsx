import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Modal, Pressable, ScrollView,
} from 'react-native';
import { useAutoRefresh } from '../../src/hooks/useAutoRefresh';
import { getGridState } from '../../src/api/endpoints';
import { SlotRow } from '../../src/components/SlotRow';
import { ErrorBanner } from '../../src/components/ErrorBanner';
import { colors } from '../../src/theme/colors';
import { GridSlot } from '../../src/api/types';
import { formatKrw, formatBtc } from '../../src/utils/format';

export default function GridScreen() {
  const grid = useAutoRefresh(getGridState, 10_000);
  const [selected, setSelected] = useState<GridSlot | null>(null);

  const sorted = (grid.data?.slots ?? []).slice().sort((a, b) => b.buy_price - a.buy_price);
  const heldCount = sorted.filter((s) => s.held_qty > 0).length;

  const onClose = useCallback(() => setSelected(null), []);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>슬롯 {sorted.length}개 · 보유 {heldCount}</Text>
      </View>
      {grid.error ? <ErrorBanner message={grid.error.message} onRetry={grid.refresh} /> : null}
      <FlatList
        data={sorted}
        keyExtractor={(s) => String(s.slot_index)}
        renderItem={({ item }) => <SlotRow slot={item} onPress={setSelected} />}
        refreshControl={<RefreshControl refreshing={grid.loading && !grid.data} onRefresh={grid.refresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          grid.loading ? <Text style={styles.empty}>로딩 중...</Text>
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
                      <DetailRow k="uuid" v={selected.pending_order.uuid} />
                      <DetailRow k="side" v={selected.pending_order.side} />
                      <DetailRow k="state" v={selected.pending_order.state} />
                      <DetailRow k="price" v={formatKrw(selected.pending_order.price ?? 0)} />
                      <DetailRow k="volume" v={formatBtc(selected.pending_order.volume ?? 0)} />
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
