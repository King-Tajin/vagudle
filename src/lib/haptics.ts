const getHapticsPlugin = (): CapacitorHapticsPlugin | null => {
  if (typeof window === "undefined") return null;
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  return window.Capacitor.Plugins?.Haptics ?? null;
};

const triggerNotification = (
  enabled: boolean,
  type: CapacitorNotificationType
): void => {
  if (!enabled) return;
  const plugin = getHapticsPlugin();
  if (!plugin) return;
  void plugin.notification({ type }).catch(() => {});
};

const triggerImpact = (enabled: boolean, style: CapacitorImpactStyle): void => {
  if (!enabled) return;
  const plugin = getHapticsPlugin();
  if (!plugin) return;
  void plugin.impact({ style }).catch(() => {});
};

export const triggerErrorHaptic = (enabled: boolean): void =>
  triggerNotification(enabled, "ERROR");

export const triggerSuccessHaptic = (enabled: boolean): void =>
  triggerNotification(enabled, "SUCCESS");

export const triggerLossHaptic = (enabled: boolean): void =>
  triggerNotification(enabled, "WARNING");

export const triggerAchievementHaptic = (enabled: boolean): void =>
  triggerImpact(enabled, "HEAVY");
