import * as SecureStore from 'expo-secure-store';

export const KEY_ACCESS = 'mobile_api.access_token';
export const KEY_REFRESH = 'mobile_api.refresh_token';

let memAccess: string | null = null;

export const AuthStore = {
  getAccessToken(): string | null {
    return memAccess;
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEY_REFRESH);
  },

  async setTokens(tokens: { access: string; refresh: string }): Promise<void> {
    memAccess = tokens.access;
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS, tokens.access),
      SecureStore.setItemAsync(KEY_REFRESH, tokens.refresh),
    ]);
  },

  async setAccessToken(access: string): Promise<void> {
    memAccess = access;
    await SecureStore.setItemAsync(KEY_ACCESS, access);
  },

  async clearAccessToken(): Promise<void> {
    memAccess = null;
    await SecureStore.deleteItemAsync(KEY_ACCESS);
  },

  async clearAll(): Promise<void> {
    memAccess = null;
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
    ]);
  },

  async hydrate(): Promise<void> {
    const access = await SecureStore.getItemAsync(KEY_ACCESS);
    memAccess = access;
  },

  clearMemory(): void {
    memAccess = null;
  },
};
