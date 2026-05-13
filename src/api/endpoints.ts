import { apiGetJson } from './client';
import {
  BotStatus, MarketPrice, GridSummary, GridState,
  PendingOrder, RecentOrder, PnlRealized,
} from './types';

export function getBotStatus(): Promise<BotStatus> {
  return apiGetJson<BotStatus>('/v1/bot/status');
}

export function getMarketPrice(): Promise<MarketPrice> {
  return apiGetJson<MarketPrice>('/v1/market/price');
}

export function getGridSummary(): Promise<GridSummary> {
  return apiGetJson<GridSummary>('/v1/grid/summary');
}

export function getGridState(): Promise<GridState> {
  return apiGetJson<GridState>('/v1/grid/state');
}

export function getPendingOrders(): Promise<PendingOrder[]> {
  return apiGetJson<PendingOrder[]>('/v1/orders/pending');
}

export function getRecentOrders(limit = 50): Promise<RecentOrder[]> {
  return apiGetJson<RecentOrder[]>(`/v1/orders/recent?limit=${limit}`);
}

export type PnlPeriod = 'd' | 'w' | 'm' | 'y' | 'all';

export function getPnlRealized(period: PnlPeriod): Promise<PnlRealized> {
  return apiGetJson<PnlRealized>(`/v1/pnl/realized?period=${period}`);
}
