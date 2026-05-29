import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Badge, Card, Loading, Muted } from "@/components/ui";
import { attendance } from "@/api/endpoints";
import type { HistoryDay } from "@/api/types";
import { ApiError } from "@/api/client";
import { formatDate, formatDuration, formatTime, statusLabel, todayIso } from "@/lib/format";
import { colors, font, spacing } from "@/theme";

export default function HistoryScreen() {
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      // The server exposes only today's attendance to employees, so history
      // shows today's record. (No employee history API exists server-side.)
      const t = await attendance.today();
      const day: HistoryDay | null = t.checkIn
        ? {
            date: todayIso(),
            checkIn: t.checkIn,
            checkOut: t.checkOut,
            durationMinutes: t.durationMinutes,
          }
        : null;
      setDays(day ? [day] : []);
    } catch (e) {
      if (e instanceof ApiError && e.status !== 401) setError(e.message);
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

  if (loading) return <Loading label="Loading history…" />;

  return (
    <Screen
      title="History"
      subtitle="Today's attendance"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
    >
      {error ? <Muted style={{ color: colors.danger }}>{error}</Muted> : null}

      {days.length === 0 ? (
        <Card>
          <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg }}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            <Muted>No check-in recorded today.</Muted>
          </View>
        </Card>
      ) : (
        days.map((d) => {
          const inPunch = d.checkIn;
          const within = inPunch?.status === "WITHIN_RANGE";
          return (
            <Card key={d.date} style={styles.dayCard}>
              <View style={styles.dayHead}>
                <Text style={styles.dayDate}>{formatDate(d.checkIn?.capturedAt ?? d.date)}</Text>
                {inPunch ? (
                  <Badge label={statusLabel(inPunch.status)} tone={within ? "success" : "warning"} />
                ) : null}
              </View>
              <View style={styles.times}>
                <Time label="In" value={formatTime(d.checkIn?.capturedAt)} />
                <Time label="Out" value={formatTime(d.checkOut?.capturedAt)} />
                <Time label="Total" value={formatDuration(d.durationMinutes)} />
              </View>
              {inPunch?.nearestOffice ? (
                <View style={styles.footer}>
                  <Muted>{inPunch.nearestOffice.name}</Muted>
                  {inPunch.distanceMeters != null ? (
                    <Muted>{Math.round(inPunch.distanceMeters)} m away</Muted>
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      <Card>
        <Muted>
          Full 30-day history is available in the web app. The mobile app shows today's
          record because the server doesn't expose a per-employee history API.
        </Muted>
      </Card>
    </Screen>
  );
}

function Time({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.timeBox}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dayCard: { gap: spacing.sm },
  dayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayDate: { fontSize: font.md, fontWeight: "700", color: colors.text },
  times: { flexDirection: "row", gap: spacing.sm },
  timeBox: { flex: 1, backgroundColor: colors.cardMuted, borderRadius: 10, padding: spacing.sm },
  timeLabel: { fontSize: font.xs, color: colors.textMuted, fontWeight: "600" },
  timeValue: { fontSize: font.md, color: colors.text, fontWeight: "700", marginTop: 2 },
  footer: { flexDirection: "row", justifyContent: "space-between" },
});
