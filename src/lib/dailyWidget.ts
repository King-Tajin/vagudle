const getDailyWidgetPlugin = (): CapacitorDailyWidgetPlugin | null => {
  if (typeof window === "undefined") return null;
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  return window.Capacitor.Plugins?.DailyWidget ?? null;
};

export const syncDailyWidget = async (
  payload: DailyWidgetSyncPayload
): Promise<void> => {
  const plugin = getDailyWidgetPlugin();
  if (!plugin) return;
  try {
    await plugin.syncWidgetData(payload);
  } catch {}
};
