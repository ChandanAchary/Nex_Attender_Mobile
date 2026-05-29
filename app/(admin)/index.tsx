import React, { useCallback, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, Loading, Muted } from "@/components/ui";
import { attendance, reports } from "@/api/endpoints";
import type { AttendanceDay, DailyRow } from "@/api/types";
import { ApiError } from "@/api/client";
import { formatDate, formatDuration, formatTime, statusLabel, todayIso } from "@/lib/format";
import { openInMaps } from "@/lib/location";
import { shareCsv } from "@/lib/share";
import { colors, font, radius, spacing } from "@/theme";

function rowState(r: DailyRow): { label: string; tone: "success" | "warning" | "danger" | "info" } {
  if (r.onLeave) return { label: "On leave", tone: "info" };
  if (r.checkOutAt) return { label: "Checked out", tone: "success" };
  if (r.checkInAt) return { label: "Present", tone: "success" };
  return { label: "Absent", tone: "danger" };
}

export default function AdminDashboard() {
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState<AttendanceDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async (d: string) => {
    try {
      const res = await attendance.adminDay(d);
      setData(res);
    } catch (e) {
      if (e instanceof ApiError && e.status !== 401) Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(date);
    }, [load, date]),
  );

  const exportCsv = async () => {
    setDownloading(true);
    try {
      const csv = await reports.dailyCsv(date);
      await shareCsv(`attendance-${date}.csv`, csv);
    } catch (e) {
      Alert.alert("Export failed", e instanceof ApiError ? e.message : "Try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <Loading label="Loading dashboard…" />;

  const s = data?.summary;

  return (
    <Screen
      title="Dashboard"
      subtitle={formatDate(date)}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load(date);
      }}
    >
      <Pressable style={styles.dateBar} onPress={() => setShowPicker(true)}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={styles.dateBarText}>{formatDate(date)}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      {showPicker ? (
        <DateTimePicker
          value={new Date(date)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={(_, d) => {
            setShowPicker(false);
            if (d) {
              setLoading(true);
              setDate(d.toISOString().slice(0, 10));
            }
          }}
        />
      ) : null}

      <View style={styles.stats}>
        <Stat label="Present" value={s?.checkedIn ?? 0} color={colors.success} />
        <Stat label="Checked out" value={s?.checkedOut ?? 0} color={colors.primary} />
        <Stat label="On leave" value={s?.onLeave ?? 0} color={colors.info} />
        <Stat label="Absent" value={s?.absent ?? 0} color={colors.danger} />
      </View>

      <Button
        title="Export day as CSV"
        variant="secondary"
        onPress={exportCsv}
        loading={downloading}
      />

      <Text style={styles.heading}>Roster ({data?.rows.length ?? 0})</Text>
      {data?.rows.map((r) => {
        const st = rowState(r);
        return (
          <Card key={r.userId} style={{ gap: spacing.xs }}>
            <View style={styles.rowHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{r.name}</Text>
                <Muted>{r.role}{r.department ? ` · ${r.department}` : ""}</Muted>
              </View>
              <Badge label={st.label} tone={st.tone} />
            </View>
            {r.checkInAt ? (
              <View style={styles.metaRow}>
                <Muted>In {formatTime(r.checkInAt)}</Muted>
                <Muted>Out {formatTime(r.checkOutAt)}</Muted>
                <Muted>{formatDuration(r.durationMinutes)}</Muted>
              </View>
            ) : null}
            {r.checkInAt && r.status ? (
              <View style={styles.metaRow}>
                <Muted>
                  {statusLabel(r.status)}
                  {r.distanceMeters != null ? ` · ${Math.round(r.distanceMeters)} m` : ""}
                </Muted>
                {r.latitude != null && r.longitude != null ? (
                  <Pressable
                    onPress={() => openInMaps(r.latitude!, r.longitude!, r.name)}
                    style={styles.mapLink}
                  >
                    <Ionicons name="map" size={15} color={colors.primary} />
                    <Text style={styles.mapText}>Map</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dateBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  dateBarText: { flex: 1, fontSize: font.md, fontWeight: "600", color: colors.text },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stat: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
  },
  statValue: { fontSize: font.xxl, fontWeight: "800" },
  statLabel: { fontSize: font.xs, color: colors.textMuted, fontWeight: "600" },
  heading: { fontSize: font.lg, fontWeight: "700", color: colors.text },
  rowHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontSize: font.md, fontWeight: "700", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  mapLink: { flexDirection: "row", alignItems: "center", gap: 3 },
  mapText: { color: colors.primary, fontWeight: "600", fontSize: font.xs },
});
