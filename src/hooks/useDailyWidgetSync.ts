import { useEffect, useState } from "react";
import { getIdTokenForCurrentUser } from "../lib/cloudSync";
import {
  fetchDailyLeaderboardRank,
  type DailyConfig,
  type DailyResult,
  type DailyStats,
} from "../lib/daily";
import { syncDailyWidget, type DailyWidgetRankState } from "../lib/dailyWidget";
import type { CapacitorAppPlugin } from "../lib/backButton";
import type { CloudAuthUser } from "./useCloudAuth";

type Params = {
  user: CloudAuthUser | null;
  dailyConfig: DailyConfig | null;
  dailyNumber: number;
  dailyStats: DailyStats;
  dailyResult: DailyResult | null;
  isDailyMode: boolean;
  guesses: string[];
};

const toRankState = (
  rank: Awaited<ReturnType<typeof fetchDailyLeaderboardRank>>
): DailyWidgetRankState | null => {
  if (!rank) return null;
  if (!rank.linked) return { status: "guest" };
  if (!rank.hasUsername) return { status: "no_username" };
  return { status: "ranked", rank: rank.rank, outOf: rank.outOf };
};

const fetchRankState = async (
  user: CloudAuthUser | null
): Promise<DailyWidgetRankState | null> => {
  const idToken = user ? await getIdTokenForCurrentUser() : null;
  return toRankState(await fetchDailyLeaderboardRank(idToken));
};

const getAppPlugin = (): CapacitorAppPlugin | null => {
  if (typeof window === "undefined") return null;
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  return window.Capacitor.Plugins?.App ?? null;
};

export const useDailyWidgetSync = ({
  user,
  dailyConfig,
  dailyNumber,
  dailyStats,
  dailyResult,
  isDailyMode,
  guesses,
}: Params): { refreshRank: () => Promise<void> } => {
  const [rankState, setRankState] = useState<DailyWidgetRankState | null>(null);

  const refreshRank = async () => {
    const next = await fetchRankState(user);
    if (next) setRankState(next);
  };

  useEffect(() => {
    let ignore = false;
    void fetchRankState(user).then((next) => {
      if (!ignore && next) setRankState(next);
    });
    return () => {
      ignore = true;
    };
    // only re-run on login/logout, not on refreshRank identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    const plugin = getAppPlugin();
    if (!plugin) return;
    const listenerHandle = plugin.addListener("appStateChange", (event) => {
      if (event.isActive) void refreshRank();
    });
    return () => {
      void listenerHandle.then((listener) => listener.remove());
    };
    // listener registered once, not per refreshRank identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dailyConfig || !rankState) return;
    const hasPlayedToday = dailyResult?.date === dailyConfig.date;
    const inProgress = isDailyMode && !hasPlayedToday && guesses.length > 0;
    void syncDailyWidget({
      date: dailyConfig.date,
      dailyNumber,
      wordLength: dailyConfig.wordLength,
      hardMode: dailyConfig.hardMode,
      currentStreak: dailyStats.currentStreak,
      bestStreak: dailyStats.bestStreak,
      hasPlayedToday,
      inProgress,
      wonToday: hasPlayedToday ? (dailyResult?.won ?? null) : null,
      guessCount: hasPlayedToday ? (dailyResult?.guessCount ?? null) : null,
      maxGuesses: hasPlayedToday ? (dailyResult?.maxGuesses ?? null) : null,
      rank: rankState,
    });
  }, [
    dailyConfig,
    dailyNumber,
    dailyStats,
    dailyResult,
    rankState,
    isDailyMode,
    guesses,
  ]);

  return { refreshRank };
};
