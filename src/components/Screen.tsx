import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TAB_BAR_HEIGHT } from "@/components/FloatingTabBar";
import { font, layout, radius, spacing, useThemedStyles, type Palette } from "@/theme";
import { haptics } from "@/lib/haptics";

interface ScreenProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
}

export function Screen({
  title,
  subtitle,
  showBack,
  onBack,
  right,
  children,
  refreshing,
  onRefresh,
  scroll = true,
}: ScreenProps) {
  const { styles, colors } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();

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

  const handleBack = () => {
    haptics.selection();
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(admin)/(tabs)/menu");
    }
  };

  // Clear the floating tab bar so content isn't hidden behind it.
  const innerStyle = [
    styles.inner,
    { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.xl },
  ];

  const body = (
    <>
      <View style={styles.header}>
        {showBack || onBack ? (
          <Pressable onPress={handleBack} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
        ) : null}
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
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontSize: font.xxl, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  });
