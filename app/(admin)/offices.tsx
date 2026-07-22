import React, { useCallback, useEffect, useState } from "react";
import { Alert, BackHandler, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, ErrorText, Field, Loading, Muted } from "@/components/ui";
import { geo, offices as officesApi } from "@/api/endpoints";
import type { GeocodeResult, Office } from "@/api/types";
import { ApiError } from "@/api/client";
import { getCurrentFix, LocationError, openInMaps } from "@/lib/location";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";

export default function Offices() {
  const { styles, colors } = useThemedStyles(makeStyles);
  const router = useRouter();
  const [list, setList] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Office | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const { offices } = await officesApi.list();
      setList(offices);
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

  if (loading) return <Loading label="Loading offices…" />;

  return (
    <>
      <Screen
        title="Offices"
        subtitle={`${list.length} geofences`}
        showBack
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
        {list.map((o) => (
          <Card key={o.id} style={{ gap: spacing.sm }}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{o.name}</Text>
                <Muted>{o.code} · {o.city}</Muted>
              </View>
              <Badge label={o.isActive ? "Active" : "Inactive"} tone={o.isActive ? "success" : "danger"} />
            </View>
            <Muted>{o.addressLine1}{o.addressLine2 ? `, ${o.addressLine2}` : ""}</Muted>
            <View style={styles.metaRow}>
              <Muted>Radius {o.attendanceRadiusMeters} m</Muted>
              <Muted>· Start {o.startTime}</Muted>
              {o._count ? <Muted>· {o._count.employees} staff</Muted> : null}
            </View>
            <View style={styles.actions}>
              <Button
                title="View on map"
                variant="ghost"
                onPress={() => openInMaps(o.latitude, o.longitude, o.name)}
                style={styles.smallBtn}
              />
              <Button title="Edit" variant="ghost" onPress={() => setEditing(o)} style={styles.smallBtn} />
            </View>
          </Card>
        ))}
      </Screen>

      <OfficeModal
        office={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

function OfficeModal({
  office,
  onClose,
  onSaved,
}: {
  office: Office | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { styles, colors } = useThemedStyles(makeStyles);
  const isNew = office === "new";
  const existing = office && office !== "new" ? office : null;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("150");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (office === null) return;
    setError("");
    setResults([]);
    setQuery("");
    if (existing) {
      setCode(existing.code);
      setName(existing.name);
      setAddress(existing.addressLine1);
      setCity(existing.city);
      setPincode(existing.pincode ?? "");
      setLat(String(existing.latitude));
      setLng(String(existing.longitude));
      setRadius(String(existing.attendanceRadiusMeters));
    } else {
      setCode("");
      setName("");
      setAddress("");
      setCity("");
      setPincode("");
      setLat("");
      setLng("");
      setRadius("150");
    }
  }, [office]);

  const search = async () => {
    if (query.trim().length < 3) return;
    setSearching(true);
    try {
      const { results } = await geo.search(query.trim());
      setResults(results);
    } catch (e) {
      Alert.alert("Search failed", e instanceof ApiError ? e.message : "Try again.");
    } finally {
      setSearching(false);
    }
  };

  const pick = (r: GeocodeResult) => {
    setLat(String(r.latitude));
    setLng(String(r.longitude));
    if (!city && r.city) setCity(r.city);
    if (!pincode && r.pincode) setPincode(r.pincode);
    if (!address) setAddress(r.label);
    setResults([]);
    setQuery(r.label);
  };

  const lookupPincode = async () => {
    if (!/^\d{6}$/.test(pincode)) return Alert.alert("Pincode", "Enter a 6-digit pincode.");
    try {
      const r = await geo.pincode(pincode);
      if (r.latitude != null && r.longitude != null) {
        setLat(String(r.latitude));
        setLng(String(r.longitude));
      }
      if (!city && r.city) setCity(r.city);
    } catch (e) {
      Alert.alert("Lookup failed", e instanceof ApiError ? e.message : "Try again.");
    }
  };

  const useCurrent = async () => {
    try {
      const fix = await getCurrentFix();
      setLat(String(fix.latitude));
      setLng(String(fix.longitude));
    } catch (e) {
      Alert.alert("Location", e instanceof LocationError ? e.message : "Could not get location.");
    }
  };

  const submit = async () => {
    setError("");
    const latN = Number(lat);
    const lngN = Number(lng);
    const radN = Number(radius);
    if (!code.trim()) return setError("Code is required.");
    if (name.trim().length < 2) return setError("Name is required.");
    if (Number.isNaN(latN) || Number.isNaN(lngN)) return setError("Pin a location (search, pincode, or current).");
    if (radN < 30 || radN > 2000) return setError("Radius must be 30–2000 m.");
    setSubmitting(true);
    const payload = {
      code: code.trim(),
      name: name.trim(),
      addressLine1: address.trim() || name.trim(),
      city: city.trim() || "—",
      pincode: pincode.trim(),
      latitude: latN,
      longitude: lngN,
      attendanceRadiusMeters: Math.round(radN),
    };
    try {
      if (existing) await officesApi.update(existing.id, payload);
      else await officesApi.create(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save office.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={office !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>{isNew ? "Add office" : "Edit office"}</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Field label="Code" value={code} onChangeText={setCode} placeholder="HQ" autoCapitalize="characters" />
          <Field label="Name" value={name} onChangeText={setName} placeholder="Head Office" />
          <Field label="Address" value={address} onChangeText={setAddress} placeholder="Street, area" />
          <Field label="City" value={city} onChangeText={setCity} placeholder="Bhubaneswar" />

          <Text style={styles.label}>Find location</Text>
          <View style={styles.searchRow}>
            <Field style={{ flex: 1 }} value={query} onChangeText={setQuery} placeholder="Search address" onSubmitEditing={search} returnKeyType="search" />
            <Button title="Search" onPress={search} loading={searching} style={styles.searchBtn} />
          </View>
          {results.map((r, i) => (
            <Pressable key={i} style={styles.result} onPress={() => pick(r)}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={styles.resultText} numberOfLines={2}>{r.label}</Text>
            </Pressable>
          ))}

          <View style={styles.searchRow}>
            <Field label="Pincode" style={{ flex: 1 }} value={pincode} onChangeText={setPincode} keyboardType="number-pad" maxLength={6} placeholder="751024" />
            <Button title="Lookup" variant="secondary" onPress={lookupPincode} style={[styles.searchBtn, { marginTop: 22 }]} />
          </View>

          <View style={styles.coordRow}>
            <Field label="Latitude" style={{ flex: 1 }} value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" placeholder="20.29" />
            <Field label="Longitude" style={{ flex: 1 }} value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" placeholder="85.82" />
          </View>
          <Button title="Use my current location" variant="ghost" onPress={useCurrent} />

          <Field label="Geofence radius (metres)" value={radius} onChangeText={setRadius} keyboardType="number-pad" placeholder="150" />

          <ErrorText>{error}</ErrorText>
          <Button title={isNew ? "Create office" : "Save changes"} onPress={submit} loading={submitting} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
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
  searchRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" },
  searchBtn: { width: 90 },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  resultText: { flex: 1, fontSize: font.sm, color: colors.text },
  coordRow: { flexDirection: "row", gap: spacing.md },
});
