export type DailyWidgetRankState =
  | { status: "guest" }
  | { status: "no_username" }
  | { status: "ranked"; rank: number; outOf: number };

export type DailyWidgetSyncPayload = {
  date: string;
  dailyNumber: number;
  wordLength: number;
  hardMode: boolean;
  currentStreak: number;
  bestStreak: number;
  hasPlayedToday: boolean;
  inProgress: boolean;
  wonToday: boolean | null;
  guessCount: number | null;
  maxGuesses: number | null;
  rank: DailyWidgetRankState;
};

export type CapacitorDailyWidgetPlugin = {
  syncWidgetData: (payload: DailyWidgetSyncPayload) => Promise<void>;
};

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
