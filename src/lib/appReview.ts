const REVIEW_PROMPT_WIN_MILESTONES = [3, 50];

const getReviewPromptPlugin = (): CapacitorReviewPromptPlugin | null => {
  if (typeof window === "undefined") return null;
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  return window.Capacitor.Plugins?.ReviewPrompt ?? null;
};

export const requestAppReviewForWins = async (
  normalModeWins: number,
  hardModeWins: number
): Promise<void> => {
  const hitMilestone =
    REVIEW_PROMPT_WIN_MILESTONES.includes(normalModeWins) ||
    REVIEW_PROMPT_WIN_MILESTONES.includes(hardModeWins);
  if (!hitMilestone) return;

  const plugin = getReviewPromptPlugin();
  if (!plugin) return;

  try {
    await plugin.requestReview();
  } catch {}
};
