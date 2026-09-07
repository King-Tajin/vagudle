import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useReducer,
  useCallback,
  Suspense,
} from "react";
import { m } from "framer-motion";

import { Grid } from "./components/grid/Grid";
import { Keyboard } from "./components/keyboard/Keyboard";
import { AlertContainer } from "./components/Alert";
import { Navbar } from "./components/layout/Navbar";
import { BackgroundStage } from "./components/backgrounds/BackgroundStage";
import { GameBanner } from "./components/layout/GameBanner";
import { DisclaimerBanner } from "./components/layout/DisclaimerBanner";
import { AttributionButton } from "./components/layout/AttributionButton";
import { GameModals } from "./components/screens/GameModals";
import { AchievementTrayToggle } from "./components/overlays/AchievementTrayToggle";
import { BackgroundTrayToggle } from "./components/overlays/BackgroundTrayToggle";
import { CloudSaveConflictOverlay } from "./components/overlays/CloudSaveConflictOverlay";
import { WinCelebrationOverlay } from "./components/overlays/WinCelebrationOverlay";
import { AchievementRevealOverlay } from "./components/overlays/AchievementRevealOverlay";
import { useAchievements } from "./hooks/useAchievements";
import { BACKGROUNDS } from "./lib/backgrounds";
import type { Achievement } from "./lib/achievements";
import type { CharStatus } from "./lib/statuses";

import {
  MalformedChallengeScreen,
  MalformedDuelScreen,
  ExpiredDuelScreen,
  ActivityNotFoundScreen,
  ActivityWrongPlayerScreen,
  ActivityServerErrorScreen,
  ActivityAccountChoiceScreen,
  ActivityAlreadyPlayedScreen,
  OfflineModeModal,
  WebglUnavailableModal,
} from "./lazyComponents";

import { LoadingScreen } from "./components/screens/GameScreens";

import { useAlert } from "./context/alert-context";
import { useIsMobile } from "./hooks/useIsMobile";
import { usePageChrome } from "./hooks/usePageChrome";
import { useDiscourageInAppBrowser } from "./hooks/useDiscourageInAppBrowser";
import { useOfflineModeCheck } from "./hooks/useOfflineModeCheck";
import { useWebglUnavailableModal } from "./hooks/useWebglUnavailableModal";
import { useTilePainting } from "./hooks/useTilePainting";
import { useDuelResult } from "./hooks/useDuelResult";
import { useDailyActivityResult } from "./hooks/useDailyActivityResult";
import { useDailyActivityGuessSync } from "./hooks/useDailyActivityGuessSync";
import { useDailyProgressSync } from "./hooks/useDailyProgressSync";
import { useDailySync } from "./hooks/useDailySync";
import { useDuelSync } from "./hooks/useDuelSync";
import { useDuelProgressSync } from "./hooks/useDuelProgressSync";
import { useGameOutcome } from "./hooks/useGameOutcome";
import { useGameInitialization } from "./hooks/useGameInitialization";
import { useGameFlow } from "./hooks/useGameFlow";
import { useGuessInput } from "./hooks/useGuessInput";
import { useSaveGameState } from "./hooks/useSaveGameState";
import { useGameSettings } from "./hooks/useGameSettings";
import { useCrossTabSync } from "./hooks/useCrossTabSync";
import { useBackgroundAttribution } from "./hooks/useBackgroundAttribution";
import { useDailyMode } from "./hooks/useDailyMode";
import { useDailyWidgetSync } from "./hooks/useDailyWidgetSync";
import { useLeaderboardModal } from "./hooks/useLeaderboardModal";
import {
  completeEmailLinkSignIn,
  completeDiscordSignIn,
  useCloudAuth,
} from "./hooks/useCloudAuth";
import { useCloudSync } from "./hooks/useCloudSync";

import { getRandomWord } from "./lib/words";
import { getStatusesFromCellColors } from "./lib/statuses";
import { computeFullyGrayLetters } from "./lib/rowAnalysis";
import {
  loadGameStateFromLocalStorage,
  loadSettingsFromLocalStorage,
} from "./lib/localStorage";
import { loadStats } from "./lib/stats";
import { isDiscordActivity } from "./lib/discord";
import { useDiscordRichPresence } from "./hooks/useDiscordRichPresence";
import { pruneOldDailyEntries, DAILY_PATH } from "./lib/daily";
import { getPendingDiscordLinkCode } from "./lib/discordCloudAuth";
import { linkDiscordOAuthWithCurrentUser } from "./lib/cloudSync";
import {
  runNotificationPrimerFlow,
  syncNotificationSchedule,
} from "./lib/notifications";
import { requestAppReviewForWins } from "./lib/appReview";
import type { ChallengeConfig } from "./lib/challenge";
import type { DuelConfig } from "./lib/duel";
import type { ActivityErrorReason } from "./components/screens/ErrorScreens";
import type { GameMode } from "./lib/gameMode";
import {
  gameRoundReducer,
  type GameRoundState,
} from "./state/gameRoundReducer";

import {
  HARD_MODE_MAX_CHALLENGES,
  NORMAL_MODE_MAX_CHALLENGES,
  SHOW_KING_TAJIN_DISCLAIMER,
} from "./constants/settings";
import strings from "./constants/strings";

const challengeParam = new URLSearchParams(window.location.search).get(
  "challenge"
);
const duelParam = new URLSearchParams(window.location.search).get("duel");
const isDailyRoute = window.location.pathname === DAILY_PATH;

function App() {
  const {
    showError: showErrorAlert,
    showSuccess: showSuccessAlert,
    dismiss: dismissAlert,
    cancel: cancelAlert,
  } = useAlert();

  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  const {
    pendingCloudSave,
    cloudUpdatedAt,
    isUpToDate,
    resolvePendingCloudSave,
    showPlayGamesLinkPrompt,
    dismissPlayGamesLinkPrompt,
  } = useCloudSync(isMobile);
  const { user } = useCloudAuth();

  useEffect(() => {
    void completeEmailLinkSignIn();
    void completeDiscordSignIn();
    pruneOldDailyEntries();
  }, []);

  const [isLoading, setIsLoading] = useState(true);

  const [{ savedGameState, savedSettings }] = useState(() => ({
    savedGameState: loadGameStateFromLocalStorage(),
    savedSettings: loadSettingsFromLocalStorage(),
  }));

  const [gameRoundState, dispatchGameRound] = useReducer(gameRoundReducer, {
    solution: savedGameState?.solution ?? "",
    guesses: savedGameState?.guesses ?? [],
    cellColors:
      (savedGameState?.cellColors as { [key: string]: CharStatus }) ?? {},
    currentGuess: "",
    currentRowClass: "",
    isGameWon: false,
    isGameLost: false,
    isRevealing: false,
    isCelebrating: false,
  } satisfies GameRoundState);
  const {
    solution,
    guesses,
    cellColors,
    currentGuess,
    currentRowClass,
    isGameWon,
    isGameLost,
    isRevealing,
    isCelebrating,
  } = gameRoundState;
  const setSolution = useCallback(
    (value: React.SetStateAction<string>) =>
      dispatchGameRound({ field: "solution", value }),
    []
  );
  const setGuesses = useCallback(
    (value: React.SetStateAction<string[]>) =>
      dispatchGameRound({ field: "guesses", value }),
    []
  );
  const setCellColors = useCallback(
    (value: React.SetStateAction<{ [key: string]: CharStatus }>) =>
      dispatchGameRound({ field: "cellColors", value }),
    []
  );
  const setCurrentGuess = useCallback(
    (value: React.SetStateAction<string>) =>
      dispatchGameRound({ field: "currentGuess", value }),
    []
  );
  const setCurrentRowClass = useCallback(
    (value: React.SetStateAction<string>) =>
      dispatchGameRound({ field: "currentRowClass", value }),
    []
  );
  const setIsGameWon = useCallback(
    (value: React.SetStateAction<boolean>) =>
      dispatchGameRound({ field: "isGameWon", value }),
    []
  );
  const setIsGameLost = useCallback(
    (value: React.SetStateAction<boolean>) =>
      dispatchGameRound({ field: "isGameLost", value }),
    []
  );
  const setIsRevealing = useCallback(
    (value: React.SetStateAction<boolean>) =>
      dispatchGameRound({ field: "isRevealing", value }),
    []
  );
  const setIsCelebrating = useCallback(
    (value: React.SetStateAction<boolean>) =>
      dispatchGameRound({ field: "isCelebrating", value }),
    []
  );
  const [isRevealingAchievement, setIsRevealingAchievement] = useState(false);
  const [challengeConfig, setChallengeConfig] =
    useState<ChallengeConfig | null>(null);
  const [isMalformedChallenge, setIsMalformedChallenge] = useState(false);
  const [duelConfig, setDuelConfig] = useState<DuelConfig | null>(null);
  const [duelToken, setDuelToken] = useState<string | null>(null);
  const [activityAccessToken, setActivityAccessToken] = useState<string | null>(
    null
  );
  const [isMalformedDuel, setIsMalformedDuel] = useState(false);
  const [isDuelExpired, setIsDuelExpired] = useState(false);
  const [isActivityNotFound] = useState(false);
  const [isActivityWrongPlayer, setIsActivityWrongPlayer] = useState(false);
  const [isActivityServerError, setIsActivityServerError] =
    useState<ActivityErrorReason | null>(null);
  const [isActivityAccountChoicePending, setIsActivityAccountChoicePending] =
    useState(false);
  const [isActivityAlreadyPlayed, setIsActivityAlreadyPlayed] = useState(false);
  const [activityAlreadyPlayedPlatform, setActivityAlreadyPlayedPlatform] =
    useState<string | undefined>(undefined);
  const [isDuelModalOpen, setIsDuelModalOpen] = useState(false);
  const [isDailyActive, setIsDailyActive] = useState(false);
  const [isDeleteAccountRoute] = useState(
    () =>
      typeof window !== "undefined" &&
      window.location.pathname === "/delete-account"
  );
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(isDeleteAccountRoute);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    const pendingLink = getPendingDiscordLinkCode();
    if (!pendingLink) return;
    let isCancelled = false;
    void (async () => {
      const result = await linkDiscordOAuthWithCurrentUser(
        pendingLink.code,
        pendingLink.redirectUri
      );
      if (isCancelled) return;
      if (result.status === "linked") {
        showSuccessAlert(strings.DISCORD_ACCOUNT_LINKED_MESSAGE);
        setIsSettingsModalOpen(true);
      } else {
        showErrorAlert(result.message);
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, [showSuccessAlert, showErrorAlert]);

  const [settingsAccountJumpKey, setSettingsAccountJumpKey] = useState(0);
  const [settingsBackgroundJumpKey, setSettingsBackgroundJumpKey] = useState(0);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [isAttributionModalOpen, setIsAttributionModalOpen] = useState(false);
  const [isTrayOpen, setIsTrayOpen] = useState(true);
  const [stats, setStats] = useState(() => loadStats(false));
  const [hardStats, setHardStats] = useState(() => loadStats(true));
  const currentWinStreak = Math.max(
    stats.currentStreak,
    hardStats.currentStreak
  );
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<
    Achievement[]
  >([]);
  const [wordLength, setWordLength] = useState(savedSettings.wordLength);
  const { settings, settingsHandlers } = useGameSettings(savedSettings);
  const {
    showGrayCount,
    hardMode,
    autoGray,
    autoGreen,
    extraEffects,
    backgroundId,
    dailyStreakRemindersEnabled,
    streakResetWarningHours,
    customReminderTimeEnabled,
    customReminderHour,
    customReminderMinute,
    customReminderPeriod,
    inactivityReminderEnabled,
    inactivityReminderDays,
    hapticsEnabled,
    language,
  } = settings;
  const {
    setShowGrayCount,
    setHardMode,
    setAutoGray,
    setAutoGreen,
    setExtraEffects,
    setBackgroundId,
    setDailyStreakRemindersEnabled,
    setStreakResetWarningHours,
    setCustomReminderTimeEnabled,
    setCustomReminderHour,
    setCustomReminderMinute,
    setCustomReminderPeriod,
    setInactivityReminderEnabled,
    setInactivityReminderDays,
    setHapticsEnabled,
    setLanguage,
  } = settingsHandlers;
  const autoGrayLetters = useMemo(
    () =>
      autoGray ? computeFullyGrayLetters(solution, guesses) : new Set<string>(),
    [autoGray, solution, guesses]
  );
  const {
    hiddenAttributionIds,
    setHiddenAttributionIds,
    currentBackground,
    showAttributionButton,
    handleAttributionHideForeverChange,
    handleRestoreHiddenAttributions,
  } = useBackgroundAttribution(backgroundId);
  const {
    unlockedIds,
    uniqueWordCount,
    recordWin,
    recordGuess,
    resetWinRecord,
  } = useAchievements();
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredGameRef = useRef(false);
  const duelSubmittedRef = useRef(false);
  const dailyActivitySubmittedRef = useRef(false);
  const keyboardRef = useRef<HTMLDivElement>(null);
  const achievementCheckedRef = useRef(false);
  const achievementRevealPendingRef = useRef(false);
  const hasAutoClosedTrayRef = useRef(false);
  const extraEffectsRef = useRef(extraEffects);
  useEffect(() => {
    extraEffectsRef.current = extraEffects;
  }, [extraEffects]);
  const hapticsEnabledRef = useRef(hapticsEnabled);
  useEffect(() => {
    hapticsEnabledRef.current = hapticsEnabled;
  }, [hapticsEnabled]);
  const startNewGame = (newSolution: string) => {
    achievementCheckedRef.current = false;
    resetWinRecord();
    setNewlyUnlockedAchievements([]);
    hasAutoClosedTrayRef.current = false;
    setIsTrayOpen(true);
    setSolution(newSolution);
  };
  const announceAchievement = (achievement: Achievement) => {
    const bg = BACKGROUNDS.find(
      (b) => b.requiresAchievementId === achievement.id
    );
    showSuccessAlert(
      strings.SHARE_ACHIEVEMENT_UNLOCKED_TEXT(achievement.title) +
        (bg
          ? strings.ACHIEVEMENT_TOAST_BACKGROUND_UNLOCKED_SUFFIX_TEXT(
              bg.desktopLabel
            )
          : ""),
      { durationMs: 4000 }
    );
  };
  const gameMode: GameMode =
    duelConfig !== null
      ? "duel"
      : challengeConfig !== null
        ? "challenge"
        : isDailyActive
          ? "daily"
          : "normal";
  const isChallengeMode = gameMode === "challenge";
  const isDuelMode = gameMode === "duel";
  const isDailyMode = gameMode === "daily";
  useEffect(() => {
    if (
      !isGameWon ||
      isDuelMode ||
      isChallengeMode ||
      isDailyMode ||
      achievementCheckedRef.current
    )
      return;
    achievementCheckedRef.current = true;
    const newly = recordWin({
      wordLength: solution.length,
      guessCount: guesses.length,
      hardMode,
      guesses,
      solution,
    });
    if (newly.length > 0) {
      // Depends on the side-effecting recordWin() result, so it can't be derived during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewlyUnlockedAchievements((prev) => [...prev, ...newly]);
      achievementRevealPendingRef.current = true;
    }
  }, [
    isGameWon,
    isDuelMode,
    isChallengeMode,
    isDailyMode,
    solution,
    guesses,
    hardMode,
    recordWin,
  ]);
  const { onCellPaint, onRowReset, onFullReset, clearAutoGray } =
    useTilePainting({
      guesses,
      solution,
      autoGray,
      autoGreen,
      cellColors,
      setCellColors,
    });
  const {
    dailyConfig,
    setDailyConfig,
    dailyResult,
    setDailyResult,
    dailyStats,
    setDailyStats,
    isDailyModalOpen,
    setIsDailyModalOpen,
    dailyModalMode,
    setDailyModalMode,
    isDailyScheduleModalOpen,
    dailyNumber,
    dailyUsernameWarning,
    submitDailyToLeaderboard,
    handleOpenDaily,
    handlePlayDaily,
    handleShareDaily,
    handleCloseDaily,
    handleLeaveDaily,
    handleOpenDailySchedule,
    handleCloseDailySchedule,
    handleViewDailyGame,
    handleUsernameSaved,
    handleDailyComplete,
  } = useDailyMode({
    user,
    setIsDailyActive,
    isDailyMode,
    guesses,
    isGameLost,
    restoredGameRef,
    dismissAlert,
    showSuccessAlert,
    setSolution,
    setGuesses,
    setCellColors,
    setCurrentGuess,
    setCurrentRowClass,
    setIsGameWon,
    setIsGameLost,
  });
  const { refreshRank: refreshDailyWidgetRank } = useDailyWidgetSync({
    user,
    dailyConfig,
    dailyNumber,
    dailyStats,
    dailyResult,
    isDailyMode,
    guesses,
  });
  const handleUsernameSavedForWidget = async () => {
    await handleUsernameSaved();
    void refreshDailyWidgetRank();
  };
  const hasSyncedNotificationsRef = useRef(false);
  useEffect(() => {
    const notificationSettings = {
      dailyStreakRemindersEnabled,
      streakResetWarningHours,
      customReminderTimeEnabled,
      customReminderHour,
      customReminderMinute,
      customReminderPeriod,
      inactivityReminderEnabled,
      inactivityReminderDays,
    };
    const currentDailyDate = dailyConfig?.date ?? null;

    if (!hasSyncedNotificationsRef.current) {
      hasSyncedNotificationsRef.current = true;
      void runNotificationPrimerFlow(
        notificationSettings,
        dailyStats.lastCompletedDate,
        currentDailyDate
      );
      return;
    }

    void syncNotificationSchedule(
      notificationSettings,
      dailyStats.lastCompletedDate,
      currentDailyDate
    );
  }, [
    dailyStreakRemindersEnabled,
    streakResetWarningHours,
    customReminderTimeEnabled,
    customReminderHour,
    customReminderMinute,
    customReminderPeriod,
    inactivityReminderEnabled,
    inactivityReminderDays,
    dailyStats.lastCompletedDate,
    dailyConfig?.date,
  ]);
  const openPostGameModal = () => {
    if (isDuelMode) setIsDuelModalOpen(true);
    else if (isDailyMode) setIsDailyModalOpen(true);
    else setIsStatsModalOpen(true);
  };
  const handleCelebrationDone = () => {
    setIsCelebrating(false);
    void requestAppReviewForWins(
      stats.totalGames - stats.gamesFailed,
      hardStats.totalGames - hardStats.gamesFailed
    );
    if (achievementRevealPendingRef.current) {
      achievementRevealPendingRef.current = false;
      setIsRevealingAchievement(true);
    } else {
      openPostGameModal();
    }
  };
  const handleAchievementRevealDone = () => {
    setIsRevealingAchievement(false);
    openPostGameModal();
  };
  const maxChallenges =
    duelConfig?.guesses ??
    challengeConfig?.guesses ??
    (isDailyMode && dailyConfig
      ? dailyConfig.hardMode
        ? HARD_MODE_MAX_CHALLENGES
        : NORMAL_MODE_MAX_CHALLENGES
      : hardMode
        ? HARD_MODE_MAX_CHALLENGES
        : NORMAL_MODE_MAX_CHALLENGES);
  useDiscordRichPresence({
    gameMode,
    guessCount: guesses.length,
    maxGuesses: maxChallenges,
    isGameWon,
    isGameLost,
  });
  const userStatuses = getStatusesFromCellColors(guesses, cellColors);
  const handleSetAutoGray = (value: boolean) => {
    setAutoGray(value);
    if (!value) clearAutoGray();
  };
  useDailyActivityResult({
    isDailyActivityMode: isDiscordActivity && isDailyMode,
    activityAccessToken,
    isGameWon,
    isGameLost,
    guesses,
    submittedRef: dailyActivitySubmittedRef,
  });
  useDailyActivityGuessSync({
    isDailyActivityMode: isDiscordActivity && isDailyMode,
    activityAccessToken,
    guesses,
    cellColors,
  });
  useDailyProgressSync({
    isWebDailyMode: !isDiscordActivity && isDailyMode,
    guesses,
    cellColors,
  });
  useDailySync({
    isDailyMode,
    isDiscordActivity,
    activityAccessToken,
    isLoading,
    dailyConfig,
    guesses,
    isGameWon,
    isGameLost,
    restoredGameRef,
    setGuesses,
    setCellColors,
    setIsGameWon,
    setIsGameLost,
  });
  const duelSaveStatus = useDuelResult({
    isDuelMode,
    duelToken,
    activityAccessToken,
    activityDuelId: duelConfig?.id ?? null,
    isGameWon,
    isGameLost,
    guessCount: guesses.length,
    submittedRef: duelSubmittedRef,
  });
  useDuelProgressSync({
    isDuelMode,
    duelToken,
    activityAccessToken,
    activityDuelId: duelConfig?.id ?? null,
    guesses,
    cellColors,
  });
  useDuelSync({
    isDuelMode,
    duelToken,
    activityAccessToken,
    duelConfig,
    isLoading,
    guesses,
    isGameWon,
    isGameLost,
    restoredGameRef,
    setGuesses,
    setCellColors,
    setIsGameWon,
    setIsGameLost,
  });
  useGameOutcome({
    isGameWon,
    isGameLost,
    solution,
    isDuelMode,
    isChallengeMode,
    isDailyMode,
    restoredRef: restoredGameRef,
    extraEffectsRef,
    hapticsEnabledRef,
    achievementRevealPendingRef,
    showSuccessAlert,
    cancelAlert,
    setIsCelebrating,
    setIsRevealingAchievement,
    setIsDuelModalOpen,
    setIsStatsModalOpen,
    setIsDailyModalOpen,
  });
  const {
    handleNewGame,
    handleReturnToNormal,
    handleNewGameWithFail,
    handleWordLengthChange,
    recordStats,
    hasActiveGame,
  } = useGameFlow({
    wordLength,
    hardMode,
    guesses,
    isGameWon,
    isGameLost,
    isDuelMode,
    isChallengeMode,
    isDailyMode,
    maxChallenges,
    revealTimerRef,
    setWordLength,
    setSolution: startNewGame,
    setGuesses,
    setCurrentGuess,
    setCurrentRowClass,
    setCellColors,
    setIsGameWon,
    setIsGameLost,
    setIsStatsModalOpen,
    setStats,
    setHardStats,
    dismissAlert,
  });
  const {
    isLeaderboardModalOpen,
    leaderboardIdToken,
    handleOpenLeaderboard,
    handleCloseLeaderboard,
    handleOpenSettingsFromLeaderboard,
  } = useLeaderboardModal({
    isDailyMode,
    setIsDailyModalOpen,
    setIsSettingsModalOpen,
    setSettingsAccountJumpKey,
    activityAccessToken,
  });
  const { onChar, onDelete, onEnter } = useGuessInput({
    currentGuess,
    solution,
    guesses,
    maxChallenges,
    isGameWon,
    isGameLost,
    isChallengeMode,
    isDuelMode,
    isDailyMode,
    cellColors,
    revealTimerRef,
    setCurrentGuess,
    setCurrentRowClass,
    setIsRevealing,
    setGuesses,
    setIsGameWon,
    setIsGameLost,
    setCellColors,
    showErrorAlert,
    recordStats,
    isMobileRef,
    hasAutoClosedTrayRef,
    hapticsEnabledRef,
    setIsTrayOpen,
    onGuessSubmit: (word) => {
      if (isChallengeMode || isDuelMode || isDailyMode) return;
      const newly = recordGuess(word, solution, guesses);
      if (newly.length > 0) {
        setNewlyUnlockedAchievements((prev) => [...prev, ...newly]);
        achievementRevealPendingRef.current = true;
        newly.forEach(announceAchievement);
      }
    },
    onDailyComplete: handleDailyComplete,
  });
  const { resolveDailyActivityAccount } = useGameInitialization({
    challengeParam,
    duelParam,
    isDailyRoute,
    restoredGameRef,
    duelSubmittedRef,
    setIsLoading,
    setIsMalformedChallenge,
    setIsMalformedDuel,
    setIsDuelExpired,
    setIsActivityWrongPlayer,
    setIsActivityServerError,
    setIsActivityAccountChoicePending,
    setIsActivityAlreadyPlayed,
    setActivityAlreadyPlayedPlatform,
    setChallengeConfig,
    setDuelConfig,
    setDuelToken,
    setActivityAccessToken,
    setSolution,
    setGuesses,
    setCellColors,
    setIsGameWon,
    setIsGameLost,
    setIsChallengeModalOpen,
    setIsDuelModalOpen,
    setIsInfoModalOpen,
    setIsStatsModalOpen,
    setIsDailyActive,
    setDailyConfig,
    setDailyResult,
    setDailyStats,
    setIsDailyModalOpen,
    setDailyModalMode,
    onDailyRestoredComplete: (date, won) => {
      void submitDailyToLeaderboard(date, won);
    },
    showErrorAlert,
  });
  useSaveGameState({
    isLoading,
    solution,
    guesses,
    cellColors,
    autoGrayLetters,
    wordLength,
    settings,
    isDuelMode,
    duelConfig,
    isChallengeMode,
    challengeConfig,
    isDailyMode,
    dailyConfig,
  });
  useCrossTabSync({
    isLoading,
    isMobile,
    isDuelMode,
    isChallengeMode,
    isDailyMode,
    duelConfig,
    challengeConfig,
    dailyConfig,
    solution,
    hardMode,
    language: settings.language,
    restoredGameRef,
    achievementCheckedRef,
    duelSubmittedRef,
    onNewGameSynced: startNewGame,
    setSolution,
    setGuesses,
    setCellColors,
    setIsGameWon,
    setIsGameLost,
    setCurrentGuess,
    setCurrentRowClass,
    setIsRevealing,
    setWordLength,
    setHardMode,
    setShowGrayCount,
    setAutoGray,
    setAutoGreen,
    setExtraEffects,
    setStats,
    setHardStats,
    setDailyStats,
    setBackgroundId,
    setHiddenAttributionIds,
  });
  usePageChrome({
    isDuelMode,
    isChallengeMode,
    isDailyMode,
    language: settings.language,
  });
  useDiscourageInAppBrowser({ showErrorAlert });
  const { isOfflineModalOpen, handleCloseOfflineModal } = useOfflineModeCheck();
  const {
    isWebglUnavailableModalOpen,
    webglUnavailableBackgroundLabel,
    handleCloseWebglUnavailableModal,
  } = useWebglUnavailableModal();
  if (isLoading) return <LoadingScreen />;
  const screenFallback = (
    <div
      className="h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      style={{ background: "#0A0A0A" }}
    />
  );
  if (isActivityNotFound)
    return (
      <Suspense fallback={screenFallback}>
        <ActivityNotFoundScreen />
      </Suspense>
    );
  if (isActivityWrongPlayer)
    return (
      <Suspense fallback={screenFallback}>
        <ActivityWrongPlayerScreen />
      </Suspense>
    );
  if (isActivityServerError)
    return (
      <Suspense fallback={screenFallback}>
        <ActivityServerErrorScreen reason={isActivityServerError} />
      </Suspense>
    );
  if (isActivityAccountChoicePending && activityAccessToken)
    return (
      <Suspense fallback={screenFallback}>
        <ActivityAccountChoiceScreen
          accessToken={activityAccessToken}
          onResolved={resolveDailyActivityAccount}
        />
      </Suspense>
    );
  if (isActivityAlreadyPlayed)
    return (
      <Suspense fallback={screenFallback}>
        <ActivityAlreadyPlayedScreen platform={activityAlreadyPlayedPlatform} />
      </Suspense>
    );
  if (isMalformedChallenge)
    return (
      <Suspense fallback={screenFallback}>
        <MalformedChallengeScreen handleReturnToNormal={handleReturnToNormal} />
      </Suspense>
    );
  if (isMalformedDuel)
    return (
      <Suspense fallback={screenFallback}>
        <MalformedDuelScreen handleReturnToNormal={handleReturnToNormal} />
      </Suspense>
    );
  if (isDuelExpired)
    return (
      <Suspense fallback={screenFallback}>
        <ExpiredDuelScreen handleReturnToNormal={handleReturnToNormal} />
      </Suspense>
    );

  return (
    <div
      className="h-screen flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      style={{ background: "#0A0A0A" }}
    >
      {SHOW_KING_TAJIN_DISCLAIMER && <DisclaimerBanner />}
      <BackgroundStage
        backgroundId={backgroundId}
        isMobile={isMobile}
        extraEffects={extraEffects}
        keyboardRef={keyboardRef}
        guessesUsed={guesses.length}
        maxChallenges={maxChallenges}
        currentWinStreak={currentWinStreak}
        guesses={guesses}
      />
      {showAttributionButton && (
        <AttributionButton
          onClick={() => setIsAttributionModalOpen(true)}
          keyboardRef={keyboardRef}
          isMobile={isMobile}
        />
      )}
      {!isChallengeMode && !isDuelMode && !isDailyMode && (
        <AchievementTrayToggle
          isTrayOpen={isTrayOpen}
          onToggleTray={() => setIsTrayOpen((prev) => !prev)}
          onOpenAchievements={() => setIsAchievementsModalOpen(true)}
        />
      )}
      {isDiscordActivity && (isChallengeMode || isDuelMode || isDailyMode) && (
        <BackgroundTrayToggle
          isTrayOpen={isTrayOpen}
          onToggleTray={() => setIsTrayOpen((prev) => !prev)}
          onOpenBackgrounds={() => {
            setSettingsBackgroundJumpKey((prev) => prev + 1);
            setIsSettingsModalOpen(true);
          }}
        />
      )}
      <Navbar
        setIsInfoModalOpen={setIsInfoModalOpen}
        setIsStatsModalOpen={setIsStatsModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        handleNewGame={handleNewGameWithFail}
        hasActiveGame={hasActiveGame}
        gameMode={gameMode}
        isInfoModalOpen={isInfoModalOpen}
        isActivityMode={isDiscordActivity}
        onOpenDaily={handleOpenDaily}
      />
      <div className="relative pt-2 px-1 pb-[calc(11rem+env(safe-area-inset-bottom))] md:max-w-7xl w-full mx-auto sm:px-6 lg:px-8 flex flex-col grow">
        <div className="pb-6 grow">
          <m.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-pixel text-center text-4xl text-crown-gold crown-glow tracking-widest mb-4"
          >
            VAGUDLE
          </m.p>
          <GameBanner
            gameMode={gameMode}
            challengeConfig={challengeConfig}
            duelConfig={duelConfig}
            dailyConfig={dailyConfig}
            dailyNumber={dailyNumber}
            usernameWarning={dailyUsernameWarning}
          />
          <Grid
            solution={solution}
            guesses={guesses}
            currentGuess={currentGuess}
            isRevealing={isRevealing}
            currentRowClassName={currentRowClass}
            showGrayCount={showGrayCount}
            maxChallenges={maxChallenges}
            cellColors={cellColors}
            onCellPaint={onCellPaint}
            onRowReset={onRowReset}
            onFullReset={onFullReset}
            autoGray={autoGray}
          />
        </div>
        <Keyboard
          onChar={onChar}
          onDelete={onDelete}
          onEnter={onEnter}
          solution={solution}
          userStatuses={userStatuses}
          isRevealing={isRevealing}
          containerRef={keyboardRef}
        />
        <GameModals
          solution={solution}
          guesses={guesses}
          stats={stats}
          hardStats={hardStats}
          hardMode={hardMode}
          extraEffects={extraEffects}
          setExtraEffects={setExtraEffects}
          cloudSyncStatus={{
            updatedAt: cloudUpdatedAt,
            isUpToDate,
            showPlayGamesLinkPrompt,
            dismissPlayGamesLinkPrompt,
          }}
          gameMode={gameMode}
          activityContext={{
            isActivityMode: isDiscordActivity,
            activityAccessToken,
          }}
          isMobile={isMobile}
          isGameWon={isGameWon}
          isGameLost={isGameLost}
          wordLength={wordLength}
          challengeConfig={challengeConfig}
          duelConfig={duelConfig}
          duelSaveStatus={duelSaveStatus}
          dailyConfig={dailyConfig}
          dailyResult={dailyResult}
          dailyStats={dailyStats}
          dailyNumber={dailyNumber}
          dailyModalMode={dailyModalMode}
          isDailyModalOpen={isDailyModalOpen}
          handlePlayDaily={handlePlayDaily}
          handleShareDaily={handleShareDaily}
          handleCloseDaily={handleCloseDaily}
          handleLeaveDaily={handleLeaveDaily}
          handleViewDailyGame={handleViewDailyGame}
          isDailyScheduleModalOpen={isDailyScheduleModalOpen}
          handleOpenDailySchedule={handleOpenDailySchedule}
          handleCloseDailySchedule={handleCloseDailySchedule}
          isLeaderboardModalOpen={isLeaderboardModalOpen}
          handleOpenLeaderboard={handleOpenLeaderboard}
          handleCloseLeaderboard={handleCloseLeaderboard}
          handleOpenSettingsFromLeaderboard={handleOpenSettingsFromLeaderboard}
          handleUsernameSaved={handleUsernameSavedForWidget}
          leaderboardIdToken={leaderboardIdToken}
          showGrayCount={showGrayCount}
          setShowGrayCount={setShowGrayCount}
          autoGray={autoGray}
          handleSetAutoGray={handleSetAutoGray}
          autoGreen={autoGreen}
          setAutoGreen={setAutoGreen}
          backgroundId={backgroundId}
          setBackgroundId={setBackgroundId}
          dailyStreakRemindersEnabled={dailyStreakRemindersEnabled}
          setDailyStreakRemindersEnabled={setDailyStreakRemindersEnabled}
          streakResetWarningHours={streakResetWarningHours}
          setStreakResetWarningHours={setStreakResetWarningHours}
          customReminderTimeEnabled={customReminderTimeEnabled}
          setCustomReminderTimeEnabled={setCustomReminderTimeEnabled}
          customReminderHour={customReminderHour}
          setCustomReminderHour={setCustomReminderHour}
          customReminderMinute={customReminderMinute}
          setCustomReminderMinute={setCustomReminderMinute}
          customReminderPeriod={customReminderPeriod}
          setCustomReminderPeriod={setCustomReminderPeriod}
          inactivityReminderEnabled={inactivityReminderEnabled}
          setInactivityReminderEnabled={setInactivityReminderEnabled}
          inactivityReminderDays={inactivityReminderDays}
          setInactivityReminderDays={setInactivityReminderDays}
          hapticsEnabled={hapticsEnabled}
          setHapticsEnabled={setHapticsEnabled}
          language={language}
          setLanguage={setLanguage}
          unlockedIds={unlockedIds}
          newlyUnlockedAchievements={newlyUnlockedAchievements}
          onAchievementsViewed={() => setNewlyUnlockedAchievements([])}
          currentBackground={currentBackground}
          hiddenAttributionIds={hiddenAttributionIds}
          handleAttributionHideForeverChange={
            handleAttributionHideForeverChange
          }
          handleRestoreHiddenAttributions={handleRestoreHiddenAttributions}
          uniqueWordCount={uniqueWordCount}
          currentWinStreak={currentWinStreak}
          totalWins={
            stats.totalGames -
            stats.gamesFailed +
            (hardStats.totalGames - hardStats.gamesFailed)
          }
          handleNewGame={handleNewGame}
          handleReturnToNormal={handleReturnToNormal}
          handleWordLengthChange={handleWordLengthChange}
          handleHardModeChange={(value: boolean) => {
            setHardMode(value);
            if (guesses.length === 0)
              startNewGame(getRandomWord(wordLength, value));
          }}
          handleShareToClipboard={() =>
            showSuccessAlert(strings.GAME_COPIED_MESSAGE)
          }
          isInfoModalOpen={isInfoModalOpen}
          handleCloseInfo={() => setIsInfoModalOpen(false)}
          infoModalAutoOpenReset={isDeleteAccountRoute}
          isStatsModalOpen={isStatsModalOpen}
          handleCloseStats={() => setIsStatsModalOpen(false)}
          isSettingsModalOpen={isSettingsModalOpen}
          handleCloseSettings={() => {
            setIsSettingsModalOpen(false);
            if (isDailyMode) void handleOpenDaily();
          }}
          jumpKeys={{
            account: settingsAccountJumpKey,
            background: settingsBackgroundJumpKey,
          }}
          isChallengeModalOpen={isChallengeModalOpen}
          handlePlayChallenge={() => setIsChallengeModalOpen(false)}
          isDuelModalOpen={isDuelModalOpen}
          handlePlayDuel={() => setIsDuelModalOpen(false)}
          isAttributionModalOpen={isAttributionModalOpen}
          handleCloseAttribution={() => setIsAttributionModalOpen(false)}
          isAchievementsModalOpen={isAchievementsModalOpen}
          handleCloseAchievements={() => setIsAchievementsModalOpen(false)}
        />
        <AlertContainer />
        <Suspense fallback={null}>
          <OfflineModeModal
            isOpen={isOfflineModalOpen}
            handleClose={handleCloseOfflineModal}
          />
        </Suspense>
        <Suspense fallback={null}>
          <WebglUnavailableModal
            isOpen={isWebglUnavailableModalOpen}
            backgroundLabel={webglUnavailableBackgroundLabel}
            handleClose={handleCloseWebglUnavailableModal}
          />
        </Suspense>
      </div>
      {pendingCloudSave && (
        <CloudSaveConflictOverlay
          cloudSave={pendingCloudSave}
          isMobile={isMobile}
          onResolved={resolvePendingCloudSave}
        />
      )}
      {isCelebrating && (
        <WinCelebrationOverlay
          solution={solution}
          onDone={handleCelebrationDone}
        />
      )}
      {isRevealingAchievement && (
        <AchievementRevealOverlay
          onDone={handleAchievementRevealDone}
          hapticsEnabled={hapticsEnabled}
        />
      )}
    </div>
  );
}

export default App;
