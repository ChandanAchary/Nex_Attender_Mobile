import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, Loading, Muted, Row } from "@/components/ui";
import { attendance } from "@/api/endpoints";
import type { TodayState } from "@/api/types";
import { ApiError } from "@/api/client";
import { getCurrentFix, LocationError, openInMaps } from "@/lib/location";
import { formatDuration, formatTime, statusLabel } from "@/lib/format";
import { font, spacing, useThemedStyles, type Palette } from "@/theme";

export default function CheckInScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const [today, setToday] = useState<TodayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<"in" | "out" | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await attendance.today();
      setToday(data);
    } catch (e) {
      if (e instanceof ApiError && e.status !== 401) Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const punch = async (kind: "in" | "out") => {
    setBusy(kind);
    try {
      const fix = await getCurrentFix();
      const res =
        kind === "in"
          ? await attendance.checkIn(fix)
          : await attendance.checkOut(fix);
      const within = res.status === "WITHIN_RANGE";
      Alert.alert(
        kind === "in" ? "Checked in" : "Checked out",
        `${statusLabel(res.status)}${
          res.distanceMeters != null ? ` · ${Math.round(res.distanceMeters)} m from office` : ""
        }`,
        [{ text: "OK" }],
      );
      void within;
      await load();
    } catch (e) {
      if (e instanceof LocationError) Alert.alert("Location needed", e.message);
      else if (e instanceof ApiError) Alert.alert("Could not record", e.message);
      else Alert.alert("Error", "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loading label="Loading attendance…" />;

  const checkedIn = !!today?.checkIn;
  const checkedOut = !!today?.checkOut;
  const office = today?.offices?.[0];

  return (
    <Screen
      title={`Hi, ${user?.name?.split(" ")[0] ?? "there"}`}
      subtitle="Mark your attendance"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
    >
      <Card style={styles.statusCard}>
        <View style={styles.statusHead}>
          <Ionicons
            name={checkedOut ? "checkmark-done-circle" : checkedIn ? "log-in" : "ellipse-outline"}
            size={28}
            color={checkedOut ? colors.success : checkedIn ? colors.primary : colors.textMuted}
          />
          <Text style={styles.statusTitle}>
            {checkedOut ? "Day complete" : checkedIn ? "Checked in" : "Not checked in"}
          </Text>
        </View>

        {checkedIn ? (
          <View style={{ gap: spacing.xs }}>
            <Row label="Check-in" value={formatTime(today!.checkIn!.capturedAt)} />
            <Row label="Check-out" value={checkedOut ? formatTime(today!.checkOut!.capturedAt) : "—"} />
            {today?.durationMinutes != null ? (
              <Row label="Duration" value={formatDuration(today.durationMinutes)} />
            ) : null}
            <View style={{ marginTop: spacing.xs }}>
              <Badge
                label={statusLabel(today!.checkIn!.status)}
                tone={today!.checkIn!.status === "WITHIN_RANGE" ? "success" : "warning"}
              />
            </View>
          </View>
        ) : (
          <Muted>You haven't checked in today. Make sure you're at the office.</Muted>
        )}
      </Card>

      <View style={{ gap: spacing.md }}>
        <Button
          title={checkedIn ? "Already checked in" : "Check in"}
          onPress={() => punch("in")}
          loading={busy === "in"}
          disabled={checkedIn}
        />
        <Button
          title={checkedOut ? "Already checked out" : "Check out"}
          variant="secondary"
          onPress={() => punch("out")}
          loading={busy === "out"}
          disabled={!checkedIn || checkedOut}
        />
      </View>

      {office ? (
        <Card>
          <Text style={styles.sectionTitle}>Your office</Text>
          <Row label="Name" value={office.name} />
          <Row label="Geofence radius" value={`${office.attendanceRadiusMeters} m`} />
          <Pressable
            style={styles.mapLink}
            onPress={() => openInMaps(office.latitude, office.longitude, office.name)}
          >
            <Ionicons name="map" size={18} color={colors.primary} />
            <Text style={styles.mapLinkText}>View on map</Text>
          </Pressable>
        </Card>
      ) : (
        <Card>
          <Muted>No office geofence is assigned to you yet. Contact your admin.</Muted>
        </Card>
      )}
    </Screen>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  statusCard: { gap: spacing.md },
  statusHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusTitle: { fontSize: font.lg, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: font.md, fontWeight: "700", color: colors.text },
  mapLink: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  mapLinkText: { color: colors.primary, fontWeight: "600", fontSize: font.sm },
});
