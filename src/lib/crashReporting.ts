const getCrashlyticsPlugin = (): CapacitorCrashlyticsPlugin | null => {
  if (typeof window === "undefined") return null;
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  return window.Capacitor.Plugins?.FirebaseCrashlytics ?? null;
};

let listenersAttached = false;

export const initCrashReporting = (): void => {
  if (listenersAttached) return;
  if (!getCrashlyticsPlugin()) return;
  listenersAttached = true;

  window.addEventListener("error", (event) => {
    void recordException(event.error ?? event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    void recordException(event.reason);
  });
};

export const recordException = async (error: unknown): Promise<void> => {
  const plugin = getCrashlyticsPlugin();
  if (!plugin) return;

  const err = error instanceof Error ? error : new Error(String(error));

  try {
    await plugin.recordException({ message: `${err.name}: ${err.message}` });
  } catch {}
};

export const logBreadcrumb = async (message: string): Promise<void> => {
  const plugin = getCrashlyticsPlugin();
  if (!plugin) return;

  try {
    await plugin.log({ message });
  } catch {}
};

export const setCrashUserId = async (userId: string): Promise<void> => {
  const plugin = getCrashlyticsPlugin();
  if (!plugin) return;

  try {
    await plugin.setUserId({ userId });
  } catch {}
};
