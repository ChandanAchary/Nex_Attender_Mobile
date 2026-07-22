import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { font, spacing, useTheme } from "@/theme";
import { haptics } from "@/lib/haptics";

export const TAB_BAR_HEIGHT = 62;

function TabItem({
  focused,
  tint,
  label,
  icon,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  focused: boolean;
  tint: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(focused ? 1.12 : 1)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.12 : 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 12,
    }).start();
  }, [focused, scale]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{icon}</Animated.View>
      <Text numberOfLines={1} style={[styles.label, { color: tint, fontWeight: focused ? "800" : "600" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * iOS-style floating, pill-shaped, translucent bottom tab bar (à la Apple
 * Albums). Frosted via expo-blur, with the active icon tinted + gently scaled
 * and a selection haptic on tap.
 */
export function FloatingTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const dark = scheme === "dark";

  const fill = dark ? "rgba(17,24,39,0.55)" : "rgba(255,255,255,0.62)";
  const borderColor = dark ? "rgba(148,163,184,0.22)" : "rgba(15,23,42,0.08)";

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, spacing.md) }]}
    >
      <View style={[styles.shadow, { backgroundColor: fill }]}>
        <BlurView
          intensity={dark ? 40 : 55}
          tint={dark ? "dark" : "light"}
          experimentalBlurMethod="dimezisBlurView"
          style={[styles.bar, { borderColor }]}
        >
          {state.routes
            .filter((route) => {
              const { options } = descriptors[route.key];
              return (options.tabBarItemStyle as any)?.display !== "none";
            })
            .map((route) => {
              const index = state.routes.findIndex((r) => r.key === route.key);
              const { options } = descriptors[route.key];
              const focused = state.index === index;
              const tint = focused ? colors.primary : colors.textMuted;
              const label = typeof options.title === "string" ? options.title : route.name;

              const onPress = () => {
                haptics.selection();
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };
              const onLongPress = () =>
                navigation.emit({ type: "tabLongPress", target: route.key });

              return (
                <TabItem
                  key={route.key}
                  focused={focused}
                  tint={tint}
                  label={label}
                  icon={options.tabBarIcon?.({ focused, color: tint })}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  accessibilityLabel={label}
                />
              );
            })}
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  shadow: {
    width: "100%",
    maxWidth: 480,
    borderRadius: TAB_BAR_HEIGHT / 2,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  bar: {
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: "hidden",
    borderWidth: Platform.OS === "android" ? StyleSheet.hairlineWidth : 1,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing.xs,
  },
  label: { fontSize: font.xs, fontWeight: "600" },
});
