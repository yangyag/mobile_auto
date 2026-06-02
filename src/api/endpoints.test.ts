jest.mock('./client', () => ({
  apiGetJson: jest.fn(),
}));

import { apiGetJson } from './client';
import { getPnlBySlot } from './endpoints';
import { PnlBySlot } from './types';

const apiGetJsonMock = apiGetJson as jest.Mock;

beforeEach(() => {
  apiGetJsonMock.mockReset();
});

describe('getPnlBySlot', () => {
  it('기본값(detail=false)로 올바른 경로/쿼리 요청 후 파싱된 본문 반환', async () => {
    const body: PnlBySlot = {
      period: 'd',
      market: 'KRW-USDT',
      base_currency: 'USDT',
      total_realized_pnl_krw: '12430',
      slots: [
        { slot: 1, grid_buy_price: '1300', order_count: 2, realized_pnl_krw: '12430', matched_qty: '9.5' },
      ],
      sells: [],
    };
    apiGetJsonMock.mockResolvedValueOnce(body);

    const result = await getPnlBySlot('d');

    expect(apiGetJsonMock).toHaveBeenCalledWith('/v1/pnl/by-slot?period=d&detail=false');
    expect(result).toBe(body);
  });
});
