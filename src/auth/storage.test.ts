jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { AuthStore, KEY_ACCESS, KEY_REFRESH } from './storage';

const mockSet = SecureStore.setItemAsync as jest.Mock;
const mockGet = SecureStore.getItemAsync as jest.Mock;
const mockDel = SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  AuthStore.clearMemory();
});

describe('AuthStore', () => {
  it('setTokens는 SecureStore에 양쪽 저장', async () => {
    await AuthStore.setTokens({ access: 'a', refresh: 'r' });
    expect(mockSet).toHaveBeenCalledWith(KEY_ACCESS, 'a');
    expect(mockSet).toHaveBeenCalledWith(KEY_REFRESH, 'r');
  });

  it('setTokens 후 메모리 access 즉시 반환', async () => {
    await AuthStore.setTokens({ access: 'a', refresh: 'r' });
    expect(AuthStore.getAccessToken()).toBe('a');
  });

  it('getRefreshToken은 SecureStore에서 읽음', async () => {
    mockGet.mockResolvedValueOnce('r-from-store');
    const refresh = await AuthStore.getRefreshToken();
    expect(mockGet).toHaveBeenCalledWith(KEY_REFRESH);
    expect(refresh).toBe('r-from-store');
  });

  it('clearAccessToken은 메모리와 store 둘 다 비움', async () => {
    await AuthStore.setTokens({ access: 'a', refresh: 'r' });
    await AuthStore.clearAccessToken();
    expect(AuthStore.getAccessToken()).toBeNull();
    expect(mockDel).toHaveBeenCalledWith(KEY_ACCESS);
  });

  it('clearAll은 양쪽 키 삭제', async () => {
    await AuthStore.clearAll();
    expect(mockDel).toHaveBeenCalledWith(KEY_ACCESS);
    expect(mockDel).toHaveBeenCalledWith(KEY_REFRESH);
  });

  it('hydrate는 SecureStore의 access를 메모리에 로드', async () => {
    mockGet.mockImplementation((key: string) =>
      key === KEY_ACCESS ? Promise.resolve('a') : Promise.resolve('r')
    );
    await AuthStore.hydrate();
    expect(AuthStore.getAccessToken()).toBe('a');
  });
});
