import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Muted } from "@/components/ui";
import { getCurrentFix, openInMaps } from "@/lib/location";
import { font, radius, spacing, useThemedStyles, type Palette } from "@/theme";
import { haptics } from "@/lib/haptics";

interface OfficeLocation {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  attendanceRadiusMeters: number;
}

interface OfficeMapViewProps {
  office: OfficeLocation;
  height?: number;
  showDetails?: boolean;
}

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function generateLeafletHtml(
  office: OfficeLocation,
  userLoc: { latitude: number; longitude: number } | null,
  withinRange: boolean,
  distance: number | null,
): string {
  const userLatStr = userLoc ? userLoc.latitude : "null";
  const userLngStr = userLoc ? userLoc.longitude : "null";
  const distText = distance != null ? `${Math.round(distance)} m away` : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0F172A; }
    .leaflet-container { background: #0F172A; font-family: system-ui, -apple-system, sans-serif; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-popup-content-wrapper { background: #1E293B; color: #F8FAFC; border-radius: 8px; border: 1px solid #334155; }
    .leaflet-popup-tip { background: #1E293B; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var officeLat = ${office.latitude};
    var officeLng = ${office.longitude};
    var radius = ${office.attendanceRadiusMeters};
    var userLat = ${userLatStr};
    var userLng = ${userLngStr};

    var map = L.map('map', { zoomControl: false }).setView([officeLat, officeLng], 17);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    // Geofence Circle
    var circle = L.circle([officeLat, officeLng], {
      color: '#6366F1',
      fillColor: '#6366F1',
      fillOpacity: 0.25,
      weight: 2
    }).addTo(map);
    circle.setRadius(radius);

    // Office Marker
    var officeMarker = L.marker([officeLat, officeLng]).addTo(map);
    officeMarker.bindPopup("<b>${office.name}</b><br>Geofence Radius: " + radius + " m");

    // User Location Marker
    if (userLat !== null && userLng !== null) {
      var userColor = ${withinRange ? "'#10B981'" : "'#F59E0B'"};
      var userMarker = L.circleMarker([userLat, userLng], {
        radius: 9,
        color: '#FFFFFF',
        fillColor: userColor,
        fillOpacity: 1,
        weight: 3
      }).addTo(map);
      userMarker.bindPopup("<b>You (Current Location)</b><br>" + "${distText}");

      var bounds = L.latLngBounds([
        [officeLat, officeLng],
        [userLat, userLng]
      ]);
      map.fitBounds(bounds.pad(0.35));
    }
  </script>
</body>
</html>
`;
}

export function OfficeMapView({ office, height = 240, showDetails = true }: OfficeMapViewProps) {
  const { styles, colors } = useThemedStyles(makeStyles);
  const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [fullModal, setFullModal] = useState(false);

  const fetchUserLoc = async () => {
    setLoadingLoc(true);
    try {
      const fix = await getCurrentFix();
      setUserLoc({ latitude: fix.latitude, longitude: fix.longitude });
      const dist = haversineDistanceMeters(
        fix.latitude,
        fix.longitude,
        office.latitude,
        office.longitude,
      );
      setDistance(dist);
    } catch {
      /* location permission or fix failed */
    } finally {
      setLoadingLoc(false);
    }
  };

  useEffect(() => {
    fetchUserLoc();
  }, [office.latitude, office.longitude]);

  const withinRange = distance != null ? distance <= office.attendanceRadiusMeters : false;
  const htmlContent = generateLeafletHtml(office, userLoc, withinRange, distance);

  return (
    <>
      <View style={[styles.cardContainer, { height }]}>
        <WebView
          originWhitelist={["*"]}
          source={{ html: htmlContent }}
          style={StyleSheet.absoluteFillObject}
          scrollEnabled={false}
        />

        {/* Map Header Overlay */}
        <View style={styles.headerOverlay}>
          <View style={{ flex: 1 }}>
            <Text style={styles.officeNameText}>{office.name}</Text>
            <Muted style={{ fontSize: 11 }}>Radius: {office.attendanceRadiusMeters} m</Muted>
          </View>
          {distance != null ? (
            <Badge
              label={withinRange ? "Within Range" : `${Math.round(distance)}m Away`}
              tone={withinRange ? "success" : "warning"}
            />
          ) : null}
        </View>

        {/* Map Action Floating Controls */}
        <View style={styles.controlsOverlay}>
          <Pressable style={styles.iconBtn} onPress={fetchUserLoc}>
            {loadingLoc ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="locate" size={18} color={colors.primary} />
            )}
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setFullModal(true)}>
            <Ionicons name="expand" size={18} color={colors.primary} />
          </Pressable>
        </View>

        {showDetails ? (
          <View style={styles.footerOverlay}>
            <Ionicons
              name={userLoc ? (withinRange ? "checkmark-circle" : "alert-circle") : "location"}
              size={16}
              color={withinRange ? colors.success : colors.warning}
            />
            <Text style={styles.footerText}>
              {distance != null
                ? withinRange
                  ? `Inside ${office.attendanceRadiusMeters}m geofence (${Math.round(distance)}m away)`
                  : `Outside geofence: ${Math.round(distance)}m away (max ${office.attendanceRadiusMeters}m)`
                : "Fetching current GPS position..."}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Fullscreen Map Modal */}
      <Modal visible={fullModal} animationType="slide" onRequestClose={() => setFullModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{office.name}</Text>
              <Muted>Geofence Radius & Live Location</Muted>
            </View>
            <Pressable onPress={() => setFullModal(false)} style={{ padding: spacing.xs }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={{ flex: 1 }}>
            <WebView
              originWhitelist={["*"]}
              source={{ html: htmlContent }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>

          <View style={styles.modalFooter}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalFooterText}>
                {distance != null
                  ? `${Math.round(distance)} meters from office geofence`
                  : "Calculating GPS distance..."}
              </Text>
              <Muted>Allowed check-in radius: {office.attendanceRadiusMeters} m</Muted>
            </View>
            <Pressable
              style={styles.openExternalBtn}
              onPress={() => {
                haptics.selection();
                openInMaps(office.latitude, office.longitude, office.name);
              }}
            >
              <Ionicons name="navigate-outline" size={18} color={colors.textInverse} />
              <Text style={styles.openExternalText}>Open Maps</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    cardContainer: {
      borderRadius: radius.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: spacing.xs,
      position: "relative",
    },
    headerOverlay: {
      position: "absolute",
      top: spacing.sm,
      left: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      opacity: 0.95,
    },
    officeNameText: {
      fontSize: font.sm,
      fontWeight: "700",
      color: colors.text,
    },
    controlsOverlay: {
      position: "absolute",
      right: spacing.sm,
      bottom: spacing.lg + spacing.xs,
      gap: spacing.xs,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    },
    footerOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      opacity: 0.95,
    },
    footerText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.lg,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: font.lg,
      fontWeight: "800",
      color: colors.text,
    },
    modalFooter: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.lg,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.md,
    },
    modalFooterText: {
      fontSize: font.sm,
      fontWeight: "700",
      color: colors.text,
    },
    openExternalBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
    },
    openExternalText: {
      color: colors.textInverse,
      fontWeight: "700",
      fontSize: font.sm,
    },
  });
