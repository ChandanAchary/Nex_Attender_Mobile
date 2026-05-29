import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from "react-native";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";

export function Card({ style, children, ...rest }: ViewProps) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

export function ScreenTitle({ children }: { children: React.ReactNode }) {
  const { styles } = useThemedStyles(makeStyles);
  return <Text style={styles.screenTitle}>{children}</Text>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const { styles } = useThemedStyles(makeStyles);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: any }) {
  const { styles } = useThemedStyles(makeStyles);
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  style?: any;
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
}: ButtonProps) {
  const { styles, colors } = useThemedStyles(makeStyles);
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : variant === "secondary"
          ? colors.surfaceAlt
          : "transparent";
  const fg = variant === "ghost" ? colors.primary : colors.textInverse;

  const press = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => !isDisabled && press(0.96)}
        onPressOut={() => press(1)}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1 },
          variant === "ghost" && styles.buttonGhost,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

interface FieldProps extends TextInputProps {
  label?: string;
}

export function Field({ label, style, ...rest }: FieldProps) {
  const { styles, colors } = useThemedStyles(makeStyles);
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

export function Badge({
  label,
  tone = "info",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "info";
}) {
  const { styles, colors } = useThemedStyles(makeStyles);
  const map = {
    success: { bg: colors.successBg, fg: colors.success },
    warning: { bg: colors.warningBg, fg: colors.warning },
    danger: { bg: colors.dangerBg, fg: colors.danger },
    info: { bg: colors.infoBg, fg: colors.info },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  const { styles } = useThemedStyles(makeStyles);
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export function Center({ children }: { children: React.ReactNode }) {
  const { styles } = useThemedStyles(makeStyles);
  return <View style={styles.center}>{children}</View>;
}

export function Loading({ label }: { label?: string }) {
  const { styles, colors } = useThemedStyles(makeStyles);
  return (
    <View style={[styles.center, styles.loadingRoot]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Muted style={{ marginTop: spacing.md }}>{label}</Muted> : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    screenTitle: { fontSize: font.xl, fontWeight: "700", color: colors.text },
    sectionLabel: {
      fontSize: font.xs,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    muted: { color: colors.textMuted, fontSize: font.sm },
    button: {
      height: 50,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    buttonGhost: { borderWidth: 1, borderColor: colors.primary },
    buttonText: { fontSize: font.md, fontWeight: "700" },
    fieldLabel: { fontSize: font.sm, fontWeight: "600", color: colors.text },
    input: {
      backgroundColor: colors.cardMuted,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: font.md,
      color: colors.text,
    },
    badge: {
      alignSelf: "flex-start",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
    },
    badgeText: { fontSize: font.xs, fontWeight: "700" },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.xs,
    },
    rowLabel: { color: colors.textMuted, fontSize: font.sm },
    rowValue: { color: colors.text, fontSize: font.sm, fontWeight: "600" },
    error: { color: colors.danger, fontSize: font.sm },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
    loadingRoot: { backgroundColor: colors.bg },
  });
