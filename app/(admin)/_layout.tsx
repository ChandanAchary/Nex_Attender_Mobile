import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="employees" />
      <Stack.Screen name="offices" />
      <Stack.Screen name="holidays" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
