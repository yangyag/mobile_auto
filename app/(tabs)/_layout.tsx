import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { useAuth } from '../../src/auth/AuthContext';
import { getActiveQueriesCount, subscribeQueriesCount } from '../../src/hooks/useManualQuery';

export default function TabsLayout() {
  const { state } = useAuth();
  const [loading, setLoading] = useState(getActiveQueriesCount() > 0);

  useEffect(() => {
    return subscribeQueriesCount((count) => {
      setLoading(count > 0);
    });
  }, []);

  const preventSwitch = useCallback((e: any) => {
    if (loading) {
      e.preventDefault();
    }
  }, [loading]);

  if (state.status !== 'authenticated') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '대시보드',
          tabBarIcon: ({ color, size }) => <Ionicons name="speedometer" size={size} color={color} />,
        }}
        listeners={{
          tabPress: preventSwitch,
        }}
      />
      <Tabs.Screen
        name="grid"
        options={{
          title: '그리드',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
        listeners={{
          tabPress: preventSwitch,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: '주문',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
        listeners={{
          tabPress: preventSwitch,
        }}
      />
      <Tabs.Screen
        name="pnl"
        options={{
          title: '손익',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
        listeners={{
          tabPress: preventSwitch,
        }}
      />
    </Tabs>
  );
}
