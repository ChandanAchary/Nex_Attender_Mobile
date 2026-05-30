import * as SecureStore from "expo-secure-store";
import type { ThemeMode } from "@/theme";

const SESSION_KEY = "oam_session_token";
const BIO_KEY = "biometric_enabled";
const BIO_CREDS_KEY = "biometric_credentials";
const LAST_IDENTIFIER_KEY = "last_identifier";
const THEME_MODE_KEY = "theme_mode";

export interface BiometricCredentials {
  identifier: string;
  password: string;
}

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

  // Credentials kept (encrypted, hardware-backed) so the user can log in with
  // biometrics even after signing out. Only stored while biometric is enabled.
  async getBiometricCredentials(): Promise<BiometricCredentials | null> {
    const raw = await SecureStore.getItemAsync(BIO_CREDS_KEY);
    if (!raw) return null;
    try {
      const c = JSON.parse(raw);
      return c?.identifier && c?.password ? (c as BiometricCredentials) : null;
    } catch {
      return null;
    }
  },
  async setBiometricCredentials(creds: BiometricCredentials): Promise<void> {
    await SecureStore.setItemAsync(BIO_CREDS_KEY, JSON.stringify(creds));
  },
  async clearBiometricCredentials(): Promise<void> {
    await SecureStore.deleteItemAsync(BIO_CREDS_KEY);
  },
  async hasBiometricCredentials(): Promise<boolean> {
    return (await SecureStore.getItemAsync(BIO_CREDS_KEY)) != null;
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
