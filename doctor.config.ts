import type { ReactDoctorConfig } from "react-doctor/api";

// noinspection JSUnusedGlobalSymbols
export default {
  rules: {
    "react-doctor/no-giant-component": "off",
    "react-doctor/no-high-complexity-react-function": "off",
    "deslop/unused-file": "off",
  },
  ignore: {
    overrides: [
      {
        // Cleanup already clears every timer/interval pushed into local arrays but the rule
        // can't trace timers registered inside nested closures.
        files: ["**/src/components/screens/AchievementReveal.tsx"],
        rules: ["react-doctor/effect-needs-cleanup"],
      },
      {
        // List positions are fixed board/grid slots that never reorder, so index keys are safe.
        files: [
          "**/src/components/grid/CompletedRow.tsx",
          "**/src/components/grid/Grid.tsx",
          "**/src/components/grid/GridRows.tsx",
          "**/src/components/stats/Histogram.tsx",
          "**/src/components/screens/WinCelebration.tsx",
        ],
        rules: ["react-doctor/no-array-index-as-key"],
      },
      {
        // setCellColors here reads the cellColors own prior state (auto-gray
        // overrides manual paint; auto-green fills only the newest row).
        files: ["**/src/hooks/useTilePainting.ts"],
        rules: ["react-doctor/no-pass-data-to-parent"],
      },
      {
        // These booleans are independent, freely-combinable settings/state,
        // not mutually-exclusive modes, so no enum split applies here.
        files: [
          "**/src/components/modals/SettingsModal.tsx",
          "**/src/components/modals/StatsModal.tsx",
          "**/src/components/screens/GameModals.tsx",
        ],
        rules: ["react-doctor/no-many-boolean-props"],
      },
      {
        // The effect already returns a cleanup that clears its own
        // timeoutId, and cancelAlert() clears AlertContext's own timers.
        files: ["**/src/hooks/useGameOutcome.ts"],
        rules: ["react-doctor/effect-needs-cleanup"],
      },
      {
        // The reconnect timer is scheduled inside a nested WebSocket "close"
        // handler but the rule can't trace it back to the effect's own cleanup,
        // which does clear it via clearTimeout(reconnectTimeoutId).
        files: ["**/src/hooks/useSyncSocket.ts"],
        rules: ["react-doctor/effect-needs-cleanup"],
      },
      {
        // Loads local audio assets for the WebAudio API, not app data for
        // rendering. Already deduped/cached at module scope and guarded by
        // an active flag so results are dropped after unmount.
        files: ["**/src/components/backgrounds/Fireworks.tsx"],
        rules: ["react-doctor/no-fetch-in-effect"],
      },
      {
        // Setters only fire after real async work (storage reads, network
        // calls, decoding) so there's no synchronous value to derive instead.
        files: ["**/src/hooks/useGameInitialization.ts"],
        rules: ["react-doctor/no-pass-live-state-to-parent"],
      },
      {
        // Auth-only config; no Firestore/Storage SDK client-side, and data
        // access goes through server-verified /api/save and /api/load.
        files: ["**/dist/assets/*.js"],
        rules: ["react-doctor/artifact-baas-authority-surface"],
      },
      {
        // Every setter after an await is already guarded by the local
        // canceled flag set in the effect's cleanup.
        files: [
          "**/src/components/backgrounds/VideoBackground.tsx",
          "**/src/hooks/useDuelResult.ts",
        ],
        rules: ["react-doctor/no-set-state-after-await-in-effect"],
      },
      {
        // Setter after await is already guarded by the local ignore flag
        // set in the effect's cleanup.
        files: ["**/src/hooks/useDailyWidgetSync.ts"],
        rules: ["react-doctor/no-set-state-after-await-in-effect"],
      },
      {
        // Cleanup is already returned; listener.remove() runs inside a
        // .then() because Capacitor's addListener resolves asynchronously.
        files: [
          "**/src/hooks/useDailyWidgetSync.ts",
          "**/src/lib/backButton.ts",
        ],
        rules: ["react-doctor/effect-needs-cleanup"],
      },
    ],
  },
} satisfies ReactDoctorConfig;
