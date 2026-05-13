import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';

export function useAutoRefresh<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 10_000,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    if (aliveRef.current) setRefreshing(true);
    try {
      const next = await fetcher();
      if (aliveRef.current) {
        setData(next);
        setError(null);
      }
    } catch (e) {
      if (aliveRef.current) setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (aliveRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetcher]);

  useFocusEffect(
    useCallback(() => {
      aliveRef.current = true;
      load();
      const id = setInterval(load, intervalMs);

      const subscription = AppState.addEventListener('change', (s: AppStateStatus) => {
        if (s === 'active') load();
      });

      return () => {
        aliveRef.current = false;
        clearInterval(id);
        subscription.remove();
      };
    }, [load, intervalMs]),
  );

  return { data, loading, refreshing, error, refresh: load };
}
