import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, Loading, Muted } from "@/components/ui";
import { leave as leaveApi } from "@/api/endpoints";
import type { Leave, LeaveStatus } from "@/api/types";
import { ApiError } from "@/api/client";
import { formatDate } from "@/lib/format";
import { colors, font, radius, spacing } from "@/theme";

const FILTERS: Array<{ key: LeaveStatus | "ALL"; label: string }> = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

function tone(status: string): "success" | "warning" | "danger" {
  return status === "APPROVED" ? "success" : status === "REJECTED" ? "danger" : "warning";
}

export default function AdminLeave() {
  const [filter, setFilter] = useState<LeaveStatus | "ALL">("PENDING");
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async (f: LeaveStatus | "ALL") => {
    try {
      const { leaves } = await leaveApi.list({
        scope: "all",
        status: f === "ALL" ? undefined : f,
      });
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
      load(filter);
    }, [load, filter]),
  );

  const review = async (l: Leave, decision: "APPROVE" | "REJECT") => {
    setActingId(l.id);
    try {
      await leaveApi.review(l.id, decision);
      await load(filter);
    } catch (e) {
      Alert.alert("Error", e instanceof ApiError ? e.message : "Failed.");
    } finally {
      setActingId(null);
    }
  };

  if (loading) return <Loading label="Loading requests…" />;

  return (
    <Screen
      title="Leave requests"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load(filter);
      }}
    >
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => {
              setLoading(true);
              setFilter(f.key);
            }}
            style={[styles.filter, filter === f.key && styles.filterActive]}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {leaves.length === 0 ? (
        <Muted>No {filter === "ALL" ? "" : filter.toLowerCase()} requests.</Muted>
      ) : (
        leaves.map((l) => (
          <Card key={l.id} style={{ gap: spacing.sm }}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{l.user?.name ?? "Employee"}</Text>
                <Muted>
                  {l.user?.role}
                  {l.user?.department ? ` · ${l.user.department}` : ""}
                </Muted>
              </View>
              <Badge label={l.status} tone={tone(l.status)} />
            </View>
            <View style={styles.metaRow}>
              <Badge label={l.type} tone="info" />
              <Muted>
                {formatDate(l.startDate)} → {formatDate(l.endDate)}
              </Muted>
            </View>
            <Text style={styles.reason}>{l.reason}</Text>
            {l.status === "PENDING" ? (
              <View style={styles.actions}>
                <Button
                  title="Approve"
                  onPress={() => review(l, "APPROVE")}
                  loading={actingId === l.id}
                  style={styles.actionBtn}
                />
                <Button
                  title="Reject"
                  variant="danger"
                  onPress={() => review(l, "REJECT")}
                  loading={actingId === l.id}
                  style={styles.actionBtn}
                />
              </View>
            ) : l.reviewedBy ? (
              <Muted>
                Reviewed by {l.reviewedBy.name}
                {l.reviewNote ? ` · ${l.reviewNote}` : ""}
              </Muted>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", gap: spacing.sm },
  filter: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: font.xs, fontWeight: "700", color: colors.textMuted },
  filterTextActive: { color: colors.textInverse },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontSize: font.md, fontWeight: "700", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reason: { fontSize: font.sm, color: colors.text },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: { flex: 1, height: 44 },
});
