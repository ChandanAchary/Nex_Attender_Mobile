import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { auth, me as meApi } from "@/api/endpoints";
import { clearToken, getToken, loadToken, onUnauthorized } from "@/api/client";
import type { Me } from "@/api/types";
import { storage } from "@/lib/storage";
import { authenticate } from "@/lib/biometric";

interface AuthState {
  loading: boolean;
  user: Me | null;
  locked: boolean; // awaiting biometric login/unlock
  isAdmin: boolean;
  signIn: (identifier: string, password: string) => Promise<Me>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Biometric check, then log in using the stored credentials. */
  unlock: () => Promise<boolean>;
  /** Turn biometric login on (stores the current credentials). */
  enableBiometric: () => Promise<boolean>;
  /** Turn biometric login off and wipe the stored credentials. */
  disableBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Me | null>(null);
  const [locked, setLocked] = useState(false);
  const bootstrapped = useRef(false);
  // Last credentials used to sign in this session — needed to enable biometric
  // login (the password isn't recoverable from the session token).
  const lastCreds = useRef<{ identifier: string; password: string } | null>(null);

  const fetchUser = async () => {
    const u = await meApi.get();
    setUser(u);
    return u;
  };

  const bootstrap = async () => {
    try {
      const token = await loadToken();
      const bioOn = await storage.isBiometricEnabled();

      if (token) {
        // Existing session: gate behind biometrics if enabled, else use it.
        if (bioOn) {
          setLocked(true);
          return;
        }
        await fetchUser();
        return;
      }

      // No active session — still offer biometric login if it was set up
      // (this is what lets the user log in with biometrics after signing out).
      if (bioOn && (await storage.hasBiometricCredentials())) {
        setLocked(true);
        return;
      }

      setUser(null);
    } catch {
      await clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    bootstrap();

    const off = onUnauthorized(() => {
      setUser(null);
      setLocked(false);
    });
    return off;
  }, []);

  const signIn = async (identifier: string, password: string): Promise<Me> => {
    await auth.login(identifier, password);
    await storage.setLastIdentifier(identifier);
    lastCreds.current = { identifier, password };
    // Keep the stored biometric credentials current (e.g. after a password change).
    if (await storage.isBiometricEnabled()) {
      await storage.setBiometricCredentials({ identifier, password });
    }
    const u = await fetchUser();
    setLocked(false);
    return u;
  };

  const enableBiometric = async (): Promise<boolean> => {
    const creds = lastCreds.current;
    if (!creds) return false; // need a fresh sign-in to capture the password
    const ok = await authenticate("Confirm to enable biometric login");
    if (!ok) return false;
    await storage.setBiometricCredentials(creds);
    await storage.setBiometricEnabled(true);
    return true;
  };

  const disableBiometric = async (): Promise<void> => {
    await storage.setBiometricEnabled(false);
    await storage.clearBiometricCredentials();
  };

  const signOut = async (): Promise<void> => {
    try {
      await auth.logout();
    } catch {
      /* token already cleared in logout()'s finally block */
    }
    lastCreds.current = null;
    // Biometric credentials are intentionally kept so the user can log back in
    // with biometrics after signing out (turn it off in Profile to remove them).
    setUser(null);
    setLocked(false);
  };

  const refresh = async () => {
    if (!getToken()) return;
    await fetchUser();
  };

  const unlock = async (): Promise<boolean> => {
    const ok = await authenticate("Log in to Nex Attender");
    if (!ok) return false;
    try {
      const creds = await storage.getBiometricCredentials();
      if (creds) {
        // Re-create a session from stored credentials — works even after the
        // previous session expired or the user signed out.
        await signIn(creds.identifier, creds.password);
      } else {
        await fetchUser();
        setLocked(false);
      }
      return true;
    } catch {
      await clearToken();
      setUser(null);
      setLocked(false);
      return false;
    }
  };

  const value: AuthState = {
    loading,
    user,
    locked,
    isAdmin: user?.role === "ADMIN",
    signIn,
    signOut,
    refresh,
    unlock,
    enableBiometric,
    disableBiometric,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
