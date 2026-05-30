import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, ErrorText, Field, Loading, Muted } from "@/components/ui";
import { holidays as holidaysApi, offices as officesApi } from "@/api/endpoints";
import type { Holiday, HolidayType, Office } from "@/api/types";
import { ApiError } from "@/api/client";
import { formatDate } from "@/lib/format";
import { haptics } from "@/lib/haptics";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";

const TYPES: HolidayType[] = ["PUBLIC", "OPTIONAL"];
const typeLabel = (t: HolidayType) => (t === "PUBLIC" ? "Public" : "Optional");

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function Holidays() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const [list, setList] = useState<Holiday[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Holiday | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ holidays }, { offices: offs }] = await Promise.all([
        holidaysApi.list(),
        officesApi.list().catch(() => ({ offices: [] as Office[] })),
      ]);
      setList(holidays);
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
      load();
    }, [load]),
  );

  const remove = (h: Holiday) => {
    Alert.alert("Delete holiday", `Remove "${h.name}" on ${formatDate(h.date)}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await holidaysApi.remove(h.id);
            haptics.success();
            await load();
          } catch (e) {
            haptics.error();
            Alert.alert("Error", e instanceof ApiError ? e.message : "Failed.");
          }
        },
      },
    ]);
  };

  if (loading) return <Loading label="Loading holidays…" />;

  return (
    <>
      <Screen
        title="Holidays"
        subtitle={`${list.length} on the calendar`}
        right={
          <Pressable style={styles.addBtn} onPress={() => setEditing("new")}>
            <Ionicons name="add" size={24} color={colors.textInverse} />
          </Pressable>
        }
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
      >
        <Card>
          <Muted>
            Holidays are a reference, not a lock. Nobody is marked absent on a holiday, and anyone
            who still checks in is recorded as working on a holiday.
          </Muted>
        </Card>

        {list.length === 0 ? (
          <Muted>No holidays added yet.</Muted>
        ) : (
          list.map((h) => (
            <Card key={h.id} style={{ gap: spacing.xs }}>
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{h.name}</Text>
                  <Muted>{formatDate(h.date)}</Muted>
                </View>
                <Badge label={typeLabel(h.type)} tone={h.type === "PUBLIC" ? "info" : "warning"} />
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="business-outline" size={14} color={colors.textMuted} />
                <Muted>{h.office ? h.office.name : "All offices"}</Muted>
              </View>
              {h.description ? <Text style={styles.desc}>{h.description}</Text> : null}
              <View style={styles.actions}>
                <Button title="Edit" variant="ghost" onPress={() => setEditing(h)} style={styles.smallBtn} />
                <Button title="Delete" variant="ghost" onPress={() => remove(h)} style={styles.smallBtn} />
              </View>
            </Card>
          ))
        )}
      </Screen>

      <HolidayModal
        holiday={editing}
        offices={offices}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

function HolidayModal({
  holiday,
  offices,
  onClose,
  onSaved,
}: {
  holiday: Holiday | "new" | null;
  offices: Office[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { styles, colors } = useThemedStyles(makeStyles);
  const isNew = holiday === "new";
  const existing = holiday && holiday !== "new" ? holiday : null;

  const [date, setDate] = useState(new Date());
  const [name, setName] = useState("");
  const [type, setType] = useState<HolidayType>("PUBLIC");
  const [officeId, setOfficeId] = useState(""); // "" = all
  const [description, setDescription] = useState("");
  const [picker, setPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (holiday === null) return;
    setError("");
    if (existing) {
      setDate(new Date(`${existing.date}T00:00:00`));
      setName(existing.name);
      setType(existing.type);
      setOfficeId(existing.officeId ?? "");
      setDescription(existing.description ?? "");
    } else {
      setDate(new Date());
      setName("");
      setType("PUBLIC");
      setOfficeId("");
      setDescription("");
    }
  }, [holiday]);

  const submit = async () => {
    setError("");
    if (name.trim().length < 2) return setError("Enter a holiday name.");
    setSubmitting(true);
    const payload = {
      date: ymd(date),
      name: name.trim(),
      type,
      description: description.trim(),
      officeId: officeId || "",
    };
    try {
      if (existing) await holidaysApi.update(existing.id, payload);
      else await holidaysApi.create(payload);
      haptics.success();
      onSaved();
    } catch (e) {
      haptics.error();
      setError(e instanceof ApiError ? e.message : "Could not save holiday.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={holiday !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>{isNew ? "Add holiday" : "Edit holiday"}</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Pressable style={{ gap: spacing.xs }} onPress={() => setPicker(true)}>
            <Text style={styles.label}>Date</Text>
            <View style={styles.dateBox}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <Text style={styles.dateText}>{formatDate(ymd(date))}</Text>
            </View>
          </Pressable>
          {picker ? (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, d) => {
                setPicker(false);
                if (d) setDate(d);
              }}
            />
          ) : null}

          <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Republic Day" />

          <Text style={styles.label}>Type</Text>
          <View style={styles.chips}>
            {TYPES.map((t) => (
              <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipActive]}>
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{typeLabel(t)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Applies to</Text>
          <View style={styles.chips}>
            <Pressable onPress={() => setOfficeId("")} style={[styles.chip, officeId === "" && styles.chipActive]}>
              <Text style={[styles.chipText, officeId === "" && styles.chipTextActive]}>All offices</Text>
            </Pressable>
            {offices.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => setOfficeId(o.id)}
                style={[styles.chip, officeId === o.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, officeId === o.id && styles.chipTextActive]}>{o.name}</Text>
              </Pressable>
            ))}
          </View>

          <Field
            label="Note (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
          />

          <ErrorText>{error}</ErrorText>
          <Button title={isNew ? "Add holiday" : "Save changes"} onPress={submit} loading={submitting} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    name: { fontSize: font.md, fontWeight: "700", color: colors.text },
    metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    desc: { fontSize: font.sm, color: colors.text },
    actions: { flexDirection: "row", gap: spacing.sm },
    smallBtn: { flex: 1, height: 42 },
    modalRoot: { flex: 1, backgroundColor: colors.cardMuted },
    modalHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: font.lg, fontWeight: "800", color: colors.text },
    modalBody: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    label: { fontSize: font.sm, fontWeight: "600", color: colors.text },
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
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
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
  });
