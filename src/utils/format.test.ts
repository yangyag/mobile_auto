import { formatKrw, formatBtc, formatRelativeTime, formatSigned } from './format';

describe('formatKrw', () => {
  it('천 단위 콤마 적용', () => {
    expect(formatKrw(95420000)).toBe('95,420,000');
  });
  it('소수 버림', () => {
    expect(formatKrw(1234.7)).toBe('1,234');
  });
  it('음수도 콤마', () => {
    expect(formatKrw(-12400)).toBe('-12,400');
  });
  it('null/undefined는 빈 문자열', () => {
    expect(formatKrw(null)).toBe('');
    expect(formatKrw(undefined)).toBe('');
  });
});

describe('formatBtc', () => {
  it('소수점 8자리 고정', () => {
    expect(formatBtc(0.0432)).toBe('0.04320000');
    expect(formatBtc(1)).toBe('1.00000000');
  });
});

describe('formatSigned', () => {
  it('양수는 + 부호', () => {
    expect(formatSigned(12400)).toBe('+12,400');
  });
  it('음수는 - 부호 유지', () => {
    expect(formatSigned(-12400)).toBe('-12,400');
  });
  it('0은 부호 없음', () => {
    expect(formatSigned(0)).toBe('0');
  });
});

describe('formatRelativeTime', () => {
  it('초 단위', () => {
    const now = new Date('2026-05-13T10:00:00Z').getTime();
    const ts = new Date('2026-05-13T09:59:48Z').getTime();
    expect(formatRelativeTime(ts, now)).toBe('12s ago');
  });
  it('분 단위', () => {
    const now = new Date('2026-05-13T10:00:00Z').getTime();
    const ts = new Date('2026-05-13T09:57:00Z').getTime();
    expect(formatRelativeTime(ts, now)).toBe('3m ago');
  });
  it('시간 단위', () => {
    const now = new Date('2026-05-13T10:00:00Z').getTime();
    const ts = new Date('2026-05-13T08:00:00Z').getTime();
    expect(formatRelativeTime(ts, now)).toBe('2h ago');
  });
});
