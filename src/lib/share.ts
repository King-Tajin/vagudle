import { getGuessStatuses } from "./statuses";
import { unicodeSplit } from "./words";
import { type GameStats } from "./localStorage";
import { DAILY_PATH, type DailyStats } from "./daily";
import { getPublicOrigin } from "./publicOrigin";
import { UAParser } from "ua-parser-js";
import { DICT_LABELS, type ChallengeConfig } from "./challenge";
import type { Achievement } from "./achievements";
import { BACKGROUNDS } from "./backgrounds";
import strings from "../constants/strings";

const parser = new UAParser();
const browser = parser.getBrowser();

const EMOJI_TILES = ["🟩", "🟨", "⬛"];

const attemptShare = (shareData: object) => {
  return (
    browser.name?.toUpperCase().indexOf("FIREFOX") === -1 &&
    typeof navigator.share === "function" &&
    navigator.canShare &&
    navigator.canShare(shareData)
  );
};

const getSharePlugin = (): CapacitorSharePlugin | null => {
  if (typeof window === "undefined") return null;
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  return window.Capacitor.Plugins?.Share ?? null;
};

export const doShare = async (
  shareData: { title: string; text: string },
  textToShare: string,
  handleShareToClipboard: () => void
) => {
  try {
    const sharePlugin = getSharePlugin();
    if (sharePlugin) {
      await sharePlugin.share(shareData);
      return;
    }
    if (attemptShare(shareData)) {
      await navigator.share(shareData);
      return;
    }
  } catch {}
  try {
    await navigator.clipboard.writeText(textToShare);
    handleShareToClipboard();
  } catch {}
};

export const shareStatus = async (
  solution: string,
  guesses: string[],
  lost: boolean,
  handleShareToClipboard: () => void,
  hardMode: boolean,
  maxChallenges: number,
  challengeMode: boolean = false
) => {
  const score = lost ? "X" : guesses.length;
  const modeTag = hardMode ? strings.SHARE_HARD_MODE_TAG : "";
  const wordPart = challengeMode ? `${solution.length} letters` : solution;
  const header = challengeMode
    ? strings.SHARE_CHALLENGE_HEADER_TEXT(score, maxChallenges, wordPart)
    : strings.SHARE_STATUS_HEADER_TEXT(
        modeTag,
        solution,
        score,
        maxChallenges,
        solution.length
      );
  const textToShare =
    `${header}\n${window.location.href}\n` +
    generateEmojiGrid(solution, guesses, EMOJI_TILES);

  await doShare(
    {
      title: challengeMode
        ? strings.SHARE_STATUS_CHALLENGE_TITLE()
        : strings.SHARE_STATUS_NORMAL_TITLE(solution),
      text: textToShare,
    },
    textToShare,
    handleShareToClipboard
  );
};

export const shareDailyResult = async (
  solution: string,
  guesses: string[],
  lost: boolean,
  dailyNumber: number,
  maxChallenges: number,
  handleShareToClipboard: () => void
) => {
  const score = lost ? "X" : guesses.length;
  const header = strings.SHARE_DAILY_HEADER_TEXT(
    dailyNumber,
    score,
    maxChallenges
  );
  const textToShare =
    `${header}\n${getPublicOrigin()}${DAILY_PATH}\n` +
    generateEmojiGrid(solution, guesses, EMOJI_TILES);

  await doShare(
    { title: strings.SHARE_DAILY_TITLE(dailyNumber), text: textToShare },
    textToShare,
    handleShareToClipboard
  );
};

export const generateEmojiGrid = (
  solution: string,
  guesses: string[],
  tiles: string[]
) => {
  return guesses
    .map((guess) => {
      const status = getGuessStatuses(solution, guess);
      const splitGuess = unicodeSplit(guess);
      return splitGuess
        .map((_, i) => {
          switch (status[i]) {
            case "correct":
              return tiles[0];
            case "present":
              return tiles[1];
            default:
              return tiles[2];
          }
        })
        .join("");
    })
    .join("\n");
};

export const shareStats = async (
  stats: GameStats,
  hardMode: boolean,
  handleShareToClipboard: () => void
) => {
  const modeTag = hardMode
    ? strings.SHARE_HARD_MODE_TAG
    : strings.SHARE_NORMAL_MODE_TAG;
  const lines = [
    strings.SHARE_STATS_TITLE(modeTag),
    `${window.location.href}`,
    ``,
    `${strings.SHARE_STATS_PLAYED_LABEL}${stats.totalGames}`,
    `${strings.SHARE_STATS_WIN_RATE_LABEL}${stats.successRate}%`,
    `${strings.SHARE_STATS_STREAK_LABEL}${stats.currentStreak}`,
    `${strings.SHARE_STATS_BEST_LABEL}${stats.bestStreak}`,
  ];

  const maxCount = Math.max(...stats.winDistribution, 1);
  const bars = stats.winDistribution
    .map((count, i) => {
      const filled = Math.round((count / maxCount) * 8);
      const bar = "█".repeat(filled) + "░".repeat(8 - filled);
      return `${String(i + 1).padStart(2)}: ${bar} ${count}`;
    })
    .join("\n");

  lines.push(``, strings.SHARE_STATS_GUESS_DISTRIBUTION_LABEL, bars);

  const textToShare = lines.join("\n");

  await doShare(
    { title: strings.SHARE_STATS_TITLE(modeTag), text: textToShare },
    textToShare,
    handleShareToClipboard
  );
};

export const shareDailyStats = async (
  stats: DailyStats,
  handleShareToClipboard: () => void
) => {
  const winRate =
    stats.totalPlayed > 0
      ? Math.round((stats.totalWon / stats.totalPlayed) * 100)
      : 0;
  const lines = [
    strings.SHARE_DAILY_STATS_TITLE(),
    `${window.location.href}`,
    ``,
    `${strings.SHARE_STATS_PLAYED_LABEL}${stats.totalPlayed}`,
    `${strings.SHARE_STATS_WIN_RATE_LABEL}${winRate}%`,
    `${strings.SHARE_STATS_STREAK_LABEL}${stats.currentStreak}`,
    `${strings.SHARE_STATS_BEST_LABEL}${stats.bestStreak}`,
  ];

  const textToShare = lines.join("\n");

  await doShare(
    { title: strings.SHARE_DAILY_STATS_TITLE(), text: textToShare },
    textToShare,
    handleShareToClipboard
  );
};

export const shareChallengeInvite = async (
  config: ChallengeConfig,
  handleShareToClipboard: () => void
) => {
  const text =
    `${strings.SHARE_CHALLENGE_INVITE_INTRO_TEXT}\n` +
    `${strings.SHARE_CHALLENGE_INVITE_DETAILS_TEXT(
      config.length,
      DICT_LABELS[config.dict],
      config.guesses
    )}\n` +
    `${strings.SHARE_CHALLENGE_INVITE_NOTE_TEXT}\n` +
    window.location.href;

  await doShare(
    { title: strings.SHARE_CHALLENGE_INVITE_TITLE, text },
    text,
    handleShareToClipboard
  );
};

export const shareAchievement = async (
  achievement: Achievement,
  handleShareToClipboard: () => void
) => {
  const bgUnlock = BACKGROUNDS.find(
    (b) => b.requiresAchievementId === achievement.id
  );
  const text =
    `${strings.SHARE_ACHIEVEMENT_UNLOCKED_TEXT(achievement.title)}\n` +
    `${achievement.description}\n` +
    (bgUnlock
      ? `${strings.SHARE_ACHIEVEMENT_BACKGROUND_UNLOCKED_TEXT(bgUnlock.desktopLabel)}\n`
      : "") +
    window.location.href;

  await doShare(
    { title: strings.SHARE_ACHIEVEMENT_TITLE, text },
    text,
    handleShareToClipboard
  );
};
