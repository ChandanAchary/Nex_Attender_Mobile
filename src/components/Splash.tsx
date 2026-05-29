import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";

/**
 * Animated branded launch screen. Plays a short entrance, holds, then fades
 * out and calls {@link onFinish}. Rendered as a full-screen overlay above the
 * app on startup.
 */
export function Splash({ onFinish }: { onFinish: () => void }) {
  const { styles } = useThemedStyles(makeStyles);

  const container = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(14)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const exitY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ).start();

    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, speed: 8, bounciness: 9, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(subOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(bar, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.delay(250),
    ]).start(() => {
      // Float the logo up while the splash fades, handing off to the login
      // screen's brand which floats up from below.
      Animated.parallel([
        Animated.timing(container, {
          toValue: 0,
          duration: 460,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(exitY, {
          toValue: -70,
          duration: 460,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => onFinish());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: container }]}>
      {/* soft brand glows */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.blob, styles.blobTop]} />
        <View style={[styles.blob, styles.blobBottom]} />
      </View>

      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <Animated.View
            style={[styles.pulseRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
          />
          <Animated.Image
            source={require("../../assets/splash-icon.png")}
            resizeMode="contain"
            style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }, { translateY: exitY }] }]}
          />
        </View>

        <Animated.Text
          style={[styles.title, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}
        >
          Nex Attender
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: subOpacity }]}>
          Nexus Infotech · Attendance
        </Animated.Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              { width: bar.interpolate({ inputRange: [0, 1], outputRange: ["6%", "100%"] }) },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { backgroundColor: colors.brandBottom, alignItems: "center", justifyContent: "center" },
    blob: { position: "absolute", borderRadius: 200 },
    blobTop: {
      top: -100,
      right: -80,
      width: 320,
      height: 320,
      backgroundColor: colors.primary,
      opacity: 0.28,
    },
    blobBottom: {
      bottom: -120,
      left: -90,
      width: 340,
      height: 340,
      backgroundColor: colors.accent,
      opacity: 0.22,
    },
    center: { alignItems: "center", gap: spacing.sm },
    logoWrap: { alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
    pulseRing: {
      position: "absolute",
      width: 150,
      height: 150,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
    },
    logo: {
      width: 188,
      height: 188,
    },
    title: {
      fontSize: 34,
      fontWeight: "800",
      color: colors.brandText,
      letterSpacing: 0.5,
    },
    subtitle: { fontSize: font.sm, color: colors.brandMuted, letterSpacing: 1 },
    footer: { position: "absolute", bottom: 56, alignItems: "center", width: "100%" },
    barTrack: {
      width: 140,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.15)",
      overflow: "hidden",
    },
    barFill: { height: "100%", borderRadius: 2, backgroundColor: colors.primary },
  });
