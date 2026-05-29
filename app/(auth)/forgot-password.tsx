import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { Button, ErrorText, Field, Muted } from "@/components/ui";
import { GlowBackdrop } from "@/components/GlowBackdrop";
import { font, layout, radius, spacing, useThemedStyles, type Palette } from "@/theme";
import { useKeyboardHeight } from "@/lib/useKeyboard";

export default function ForgotPassword() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const kb = useKeyboardHeight();
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify" | "done">("request");
  const [email, setEmail] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestReset = async () => {
    setError("");
    if (!email.includes("@")) return setError("Enter a valid email.");
    setLoading(true);
    try {
      const r = await auth.forgotRequest(email.trim());
      setDevCode(r.devCode);
      setStep("verify");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start reset.");
    } finally {
      setLoading(false);
    }
  };

  const verifyReset = async () => {
    setError("");
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code.");
    if (newPassword.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      await auth.forgotVerify(email.trim(), code, newPassword);
      setStep("done");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <GlowBackdrop />
      <KeyboardAvoidingView behavior={undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scroll, kb > 0 && { paddingBottom: kb + spacing.xl }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="none" showsVerticalScrollIndicator={false}>
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={styles.backText}>Back to sign in</Text>
          </Pressable>

          <Text style={styles.title}>Reset password</Text>

          <View style={styles.card}>
            {step === "request" && (
              <>
                <Muted>Enter your account email and we'll send a reset code.</Muted>
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@company.com"
                />
                <Button title="Send reset code" onPress={requestReset} loading={loading} />
              </>
            )}

            {step === "verify" && (
              <>
                <Muted>If that email exists, a code was sent to it.</Muted>
                {devCode ? <Muted>Dev code: {devCode}</Muted> : null}
                <Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="123456" />
                <Field label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Min 8 chars, 1 letter + 1 number" />
                <Button title="Reset password" onPress={verifyReset} loading={loading} />
              </>
            )}

            {step === "done" && (
              <>
                <View style={{ alignItems: "center", gap: spacing.sm }}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                  <Muted style={{ textAlign: "center" }}>
                    Password reset. You can now sign in with your new password.
                  </Muted>
                </View>
                <Button title="Go to sign in" onPress={() => router.replace("/(auth)/login")} />
              </>
            )}

            <ErrorText>{error}</ErrorText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, justifyContent: "flex-start", padding: spacing.xl, gap: spacing.lg },
    back: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
    backText: { color: colors.text, fontSize: font.sm, fontWeight: "600" },
    title: { fontSize: font.xl, fontWeight: "800", color: colors.text },
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
    },
  });
