import * as Location from "expo-location";
import { Linking, Platform } from "react-native";

export interface Fix {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export class LocationError extends Error {}

/** Request permission and return a single high-accuracy GPS fix. */
export async function getCurrentFix(): Promise<Fix> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new LocationError(
      "Location permission denied. Enable it in Settings to mark attendance.",
    );
  }

  const enabled = await Location.hasServicesEnabledAsync();
  if (!enabled) {
    throw new LocationError("Location services are off. Turn on GPS and try again.");
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracyMeters: pos.coords.accuracy ?? undefined,
  };
}

/** Open a coordinate in the device's native maps app. */
export function openInMaps(lat: number, lng: number, label?: string): void {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
  const url = Platform.select({
    ios: `http://maps.apple.com/?ll=${lat},${lng}&q=${q}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${q})`,
    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  });
  Linking.openURL(url);
}
