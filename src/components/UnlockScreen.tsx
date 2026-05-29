import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui";
import { colors, font, spacing } from "@/theme";

export function UnlockScreen() {
  const { unlock, signOut } = useAuth();
  const [tried, setTried] = useState(false);

  const attempt = async () => {
    setTried(true);
    await unlock();
  };

  useEffect(() => {
    attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <Ionicons name="finger-print" size={72} color={colors.primary} />
        <Text style={styles.title}>Nex Attender is locked</Text>
        <Text style={styles.subtitle}>
          Use your fingerprint or Face ID to unlock the app.
        </Text>
        <Button title="Unlock" onPress={attempt} style={{ marginTop: spacing.lg, minWidth: 220 }} />
        {tried ? (
          <Button
            title="Sign in with password instead"
            variant="ghost"
            onPress={signOut}
            style={{ marginTop: spacing.sm, minWidth: 220 }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  title: { fontSize: font.xl, fontWeight: "700", color: colors.textInverse, marginTop: spacing.lg },
  subtitle: { fontSize: font.sm, color: "#94a3b8", textAlign: "center", maxWidth: 280 },
});
