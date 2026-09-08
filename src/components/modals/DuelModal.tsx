import { Fragment } from "react";
import { Transition, TransitionChild } from "@headlessui/react";
import {
  Swords,
  BookOpen,
  Hash,
  Target,
  RotateCcw,
  Loader,
} from "lucide-react";
import { DICT_LABELS, DICT_DESCRIPTIONS } from "../../lib/challenge";
import type { DuelConfig, DuelSaveStatus } from "../../lib/duel";
import { useBackButtonClose, useBackGestureStyle } from "../../lib/backButton";
import strings from "../../constants/strings";

type Props = {
  isOpen: boolean;
  mode: "accept" | "complete";
  config: DuelConfig;
  onPlay?: () => void;
  onReturn: () => void;
  saveStatus?: DuelSaveStatus;
  isActivityMode?: boolean;
};

export const DuelModal = ({
  isOpen,
  mode,
  config,
  onPlay,
  onReturn,
  saveStatus = "idle",
  isActivityMode = false,
}: Props) => {
  useBackButtonClose(isOpen, () => {});
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
              className="flex items-center gap-3 px-5 py-4 border-b-2 border-obsidian-700"
              style={{ background: "rgba(10,0,20,0.97)" }}
            >
              <Swords className="w-5 h-5 text-crown-gold" />
              <h2 className="font-pixel text-sm text-crown-amber tracking-widest">
                {mode === "accept"
                  ? strings.DUEL_MODAL_ACCEPT_HEADING
                  : strings.DUEL_MODAL_COMPLETE_HEADING}
              </h2>
            </div>

            <div className="px-5 py-5 space-y-4">
              {mode === "accept" && (
                <>
                  <p className="font-code text-sm text-gray-300 leading-relaxed">
                    {strings.DUEL_MODAL_CHALLENGED_INTRO_TEXT}
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
                          {strings.DUEL_MODAL_WORD_LENGTH_LABEL}
                        </p>
                        <p className="font-code text-sm text-gray-200 mt-0.5">
                          {strings.DUEL_MODAL_LETTERS_TEXT(config.length)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-crown-amber shrink-0" />
                      <div>
                        <p className="font-pixel text-xs text-crown-amber tracking-widest leading-none">
                          {strings.DUEL_MODAL_DICTIONARY_LABEL}
                        </p>
                        <p className="font-code text-sm text-gray-200 mt-0.5">
                          {DICT_LABELS[config.dict]} —{" "}
                          <span className="text-gray-400 text-xs">
                            {DICT_DESCRIPTIONS[config.dict]}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Target className="w-4 h-4 text-crown-amber shrink-0" />
                      <div>
                        <p className="font-pixel text-xs text-crown-amber tracking-widest leading-none">
                          {strings.DUEL_MODAL_GUESSES_LABEL}
                        </p>
                        <p className="font-code text-sm text-gray-200 mt-0.5">
                          {strings.DUEL_MODAL_ATTEMPTS_TEXT(config.guesses)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="font-code text-xs text-gray-500 leading-snug">
                    {strings.DUEL_MODAL_PROGRESS_SAVED_TEXT}
                  </p>
                  <p
                    className="font-code text-xs leading-snug"
                    style={{ color: "rgba(212,175,55,0.6)" }}
                  >
                    {strings.DUEL_MODAL_RESULTS_NOT_COUNTED_TEXT}
                  </p>

                  <button
                    type="button"
                    onClick={onPlay}
                    className="w-full py-3 font-pixel text-xs tracking-widest flex items-center justify-center gap-2 transition-[filter]"
                    style={{
                      background:
                        "linear-gradient(180deg, #d4af37 0%, #b8860b 100%)",
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
                    <Swords className="w-3.5 h-3.5" />
                    {strings.DUEL_MODAL_PLAY_BUTTON_TEXT}
                  </button>
                </>
              )}

              {mode === "complete" && (
                <>
                  <p
                    className="font-pixel text-xs tracking-widest text-center"
                    style={{
                      color:
                        saveStatus === "failed"
                          ? "var(--color-spice-red, #ef4444)"
                          : saveStatus === "saved"
                            ? "var(--color-crown-amber, #f59e0b)"
                            : "#6b7280",
                    }}
                  >
                    {saveStatus === "failed"
                      ? strings.DUEL_MODAL_RESULT_NOT_RECORDED_TEXT
                      : saveStatus === "saved"
                        ? strings.DUEL_MODAL_RESULT_RECORDED_TEXT
                        : strings.DUEL_MODAL_SAVING_RESULT_TEXT}
                  </p>
                  <p className="font-code text-xs text-gray-500 text-center leading-snug">
                    {saveStatus === "failed"
                      ? strings.DUEL_MODAL_RESULT_NOT_RECORDED_DESCRIPTION
                      : saveStatus === "saved"
                        ? strings.DUEL_MODAL_RESULT_RECORDED_DESCRIPTION
                        : strings.DUEL_MODAL_SAVING_RESULT_DESCRIPTION}
                  </p>

                  <div
                    className="p-3 flex items-center gap-3"
                    style={{
                      background: "rgba(80,0,170,0.08)",
                      border: "1px solid rgba(80,0,170,0.25)",
                    }}
                  >
                    {saveStatus === "saving" && (
                      <>
                        <Loader className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
                        <p className="font-code text-xs text-gray-400">
                          {strings.DUEL_MODAL_SAVING_RESULTS_TEXT}
                        </p>
                      </>
                    )}
                    {saveStatus === "saved" && (
                      <p className="font-code text-xs text-spice-lime">
                        {strings.DUEL_MODAL_RESULTS_SAVED_TEXT}
                      </p>
                    )}
                    {saveStatus === "failed" && (
                      <p className="font-code text-xs text-spice-red leading-snug">
                        {strings.DUEL_MODAL_SAVE_FAILED_TEXT}
                      </p>
                    )}
                    {saveStatus === "idle" && (
                      <p className="font-code text-xs text-gray-500">
                        {strings.DUEL_MODAL_PREPARING_SAVE_TEXT}
                      </p>
                    )}
                  </div>

                  {!isActivityMode && (
                    <button
                      type="button"
                      onClick={onReturn}
                      disabled={
                        saveStatus === "saving" || saveStatus === "idle"
                      }
                      className="w-full py-3 font-pixel text-xs tracking-widest flex items-center justify-center gap-2 transition-colors"
                      style={{
                        background:
                          saveStatus === "saving" || saveStatus === "idle"
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(255,255,255,0.04)",
                        border: "2px solid rgba(255,255,255,0.12)",
                        color:
                          saveStatus === "saving" || saveStatus === "idle"
                            ? "#4b5563"
                            : "#9ca3af",
                        cursor:
                          saveStatus === "saving" || saveStatus === "idle"
                            ? "not-allowed"
                            : "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (saveStatus === "saving" || saveStatus === "idle")
                          return;
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
              )}
            </div>
          </div>
        </TransitionChild>
      </div>
    </Transition>
  );
};
