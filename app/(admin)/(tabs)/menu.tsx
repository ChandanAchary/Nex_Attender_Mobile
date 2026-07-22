import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Card, Muted } from "@/components/ui";
import { haptics } from "@/lib/haptics";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";

interface MenuItem {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/(admin)/employees" | "/(admin)/offices" | "/(admin)/holidays" | "/(admin)/profile";
}

const MENU_ITEMS: MenuItem[] = [
  {
    title: "People",
    subtitle: "Manage employees, roles & staff directory",
    icon: "people",
    route: "/(admin)/employees",
  },
  {
    title: "Offices",
    subtitle: "Manage office locations & geofences",
    icon: "business",
    route: "/(admin)/offices",
  },
  {
    title: "Holidays",
    subtitle: "Manage official & public holiday calendar",
    icon: "calendar-clear-outline",
    route: "/(admin)/holidays",
  },
  {
    title: "Profile & Reports",
    subtitle: "Account settings, credentials & monthly export",
    icon: "person",
    route: "/(admin)/profile",
  },
];

export default function AdminMenuScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const router = useRouter();

  const navigateTo = (route: MenuItem["route"]) => {
    haptics.selection();
    router.push(route);
  };

  return (
    <Screen title="Menu" subtitle="Admin management tools">
      <View style={styles.list}>
        {MENU_ITEMS.map((item) => (
          <Card key={item.route} style={styles.cardOverride}>
            <Pressable style={styles.itemRow} onPress={() => navigateTo(item.route)}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Muted>{item.subtitle}</Muted>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    list: { gap: spacing.md },
    cardOverride: { padding: spacing.md },
    itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.cardMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    itemTitle: { fontSize: font.md, fontWeight: "700", color: colors.text, marginBottom: 2 },
  });
