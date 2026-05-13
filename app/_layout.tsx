import React from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

function Gate() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Gate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
