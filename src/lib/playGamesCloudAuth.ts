import { PLAY_GAMES_ACHIEVEMENT_MAP } from "./playGamesAchievementMap";
import {
  loadAchievementProgress,
  loadWordConnoisseurList,
  getEffectiveUnlockedIds,
} from "./achievements";
import { loadStats } from "./stats";
import { setCrashUserId, logBreadcrumb } from "./crashReporting";
import strings from "../constants/strings";

export const PLAYGAMES_SESSION_STORAGE_KEY = "vagudle-playgames-session:v1";
const PENDING_UNLOCKS_KEY = "vagudle-playgames-pending-unlocks:v1";
const PENDING_STEPS_KEY = "vagudle-playgames-pending-steps:v1";
const TOTAL_WINS_LEADERBOARD_ID = "CgkIsKCwqpsCEAIQJA";

export type PlayGamesSession = {
  token: string;
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  expiresAt: number;
};

export type PlayGamesProgressSnapshot = {
  unlockedIds: string[];
  totalWins: number;
  bestCurrentStreak: number;
  uniqueWordCount: number;
};

const RENEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

const dispatchPlayGamesSessionSync = (): void => {
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: PLAYGAMES_SESSION_STORAGE_KEY,
        newValue: localStorage.getItem(PLAYGAMES_SESSION_STORAGE_KEY),
        storageArea: localStorage,
      })
    );
  } catch {}
};

export const getStoredPlayGamesSessionRaw = (): PlayGamesSession | null => {
  try {
    const raw = localStorage.getItem(PLAYGAMES_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PlayGamesSession;
    if (!session.token) return null;
    return session;
  } catch {
    return null;
  }
};

export const getStoredPlayGamesSession = (): PlayGamesSession | null => {
  const session = getStoredPlayGamesSessionRaw();
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    localStorage.removeItem(PLAYGAMES_SESSION_STORAGE_KEY);
    return null;
  }
  return session;
};

const storePlayGamesSession = (session: PlayGamesSession): void => {
  try {
    localStorage.setItem(
      PLAYGAMES_SESSION_STORAGE_KEY,
      JSON.stringify(session)
    );
  } catch {}
  void setCrashUserId(session.uid);
  dispatchPlayGamesSessionSync();
};

export const clearPlayGamesSession = (): void => {
  try {
    localStorage.removeItem(PLAYGAMES_SESSION_STORAGE_KEY);
  } catch {}
  void logBreadcrumb("Play Games session cleared");
  dispatchPlayGamesSessionSync();
};

export const isPlayGamesAvailable = (): boolean => {
  const capacitor = window.Capacitor;
  if (!capacitor?.isNativePlatform?.()) return false;
  if (capacitor.getPlatform?.() !== "android") return false;
  return !!capacitor.Plugins?.PlayGamesAuth;
};

const sessionFromResponse = (data: {
  success: boolean;
  token?: string;
  user?: {
    uid: string;
    displayName: string;
    avatarUrl: string | null;
    expiresAt: number;
  };
}): PlayGamesSession | null => {
  if (!data.success || !data.token || !data.user) return null;
  return {
    token: data.token,
    uid: data.user.uid,
    displayName: data.user.displayName,
    avatarUrl: data.user.avatarUrl,
    expiresAt: data.user.expiresAt,
  };
};

export const signInWithPlayGames =
  async (): Promise<PlayGamesSession | null> => {
    const plugin = window.Capacitor?.Plugins?.PlayGamesAuth;
    if (!plugin) return null;

    const { serverAuthCode } = await plugin.signIn();
    if (!serverAuthCode) return null;

    const res = await fetch("/api/playgames-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverAuthCode }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Parameters<
      typeof sessionFromResponse
    >[0];
    const session = sessionFromResponse(data);
    if (!session) return null;

    storePlayGamesSession(session);
    backfillPlayGamesAchievements();
    return session;
  };

export const startPlayGamesLinkAuthCode = async (): Promise<
  { code: string } | { error: string }
> => {
  const plugin = window.Capacitor?.Plugins?.PlayGamesAuth;
  if (!plugin) return { error: strings.PLAYGAMES_NOT_AVAILABLE_ERROR_TEXT };

  try {
    const { serverAuthCode } = await plugin.signIn();
    if (!serverAuthCode)
      return { error: strings.CLOUD_AUTH_PLAYGAMES_SIGNIN_ERROR_TEXT };
    return { code: serverAuthCode };
  } catch {
    return { error: strings.CLOUD_AUTH_PLAYGAMES_SIGNIN_ERROR_TEXT };
  }
};

export const fetchPlayGamesLinkUrl = async (
  session: PlayGamesSession
): Promise<{ url: string } | { error: string }> => {
  try {
    const res = await fetch("/api/playgames-link-token", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const data = (await res.json()) as {
      success: boolean;
      url?: string;
      error?: string;
    };
    if (!res.ok || !data.success || !data.url) {
      return { error: data.error ?? strings.LINK_START_ERROR_SHORT_TEXT };
    }
    return { url: data.url };
  } catch {
    return { error: strings.CLOUD_SAVE_LINK_START_ERROR_TEXT };
  }
};

export const openPlayGamesLinkFlow = async (
  session: PlayGamesSession
): Promise<{ opened: true } | { error: string }> => {
  const result = await fetchPlayGamesLinkUrl(session);
  if ("error" in result) return result;

  const browser = window.Capacitor?.Plugins?.Browser;
  if (!browser) return { error: strings.LINKING_NOT_AVAILABLE_ERROR_TEXT };

  await browser.open({ url: result.url, presentationStyle: "popover" });
  return { opened: true };
};

export const renewPlayGamesSession = async (
  session: PlayGamesSession
): Promise<PlayGamesSession | null> => {
  try {
    const res = await fetch("/api/playgames-refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (!res.ok) {
      clearPlayGamesSession();
      return null;
    }

    const data = (await res.json()) as Parameters<
      typeof sessionFromResponse
    >[0];
    const renewed = sessionFromResponse(data);
    if (!renewed) {
      clearPlayGamesSession();
      return null;
    }

    storePlayGamesSession(renewed);
    flushPendingPlayGamesAchievements();
    syncPlayGamesLeaderboard();
    return renewed;
  } catch {
    return null;
  }
};

export const maybeRenewPlayGamesSession =
  async (): Promise<PlayGamesSession | null> => {
    const session = getStoredPlayGamesSessionRaw();
    if (!session) return null;
    if (session.expiresAt - Date.now() > RENEW_THRESHOLD_MS) return session;
    return renewPlayGamesSession(session);
  };

const loadPendingUnlocks = (): string[] => {
  try {
    const raw = localStorage.getItem(PENDING_UNLOCKS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const savePendingUnlocks = (ids: string[]): void => {
  try {
    localStorage.setItem(PENDING_UNLOCKS_KEY, JSON.stringify(ids));
  } catch {}
};

const queuePendingUnlock = (localId: string): void => {
  const pending = loadPendingUnlocks();
  if (!pending.includes(localId)) {
    savePendingUnlocks([...pending, localId]);
  }
};

const removePendingUnlock = (localId: string): void => {
  const pending = loadPendingUnlocks();
  savePendingUnlocks(pending.filter((id) => id !== localId));
};

const loadPendingSteps = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(PENDING_STEPS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
};

const savePendingSteps = (steps: Record<string, number>): void => {
  try {
    localStorage.setItem(PENDING_STEPS_KEY, JSON.stringify(steps));
  } catch {}
};

const queuePendingSteps = (localId: string, steps: number): void => {
  const pending = loadPendingSteps();
  const existing = pending[localId] ?? 0;
  if (steps > existing) {
    savePendingSteps({ ...pending, [localId]: steps });
  }
};

const removePendingSteps = (localId: string): void => {
  const pending = loadPendingSteps();
  delete pending[localId];
  savePendingSteps(pending);
};

const pushAchievementUnlock = async (
  localId: string,
  playGamesId: string
): Promise<void> => {
  if (!isPlayGamesAvailable()) {
    queuePendingUnlock(localId);
    return;
  }

  try {
    const plugin = window.Capacitor?.Plugins?.PlayGamesAuth;
    await plugin?.unlockAchievement({ achievementId: playGamesId });
    removePendingUnlock(localId);
  } catch {
    queuePendingUnlock(localId);
  }
};

const pushAchievementSteps = async (
  localId: string,
  playGamesId: string,
  steps: number
): Promise<void> => {
  if (!isPlayGamesAvailable()) {
    queuePendingSteps(localId, steps);
    return;
  }

  try {
    const plugin = window.Capacitor?.Plugins?.PlayGamesAuth;
    await plugin?.setAchievementSteps({ achievementId: playGamesId, steps });
    removePendingSteps(localId);
  } catch {
    queuePendingSteps(localId, steps);
  }
};

export const flushPendingPlayGamesAchievements = (): void => {
  if (!isPlayGamesAvailable()) return;

  for (const localId of loadPendingUnlocks()) {
    const entry = PLAY_GAMES_ACHIEVEMENT_MAP[localId];
    if (entry?.type === "unlock") {
      void pushAchievementUnlock(localId, entry.playGamesId);
    }
  }

  const pendingSteps = loadPendingSteps();
  for (const localId of Object.keys(pendingSteps)) {
    const entry = PLAY_GAMES_ACHIEVEMENT_MAP[localId];
    if (entry?.type === "incremental") {
      void pushAchievementSteps(
        localId,
        entry.playGamesId,
        pendingSteps[localId]
      );
    }
  }
};

const getIncrementalSteps = (
  localId: string,
  snapshot: PlayGamesProgressSnapshot
): number => {
  switch (localId) {
    case "win_15":
    case "win_50":
      return snapshot.totalWins;
    case "on_a_roll":
    case "unstoppable":
      return snapshot.bestCurrentStreak;
    case "word_connoisseur":
      return snapshot.uniqueWordCount;
    case "completionist":
      return snapshot.unlockedIds.filter((id) => id !== "completionist").length;
    default:
      return 0;
  }
};

export const computeTotalWins = (): number => {
  const normal = loadStats(false);
  const hard = loadStats(true);
  return (
    normal.totalGames -
    normal.gamesFailed +
    (hard.totalGames - hard.gamesFailed)
  );
};

const pushLeaderboardScore = async (score: number): Promise<void> => {
  if (!isPlayGamesAvailable()) return;

  try {
    const plugin = window.Capacitor?.Plugins?.PlayGamesAuth;
    await plugin?.submitScore({
      leaderboardId: TOTAL_WINS_LEADERBOARD_ID,
      score,
    });
  } catch {}
};

export const syncPlayGamesLeaderboard = (totalWins?: number): void => {
  void pushLeaderboardScore(totalWins ?? computeTotalWins());
};

export const backfillPlayGamesAchievements = (): void => {
  const progress = loadAchievementProgress();
  const normal = loadStats(false);
  const hard = loadStats(true);
  const totalWins =
    normal.totalGames -
    normal.gamesFailed +
    (hard.totalGames - hard.gamesFailed);
  const bestCurrentStreak = Math.max(normal.currentStreak, hard.currentStreak);
  const uniqueWordCount = progress.unlockedIds.includes("word_connoisseur")
    ? 200
    : loadWordConnoisseurList().length;

  syncPlayGamesAchievements({
    unlockedIds: getEffectiveUnlockedIds(progress.unlockedIds),
    totalWins,
    bestCurrentStreak,
    uniqueWordCount,
  });
  syncPlayGamesLeaderboard(totalWins);
};

export const syncPlayGamesAchievements = (
  snapshot: PlayGamesProgressSnapshot
): void => {
  const unlockedSet = new Set(snapshot.unlockedIds);

  for (const [localId, entry] of Object.entries(PLAY_GAMES_ACHIEVEMENT_MAP)) {
    if (entry.type === "unlock") {
      if (unlockedSet.has(localId)) {
        void pushAchievementUnlock(localId, entry.playGamesId);
      }
      continue;
    }

    const steps = Math.min(
      getIncrementalSteps(localId, snapshot),
      entry.target
    );
    void pushAchievementSteps(localId, entry.playGamesId, steps);
  }
};
