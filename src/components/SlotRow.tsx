import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { GridSlot } from '../api/types';
import { formatKrw, formatBtc } from '../utils/format';

interface Props {
  slot: GridSlot;
  onPress?: (slot: GridSlot) => void;
}

export function SlotRow({ slot, onPress }: Props) {
  const isHeld = Number(slot.held_qty) > 0;
  return (
    <Pressable onPress={() => onPress?.(slot)} style={styles.row}>
      <View style={styles.col}>
        <Text style={styles.label}>매수</Text>
        <Text style={styles.value}>{formatKrw(slot.buy_price)}</Text>
      </View>
      <View style={styles.col}>
        <Text style={styles.label}>{isHeld ? '보유' : '계획'}</Text>
        <Text style={styles.value}>{formatBtc(isHeld ? slot.held_qty : slot.planned_qty)}</Text>
      </View>
      <View style={styles.col}>
        <Text style={styles.label}>매도</Text>
        <Text style={styles.value}>{formatKrw(slot.effective_sell_price)}</Text>
      </View>
      {slot.pending_order ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  col: { flex: 1 },
  label: { color: colors.textDim, fontSize: 9, textTransform: 'uppercase' },
  value: { color: colors.text, fontSize: 13, fontWeight: '500', marginTop: 2 },
  badge: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginLeft: 4,
  },
});
