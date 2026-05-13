import { apiGetJson } from './client';
import {
  BotStatus, MarketPrice, GridSummary, GridState,
  PendingOrder, RecentOrder, PnlRealized, OrdersResponse,
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

export async function getPendingOrders(): Promise<PendingOrder[]> {
  const resp = await apiGetJson<OrdersResponse>('/v1/orders/pending');
  return resp.orders ?? [];
}

export async function getRecentOrders(limit = 50): Promise<RecentOrder[]> {
  const resp = await apiGetJson<OrdersResponse>(`/v1/orders/recent?limit=${limit}`);
  return resp.orders ?? [];
}

export type PnlPeriod = 'd' | 'w' | 'm' | 'y' | 'all';

export function getPnlRealized(period: PnlPeriod): Promise<PnlRealized> {
  return apiGetJson<PnlRealized>(`/v1/pnl/realized?period=${period}`);
}
