import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    __vagudleBackNavPatched?: boolean;
  }
}

type StackEntry = {
  id: number;
  onBack: () => void;
};

const stack: StackEntry[] = [];
let nextId = 1;
let listenerHandle: Promise<{ remove: () => void }> | null = null;

const isNativePlatform = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.Capacitor?.isNativePlatform?.() ?? false;
};

const getAppPlugin = (): CapacitorAppPlugin | null => {
  if (!isNativePlatform()) return null;
  return window.Capacitor?.Plugins?.App ?? null;
};

const getBackNavigationPlugin = (): BackNavigationPlugin | null => {
  if (!isNativePlatform()) return null;
  return window.Capacitor?.Plugins?.BackNavigation ?? null;
};

const handleBackButton = (event: CapacitorBackButtonEvent): void => {
  const top = stack[stack.length - 1];
  if (top) {
    top.onBack();
    return;
  }
  if (event.canGoBack) {
    window.history.back();
    return;
  }
  getAppPlugin()?.exitApp();
};

const updateNativeBackState = async (): Promise<void> => {
  const plugin = getBackNavigationPlugin();
  if (!plugin) return;

  const isRoot = stack.length === 0 && window.location.pathname === "/";
  await plugin.setIsRoot({ isRoot });
};

const patchHistoryForNativeBackSync = (): void => {
  if (typeof window === "undefined") return;
  if (!isNativePlatform()) return;
  if (window.__vagudleBackNavPatched) return;
  window.__vagudleBackNavPatched = true;

  const originalPushState = window.history.pushState.bind(window.history);
  window.history.pushState = (
    ...args: Parameters<typeof window.history.pushState>
  ) => {
    originalPushState(...args);
    void updateNativeBackState();
  };

  const originalReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = (
    ...args: Parameters<typeof window.history.replaceState>
  ) => {
    originalReplaceState(...args);
    void updateNativeBackState();
  };

  window.addEventListener("popstate", () => {
    void updateNativeBackState();
  });

  void updateNativeBackState();
};

patchHistoryForNativeBackSync();

const updateListenerRegistration = async (): Promise<void> => {
  const plugin = getAppPlugin();
  if (!plugin) return;

  void updateNativeBackState();

  if (stack.length > 0) {
    if (!listenerHandle) {
      listenerHandle = plugin.addListener("backButton", handleBackButton);
    }
  } else if (listenerHandle) {
    const handle = await listenerHandle;
    handle.remove();
    listenerHandle = null;
  }
};

export const useBackButtonClose = (
  isOpen: boolean,
  onBack: () => void
): void => {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const entry: StackEntry = {
      id: nextId++,
      onBack: () => onBackRef.current(),
    };
    stack.push(entry);
    void updateListenerRegistration();

    return () => {
      const index = stack.findIndex((item) => item.id === entry.id);
      if (index !== -1) {
        stack.splice(index, 1);
        void updateListenerRegistration();
      }
    };
  }, [isOpen]);
};

export type BackGestureState = {
  isStarted: boolean;
  progress: number;
  swipeEdge: number;
};

export const useBackGestureProgress = (
  isEnabled: boolean
): BackGestureState => {
  const [state, setState] = useState<BackGestureState>({
    isStarted: false,
    progress: 0,
    swipeEdge: 0,
  });

  useEffect(() => {
    if (!isEnabled) return undefined;

    const plugin = getBackNavigationPlugin();
    if (!plugin) return undefined;

    const registration = Promise.all([
      plugin.addListener("backStarted", (event) => {
        setState({
          isStarted: true,
          progress: event.progress,
          swipeEdge: event.swipeEdge,
        });
      }),
      plugin.addListener("backProgressed", (event) => {
        setState((prev) => ({ ...prev, progress: event.progress }));
      }),
      plugin.addListener("backCancelled", () => {
        setState({ isStarted: false, progress: 0, swipeEdge: 0 });
      }),
    ]);

    return () => {
      void registration.then((handles) => {
        handles.forEach((h) => h.remove());
      });
      setState({ isStarted: false, progress: 0, swipeEdge: 0 });
    };
  }, [isEnabled]);

  return state;
};

export const computePeekStyle = (progress: number) => ({
  transform: `scale(${1 - progress * 0.08})`,
  opacity: 1 - progress * 0.15,
});

export type BackGestureStyle = {
  transform: string | undefined;
  opacity: number;
};

export const useBackGestureStyle = (isOpen: boolean): BackGestureStyle => {
  const { isStarted, progress } = useBackGestureProgress(isOpen);

  return useMemo(
    () =>
      isStarted
        ? computePeekStyle(progress)
        : { transform: undefined, opacity: 1 },
    [isStarted, progress]
  );
};
