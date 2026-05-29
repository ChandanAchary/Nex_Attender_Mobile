import * as SecureStore from "expo-secure-store";
import type { ThemeMode } from "@/theme";

const SESSION_KEY = "oam_session_token";
const BIO_KEY = "biometric_enabled";
const LAST_IDENTIFIER_KEY = "last_identifier";
const THEME_MODE_KEY = "theme_mode";

export const storage = {
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(SESSION_KEY);
  },
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(SESSION_KEY, token);
  },
  async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  },

  async isBiometricEnabled(): Promise<boolean> {
    return (await SecureStore.getItemAsync(BIO_KEY)) === "1";
  },
  async setBiometricEnabled(on: boolean): Promise<void> {
    if (on) await SecureStore.setItemAsync(BIO_KEY, "1");
    else await SecureStore.deleteItemAsync(BIO_KEY);
  },

  async getLastIdentifier(): Promise<string | null> {
    return SecureStore.getItemAsync(LAST_IDENTIFIER_KEY);
  },
  async setLastIdentifier(id: string): Promise<void> {
    await SecureStore.setItemAsync(LAST_IDENTIFIER_KEY, id);
  },

  async getThemeMode(): Promise<ThemeMode | null> {
    const v = await SecureStore.getItemAsync(THEME_MODE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : null;
  },
  async setThemeMode(mode: ThemeMode): Promise<void> {
    await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
  },
};
