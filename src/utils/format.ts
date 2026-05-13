export function formatKrw(value: number | null | undefined): string {
  if (value == null) return '';
  const n = Math.trunc(value);
  return n.toLocaleString('en-US');
}

export function formatBtc(value: number | null | undefined): string {
  if (value == null) return '';
  return value.toFixed(8);
}

export function formatSigned(value: number | null | undefined): string {
  if (value == null) return '';
  if (value === 0) return '0';
  const formatted = Math.abs(Math.trunc(value)).toLocaleString('en-US');
  return value > 0 ? `+${formatted}` : `-${formatted}`;
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
