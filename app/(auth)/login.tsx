import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { Button, ErrorText, Field } from "@/components/ui";
import { GlowBackdrop } from "@/components/GlowBackdrop";
import { storage } from "@/lib/storage";
import { isBiometricAvailable } from "@/lib/biometric";
import { ApiError } from "@/api/client";
import { haptics } from "@/lib/haptics";
import { font, layout, radius, spacing, useTheme, useThemedStyles, type Palette } from "@/theme";
import { useKeyboardHeight } from "@/lib/useKeyboard";
import { useSplashDone } from "@/lib/splashGate";

export default function Login() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { scheme, setMode } = useTheme();
  const kb = useKeyboardHeight();
  const splashDone = useSplashDone();
  const { signIn, unlock } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bioReady, setBioReady] = useState(false);

  const brand = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    storage.getLastIdentifier().then((v) => v && setIdentifier(v));
    // Offer biometric login if it's set up (works even when signed out).
    (async () => {
      setBioReady(
        (await isBiometricAvailable()) &&
          (await storage.isBiometricEnabled()) &&
          (await storage.hasBiometricCredentials()),
      );
    })();
  }, []);

  // Float the brand up into place once the splash hands off, so the logo
  // appears to continue floating up from the launch screen into the form.
  useEffect(() => {
    if (!splashDone) return;
    Animated.stagger(130, [
      Animated.spring(brand, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 7 }),
      Animated.timing(card, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [splashDone, brand, card]);

  const onSubmit = async () => {
    setError("");
    if (!identifier.trim() || !password) {
      setError("Enter your email/phone and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(identifier.trim(), password);
      // Navigation handled by the root navigator.
    } catch (e) {
      haptics.error();
      setError(e instanceof ApiError ? e.message : "Could not sign in. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    haptics.selection();
    setMode(scheme === "dark" ? "light" : "dark");
  };

  return (
    <SafeAreaView style={styles.root}>
      <GlowBackdrop />
      <KeyboardAvoidingView
        behavior={undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scroll, kb > 0 && { paddingBottom: kb + spacing.xl }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="none" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View style={{ flex: 1 }} />
            <Pressable
              style={styles.themeToggleBtn}
              onPress={toggleTheme}
              hitSlop={8}
              accessibilityLabel="Toggle theme mode"
            >
              <Ionicons
                name={scheme === "dark" ? "sunny" : "moon"}
                size={20}
                color={colors.text}
              />
            </Pressable>
          </View>
          <Animated.View
            style={[
              styles.brand,
              {
                opacity: brand,
                transform: [
                  { translateY: brand.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) },
                  { scale: brand.interpolate({ inputRange: [0, 1], outputRange: [1.2, 1] }) },
                ],
              },
            ]}
          >
            <Image
              source={require("../../assets/splash-icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Nex Attender</Text>
            <Text style={styles.subtitle}>Nexus Infotech · Attendance</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              { opacity: card, transform: [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }] },
            ]}
          >
            <Field
              label="Email or phone"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@company.com"
            />
            <View>
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                placeholder="Your password"
              />
              <Pressable style={styles.eye} onPress={() => setShowPw((s) => !s)} hitSlop={8}>
                <Ionicons
                  name={showPw ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            <ErrorText>{error}</ErrorText>

            <Button title="Sign in" onPress={onSubmit} loading={loading} />

            {bioReady ? (
              <Button
                title="Log in with Biometric"
                variant="secondary"
                onPress={() => unlock()}
              />
            ) : null}

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>
            </Link>
          </Animated.View>

          <Animated.View style={{ opacity: card, alignItems: "center", gap: spacing.lg }}>
            <Link href="/(auth)/admin-login" asChild>
              <Pressable style={styles.adminBtn} hitSlop={8}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
                <Text style={styles.adminText}>Administrator login</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, justifyContent: "flex-start", padding: spacing.xl, gap: spacing.xl },
    brand: { alignItems: "center", gap: spacing.sm },
    logo: {
      width: 104,
      height: 104,
    },
    title: { fontSize: font.xxl, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: font.sm, color: colors.textMuted, letterSpacing: 0.5 },
    card: {
      width: "100%",
      maxWidth: layout.maxForm,
      alignSelf: "center",
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
      gap: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    },
    eye: { position: "absolute", right: spacing.md, top: 34 },
    link: { color: colors.primary, fontWeight: "600", textAlign: "center", fontSize: font.sm },
    adminBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    adminText: { color: colors.textMuted, fontWeight: "700", fontSize: font.sm },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      width: "100%",
      paddingTop: spacing.xs,
    },
    themeToggleBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
  });
