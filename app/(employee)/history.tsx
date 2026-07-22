import React, { useCallback, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { Screen } from "@/components/Screen";
import { Badge, Card, Loading, Muted, Row } from "@/components/ui";
import { attendance } from "@/api/endpoints";
import type { DayCell, DayStatus, EmployeeMonth } from "@/api/types";
import { ApiError } from "@/api/client";
import { currentMonthIso, formatDate, formatDuration, formatMonthLabel, formatTime } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function statusAbbr(s: DayStatus): string {
  switch (s) {
    case "PRESENT":
      return "P";
    case "ABSENT":
      return "A";
    case "LEAVE":
      return "L";
    case "HOLIDAY":
    case "WEEKEND":
      return "H";
    case "NOT_JOINED":
      return "—";
    default:
      return "·";
  }
}

function statusFullLabel(s: DayStatus): string {
  switch (s) {
    case "PRESENT":
      return "Present";
    case "ABSENT":
      return "Absent";
    case "LEAVE":
      return "On Leave";
    case "HOLIDAY":
      return "Holiday";
    case "WEEKEND":
      return "Weekly Off";
    case "FUTURE":
      return "Future Day";
    case "NOT_JOINED":
      return "Before Joining";
    default:
      return s;
  }
}

export default function StaffHistoryScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonthIso());
  const [myMonthData, setMyMonthData] = useState<EmployeeMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedCell, setSelectedCell] = useState<DayCell | null>(null);

  const load = useCallback(async (m: string) => {
    setError("");
    try {
      const res = await attendance.dayStatus(m);
      const mine = res.rows?.find((r) => r.userId === user?.id) ?? res.rows?.[0] ?? null;
      setMyMonthData(mine);
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

  const handleCellPress = (cell: DayCell) => {
    haptics.selection();
    setSelectedCell(cell);
  };

  if (loading) return <Loading label="Loading your attendance…" />;

  const tot = myMonthData?.totals;
  const pct = tot && tot.workingDays > 0 ? Math.round((tot.present / tot.workingDays) * 100) : 0;

  // Real calendar padding calculation
  const [y, m] = month.split("-").map(Number);
  const firstDayOfWeek = new Date(y, m - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const leadingPadding = Array.from({ length: firstDayOfWeek });

  return (
    <>
      <Screen
        title="My Attendance"
        subtitle={`Monthly summary — ${formatMonthLabel(month)}`}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load(month);
        }}
      >
        {error ? <Muted style={{ color: colors.danger }}>{error}</Muted> : null}

        {/* Month Selector Filter */}
        <View style={styles.monthBar}>
          <Pressable onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.monthText}>{formatMonthLabel(month)}</Text>
          <Pressable onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Monthly Summary Cards */}
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

        {/* Legend */}
        <View style={styles.legendRow}>
          <LegendItem label="P: Present" color={colors.success} />
          <LegendItem label="A: Absent" color={colors.danger} />
          <LegendItem label="L: Leave" color={colors.info} />
          <LegendItem label="H: Holiday" color={colors.warning} />
        </View>

        {/* Real 7-Day Calendar Grid */}
        <Text style={styles.sectionHeader}>Daily Breakdown — Tap a day for details</Text>
        {!myMonthData || myMonthData.days.length === 0 ? (
          <Muted>No attendance records found for {formatMonthLabel(month)}.</Muted>
        ) : (
          <Card style={{ gap: spacing.sm }}>
            {/* Weekday Header Row */}
            <View style={styles.weekdayHeaderRow}>
              {WEEKDAYS.map((dayName, idx) => (
                <View key={dayName} style={styles.weekdayHeaderCell}>
                  <Text
                    style={[
                      styles.weekdayHeaderText,
                      (idx === 0 || idx === 6) && { color: colors.warning },
                    ]}
                  >
                    {dayName}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar Days */}
            <View style={styles.calendarGrid}>
              {/* Empty leading padding slots */}
              {leadingPadding.map((_, i) => (
                <View key={`pad-${i}`} style={styles.dayCellWrapper} />
              ))}

              {/* Days of Month */}
              {myMonthData.days.map((c) => (
                <Pressable
                  key={c.date}
                  style={styles.dayCellWrapper}
                  onPress={() => handleCellPress(c)}
                >
                  <Text style={styles.dayNum}>{c.date.slice(8)}</Text>
                  <View
                    style={[styles.statusBadge, { backgroundColor: getBgColor(c.status, colors) }]}
                  >
                    <Text
                      style={[styles.statusBadgeText, { color: getFgColor(c.status, colors) }]}
                    >
                      {statusAbbr(c.status)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Card>
        )}
      </Screen>

      {/* Staff Self Day Detail Modal */}
      <SelfDayDetailModal
        cell={selectedCell}
        userName={user?.name ?? "Staff"}
        onClose={() => setSelectedCell(null)}
      />
    </>
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

function LegendItem({ label, color }: { label: string; color: string }) {
  const { styles } = useThemedStyles(makeStyles);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function SelfDayDetailModal({
  cell,
  userName,
  onClose,
}: {
  cell: DayCell | null;
  userName: string;
  onClose: () => void;
}) {
  const { styles, colors } = useThemedStyles(makeStyles);
  if (!cell) return null;

  const tone = dayStatusTone(cell.status);
  const titleDate = formatDate(cell.date);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalEmpName}>{userName}</Text>
              <Muted>My Attendance Record</Muted>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.dateBanner}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={styles.dateBannerText}>{titleDate}</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.detailLabel}>Day Status</Text>
              <Badge label={statusFullLabel(cell.status)} tone={tone} />
            </View>

            {cell.holidayName ? <Row label="Holiday / Event" value={cell.holidayName} /> : null}

            {cell.leaveType ? <Row label="Approved Leave" value={`${cell.leaveType} Leave`} /> : null}

            {cell.checkInAt ? (
              <>
                <Row label="Check-in Time" value={formatTime(cell.checkInAt)} />
                <Row label="Check-out Time" value={formatTime(cell.checkOutAt)} />
                {cell.durationMinutes != null ? (
                  <Row label="Total Duration" value={formatDuration(cell.durationMinutes)} />
                ) : null}
              </>
            ) : (
              <Muted style={{ marginTop: spacing.xs }}>
                {cell.status === "ABSENT"
                  ? "No check-in punch was recorded for this working day."
                  : cell.status === "HOLIDAY" || cell.status === "WEEKEND"
                  ? "Excused holiday / weekly off."
                  : cell.status === "LEAVE"
                  ? "Covered by approved leave."
                  : "No attendance record."}
              </Muted>
            )}

            {cell.workedOnHoliday ? (
              <View style={styles.extraBox}>
                <Ionicons name="sparkles" size={16} color={colors.warning} />
                <Text style={styles.extraText}>Worked on Holiday / Off — Extra Time Recorded</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getBgColor(s: DayStatus, colors: Palette): string {
  switch (s) {
    case "PRESENT":
      return colors.successBg;
    case "ABSENT":
      return colors.dangerBg;
    case "LEAVE":
      return colors.infoBg;
    case "HOLIDAY":
    case "WEEKEND":
      return colors.warningBg;
    default:
      return colors.cardMuted;
  }
}

function getFgColor(s: DayStatus, colors: Palette): string {
  switch (s) {
    case "PRESENT":
      return colors.success;
    case "ABSENT":
      return colors.danger;
    case "LEAVE":
      return colors.info;
    case "HOLIDAY":
    case "WEEKEND":
      return colors.warning;
    default:
      return colors.textMuted;
  }
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
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
    extraBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: colors.warningBg,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    extraText: { fontSize: font.xs, fontWeight: "600", color: colors.warning, flex: 1 },
    legendRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingVertical: spacing.xs },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: font.xs, color: colors.textMuted, fontWeight: "600" },
    sectionHeader: { fontSize: font.md, fontWeight: "700", color: colors.text, marginTop: spacing.xs },
    weekdayHeaderRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: spacing.xs,
      marginBottom: spacing.xs,
    },
    weekdayHeaderCell: {
      width: "14.28%",
      alignItems: "center",
    },
    weekdayHeaderText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    dayCellWrapper: {
      width: "14.28%",
      alignItems: "center",
      paddingVertical: 4,
      gap: 4,
    },
    dayNum: { fontSize: 11, fontWeight: "700", color: colors.text },
    statusBadge: {
      width: 28,
      height: 24,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    statusBadgeText: { fontSize: 11, fontWeight: "800" },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    modalContent: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardMuted,
    },
    modalEmpName: { fontSize: font.lg, fontWeight: "800", color: colors.text },
    closeBtn: { padding: spacing.xs },
    modalBody: { padding: spacing.lg, gap: spacing.md },
    dateBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.cardMuted,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    dateBannerText: { fontSize: font.md, fontWeight: "700", color: colors.text },
    detailLabel: { fontSize: font.sm, fontWeight: "700", color: colors.text },
  });
