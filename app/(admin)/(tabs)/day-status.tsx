import React, { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, Loading, Muted, Row } from "@/components/ui";
import { attendance, offices as officesApi, reports } from "@/api/endpoints";
import type { DayCell, DayStatus, EmployeeMonth, MonthlyDayStatusResponse, Office } from "@/api/types";
import { ApiError } from "@/api/client";
import { currentMonthIso, formatDate, formatDuration, formatMonthLabel, formatTime } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { shareXls } from "@/lib/share";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function statusTone(s: DayStatus): "success" | "danger" | "info" | "warning" | undefined {
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

interface SelectedDayDetail {
  employee: EmployeeMonth;
  cell: DayCell;
}

export default function DayStatusScreen() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const [month, setMonth] = useState(currentMonthIso());
  const [officeId, setOfficeId] = useState("");
  const [offices, setOffices] = useState<Office[]>([]);
  const [data, setData] = useState<MonthlyDayStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<SelectedDayDetail | null>(null);

  const load = useCallback(async (m: string, oId: string) => {
    try {
      const [res, { offices: offs }] = await Promise.all([
        attendance.dayStatus(m, oId || undefined),
        officesApi.list().catch(() => ({ offices: [] as Office[] })),
      ]);
      setData(res);
      setOffices(offs);
    } catch (e) {
      if (e instanceof ApiError && e.status !== 401) Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(month, officeId);
    }, [load, month, officeId]),
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

  const exportExcel = async () => {
    setDownloading(true);
    try {
      const xls = await reports.dayStatusXls(month, officeId || undefined);
      await shareXls(`attendance-status-${month}.xls`, xls);
    } catch (e) {
      Alert.alert("Export failed", e instanceof ApiError ? e.message : "Try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCellPress = (employee: EmployeeMonth, cell: DayCell) => {
    haptics.selection();
    setSelectedDayDetail({ employee, cell });
  };

  if (loading) return <Loading label="Loading attendance status…" />;

  // Real calendar padding calculation
  const [y, m] = month.split("-").map(Number);
  const firstDayOfWeek = new Date(y, m - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const leadingPadding = Array.from({ length: firstDayOfWeek });

  return (
    <>
      <Screen
        title="Attendance Status"
        subtitle={`Monthly breakdown — ${formatMonthLabel(month)}`}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load(month, officeId);
        }}
      >
        {/* Month Selector Bar */}
        <View style={styles.monthBar}>
          <Pressable onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.monthText}>{formatMonthLabel(month)}</Text>
          <Pressable onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Office Filter Chips */}
        {offices.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Pressable
              onPress={() => {
                setOfficeId("");
                setLoading(true);
              }}
              style={[styles.chip, officeId === "" && styles.chipActive]}
            >
              <Text style={[styles.chipText, officeId === "" && styles.chipTextActive]}>All Offices</Text>
            </Pressable>
            {offices.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => {
                  setOfficeId(o.id);
                  setLoading(true);
                }}
                style={[styles.chip, officeId === o.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, officeId === o.id && styles.chipTextActive]}>{o.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <Button title="Export Excel (.xls)" variant="secondary" onPress={exportExcel} loading={downloading} />

        {/* Legend */}
        <View style={styles.legendRow}>
          <LegendItem label="P: Present" color={colors.success} />
          <LegendItem label="A: Absent" color={colors.danger} />
          <LegendItem label="L: Leave" color={colors.info} />
          <LegendItem label="H: Holiday" color={colors.warning} />
        </View>

        {/* Employee Roster */}
        <Text style={styles.sectionHeader}>Employees ({data?.rows.length ?? 0})</Text>
        {data?.rows.length === 0 ? (
          <Muted>No employees found for this selection.</Muted>
        ) : (
          data?.rows.map((row) => {
            const isExpanded = expandedUser === row.userId;
            const tot = row.totals;
            const pct = tot.workingDays > 0 ? Math.round((tot.present / tot.workingDays) * 100) : 0;
            return (
              <Card key={row.userId} style={{ gap: spacing.xs }}>
                <Pressable
                  onPress={() => setExpandedUser(isExpanded ? null : row.userId)}
                  style={styles.rowHead}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.empName}>{row.name}</Text>
                    <Muted>
                      {row.role}
                      {row.department ? ` · ${row.department}` : ""}
                    </Muted>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Badge
                      label={`${pct}% Attendance`}
                      tone={pct >= 75 ? "success" : "danger"}
                    />
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.textMuted}
                    />
                  </View>
                </Pressable>

                {/* Employee Monthly Totals */}
                <View style={styles.totalsRow}>
                  <Text style={styles.totalBadge}>P: {tot.present}</Text>
                  <Text style={styles.totalBadge}>A: {tot.absent}</Text>
                  <Text style={styles.totalBadge}>L: {tot.leave}</Text>
                  <Text style={styles.totalBadge}>H: {tot.holiday}</Text>
                  {tot.extraTimeMinutes > 0 ? (
                    <Text style={styles.totalBadge}>Extra: {formatDuration(tot.extraTimeMinutes)}</Text>
                  ) : null}
                </View>

                {/* Expandable Real 7-Day Calendar Grid */}
                {isExpanded ? (
                  <View style={styles.daysContainer}>
                    <Text style={styles.gridHeader}>Daily Breakdown — Tap a day for full details</Text>
                    
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

                    {/* Calendar Days Grid */}
                    <View style={styles.calendarGrid}>
                      {/* Leading empty padding */}
                      {leadingPadding.map((_, i) => (
                        <View key={`pad-${i}`} style={styles.dayCellWrapper} />
                      ))}

                      {/* Day Cells */}
                      {row.days.map((c) => (
                        <Pressable
                          key={c.date}
                          style={styles.dayCellWrapper}
                          onPress={() => handleCellPress(row, c)}
                        >
                          <Text style={styles.dayNum}>{c.date.slice(8)}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: getBgColor(c.status, colors) }]}>
                            <Text style={[styles.statusBadgeText, { color: getFgColor(c.status, colors) }]}>
                              {statusAbbr(c.status)}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </Screen>

      {/* Day Detail Modal */}
      <DayDetailModal
        detail={selectedDayDetail}
        onClose={() => setSelectedDayDetail(null)}
      />
    </>
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

function DayDetailModal({
  detail,
  onClose,
}: {
  detail: SelectedDayDetail | null;
  onClose: () => void;
}) {
  const { styles, colors } = useThemedStyles(makeStyles);
  if (!detail) return null;

  const { employee, cell } = detail;
  const tone = statusTone(cell.status);
  const titleDate = formatDate(cell.date);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalEmpName}>{employee.name}</Text>
              <Muted>{employee.role}{employee.department ? ` · ${employee.department}` : ""}</Muted>
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

            {cell.holidayName ? (
              <Row label="Holiday / Event" value={cell.holidayName} />
            ) : null}

            {cell.leaveType ? (
              <Row label="Approved Leave" value={`${cell.leaveType} Leave`} />
            ) : null}

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
                  ? "Excused holiday / weekly off. No attendance required."
                  : cell.status === "LEAVE"
                  ? "Covered by approved leave."
                  : "No attendance record."}
              </Muted>
            )}

            {cell.workedOnHoliday ? (
              <View style={styles.extraBox}>
                <Ionicons name="sparkles" size={16} color={colors.warning} />
                <Text style={styles.extraText}>Worked on Holiday / Off — Flagged as Extra Time</Text>
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
    chips: { gap: spacing.xs },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: font.xs, fontWeight: "700", color: colors.textMuted },
    chipTextActive: { color: colors.textInverse },
    legendRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingVertical: spacing.xs },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: font.xs, color: colors.textMuted, fontWeight: "600" },
    sectionHeader: { fontSize: font.md, fontWeight: "700", color: colors.text, marginTop: spacing.xs },
    rowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    empName: { fontSize: font.md, fontWeight: "700", color: colors.text },
    totalsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
    totalBadge: {
      fontSize: font.xs,
      fontWeight: "600",
      color: colors.textMuted,
      backgroundColor: colors.cardMuted,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radius.sm,
    },
    daysContainer: { marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
    gridHeader: { fontSize: font.xs, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.sm },
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
    extraBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: colors.warningBg,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    extraText: { fontSize: font.xs, fontWeight: "700", color: colors.warning, flex: 1 },
  });
