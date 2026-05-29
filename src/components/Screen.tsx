import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "@/components/FloatingTabBar";
import { font, spacing, useThemedStyles, type Palette } from "@/theme";

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
  // Clear the floating tab bar so content isn't hidden behind it.
  const contentStyle = [
    styles.content,
    { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.xl },
  ];

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.cardMuted },
    content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
    header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    title: { fontSize: font.xxl, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  });
