import React, { useCallback, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, ErrorText, Field, Loading, Muted } from "@/components/ui";
import { leave as leaveApi } from "@/api/endpoints";
import type { Leave, LeaveType } from "@/api/types";
import { ApiError } from "@/api/client";
import { formatDate } from "@/lib/format";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";

const TYPES: LeaveType[] = ["CASUAL", "SICK", "PAID", "UNPAID", "OTHER"];

function toneFor(status: string): "success" | "warning" | "danger" {
  return status === "APPROVED" ? "success" : status === "REJECTED" ? "danger" : "warning";
}

export default function LeaveScreen() {
  const { styles } = useThemedStyles(makeStyles);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [type, setType] = useState<LeaveType>("CASUAL");
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  const [reason, setReason] = useState("");
  const [picker, setPicker] = useState<null | "start" | "end">(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { leaves } = await leaveApi.list();
      setLeaves(leaves);
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

  const submit = async () => {
    setError("");
    if (reason.trim().length < 5) return setError("Please give a brief reason (5+ chars).");
    if (end < start) return setError("End date can't be before start date.");
    setSubmitting(true);
    try {
      await leaveApi.apply({
        type,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        reason: reason.trim(),
      });
      setReason("");
      Alert.alert("Submitted", "Your leave request was sent for approval.");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading label="Loading leave…" />;

  return (
    <Screen
      title="Leave"
      subtitle="Apply and track requests"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
    >
      <Card>
        <Text style={styles.cardTitle}>Apply for leave</Text>

        <View style={{ gap: spacing.xs }}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chips}>
            {TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[styles.chip, type === t && styles.chipActive]}
              >
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.dateRow}>
          <DateField label="From" value={start} onPress={() => setPicker("start")} />
          <DateField label="To" value={end} onPress={() => setPicker("end")} />
        </View>

        <Field
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="Brief reason for leave"
          multiline
          numberOfLines={3}
          style={{ minHeight: 72, textAlignVertical: "top" }}
        />

        <ErrorText>{error}</ErrorText>
        <Button title="Submit request" onPress={submit} loading={submitting} />
      </Card>

      {picker ? (
        <DateTimePicker
          value={picker === "start" ? start : end}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, d) => {
            setPicker(null);
            if (!d) return;
            if (picker === "start") {
              setStart(d);
              if (end < d) setEnd(d);
            } else {
              setEnd(d);
            }
          }}
        />
      ) : null}

      <Text style={styles.sectionHeading}>Your requests</Text>
      {leaves.length === 0 ? (
        <Muted>No leave requests yet.</Muted>
      ) : (
        leaves.map((l) => (
          <Card key={l.id} style={{ gap: spacing.xs }}>
            <View style={styles.leaveHead}>
              <Text style={styles.leaveType}>{l.type}</Text>
              <Badge label={l.status} tone={toneFor(l.status)} />
            </View>
            <Muted>
              {formatDate(l.startDate)} → {formatDate(l.endDate)}
            </Muted>
            <Text style={styles.reason}>{l.reason}</Text>
            {l.reviewNote ? <Muted>Note: {l.reviewNote}</Muted> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

function DateField({ label, value, onPress }: { label: string; value: Date; onPress: () => void }) {
  const { styles, colors } = useThemedStyles(makeStyles);
  return (
    <Pressable style={styles.dateField} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dateBox}>
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
        <Text style={styles.dateText}>{formatDate(value.toISOString())}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  cardTitle: { fontSize: font.md, fontWeight: "700", color: colors.text },
  label: { fontSize: font.sm, fontWeight: "600", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.xs, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: colors.textInverse },
  dateRow: { flexDirection: "row", gap: spacing.md },
  dateField: { flex: 1, gap: spacing.xs },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  dateText: { color: colors.text, fontSize: font.sm, fontWeight: "600" },
  sectionHeading: { fontSize: font.lg, fontWeight: "700", color: colors.text },
  leaveHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  leaveType: { fontSize: font.md, fontWeight: "700", color: colors.text },
  reason: { fontSize: font.sm, color: colors.text },
});
