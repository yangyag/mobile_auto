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

export interface GuardInfo {
  active: boolean;
  side?: string | null;
  reason?: string | null;
}

export interface StopLossInfo {
  active: boolean;
  level?: string | null;
  armed_at?: string | null;
  liquidated_at?: string | null;
}

export interface BotStatus {
  bot_key: string;
  symbol: string;
  is_alive: boolean;
  last_heartbeat_at: string | null;
  last_cycle_at: string | null;
  lag_seconds: string | number | null;
  current_price: string | number | null;
  breakout_guard: GuardInfo;
  stop_loss: StopLossInfo;
}

export interface MarketPrice {
  symbol: string;
  price: string | number;
  source: string;
  observed_at: string;
}

export interface GridSummary {
  symbol: string;
  row_count: number;
  holding_count: number;
  empty_count: number;
  total_inventory_btc: string | number;
  current_inventory_cost_krw: string | number;
  total_allocated_budget_krw: string | number;
  planned_buy_budget_total: string | number;
  avg_buy_price: string | number | null;
  lower_price: string | number;
  upper_price: string | number;
  breakout_guard: GuardInfo;
  stop_loss: StopLossInfo;
}

export interface GridSlot {
  slot_index: number;
  buy_price: string | number;
  planned_qty: string | number;
  planned_buy_krw: string | number;
  held_qty: string | number;
  inventory_cost_krw: string | number;
  sell_price: string | number;
  effective_sell_price: string | number;
  filled_at: string | null;
  status?: string;
  pending_order: PendingOrder | null;
}

export interface GridState {
  symbol?: string;
  version?: number;
  revision?: string;
  slots: GridSlot[];
}

export interface PendingOrder {
  order_id: string;
  identifier: string | null;
  slot_index: number | null;
  side: 'BUY' | 'SELL';
  price: string | number | null;
  quantity: string | number | null;
  symbol: string;
  execution_type: string;
  spend_amount: string | number | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  filled_at: string | null;
  cancelled_at: string | null;
}

export type RecentOrder = PendingOrder;

export interface OrdersResponse {
  orders: PendingOrder[];
}

export interface PnlBucket {
  key: string;
  order_count: number;
  trade_count: number;
  realized_pnl_krw: string | number;
  matched_qty_btc: string | number;
}

export interface PnlRealized {
  period: 'd' | 'w' | 'm' | 'y' | 'all';
  market: string;
  buckets: PnlBucket[];
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
