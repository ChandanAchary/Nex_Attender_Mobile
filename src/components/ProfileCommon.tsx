import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { Button, Card, Muted, Row } from "@/components/ui";
import { storage } from "@/lib/storage";
import { biometricLabel, isBiometricAvailable } from "@/lib/biometric";
import { colors, font, spacing } from "@/theme";

/** Shared profile content used by both employee and admin profile screens. */
export function ProfileCommon() {
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

const styles = StyleSheet.create({
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
});
