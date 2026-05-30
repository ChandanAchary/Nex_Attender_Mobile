import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui";
import { biometricLabel } from "@/lib/biometric";
import { useSplashDone } from "@/lib/splashGate";
import { font, spacing, useThemedStyles, type Palette } from "@/theme";

export function UnlockScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { unlock, signOut } = useAuth();
  const splashDone = useSplashDone();
  const [tried, setTried] = useState(false);
  const [bioName, setBioName] = useState("Biometric");
  const prompted = useRef(false);

  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const attempt = async () => {
    setTried(true);
    await unlock();
  };

  useEffect(() => {
    biometricLabel().then(setBioName);
    Animated.timing(enter, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-prompt for biometrics once the launch splash has handed off (so the
  // system dialog doesn't pop up behind the splash).
  useEffect(() => {
    if (splashDone && !prompted.current) {
      prompted.current = true;
      attempt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splashDone]);

  const ring = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  const icon = "finger-print" as const;

  return (
    <SafeAreaView style={styles.root}>
      <Animated.View
        style={[
          styles.body,
          {
            opacity: enter,
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.iconWrap}>
          <Animated.View
            style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ring }] }]}
          />
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={56} color={colors.primary} />
          </View>
        </View>
        <Text style={styles.title}>Nex Attender is locked</Text>
        <Text style={styles.subtitle}>
          Use your {bioName.toLowerCase()} to log in to the app.
        </Text>
        <Button
          title={`Log in with ${bioName}`}
          onPress={attempt}
          style={{ marginTop: spacing.lg, minWidth: 240 }}
        />
        {tried ? (
          <Button
            title="Use password instead"
            variant="ghost"
            onPress={() => signOut()}
            style={{ marginTop: spacing.sm, minWidth: 240 }}
          />
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    body: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
    iconWrap: { alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
    ring: {
      position: "absolute",
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: colors.primary,
    },
    iconCircle: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontSize: font.xl, fontWeight: "700", color: colors.text, marginTop: spacing.lg },
    subtitle: { fontSize: font.sm, color: colors.textMuted, textAlign: "center", maxWidth: 280 },
  });
