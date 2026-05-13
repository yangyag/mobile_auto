export interface LoginRequest {
  username: string;
  password: string;
  totp_code?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface BotStatus {
  is_alive: boolean;
  last_heartbeat_at: string | null;
  last_heartbeat_age_seconds: number | null;
  stop_loss_active: boolean;
  breakout_guard_active: boolean;
}

export interface MarketPrice {
  symbol: string;
  price: number;
  source: 'ws' | 'rest';
  fetched_at: string;
}

export interface GridSummary {
  total_slots: number;
  held_slots: number;
  total_held_btc: number;
  inventory_cost_krw: number;
  average_buy_price: number | null;
  pending_orders_count: number;
}

export interface GridSlot {
  slot_index: number;
  buy_price: number;
  planned_qty: number;
  planned_buy_krw: number;
  held_qty: number;
  inventory_cost_krw: number;
  sell_price: number;
  effective_sell_price: number;
  filled_at: string | null;
  pending_order: PendingOrder | null;
}

export interface GridState {
  slots: GridSlot[];
}

export interface PendingOrder {
  uuid: string;
  identifier: string | null;
  side: 'bid' | 'ask';
  ord_type: string;
  price: number | null;
  volume: number | null;
  state: string;
  created_at: string;
  slot_index: number | null;
}

export interface RecentOrder extends PendingOrder {
  executed_volume: number;
  finished_at: string | null;
}

export interface PnlRealized {
  period: 'd' | 'w' | 'm' | 'y' | 'all';
  from: string;
  to: string;
  sell_order_count: number;
  fill_count: number;
  gross_krw: number;
  fee_krw: number;
  net_krw: number;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  code: 'network' | 'auth' | 'server' | 'client' | 'session-expired';
  constructor(message: string, status: number, code: ApiError['code'], body?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}
