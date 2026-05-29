import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { font, radius, spacing, useTheme } from "@/theme";

export const TAB_BAR_HEIGHT = 62;

/**
 * iOS-style floating, pill-shaped, translucent bottom tab bar (à la Apple
 * Albums). Frosted via expo-blur on iOS, with a translucent background that
 * keeps it legible on Android too. Rendered absolutely so it floats over the
 * screen content rather than consuming layout space.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
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
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const iconColor = focused ? colors.textInverse : colors.textMuted;
            const labelColor = focused ? colors.primary : colors.textMuted;
            const label = typeof options.title === "string" ? options.title : route.name;

            const onPress = () => {
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
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.item}
              >
                <View style={[styles.iconPill, focused && { backgroundColor: colors.primary }]}>
                  {options.tabBarIcon?.({ focused, color: iconColor, size: 22 })}
                </View>
                <Text numberOfLines={1} style={[styles.label, { color: labelColor }]}>
                  {label}
                </Text>
              </Pressable>
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
    gap: 2,
    paddingVertical: spacing.xs,
  },
  iconPill: {
    width: 56,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: font.xs, fontWeight: "600" },
});
