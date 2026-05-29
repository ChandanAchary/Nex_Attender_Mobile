import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { auth, me as meApi } from "@/api/endpoints";
import { clearToken, getToken, loadToken, onUnauthorized } from "@/api/client";
import type { Me } from "@/api/types";
import { storage } from "@/lib/storage";
import { authenticate } from "@/lib/biometric";

interface AuthState {
  loading: boolean;
  user: Me | null;
  locked: boolean; // session exists but awaiting biometric unlock
  isAdmin: boolean;
  signIn: (identifier: string, password: string) => Promise<Me>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  unlock: () => Promise<boolean>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Me | null>(null);
  const [locked, setLocked] = useState(false);
  const bootstrapped = useRef(false);

  const fetchUser = async () => {
    const u = await meApi.get();
    setUser(u);
    return u;
  };

  const bootstrap = async () => {
    try {
      const token = await loadToken();
      if (!token) {
        setUser(null);
        return;
      }
      const bioOn = await storage.isBiometricEnabled();
      if (bioOn) {
        setLocked(true); // gate behind biometric unlock; user fetched after unlock
        return;
      }
      await fetchUser();
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
    const u = await fetchUser();
    setLocked(false);
    return u;
  };

  const signOut = async () => {
    await auth.logout();
    await storage.setBiometricEnabled(false);
    setUser(null);
    setLocked(false);
  };

  const refresh = async () => {
    if (!getToken()) return;
    await fetchUser();
  };

  const unlock = async (): Promise<boolean> => {
    const ok = await authenticate("Unlock Nex Attender");
    if (!ok) return false;
    try {
      await fetchUser();
      setLocked(false);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
