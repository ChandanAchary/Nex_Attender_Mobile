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
import { ApiError } from "@/api/client";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";

export default function Login() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const brand = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    storage.getLastIdentifier().then((v) => v && setIdentifier(v));
    Animated.stagger(120, [
      Animated.timing(brand, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(card, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setError(e instanceof ApiError ? e.message : "Could not sign in. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <GlowBackdrop />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View
            style={[
              styles.brand,
              { opacity: brand, transform: [{ translateY: brand.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
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
            <Text style={styles.footer}>Connected to nex-attender.vercel.app</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.xl },
    brand: { alignItems: "center", gap: spacing.sm },
    logo: {
      width: 104,
      height: 104,
    },
    title: { fontSize: font.xxl, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: font.sm, color: colors.textMuted, letterSpacing: 0.5 },
    card: {
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
    footer: { color: colors.textMuted, fontSize: font.xs, textAlign: "center" },
  });
