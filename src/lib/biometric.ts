import * as LocalAuthentication from "expo-local-authentication";

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function biometricLabel(): Promise<string> {
  // The app refers to all face/fingerprint methods generically as "Biometric".
  return "Biometric";
}

export async function authenticate(reason = "Unlock Nex Attender"): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: "Use passcode",
    cancelLabel: "Cancel",
  });
  return result.success;
}
