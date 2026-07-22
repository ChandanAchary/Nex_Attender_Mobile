import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { Screen } from "@/components/Screen";
import { Badge, Card, Loading, Muted } from "@/components/ui";
import { attendance } from "@/api/endpoints";
import type { DayStatus, EmployeeMonth, HistoryDay, MonthlyDayStatusResponse } from "@/api/types";
import { ApiError } from "@/api/client";
import { currentMonthIso, formatDate, formatDuration, formatTime, statusLabel } from "@/lib/format";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";

function dayStatusTone(s: DayStatus): "success" | "danger" | "info" | "warning" | undefined {
  switch (s) {
    case "PRESENT":
      return "success";
    case "ABSENT":
      return "danger";
    case "LEAVE":
      return "info";
    case "HOLIDAY":
    case "WEEKEND":
      return "warning";
    default:
      return undefined;
  }
}

export default function HistoryScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonthIso());
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [myMonthData, setMyMonthData] = useState<EmployeeMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"logs" | "daywise">("daywise");

  const load = useCallback(async (m: string) => {
    setError("");
    try {
      const [histRes, dayStatusRes] = await Promise.all([
        attendance.history(),
        attendance.dayStatus(m).catch(() => null as MonthlyDayStatusResponse | null),
      ]);

      setDays(histRes.days);

      if (dayStatusRes && user) {
        const mine = dayStatusRes.rows.find((r) => r.userId === user.id);
        setMyMonthData(mine ?? null);
      } else {
        setMyMonthData(null);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status !== 401) setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load(month);
    }, [load, month]),
  );

  const prevMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    const newMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    setMonth(newMonth);
    setLoading(true);
  };

  const nextMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const next = new Date(y, m, 1);
    const newMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    setMonth(newMonth);
    setLoading(true);
  };

  if (loading) return <Loading label="Loading attendance history…" />;

  const tot = myMonthData?.totals;
  const pct = tot && tot.workingDays > 0 ? Math.round((tot.present / tot.workingDays) * 100) : 0;

  return (
    <Screen
      title="My Attendance"
      subtitle="Day-wise status & log history"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load(month);
      }}
    >
      {error ? <Muted style={{ color: colors.danger }}>{error}</Muted> : null}

      {/* Mode Switcher */}
      <View style={styles.modeTabs}>
        <Pressable
          onPress={() => setViewMode("daywise")}
          style={[styles.modeTab, viewMode === "daywise" && styles.modeTabActive]}
        >
          <Text style={[styles.modeTabText, viewMode === "daywise" && styles.modeTabTextActive]}>
            Day-wise Status
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode("logs")}
          style={[styles.modeTab, viewMode === "logs" && styles.modeTabActive]}
        >
          <Text style={[styles.modeTabText, viewMode === "logs" && styles.modeTabTextActive]}>
            Punches (30 Days)
          </Text>
        </Pressable>
      </View>

      {viewMode === "daywise" ? (
        <>
          {/* Month Selector */}
          <View style={styles.monthBar}>
            <Pressable onPress={prevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.monthText}>{month}</Text>
            <Pressable onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Monthly Totals Summary */}
          {tot ? (
            <Card style={{ gap: spacing.sm }}>
              <View style={styles.summaryHead}>
                <Text style={styles.summaryTitle}>Monthly Summary</Text>
                <Badge label={`${pct}% Attendance`} tone={pct >= 75 ? "success" : "danger"} />
              </View>
              <View style={styles.statsGrid}>
                <Stat label="Present" value={tot.present} color={colors.success} />
                <Stat label="Absent" value={tot.absent} color={colors.danger} />
                <Stat label="On Leave" value={tot.leave} color={colors.info} />
                <Stat label="Holiday / Off" value={tot.holiday} color={colors.warning} />
              </View>
              {tot.extraTimeMinutes > 0 ? (
                <View style={styles.extraBox}>
                  <Ionicons name="time-outline" size={16} color={colors.warning} />
                  <Text style={styles.extraText}>
                    Extra time worked: {formatDuration(tot.extraTimeMinutes)}
                  </Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* Daily Status List */}
          <Text style={styles.sectionHeader}>Daily Status ({myMonthData?.days.length ?? 0} days)</Text>
          {!myMonthData || myMonthData.days.length === 0 ? (
            <Muted>No day-wise status records found for {month}.</Muted>
          ) : (
            myMonthData.days
              .slice()
              .reverse()
              .map((c) => {
                const label = c.holidayName
                  ? `${c.status === "PRESENT" ? "Worked (" + c.holidayName + ")" : c.holidayName}`
                  : c.leaveType
                  ? `On Leave (${c.leaveType})`
                  : c.status;
                return (
                  <Card key={c.date} style={styles.dayCard}>
                    <View style={styles.dayHead}>
                      <Text style={styles.dayDate}>{formatDate(c.date)}</Text>
                      <Badge label={label} tone={dayStatusTone(c.status)} />
                    </View>
                    {c.checkInAt ? (
                      <View style={styles.times}>
                        <Time label="In" value={formatTime(c.checkInAt)} />
                        <Time label="Out" value={formatTime(c.checkOutAt)} />
                        <Time label="Duration" value={formatDuration(c.durationMinutes)} />
                      </View>
                    ) : (
                      <Muted style={{ fontSize: font.xs }}>
                        {c.status === "ABSENT"
                          ? "No check-in recorded for this working day."
                          : c.holidayName
                          ? "Excused holiday / weekly off."
                          : c.leaveType
                          ? `Covered by approved ${c.leaveType} leave.`
                          : "No punch activity."}
                      </Muted>
                    )}
                  </Card>
                );
              })
          )}
        </>
      ) : (
        /* Punches History Mode */
        <>
          <Text style={styles.sectionHeader}>Recent Check-ins (Last 30 Days)</Text>
          {days.length === 0 ? (
            <Card>
              <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg }}>
                <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
                <Muted>No attendance logs in the last 30 days.</Muted>
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
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Time({ label, value }: { label: string; value: string }) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <View style={styles.timeBox}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    modeTabs: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
    },
    modeTab: { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radius.sm },
    modeTabActive: { backgroundColor: colors.primary },
    modeTabText: { fontSize: font.xs, fontWeight: "700", color: colors.textMuted },
    modeTabTextActive: { color: colors.textInverse },
    monthBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
    },
    monthText: { fontSize: font.md, fontWeight: "700", color: colors.text },
    navBtn: { padding: spacing.xs },
    summaryHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    summaryTitle: { fontSize: font.md, fontWeight: "700", color: colors.text },
    statsGrid: { flexDirection: "row", gap: spacing.xs },
    statCard: {
      flex: 1,
      backgroundColor: colors.cardMuted,
      borderRadius: radius.sm,
      padding: spacing.sm,
      alignItems: "center",
    },
    statValue: { fontSize: font.lg, fontWeight: "800" },
    statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "600" },
    extraBox: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    extraText: { fontSize: font.xs, fontWeight: "600", color: colors.text },
    sectionHeader: { fontSize: font.md, fontWeight: "700", color: colors.text, marginTop: spacing.xs },
    dayCard: { gap: spacing.sm },
    dayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    dayDate: { fontSize: font.md, fontWeight: "700", color: colors.text },
    times: { flexDirection: "row", gap: spacing.sm },
    timeBox: { flex: 1, backgroundColor: colors.cardMuted, borderRadius: 10, padding: spacing.sm },
    timeLabel: { fontSize: font.xs, color: colors.textMuted, fontWeight: "600" },
    timeValue: { fontSize: font.md, color: colors.text, fontWeight: "700", marginTop: 2 },
    footer: { flexDirection: "row", justifyContent: "space-between" },
  });
