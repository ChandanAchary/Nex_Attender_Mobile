import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";

/**
 * Soft, theme-aware decorative glows rendered behind a screen's content.
 * Place as the first child of a full-screen container; it fills the parent
 * and ignores touches.
 */
export function GlowBackdrop({ accent }: { accent?: string }) {
  const { colors } = useTheme();
  const primary = accent ?? colors.primary;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.blobTop, { backgroundColor: primary }]} />
      <View style={[styles.blobBottom, { backgroundColor: colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blobTop: {
    position: "absolute",
    top: -120,
    right: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.18,
  },
  blobBottom: {
    position: "absolute",
    bottom: -140,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.14,
  },
});
