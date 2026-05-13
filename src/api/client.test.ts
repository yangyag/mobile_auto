jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('./auth', () => ({
  loginApi: jest.fn(),
  refreshApi: jest.fn(),
  logoutApi: jest.fn(),
}));

import { apiFetch, AuthEvents, __resetClientForTest } from './client';
import { AuthStore } from '../auth/storage';
import { refreshApi } from './auth';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
  (refreshApi as jest.Mock).mockReset();
  AuthStore.clearMemory();
  __resetClientForTest();
});

describe('apiFetch', () => {
  it('access 있으면 Authorization 헤더 첨부', async () => {
    await AuthStore.setTokens({ access: 'a1', refresh: 'r1' });
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await apiFetch('/v1/bot/status');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/bot/status'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer a1' }),
      }),
    );
  });

  it('401 → refresh → 재시도 후 성공', async () => {
    await AuthStore.setTokens({ access: 'a1', refresh: 'r1' });
    (AuthStore.getRefreshToken as any) = jest.fn(async () => 'r1');
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    (refreshApi as jest.Mock).mockResolvedValueOnce({
      access_token: 'a2', refresh_token: 'r2', token_type: 'bearer', expires_in: 900,
    });

    const res = await apiFetch('/v1/bot/status');
    expect(res.status).toBe(200);
    expect(refreshApi).toHaveBeenCalledWith('r1');
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer a2' }),
      }),
    );
  });

  it('refresh 실패 시 logout 이벤트 발생 + 예외', async () => {
    await AuthStore.setTokens({ access: 'a1', refresh: 'r1' });
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    (refreshApi as jest.Mock).mockRejectedValueOnce(new Error('refresh failed'));

    const handler = jest.fn();
    AuthEvents.on('logout', handler);

    await expect(apiFetch('/v1/bot/status')).rejects.toMatchObject({
      code: 'session-expired',
    });
    expect(handler).toHaveBeenCalled();
  });

  it('동시 401 두 번에도 refresh는 한 번만', async () => {
    await AuthStore.setTokens({ access: 'a1', refresh: 'r1' });
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    (refreshApi as jest.Mock).mockResolvedValueOnce({
      access_token: 'a2', refresh_token: 'r2', token_type: 'bearer', expires_in: 900,
    });

    await Promise.all([apiFetch('/v1/bot/status'), apiFetch('/v1/market/price')]);
    expect(refreshApi).toHaveBeenCalledTimes(1);
  });

  it('네트워크 오류는 ApiError(network)', async () => {
    await AuthStore.setTokens({ access: 'a1', refresh: 'r1' });
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await expect(apiFetch('/v1/bot/status')).rejects.toMatchObject({ code: 'network' });
  });

  it('401 시 다른 요청이 이미 refresh했으면 재refresh 없이 재시도', async () => {
    await AuthStore.setTokens({ access: 'a1', refresh: 'r1' });

    // 첫 fetch 시점에 누군가 이미 refresh를 끝낸 상태 시뮬레이션
    fetchMock.mockImplementationOnce(async () => {
      await AuthStore.setTokens({ access: 'a2', refresh: 'r2' });
      return new Response('', { status: 401 });
    });
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const res = await apiFetch('/v1/bot/status');
    expect(res.status).toBe(200);
    expect(refreshApi).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer a2' }),
      }),
    );
  });
});
