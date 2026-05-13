import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <View style={styles.banner}>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonText}>재시도</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#2a1212',
    borderRadius: 6,
    padding: 10,
    margin: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: { color: colors.negative, flex: 1, fontSize: 12 },
  button: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: colors.surface, borderRadius: 4, marginLeft: 8,
  },
  buttonText: { color: colors.text, fontSize: 12 },
});
