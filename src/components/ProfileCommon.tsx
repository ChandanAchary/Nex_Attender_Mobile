import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { Button, Card, Muted, Row } from "@/components/ui";
import { storage } from "@/lib/storage";
import { biometricLabel, isBiometricAvailable } from "@/lib/biometric";
import {
  font,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type Palette,
  type ThemeMode,
} from "@/theme";

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: "system", label: "System", icon: "phone-portrait-outline" },
  { mode: "light", label: "Light", icon: "sunny-outline" },
  { mode: "dark", label: "Dark", icon: "moon-outline" },
];

/** Animated Light / Dark / System segmented control. */
function AppearanceToggle() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { mode, setMode } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const index = THEME_OPTIONS.findIndex((o) => o.mode === mode);
  const slide = useRef(new Animated.Value(0)).current;
  const segWidth = trackWidth ? trackWidth / THEME_OPTIONS.length : 0;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: Math.max(index, 0) * segWidth,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [index, segWidth, slide]);

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <Card>
      <Text style={styles.sectionTitle}>Appearance</Text>
      <Muted>Choose how Nex Attender looks. "System" follows your device.</Muted>
      <View style={styles.track} onLayout={onLayout}>
        {segWidth > 0 ? (
          <Animated.View
            style={[
              styles.thumb,
              { width: segWidth - 6, transform: [{ translateX: slide }] },
            ]}
          />
        ) : null}
        {THEME_OPTIONS.map((o) => {
          const active = o.mode === mode;
          return (
            <Pressable key={o.mode} style={styles.segment} onPress={() => setMode(o.mode)}>
              <Ionicons
                name={o.icon}
                size={18}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.segmentText, active && { color: colors.primary }]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

/** Shared profile content used by both employee and admin profile screens. */
export function ProfileCommon() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { user, signOut } = useAuth();
  const [bioOn, setBioOn] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioName, setBioName] = useState("Biometrics");

  useEffect(() => {
    (async () => {
      setBioAvailable(await isBiometricAvailable());
      setBioName(await biometricLabel());
      setBioOn(await storage.isBiometricEnabled());
    })();
  }, []);

  const toggleBio = async (next: boolean) => {
    if (next && !bioAvailable) {
      Alert.alert("Not available", "No fingerprint or Face ID is set up on this device.");
      return;
    }
    setBioOn(next);
    await storage.setBiometricEnabled(next);
    Alert.alert(
      next ? "Biometric unlock on" : "Biometric unlock off",
      next
        ? `${bioName} will be required the next time you open the app.`
        : "You'll no longer need biometrics to open the app.",
    );
  };

  const confirmLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  };

  return (
    <>
      <Card>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Muted>{user?.role}</Muted>
          </View>
        </View>
        <Row label="Email" value={user?.email ?? "—"} />
        <Row label="Phone" value={user?.phone ?? "—"} />
        <Row label="Employment" value={user?.employmentType ?? "—"} />
        {user?.department ? <Row label="Department" value={user.department} /> : null}
      </Card>

      <AppearanceToggle />

      <Card>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>{bioName} unlock</Text>
            <Muted>
              {bioAvailable
                ? "Require biometrics each time you open the app."
                : "No biometrics enrolled on this device."}
            </Muted>
          </View>
          <Switch
            value={bioOn}
            onValueChange={toggleBio}
            disabled={!bioAvailable}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </Card>

      <Button title="Sign out" variant="danger" onPress={confirmLogout} />
    </>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    avatarRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: colors.textInverse, fontSize: font.lg, fontWeight: "800" },
    name: { fontSize: font.lg, fontWeight: "700", color: colors.text },
    sectionTitle: { fontSize: font.md, fontWeight: "700", color: colors.text },
    switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    switchLabel: { fontSize: font.md, fontWeight: "600", color: colors.text },
    track: {
      flexDirection: "row",
      backgroundColor: colors.cardMuted,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 3,
      position: "relative",
    },
    thumb: {
      position: "absolute",
      top: 3,
      bottom: 3,
      left: 3,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      flexDirection: "row",
      gap: spacing.xs,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.sm,
    },
    segmentText: { fontSize: font.sm, fontWeight: "700", color: colors.textMuted },
  });
