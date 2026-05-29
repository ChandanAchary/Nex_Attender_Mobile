import * as Haptics from "expo-haptics";

/**
 * Thin, crash-safe wrapper around expo-haptics. Each call is fire-and-forget
 * and swallows errors, so it's a no-op on devices/builds without haptics
 * (e.g. an older binary before a rebuild, or hardware without a vibrator).
 */
function safe(run: () => Promise<unknown>) {
  try {
    void run().catch(() => {});
  } catch {
    /* haptics unavailable — ignore */
  }
}

export const haptics = {
  /** Light tap — button presses, toggles. */
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Medium tap — more significant actions. */
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Selection tick — switching tabs, picking an option. */
  selection: () => safe(() => Haptics.selectionAsync()),
  /** Success notification — completed action (check-in, submit). */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Error notification — failed action. */
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
