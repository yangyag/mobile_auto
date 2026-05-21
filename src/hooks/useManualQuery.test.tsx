import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { useManualQuery, combineLastUpdated } from './useManualQuery';

function Harness({ fetcher }: { fetcher: () => Promise<number> }) {
  const { data, loading, error, refresh, lastUpdatedAt } = useManualQuery(fetcher);
  return (
    <>
      <Text testID="loading">{loading ? '1' : '0'}</Text>
      <Text testID="data">{data == null ? '-' : String(data)}</Text>
      <Text testID="error">{error?.message ?? ''}</Text>
      <Text testID="updated">{lastUpdatedAt == null ? '-' : 'set'}</Text>
      <Pressable testID="btn" onPress={refresh}><Text>go</Text></Pressable>
    </>
  );
}

describe('useManualQuery', () => {
  it('마운트만으로는 조회하지 않는다', async () => {
    const fetcher = jest.fn().mockResolvedValue(42);
    const view = render(<Harness fetcher={fetcher} />);
    await act(async () => {});
    expect(fetcher).not.toHaveBeenCalled();
    expect(view.getByTestId('data').props.children).toBe('-');
  });

  it('refresh 호출 시 조회되고 data·lastUpdatedAt이 채워진다', async () => {
    const fetcher = jest.fn().mockResolvedValue(42);
    const view = render(<Harness fetcher={fetcher} />);
    await act(async () => { fireEvent.press(view.getByTestId('btn')); });
    await waitFor(() => expect(view.getByTestId('data').props.children).toBe('42'));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('updated').props.children).toBe('set');
  });

  it('조회 중에는 loading이 true, 완료 후 false', async () => {
    let resolve: ((v: number) => void) | null = null;
    const fetcher = jest.fn().mockImplementation(
      () => new Promise<number>((r) => { resolve = r; }),
    );
    const view = render(<Harness fetcher={fetcher} />);
    await act(async () => { fireEvent.press(view.getByTestId('btn')); });
    await waitFor(() => expect(view.getByTestId('loading').props.children).toBe('1'));
    await act(async () => { resolve!(7); });
    await waitFor(() => expect(view.getByTestId('loading').props.children).toBe('0'));
  });

  it('fetcher가 throw하면 error 상태', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));
    const view = render(<Harness fetcher={fetcher} />);
    await act(async () => { fireEvent.press(view.getByTestId('btn')); });
    await waitFor(() => expect(view.getByTestId('error').props.children).toBe('boom'));
  });
});

describe('combineLastUpdated', () => {
  it('하나라도 null이면 null', () => {
    expect(combineLastUpdated([100, null, 300])).toBeNull();
  });
  it('모두 값이 있으면 가장 이른 값', () => {
    expect(combineLastUpdated([300, 100, 200])).toBe(100);
  });
  it('빈 배열이면 null', () => {
    expect(combineLastUpdated([])).toBeNull();
  });
});
