import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, ErrorText, Field, Loading, Muted } from "@/components/ui";
import { roles as rolesApi, users as usersApi } from "@/api/endpoints";
import type { AdminUser, EmploymentType, RoleItem } from "@/api/types";
import { ApiError } from "@/api/client";
import { formatDate, todayIso } from "@/lib/format";
import { colors, font, radius, spacing } from "@/theme";

const EMPLOYMENT: EmploymentType[] = ["FULL_TIME", "INTERN"];

export default function Employees() {
  const [list, setList] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (query?: string) => {
    try {
      const [{ users }, { roles }] = await Promise.all([
        usersApi.list(query ? { q: query } : undefined),
        rolesApi.list().catch(() => ({ roles: [] as RoleItem[] })),
      ]);
      setList(users);
      setRoles(roles);
    } catch (e) {
      if (e instanceof ApiError && e.status !== 401) Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(q);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const deactivate = (u: AdminUser) => {
    Alert.alert("Deactivate", `Deactivate ${u.name}? They won't be able to sign in.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deactivate",
        style: "destructive",
        onPress: async () => {
          try {
            await usersApi.deactivate(u.id);
            await load(q);
          } catch (e) {
            Alert.alert("Error", e instanceof ApiError ? e.message : "Failed.");
          }
        },
      },
    ]);
  };

  const reactivate = async (u: AdminUser) => {
    try {
      await usersApi.update(u.id, { isActive: true });
      await load(q);
    } catch (e) {
      Alert.alert("Error", e instanceof ApiError ? e.message : "Failed.");
    }
  };

  const resetPw = (u: AdminUser) => {
    Alert.alert("Reset password", `Issue a new temporary password for ${u.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        onPress: async () => {
          try {
            const r = await usersApi.resetPassword(u.id);
            Alert.alert(
              "Password reset",
              r.emailSent
                ? "A new temporary password was emailed."
                : `Temp password: ${r.tempPassword ?? "(check server logs)"}`,
            );
          } catch (e) {
            Alert.alert("Error", e instanceof ApiError ? e.message : "Failed.");
          }
        },
      },
    ]);
  };

  if (loading) return <Loading label="Loading people…" />;

  return (
    <>
      <Screen
        title="People"
        subtitle={`${list.length} employees`}
        right={
          <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Ionicons name="person-add" size={20} color={colors.textInverse} />
          </Pressable>
        }
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load(q);
        }}
      >
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Field
            style={styles.searchInput}
            value={q}
            onChangeText={setQ}
            placeholder="Search name, email or phone"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => load(q)}
          />
        </View>

        {list.map((u) => (
          <Card key={u.id} style={{ gap: spacing.sm }}>
            <View style={styles.rowHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{u.name}</Text>
                <Muted>{u.email ?? u.phone}</Muted>
              </View>
              <Badge label={u.isActive ? u.role : "Inactive"} tone={u.isActive ? "info" : "danger"} />
            </View>
            <View style={styles.metaRow}>
              <Muted>{u.employmentType}</Muted>
              {u.department ? <Muted>· {u.department}</Muted> : null}
              <Muted>· joined {formatDate(u.joinedOn)}</Muted>
            </View>
            <View style={styles.actions}>
              <Button title="Reset password" variant="ghost" onPress={() => resetPw(u)} style={styles.smallBtn} />
              {u.isActive ? (
                <Button title="Deactivate" variant="ghost" onPress={() => deactivate(u)} style={styles.smallBtn} />
              ) : (
                <Button title="Reactivate" variant="ghost" onPress={() => reactivate(u)} style={styles.smallBtn} />
              )}
            </View>
          </Card>
        ))}
      </Screen>

      <CreateEmployeeModal
        visible={showForm}
        roles={roles}
        onClose={() => setShowForm(false)}
        onCreated={() => {
          setShowForm(false);
          load(q);
        }}
      />
    </>
  );
}

function CreateEmployeeModal({
  visible,
  roles,
  onClose,
  onCreated,
}: {
  visible: boolean;
  roles: RoleItem[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("DEVELOPER");
  const [employment, setEmployment] = useState<EmploymentType>("FULL_TIME");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setName("");
      setEmail("");
      setPhone("");
      setRole("DEVELOPER");
      setEmployment("FULL_TIME");
      setDepartment("");
      setError("");
    }
  }, [visible]);

  const roleOptions = roles.length ? roles.map((r) => r.name) : ["ADMIN", "HR", "MANAGER", "DEVELOPER", "INTERN"];

  const submit = async () => {
    setError("");
    if (name.trim().length < 2) return setError("Enter a name.");
    if (!email.includes("@")) return setError("Enter a valid email.");
    if (phone.trim().length < 7) return setError("Enter a valid phone.");
    setSubmitting(true);
    try {
      const r = await usersApi.create({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        employmentType: employment,
        department: department.trim(),
        joinedOn: todayIso(),
      });
      Alert.alert(
        "Employee added",
        r.emailSent
          ? "Login credentials were emailed to the employee."
          : `Temp password: ${r.tempPassword ?? "(check server logs)"}`,
      );
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create employee.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>Onboard employee</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Field label="Full name" value={name} onChangeText={setName} placeholder="Jane Doe" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="jane@company.com" />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+9190000..." />

          <Text style={styles.label}>Role</Text>
          <View style={styles.chips}>
            {roleOptions.map((r) => (
              <Pressable key={r} onPress={() => setRole(r)} style={[styles.chip, role === r && styles.chipActive]}>
                <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Employment</Text>
          <View style={styles.chips}>
            {EMPLOYMENT.map((e) => (
              <Pressable key={e} onPress={() => setEmployment(e)} style={[styles.chip, employment === e && styles.chipActive]}>
                <Text style={[styles.chipText, employment === e && styles.chipTextActive]}>{e}</Text>
              </Pressable>
            ))}
          </View>

          <Field label="Department (optional)" value={department} onChangeText={setDepartment} placeholder="Engineering" />

          <ErrorText>{error}</ErrorText>
          <Button title="Create & send credentials" onPress={submit} loading={submitting} />
          <Muted style={{ textAlign: "center" }}>
            A random password is generated and emailed; the employee changes it on first login.
          </Muted>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchInput: { flex: 1 },
  rowHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontSize: font.md, fontWeight: "700", color: colors.text },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
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
