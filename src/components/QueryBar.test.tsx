import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryBar } from './QueryBar';

describe('QueryBar', () => {
  it('조회 전에는 "조회 전" 표시', () => {
    const view = render(
      <QueryBar onQuery={() => {}} loading={false} lastUpdatedAt={null} />,
    );
    expect(view.getByText('조회 전')).toBeTruthy();
  });

  it('lastUpdatedAt이 있으면 HH:MM:SS 시각 표시', () => {
    const ts = new Date(2026, 4, 21, 9, 5, 3).getTime();
    const view = render(
      <QueryBar onQuery={() => {}} loading={false} lastUpdatedAt={ts} />,
    );
    expect(view.getByText('마지막 조회: 09:05:03')).toBeTruthy();
  });

  it('버튼을 누르면 onQuery 호출', () => {
    const onQuery = jest.fn();
    const view = render(
      <QueryBar onQuery={onQuery} loading={false} lastUpdatedAt={null} />,
    );
    fireEvent.press(view.getByText('조회'));
    expect(onQuery).toHaveBeenCalledTimes(1);
  });

  it('loading이면 "조회 중..."을 표시하고 눌러도 onQuery 미호출', () => {
    const onQuery = jest.fn();
    const view = render(
      <QueryBar onQuery={onQuery} loading={true} lastUpdatedAt={null} />,
    );
    fireEvent.press(view.getByText('조회 중...'));
    expect(onQuery).not.toHaveBeenCalled();
  });
});
