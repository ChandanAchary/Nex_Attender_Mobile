import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { auth } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { Button, ErrorText, Field, Muted } from "@/components/ui";
import { colors, font, radius, spacing } from "@/theme";

export default function ChangePassword() {
  const { user, refresh, signOut } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [masked, setMasked] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await auth.changePasswordRequest();
      setMasked(r.emailMasked);
      setDevCode(r.devCode);
      setStep("verify");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send code.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError("");
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code.");
    if (newPassword.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      await auth.changePasswordVerify(code, newPassword);
      await refresh();
      router.replace(user?.role === "ADMIN" ? "/(admin)" : "/(employee)");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change password.");
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
          <View style={{ gap: spacing.xs }}>
            <Text style={styles.title}>Change password</Text>
            <Muted style={{ color: "#94a3b8" }}>
              {user?.mustChangePassword
                ? "You must set a new password before continuing."
                : "Secure your account with a new password."}
            </Muted>
          </View>

          <View style={styles.card}>
            {step === "request" ? (
              <>
                <Muted>
                  We'll email a 6-digit verification code to confirm it's you.
                </Muted>
                <Button title="Send code" onPress={sendCode} loading={loading} />
              </>
            ) : (
              <>
                <Muted>Code sent to {masked || "your email"}.</Muted>
                {devCode ? <Muted>Dev code: {devCode}</Muted> : null}
                <Field
                  label="6-digit code"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="123456"
                />
                <Field
                  label="New password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="Min 8 chars, 1 letter + 1 number"
                />
                <Button title="Update password" onPress={verify} loading={loading} />
                <Button title="Resend code" variant="ghost" onPress={sendCode} />
              </>
            )}
            <ErrorText>{error}</ErrorText>
          </View>

          <Button title="Sign out" variant="ghost" onPress={signOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: font.xl, fontWeight: "800", color: colors.textInverse },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
});
