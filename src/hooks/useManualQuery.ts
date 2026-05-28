import { useState, useCallback, useRef, useEffect } from 'react';

let activeQueriesCount = 0;
const listeners = new Set<(count: number) => void>();

export function getActiveQueriesCount(): number {
  return activeQueriesCount;
}

export function subscribeQueriesCount(listener: (count: number) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function updateQueriesCount(delta: number) {
  activeQueriesCount = Math.max(0, activeQueriesCount + delta);
  listeners.forEach((l) => l(activeQueriesCount));
}

/**
 * 수동 조회 훅. 마운트/포커스/폴링으로 자동 조회하지 않는다.
 * refresh()를 호출했을 때만 fetcher를 실행한다.
 */
export function useManualQuery<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    updateQueriesCount(1);
    try {
      const next = await fetcher();
      if (aliveRef.current) {
        setData(next);
        setError(null);
        setLastUpdatedAt(Date.now());
      }
    } catch (e) {
      if (aliveRef.current) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    } finally {
      if (aliveRef.current) setLoading(false);
      updateQueriesCount(-1);
    }
  }, [fetcher]);

  return { data, loading, error, refresh, lastUpdatedAt };
}

/**
 * 여러 쿼리의 lastUpdatedAt을 합친다.
 * 하나라도 아직 조회 전(null)이면 null, 모두 조회됐으면 가장 이른 시각.
 */
export function combineLastUpdated(values: (number | null)[]): number | null {
  if (values.length === 0) return null;
  if (values.some((v) => v == null)) return null;
  return Math.min(...(values as number[]));
}
