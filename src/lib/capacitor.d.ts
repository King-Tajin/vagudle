type CapacitorBackButtonEvent = {
  canGoBack: boolean;
};

type CapacitorAppStateChangeEvent = {
  isActive: boolean;
};

type BackGestureProgressEvent = {
  progress: number;
  swipeEdge: number;
};

type CapacitorAppPlugin = {
  addListener: ((
    eventName: "backButton",
    listenerFunc: (event: CapacitorBackButtonEvent) => void
  ) => Promise<{ remove: () => void }>) &
    ((
      eventName: "appStateChange",
      listenerFunc: (event: CapacitorAppStateChangeEvent) => void
    ) => Promise<{ remove: () => void }>);
  exitApp: () => void;
};

type BackNavigationPlugin = {
  setIsRoot: (options: { isRoot: boolean }) => Promise<void>;
  addListener: ((
    eventName: "backStarted",
    listenerFunc: (event: BackGestureProgressEvent) => void
  ) => Promise<{ remove: () => void }>) &
    ((
      eventName: "backProgressed",
      listenerFunc: (event: BackGestureProgressEvent) => void
    ) => Promise<{ remove: () => void }>) &
    ((
      eventName: "backCancelled",
      listenerFunc: () => void
    ) => Promise<{ remove: () => void }>);
};

type CapacitorReviewPromptResult = {
  requested: boolean;
};

type CapacitorReviewPromptPlugin = {
  requestReview: () => Promise<CapacitorReviewPromptResult>;
};

type CapacitorCrashlyticsPlugin = {
  recordException: (options: { message: string }) => Promise<void>;
  log: (options: { message: string }) => Promise<void>;
  setUserId: (options: { userId: string }) => Promise<void>;
};

type DailyWidgetRankState =
  | { status: "guest" }
  | { status: "no_username" }
  | { status: "ranked"; rank: number; outOf: number };

type DailyWidgetSyncPayload = {
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

type CapacitorDailyWidgetPlugin = {
  syncWidgetData: (payload: DailyWidgetSyncPayload) => Promise<void>;
};

type CapacitorFirebaseAuthPlugin = {
  signInWithGoogle: () => Promise<{
    credential?: { idToken?: string | null } | null;
  }>;
};

type CapacitorImpactStyle = "LIGHT" | "MEDIUM" | "HEAVY";
type CapacitorNotificationType = "SUCCESS" | "WARNING" | "ERROR";

type CapacitorHapticsPlugin = {
  impact: (options: { style: CapacitorImpactStyle }) => Promise<void>;
  notification: (options: { type: CapacitorNotificationType }) => Promise<void>;
};

type CapacitorLocalNotificationsSchedule = {
  at?: Date;
  repeats?: boolean;
  allowWhileIdle?: boolean;
  on?: {
    hour?: number;
    minute?: number;
  };
};

type CapacitorLocalNotification = {
  id: number;
  title: string;
  body: string;
  channelId?: string;
  largeIcon?: string;
  actionTypeId?: string;
  schedule?: CapacitorLocalNotificationsSchedule;
};

type CapacitorPermissionStatus = {
  display: "granted" | "denied" | "prompt" | "prompt-with-rationale";
};

type CapacitorNotificationActionType = {
  id: string;
  actions: { id: string; title: string }[];
};

type CapacitorNotificationActionPerformed = {
  actionId: string;
  notification: { id: number };
};

type CapacitorLocalNotificationsPlugin = {
  schedule: (options: {
    notifications: CapacitorLocalNotification[];
  }) => Promise<unknown>;
  cancel: (options: { notifications: { id: number }[] }) => Promise<void>;
  createChannel: (channel: {
    id: string;
    name: string;
    description?: string;
    importance?: number;
  }) => Promise<void>;
  checkPermissions: () => Promise<CapacitorPermissionStatus>;
  requestPermissions: () => Promise<CapacitorPermissionStatus>;
  registerActionTypes: (options: {
    types: CapacitorNotificationActionType[];
  }) => Promise<void>;
  addListener: (
    eventName: "localNotificationActionPerformed",
    listenerFunc: (event: CapacitorNotificationActionPerformed) => void
  ) => Promise<{ remove: () => void }>;
};

type CapacitorNotificationPrimerResult = {
  alreadyShown: boolean;
  accepted: boolean;
};

type CapacitorNotificationPrimerPlugin = {
  showPrimer: () => Promise<CapacitorNotificationPrimerResult>;
};

type CapacitorPlayGamesPlugin = {
  signIn: () => Promise<{ serverAuthCode: string }>;
  unlockAchievement: (options: { achievementId: string }) => Promise<void>;
  setAchievementSteps: (options: {
    achievementId: string;
    steps: number;
  }) => Promise<void>;
  submitScore: (options: {
    leaderboardId: string;
    score: number;
  }) => Promise<void>;
};

type CapacitorBrowserPlugin = {
  open: (options: { url: string; presentationStyle?: string }) => Promise<void>;
};

type CapacitorShareOptions = {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
  files?: string[];
};

type CapacitorSharePlugin = {
  share: (options: CapacitorShareOptions) => Promise<{ activityType?: string }>;
};

interface Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    Plugins?: {
      App?: CapacitorAppPlugin;
      BackNavigation?: BackNavigationPlugin;
      ReviewPrompt?: CapacitorReviewPromptPlugin;
      FirebaseCrashlytics?: CapacitorCrashlyticsPlugin;
      DailyWidget?: CapacitorDailyWidgetPlugin;
      FirebaseAuthentication?: CapacitorFirebaseAuthPlugin;
      Haptics?: CapacitorHapticsPlugin;
      LocalNotifications?: CapacitorLocalNotificationsPlugin;
      NotificationPrimer?: CapacitorNotificationPrimerPlugin;
      PlayGamesAuth?: CapacitorPlayGamesPlugin;
      Browser?: CapacitorBrowserPlugin;
      Share?: CapacitorSharePlugin;
    };
  };
}
