import React, { useEffect, useState } from "react";
import {
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
import { storage } from "@/lib/storage";
import { ApiError } from "@/api/client";
import { colors, font, radius, spacing } from "@/theme";

export default function Login() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    storage.getLastIdentifier().then((v) => v && setIdentifier(v));
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="location" size={30} color={colors.textInverse} />
            </View>
            <Text style={styles.title}>Nex Attender</Text>
            <Text style={styles.subtitle}>Nexus Infotech · Attendance</Text>
          </View>

          <View style={styles.card}>
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
              <Pressable style={styles.eye} onPress={() => setShowPw((s) => !s)}>
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
              <Pressable>
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>
            </Link>
          </View>

          <Text style={styles.footer}>Connected to nex-attender.vercel.app</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.xl },
  brand: { alignItems: "center", gap: spacing.sm },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: font.xxl, fontWeight: "800", color: colors.textInverse },
  subtitle: { fontSize: font.sm, color: "#94a3b8" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  eye: { position: "absolute", right: spacing.md, top: 34 },
  link: { color: colors.primary, fontWeight: "600", textAlign: "center", fontSize: font.sm },
  footer: { color: "#475569", fontSize: font.xs, textAlign: "center" },
});
