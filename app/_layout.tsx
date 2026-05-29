import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { UnlockScreen } from "@/components/UnlockScreen";
import { Splash } from "@/components/Splash";
import { Loading } from "@/components/ui";
import { SplashDoneContext } from "@/lib/splashGate";
import { ThemeProvider, useTheme } from "@/theme";

function RootNavigator() {
  const { loading, user, locked, isAdmin } = useAuth();
  const { colors } = useTheme();
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

    // Logged in: make sure we're in the correct area. This covers a cold start
    // landing on the index route ("/"), being on an auth screen, and being in
    // the wrong area — otherwise a logged-in session gets stuck on "/".
    const correctGroup = isAdmin ? "(admin)" : "(employee)";
    if (group !== correctGroup) {
      router.replace(isAdmin ? "/(admin)" : "/(employee)");
    }
  }, [loading, locked, user, isAdmin, segments, router]);

  if (loading) return <Loading label="Loading…" />;
  if (locked) return <UnlockScreen />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: colors.cardMuted } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(employee)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

function Root() {
  const { colors, scheme } = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={!splashDone || scheme === "dark" ? "light" : "dark"} />
      <SplashDoneContext.Provider value={splashDone}>
        <RootNavigator />
      </SplashDoneContext.Provider>
      {!splashDone ? <Splash onFinish={() => setSplashDone(true)} /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
