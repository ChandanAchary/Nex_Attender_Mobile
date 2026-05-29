import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { Button, ErrorText, Field } from "@/components/ui";
import { GlowBackdrop } from "@/components/GlowBackdrop";
import { storage } from "@/lib/storage";
import { ApiError } from "@/api/client";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";

export default function AdminLogin() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { signIn } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    storage.getLastIdentifier().then((v) => v && setIdentifier(v));
    Animated.timing(enter, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async () => {
    setError("");
    if (!identifier.trim() || !password) {
      setError("Enter your admin email/phone and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(identifier.trim(), password);
      // The root navigator routes to the admin area for admin accounts.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not sign in. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(auth)/login"));
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });

  return (
    <SafeAreaView style={styles.root}>
      <GlowBackdrop accent={colors.accent} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={styles.backText}>Employee login</Text>
          </Pressable>

          <Animated.View style={{ opacity: enter, transform: [{ translateY }], gap: spacing.xl }}>
            <View style={styles.brand}>
              <View style={styles.logo}>
                <Ionicons name="shield-checkmark" size={32} color={colors.textInverse} />
              </View>
              <Text style={styles.title}>Admin Console</Text>
              <View style={styles.pill}>
                <Ionicons name="lock-closed" size={12} color={colors.accent} />
                <Text style={styles.pillText}>Administrator access</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Field
                label="Admin email or phone"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="admin@company.com"
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
                  <Ionicons name={showPw ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <ErrorText>{error}</ErrorText>

              <Button
                title="Sign in to admin"
                onPress={onSubmit}
                loading={loading}
                style={{ backgroundColor: colors.accent }}
              />
              <Text style={styles.note}>
                Use your administrator account. Standard employees should use the employee login.
              </Text>
            </View>
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
    back: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
    backText: { color: colors.text, fontSize: font.sm, fontWeight: "600" },
    brand: { alignItems: "center", gap: spacing.sm },
    logo: {
      width: 68,
      height: 68,
      borderRadius: radius.lg,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.accent,
      shadowOpacity: 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    title: { fontSize: font.xxl, fontWeight: "800", color: colors.text },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.cardMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillText: { fontSize: font.xs, fontWeight: "700", color: colors.accent, letterSpacing: 0.5 },
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
    note: { color: colors.textMuted, fontSize: font.xs, textAlign: "center", lineHeight: 18 },
  });
