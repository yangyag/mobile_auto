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
