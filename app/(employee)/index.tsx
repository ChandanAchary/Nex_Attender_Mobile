import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, Loading, Muted, Row } from "@/components/ui";
import { attendance, holidays as holidaysApi } from "@/api/endpoints";
import type { TodayState } from "@/api/types";
import { ApiError } from "@/api/client";
import { getCurrentFix, LocationError, openInMaps } from "@/lib/location";
import { formatDuration, formatTime, statusLabel, todayIso, weekendName } from "@/lib/format";
import { font, spacing, useThemedStyles, type Palette } from "@/theme";
import { haptics } from "@/lib/haptics";

export default function CheckInScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const [today, setToday] = useState<TodayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<"in" | "out" | null>(null);
  const [holiday, setHoliday] = useState<{
    name: string;
    kind: "weekend" | "explicit";
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await attendance.today();
      setToday(data);

      // Weekend is derived locally from the date — works without network.
      const key = todayIso();
      const wk = weekendName(key); // "Saturday" | "Sunday" | null
      let banner: { name: string; kind: "weekend" | "explicit" } | null = wk
        ? { name: wk, kind: "weekend" }
        : null;

      // Explicit holidays (Republic Day, etc.) layer on top — they win the label.
      try {
        const { holidays } = await holidaysApi.list({ from: key, to: key });
        const officeIds = new Set((data.offices ?? []).map((o) => o.id));
        const h = holidays.find(
          (x) => x.officeId === null || (x.officeId !== null && officeIds.has(x.officeId)),
        );
        if (h) banner = { name: h.name, kind: "explicit" };
      } catch {
        /* holidays endpoint may be unavailable — weekend label still shows */
      }
      setHoliday(banner);
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
      haptics.success();
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
      haptics.error();
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
      {holiday ? (
        <Card style={styles.holidayBanner}>
          <View style={styles.holidayHead}>
            <Ionicons name="calendar-clear" size={20} color={colors.accent} />
            <Text style={styles.holidayTitle}>
              {holiday.kind === "weekend" ? "Today is a weekly off" : "Today is a holiday"}
            </Text>
          </View>
          <Muted>
            {holiday.kind === "weekend"
              ? `${holiday.name} — attendance is optional. Any work today counts as extra time.`
              : `${holiday.name} — attendance is optional. If you work today, just check in as usual.`}
          </Muted>
        </Card>
      ) : null}

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

      {user?.role === "ADMIN" ? (
        <Card style={styles.holidayBanner}>
          <View style={styles.holidayHead}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Text style={[styles.holidayTitle, { color: colors.info }]}>Admin Account</Text>
          </View>
          <Muted>Attendance marking is not applicable to administrator accounts.</Muted>
        </Card>
      ) : null}

      <View style={{ gap: spacing.md }}>
        <Button
          title={checkedIn ? "Already checked in" : "Check in"}
          onPress={() => punch("in")}
          loading={busy === "in"}
          disabled={checkedIn || user?.role === "ADMIN"}
        />
        <Button
          title={checkedOut ? "Already checked out" : "Check out"}
          variant="secondary"
          onPress={() => punch("out")}
          loading={busy === "out"}
          disabled={!checkedIn || checkedOut || user?.role === "ADMIN"}
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
  holidayBanner: { borderColor: colors.accent, gap: spacing.xs },
  holidayHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  holidayTitle: { fontSize: font.md, fontWeight: "700", color: colors.accent },
  statusHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusTitle: { fontSize: font.lg, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: font.md, fontWeight: "700", color: colors.text },
  mapLink: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  mapLinkText: { color: colors.primary, fontWeight: "600", fontSize: font.sm },
});
