import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { storage } from "@/lib/storage";

/**
 * Design tokens. `spacing`, `radius` and `font` are theme-independent and stay
 * static. Colours are resolved at runtime from the active light/dark palette
 * via {@link useTheme} / {@link useThemedStyles}.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const font = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
};

export const lightColors = {
  bg: "#eef2f8",
  surface: "#ffffff",
  surfaceAlt: "#334155",
  card: "#ffffff",
  cardMuted: "#f1f5f9",
  border: "#e2e8f0",
  borderDark: "#cbd5e1",
  text: "#0f172a",
  textMuted: "#64748b",
  textInverse: "#f8fafc",
  primary: "#3a2b8c",
  primaryDark: "#2c2173",
  accent: "#1e8ca0",
  success: "#16a34a",
  successBg: "#dcfce7",
  warning: "#d97706",
  warningBg: "#fef3c7",
  danger: "#dc2626",
  dangerBg: "#fee2e2",
  info: "#0891b2",
  infoBg: "#cffafe",
  // Brand surfaces — used for the launch splash and auth screens.
  brandTop: "#241a66",
  brandBottom: "#0f0b24",
  brandText: "#f8fafc",
  brandMuted: "#cbd5e1",
};

export type Palette = typeof lightColors;

export const darkColors: Palette = {
  bg: "#0b1220",
  surface: "#1e293b",
  surfaceAlt: "#475569",
  card: "#1e293b",
  cardMuted: "#0f172a",
  border: "#334155",
  borderDark: "#475569",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  textInverse: "#f8fafc",
  primary: "#6354d6",
  primaryDark: "#5343c0",
  accent: "#2bb0c7",
  success: "#22c55e",
  successBg: "#0f2e1a",
  warning: "#f59e0b",
  warningBg: "#3a2c0a",
  danger: "#f87171",
  dangerBg: "#3a1717",
  info: "#22d3ee",
  infoBg: "#0a2e36",
  brandTop: "#1a1340",
  brandBottom: "#07050f",
  brandText: "#f8fafc",
  brandMuted: "#94a3b8",
};

export type ThemeMode = "light" | "dark" | "system";
export type Scheme = "light" | "dark";

interface ThemeContextValue {
  colors: Palette;
  scheme: Scheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    storage.getThemeMode().then((m) => {
      if (m) setModeState(m);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void storage.setThemeMode(next);
  }, []);

  const scheme: Scheme =
    mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
  const colors = scheme === "dark" ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, scheme, mode, setMode }),
    [colors, scheme, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/**
 * Builds a memoised StyleSheet from a factory that receives the active palette,
 * and returns both the styles and the palette (for inline colour use).
 *
 * @example
 * const { styles, colors } = useThemedStyles(makeStyles);
 * // ...
 * const makeStyles = (colors: Palette) => StyleSheet.create({ ... });
 */
export function useThemedStyles<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>,
>(factory: (colors: Palette) => T): { styles: T; colors: Palette } {
  const { colors } = useTheme();
  const styles = useMemo(() => factory(colors), [colors, factory]);
  return { styles, colors };
}
