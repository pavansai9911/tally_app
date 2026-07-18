import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const OPTIONS = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false };

export type HapticType =
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError'
  | 'selection';

/** Fire a haptic; silently no-ops if the device/library can't. */
export function haptic(type: HapticType = 'impactLight'): void {
  try {
    ReactNativeHapticFeedback.trigger(type, OPTIONS);
  } catch {
    // ignore
  }
}
