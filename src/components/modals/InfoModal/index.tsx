import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Transition, TransitionChild } from "@headlessui/react";
import { X, Gamepad2, Info, Sparkles, Code2, Send, Swords } from "lucide-react";
import HatIcon from "@/assets/icons/propeller-hat.svg?react";

import {
  useBackButtonClose,
  useBackGestureStyle,
} from "../../../lib/backButton";
import { isNativeApp } from "../../../lib/browser";
import { ActivityLink } from "../../ActivityLink";
import { ResetDataModal } from "../ResetDataModal";
import { HowToTab } from "./tabs/HowToTab";
import { FeaturesTab } from "./tabs/FeaturesTab";
import { ChallengesTab } from "./tabs/ChallengesTab";
import { AboutTab } from "./tabs/AboutTab";
import { OpenSourceTab } from "./tabs/OpenSourceTab";
import { FeedbackTab } from "./tabs/FeedbackTab";
import strings from "../../../constants/strings";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
  hasHiddenAttributions: boolean;
  onRestoreHiddenAttributions: () => void;
  autoOpenReset?: boolean;
};

type Tab =
  "howto" | "features" | "challenges" | "about" | "opensource" | "feedback";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "howto",
    label: strings.INFO_TAB_HOWTO_LABEL,
    icon: <Gamepad2 className="w-3.5 h-3.5" />,
  },
  {
    id: "features",
    label: strings.INFO_TAB_FEATURES_LABEL,
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    id: "challenges",
    label: strings.INFO_TAB_CHALLENGES_LABEL,
    icon: <Swords className="w-3.5 h-3.5" />,
  },
  {
    id: "about",
    label: strings.INFO_TAB_ABOUT_LABEL,
    icon: <Info className="w-3.5 h-3.5" />,
  },
  {
    id: "opensource",
    label: strings.INFO_TAB_OPENSOURCE_LABEL,
    icon: <Code2 className="w-3.5 h-3.5" />,
  },
  {
    id: "feedback",
    label: strings.INFO_TAB_FEEDBACK_LABEL,
    icon: <Send className="w-3.5 h-3.5" />,
  },
];

export const InfoModal = ({
  isOpen,
  handleClose,
  hasHiddenAttributions,
  onRestoreHiddenAttributions,
  autoOpenReset = false,
}: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>(
    autoOpenReset ? "about" : "howto"
  );
  const [isResetModalOpen, setIsResetModalOpen] = useState(autoOpenReset);
  const previousPathRef = useRef<string | null>(null);

  useBackButtonClose(isOpen, handleClose);
  const peekStyle = useBackGestureStyle(isOpen);

  useEffect(() => {
    if (typeof window === "undefined" || !isResetModalOpen) return;

    if (window.location.pathname !== "/delete-account") {
      previousPathRef.current =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      window.history.pushState({}, "", "/delete-account");
    } else {
      previousPathRef.current = "/";
    }

    const handlePopState = () => {
      if (window.location.pathname !== "/delete-account") {
        setIsResetModalOpen(false);
      }
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.location.pathname === "/delete-account") {
        window.history.replaceState({}, "", previousPathRef.current ?? "/");
      }
    };
  }, [isResetModalOpen]);

  return (
    <>
      <Transition show={isOpen} as={Fragment}>
        <div className="fixed inset-0 z-60 overflow-hidden">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <button
              type="button"
              aria-label={strings.CLOSE_BUTTON_LABEL}
              className="absolute inset-0 w-full h-full m-0 p-0 border-0 transition-opacity"
              style={{
                background: "rgba(0,0,0,0.75)",
                opacity: peekStyle.opacity,
              }}
              onClick={handleClose}
            />
          </TransitionChild>

          <div className="absolute inset-y-0 right-0 flex max-w-full">
            <TransitionChild
              as={Fragment}
              enter="transform transition ease-out duration-300"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in duration-250"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <div
                className="relative w-screen max-w-sm flex flex-col h-full shadow-2xl transition-all duration-75"
                style={{
                  background: "#0a0014",
                  borderLeft: "4px solid",
                  borderImageSlice: 1,
                  borderImageSource:
                    "linear-gradient(180deg, #5000aa 0%, #28007c 100%)",
                  ...peekStyle,
                }}
              >
                <div
                  className="flex items-center justify-between px-5 py-4 border-b-2 border-obsidian-700 shrink-0"
                  style={{
                    background: "rgba(10,0,20,0.97)",
                    ...(isNativeApp()
                      ? { paddingTop: "calc(1rem + env(safe-area-inset-top))" }
                      : {}),
                  }}
                >
                  <div className="flex items-center gap-3">
                    <HatIcon className="w-12 h-12 text-crown-gold" />
                    <h2 className="font-pixel text-sm text-crown-amber tracking-widest">
                      {strings.INFO_MODAL_TITLE}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-2 bg-obsidian-700 hover:bg-obsidian-600 text-gray-400 hover:text-white transition-colors pixel-border-sm"
                    aria-label={strings.CLOSE_BUTTON_LABEL}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div
                  className="flex shrink-0 border-b-2 border-obsidian-700"
                  style={{ background: "rgba(10,0,20,0.97)" }}
                >
                  {TABS.map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="flex-1 flex flex-col items-center gap-1 py-3 px-1 transition-colors"
                        style={{
                          color: active ? "#d4af37" : "#6b7280",
                          background: active
                            ? "rgba(255,215,0,0.06)"
                            : "transparent",
                          borderBottom: active
                            ? "2px solid #d4af37"
                            : "2px solid transparent",
                          marginBottom: "-2px",
                        }}
                      >
                        {tab.icon}
                        <span className="font-pixel text-[9px] tracking-widest">
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {activeTab === "howto" && <HowToTab />}
                  {activeTab === "features" && <FeaturesTab />}
                  {activeTab === "challenges" && <ChallengesTab />}
                  {activeTab === "about" && (
                    <AboutTab
                      hasHiddenAttributions={hasHiddenAttributions}
                      onRestoreHiddenAttributions={onRestoreHiddenAttributions}
                      onOpenResetModal={() => setIsResetModalOpen(true)}
                    />
                  )}
                  {activeTab === "opensource" && <OpenSourceTab />}
                  {activeTab === "feedback" && <FeedbackTab />}
                </div>

                <div
                  className="shrink-0 px-5 py-3 border-t border-obsidian-700"
                  style={{
                    background: "rgba(10,0,20,0.97)",
                    ...(isNativeApp()
                      ? {
                          paddingBottom:
                            "calc(0.75rem + env(safe-area-inset-bottom))",
                        }
                      : {}),
                  }}
                >
                  <p className="font-pixel text-xs text-obsidian-500 tracking-widest text-center">
                    <ActivityLink
                      href="https://vagudle.king-tajin.dev/terms.html"
                      className="hover:text-crown-amber transition-colors underline"
                    >
                      {strings.INFO_MODAL_FOOTER_TOS_LABEL}
                    </ActivityLink>{" "}
                    ·{" "}
                    <ActivityLink
                      href="https://github.com/King-Tajin"
                      className="hover:text-crown-amber transition-colors underline"
                    >
                      KING TAJIN
                    </ActivityLink>{" "}
                    ·{" "}
                    <ActivityLink
                      href="https://vagudle.king-tajin.dev/privacy.html"
                      className="hover:text-crown-amber transition-colors underline"
                    >
                      {strings.INFO_MODAL_FOOTER_PRIVACY_LABEL}
                    </ActivityLink>
                  </p>
                </div>
              </div>
            </TransitionChild>
          </div>
        </div>
      </Transition>
      <ResetDataModal
        isOpen={isResetModalOpen}
        handleClose={() => setIsResetModalOpen(false)}
      />
    </>
  );
};
