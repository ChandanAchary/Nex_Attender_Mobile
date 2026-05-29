import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { UnlockScreen } from "@/components/UnlockScreen";
import { Loading } from "@/components/ui";
import { colors } from "@/theme";

function RootNavigator() {
  const { loading, user, locked, isAdmin } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (loading || locked) return;

    const group = segments[0]; // "(auth)" | "(employee)" | "(admin)" | undefined
    const inAuth = group === "(auth)";

    if (!user) {
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }

    if (user.mustChangePassword) {
      const onChange = segments[1] === "change-password";
      if (!onChange) router.replace("/(auth)/change-password");
      return;
    }

    if (inAuth) {
      router.replace(isAdmin ? "/(admin)" : "/(employee)");
      return;
    }

    // Keep users out of the wrong area.
    if (group === "(admin)" && !isAdmin) router.replace("/(employee)");
    if (group === "(employee)" && isAdmin) router.replace("/(admin)");
  }, [loading, locked, user, isAdmin, segments, router]);

  if (loading) return <Loading label="Loading…" />;
  if (locked) return <UnlockScreen />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cardMuted } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(employee)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
