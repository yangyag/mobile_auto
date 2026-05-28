type Numeric = number | string | null | undefined;

function toFiniteNumber(v: Numeric): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function formatKrw(value: Numeric): string {
  const n = toFiniteNumber(value);
  if (n == null) return '';
  return Math.trunc(n).toLocaleString('en-US');
}

export function getBaseCurrency(symbol?: string | null): string {
  if (!symbol) return 'BTC';
  const parts = symbol.split('-');
  return parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase();
}

export function formatBtc(value: Numeric, symbol?: string | null): string {
  const n = toFiniteNumber(value);
  if (n == null) return '';
  const base = getBaseCurrency(symbol);
  if (base === 'USDT') {
    return n.toFixed(4);
  }
  return n.toFixed(8);
}

export function formatSigned(value: Numeric): string {
  const n = toFiniteNumber(value);
  if (n == null) return '';
  if (n === 0) return '0원';
  const formatted = Math.abs(Math.trunc(n)).toLocaleString('en-US');
  return n > 0 ? `+${formatted}원` : `-${formatted}원`;
}

export function formatRelativeTime(
  tsMs: number | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (tsMs == null || Number.isNaN(tsMs)) return '';
  const diff = Math.max(0, Math.floor((nowMs - tsMs) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
