import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useAutoRefresh } from './useAutoRefresh';

// expo-router의 useFocusEffect를 useEffect로 단순화 (테스트 환경)
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => any) => {
    const React = require('react');
    React.useEffect(() => cb(), []);
  },
}));

jest.useFakeTimers();

function Harness({ fetcher, interval }: { fetcher: () => Promise<number>; interval?: number }) {
  const { data, loading, error } = useAutoRefresh(fetcher, interval);
  return (
    <>
      <Text testID="loading">{loading ? '1' : '0'}</Text>
      <Text testID="data">{data == null ? '-' : String(data)}</Text>
      <Text testID="error">{error?.message ?? ''}</Text>
    </>
  );
}

afterEach(() => jest.clearAllTimers());

describe('useAutoRefresh', () => {
  it('마운트 시 한 번 호출 → 데이터 표시', async () => {
    const fetcher = jest.fn().mockResolvedValue(42);
    const view = render(<Harness fetcher={fetcher} />);
    await waitFor(() => expect(view.getByTestId('data').props.children).toBe('42'));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('interval 경과마다 재호출', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    const view = render(<Harness fetcher={fetcher} interval={1000} />);
    await waitFor(() => expect(view.getByTestId('data').props.children).toBe('1'));
    await act(async () => { jest.advanceTimersByTime(1000); });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    await act(async () => { jest.advanceTimersByTime(1000); });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
  });

  it('fetcher가 throw하면 error 상태', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));
    const view = render(<Harness fetcher={fetcher} />);
    await waitFor(() => expect(view.getByTestId('error').props.children).toBe('boom'));
  });

  it('refreshing은 fetch 중일 때만 true', async () => {
    let resolve: ((v: number) => void) | null = null;
    const fetcher = jest.fn().mockImplementation(() => new Promise<number>((r) => { resolve = r; }));
    function R() {
      const { refreshing } = useAutoRefresh(fetcher);
      return <Text testID="refreshing">{refreshing ? '1' : '0'}</Text>;
    }
    const view = render(<R />);
    await waitFor(() => expect(view.getByTestId('refreshing').props.children).toBe('1'));
    await act(async () => { resolve!(7); });
    await waitFor(() => expect(view.getByTestId('refreshing').props.children).toBe('0'));
  });
});
