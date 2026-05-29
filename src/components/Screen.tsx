import React, { useEffect, useRef } from "react";
import { Animated, Easing, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "@/components/FloatingTabBar";
import { font, layout, spacing, useThemedStyles, type Palette } from "@/theme";

interface ScreenProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
}

export function Screen({
  title,
  subtitle,
  right,
  children,
  refreshing,
  onRefresh,
  scroll = true,
}: ScreenProps) {
  const { styles, colors } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  // Gentle fade + rise entrance, played once when the screen mounts.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);
  const entrance = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };

  // Clear the floating tab bar so content isn't hidden behind it.
  const innerStyle = [
    styles.inner,
    { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.xl },
  ];

  const body = (
    <>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.outer}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          <Animated.View style={[innerStyle, entrance]}>{body}</Animated.View>
        </ScrollView>
      ) : (
        <View style={[styles.outer, styles.fill]}>
          <Animated.View style={[innerStyle, styles.fill, entrance]}>{body}</Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.cardMuted },
    // Centers the inner column on wide screens (tablets); full-width on phones.
    outer: { flexGrow: 1, alignItems: "center" },
    inner: { width: "100%", maxWidth: layout.maxContent, padding: spacing.lg, gap: spacing.lg },
    fill: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    title: { fontSize: font.xxl, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  });
