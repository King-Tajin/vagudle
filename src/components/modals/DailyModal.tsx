import { Fragment, useEffect, useState } from "react";
import { Transition, TransitionChild } from "@headlessui/react";
import {
  CalendarDays,
  CalendarClock,
  Hash,
  BookOpen,
  Flame,
  Share2,
  RotateCcw,
  Loader,
  Trophy,
  Eye,
  X,
} from "lucide-react";
import type { DailyConfig, DailyStats } from "../../lib/daily";
import { msUntilNextDailyRelease } from "../../lib/daily";
import { useBackButtonClose, useBackGestureStyle } from "../../lib/backButton";
import strings from "../../constants/strings";

export type DailyOrigin =
  { type: "daily" } | { type: "normal"; canViewGame: boolean };

export type DailyModalResult = {
  won: boolean;
  guessCount: number;
  maxGuesses: number;
};

type Props = {
  isOpen: boolean;
  mode: "loading" | "error" | "play" | "complete";
  config: DailyConfig | null;
  dailyNumber: number;
  dailyStats: DailyStats;
  result: DailyModalResult;
  origin: DailyOrigin;
  onPlay: () => void;
  onShare: () => void;
  onClose: () => void;
  onLeaveDaily: () => void;
  onOpenLeaderboard: () => void;
  onViewGame: () => void;
  onOpenSchedule: () => void;
};

const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
};

const useCountdownToNextDaily = (): string => {
  const [msRemaining, setMsRemaining] = useState(() =>
    msUntilNextDailyRelease()
  );

  useEffect(() => {
    const interval = setInterval(
      () => setMsRemaining(msUntilNextDailyRelease()),
      1000
    );
    return () => clearInterval(interval);
  }, []);

  return formatCountdown(msRemaining);
};

const DailyModalPlayContent = ({
  config,
  dailyStats,
  origin,
  onPlay,
  onLeaveDaily,
}: {
  config: DailyConfig;
  dailyStats: DailyStats;
  origin: DailyOrigin;
  onPlay: () => void;
  onLeaveDaily: () => void;
}) => {
  const isDailyMode = origin.type === "daily";

  return (
    <>
      <p className="font-code text-sm text-gray-300 leading-relaxed">
        {strings.DAILY_MODAL_PLAY_INTRO_TEXT}
      </p>

      <div
        className="space-y-2 p-3"
        style={{
          background: "rgba(80,0,170,0.1)",
          border: "1px solid rgba(80,0,170,0.35)",
        }}
      >
        <div className="flex items-center gap-3">
          <Hash className="w-4 h-4 text-crown-amber shrink-0" />
          <div>
            <p className="font-pixel text-xs text-crown-amber tracking-widest leading-none">
              {strings.DAILY_MODAL_WORD_LENGTH_LABEL}
            </p>
            <p className="font-code text-sm text-gray-200 mt-0.5">
              {strings.DAILY_SCHEDULE_WORD_LENGTH_TEXT(config.wordLength)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-crown-amber shrink-0" />
          <div>
            <p className="font-pixel text-xs text-crown-amber tracking-widest leading-none">
              {strings.DAILY_MODAL_DIFFICULTY_LABEL}
            </p>
            <p className="font-code text-sm text-gray-200 mt-0.5">
              {config.hardMode
                ? strings.BANNER_DIFFICULTY_HARD_TEXT
                : strings.BANNER_DIFFICULTY_NORMAL_TEXT}
            </p>
          </div>
        </div>

        {dailyStats.currentStreak > 0 && (
          <div className="flex items-center gap-3">
            <Flame className="w-4 h-4 text-crown-amber shrink-0" />
            <div>
              <p className="font-pixel text-xs text-crown-amber tracking-widest leading-none">
                {strings.DAILY_MODAL_CURRENT_STREAK_LABEL}
              </p>
              <p className="font-code text-sm text-gray-200 mt-0.5">
                {strings.DAILY_MODAL_STREAK_DAYS_TEXT(dailyStats.currentStreak)}
              </p>
            </div>
          </div>
        )}
      </div>

      {isDailyMode ? (
        <p className="font-code text-xs text-gray-500 leading-snug">
          {strings.DAILY_MODAL_ALREADY_PLAYING_TEXT}
        </p>
      ) : (
        <p
          className="font-code text-xs leading-snug"
          style={{ color: "rgba(212,175,55,0.6)" }}
        >
          {strings.DAILY_MODAL_LOCKOUT_WARNING_TEXT}
        </p>
      )}

      {isDailyMode ? (
        <button
          type="button"
          onClick={onLeaveDaily}
          className="w-full py-3 font-pixel text-xs tracking-widest flex items-center justify-center gap-2 transition-colors"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "2px solid rgba(255,255,255,0.12)",
            color: "#9ca3af",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = "brightness(1.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = "brightness(1)";
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {strings.DAILY_MODAL_LEAVE_BUTTON_TEXT}
        </button>
      ) : (
        <button
          type="button"
          onClick={onPlay}
          className="w-full py-3 font-pixel text-xs tracking-widest flex items-center justify-center gap-2 transition-colors"
          style={{
            background: "linear-gradient(180deg, #d4af37 0%, #b8860b 100%)",
            border: "2px solid #d4af37",
            color: "#0a0014",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = "brightness(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = "brightness(1)";
          }}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          {strings.DAILY_MODAL_PLAY_BUTTON_TEXT}
        </button>
      )}
    </>
  );
};

const DailyModalCompleteContent = ({
  result,
  origin,
  dailyStats,
  countdown,
  onViewGame,
  onShare,
  onLeaveDaily,
}: {
  result: DailyModalResult;
  origin: DailyOrigin;
  dailyStats: DailyStats;
  countdown: string;
  onViewGame: () => void;
  onShare: () => void;
  onLeaveDaily: () => void;
}) => {
  const isDailyMode = origin.type === "daily";
  const canViewGame = origin.type === "normal" && origin.canViewGame;

  return (
    <>
      <div className="flex items-center justify-center gap-3">
        <p
          className="font-pixel text-xs tracking-widest text-center"
          style={{
            color: result.won
              ? "var(--color-crown-amber, #f59e0b)"
              : "var(--color-spice-red, #ef4444)",
          }}
        >
          {result.won
            ? strings.DAILY_MODAL_SOLVED_TEXT(
                result.guessCount,
                result.maxGuesses
              )
            : strings.DAILY_MODAL_NOT_SOLVED_TEXT}
        </p>
        {canViewGame && (
          <button
            type="button"
            onClick={onViewGame}
            className="flex items-center gap-1 py-1 px-2 font-pixel text-[9px] tracking-widest transition-colors shrink-0"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#9ca3af",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#d4af37";
              e.currentTarget.style.borderColor = "rgba(212,175,55,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#9ca3af";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            }}
          >
            <Eye className="w-3 h-3" />
            {strings.DAILY_MODAL_VIEW_GAME_BUTTON_TEXT}
          </button>
        )}
      </div>
      <p className="font-code text-xs text-gray-500 text-center leading-snug">
        {strings.DAILY_MODAL_COME_BACK_TEXT}
      </p>

      <div
        className="grid grid-cols-3 gap-2 p-3 text-center"
        style={{
          background: "rgba(80,0,170,0.08)",
          border: "1px solid rgba(80,0,170,0.25)",
        }}
      >
        <div>
          <p className="font-pixel text-[9px] text-crown-amber tracking-widest">
            {strings.DAILY_MODAL_STREAK_LABEL}
          </p>
          <p className="font-code text-sm text-gray-200 mt-1">
            {dailyStats.currentStreak}
          </p>
        </div>
        <div>
          <p className="font-pixel text-[9px] text-crown-amber tracking-widest">
            {strings.DAILY_MODAL_BEST_LABEL}
          </p>
          <p className="font-code text-sm text-gray-200 mt-1">
            {dailyStats.bestStreak}
          </p>
        </div>
        <div>
          <p className="font-pixel text-[9px] text-crown-amber tracking-widest">
            {strings.DAILY_MODAL_PLAYED_LABEL}
          </p>
          <p className="font-code text-sm text-gray-200 mt-1">
            {dailyStats.totalPlayed}
          </p>
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-2 py-2"
        style={{ color: "#6b7280" }}
      >
        <p className="font-code text-xs">
          {strings.DAILY_MODAL_NEXT_DAILY_TEXT(countdown)}
        </p>
      </div>

      <button
        type="button"
        onClick={onShare}
        className="w-full flex items-center justify-center gap-2 py-3 font-pixel text-xs tracking-wider transition-colors"
        style={{
          background: "linear-gradient(180deg, #5000aa 0%, #28007c 100%)",
          border: "2px solid #5000aa",
          color: "#fff",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = "brightness(1.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = "brightness(1)";
        }}
      >
        <Share2 className="w-3.5 h-3.5" />
        {strings.DAILY_MODAL_SHARE_BUTTON_TEXT}
      </button>

      {isDailyMode && (
        <button
          type="button"
          onClick={onLeaveDaily}
          className="w-full flex items-center justify-center gap-2 py-3 font-pixel text-xs tracking-wider transition-colors"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "2px solid rgba(255,255,255,0.12)",
            color: "#9ca3af",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = "brightness(1.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = "brightness(1)";
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {strings.RETURN_TO_NORMAL_GAME_BUTTON_TEXT}
        </button>
      )}
    </>
  );
};

export const DailyModal = ({
  isOpen,
  mode,
  config,
  dailyNumber,
  dailyStats,
  result,
  origin,
  onPlay,
  onShare,
  onClose,
  onLeaveDaily,
  onOpenLeaderboard,
  onViewGame,
  onOpenSchedule,
}: Props) => {
  const countdown = useCountdownToNextDaily();

  useBackButtonClose(isOpen, onClose);
  const peekStyle = useBackGestureStyle(isOpen);

  return (
    <Transition show={isOpen} as={Fragment}>
      <div className="fixed inset-0 z-70 flex items-center justify-center px-4">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="absolute inset-0 transition-opacity"
            style={{
              background: "rgba(0,0,0,0.92)",
              opacity: peekStyle.opacity,
            }}
          />
        </TransitionChild>

        <TransitionChild
          as={Fragment}
          enter="ease-out duration-250"
          enterFrom="opacity-0 translate-y-4 scale-95"
          enterTo="opacity-100 translate-y-0 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 translate-y-0 scale-100"
          leaveTo="opacity-0 translate-y-4 scale-95"
        >
          <div
            className="relative max-w-sm w-full mx-auto shadow-2xl transition-all duration-75"
            style={{
              background: "#0a0014",
              border: "4px solid #5000aa",
              ...peekStyle,
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b-2 border-obsidian-700"
              style={{ background: "rgba(10,0,20,0.97)" }}
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-crown-gold" />
                <h2 className="font-pixel text-sm text-crown-amber tracking-widest">
                  {mode === "complete"
                    ? strings.DAILY_MODAL_HEADING_COMPLETE
                    : strings.DAILY_MODAL_HEADING_DEFAULT}
                  {dailyNumber > 0 ? ` #${dailyNumber}` : ""}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenSchedule}
                  className="p-2 bg-obsidian-700 hover:bg-obsidian-600 text-gray-400 hover:text-white transition-colors pixel-border-sm"
                  aria-label={strings.DAILY_MODAL_SCHEDULE_ARIA_LABEL}
                  title={strings.DAILY_MODAL_SCHEDULE_ARIA_LABEL}
                >
                  <CalendarClock className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 bg-obsidian-700 hover:bg-obsidian-600 text-gray-400 hover:text-white transition-colors pixel-border-sm"
                  aria-label={strings.CLOSE_BUTTON_LABEL}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-5 py-5 space-y-4">
              {mode === "loading" && (
                <div className="flex items-center gap-3 py-6 justify-center">
                  <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                  <p className="font-code text-sm text-gray-400">
                    {strings.DAILY_MODAL_LOADING_TEXT}
                  </p>
                </div>
              )}

              {mode === "error" && (
                <>
                  <p className="font-code text-sm text-gray-300 leading-relaxed">
                    {strings.DAILY_MODAL_ERROR_TEXT}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 font-pixel text-xs tracking-widest transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "2px solid rgba(255,255,255,0.12)",
                      color: "#9ca3af",
                    }}
                  >
                    {strings.RESET_DATA_CLOSE_BUTTON_TEXT}
                  </button>
                </>
              )}

              {mode === "play" && config && (
                <DailyModalPlayContent
                  config={config}
                  dailyStats={dailyStats}
                  origin={origin}
                  onPlay={onPlay}
                  onLeaveDaily={onLeaveDaily}
                />
              )}

              {mode === "complete" && (
                <DailyModalCompleteContent
                  result={result}
                  origin={origin}
                  dailyStats={dailyStats}
                  countdown={countdown}
                  onViewGame={onViewGame}
                  onShare={onShare}
                  onLeaveDaily={onLeaveDaily}
                />
              )}

              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="w-full flex items-center justify-center gap-2 py-2 font-pixel text-[10px] tracking-wider transition-colors"
                style={{
                  background: "rgba(212,175,55,0.08)",
                  border: "2px solid rgba(212,175,55,0.4)",
                  color: "#d4af37",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "brightness(1.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "brightness(1)";
                }}
              >
                <Trophy className="w-3.5 h-3.5" />
                {strings.DAILY_MODAL_VIEW_LEADERBOARD_BUTTON_TEXT}
              </button>
            </div>
          </div>
        </TransitionChild>
      </div>
    </Transition>
  );
};
