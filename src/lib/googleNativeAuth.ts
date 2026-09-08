const getFirebaseAuthPlugin = (): CapacitorFirebaseAuthPlugin | null => {
  if (typeof window === "undefined") return null;
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  return window.Capacitor.Plugins?.FirebaseAuthentication ?? null;
};

export const isGoogleNativeAvailable = (): boolean => {
  return !!getFirebaseAuthPlugin();
};

export const signInWithGoogleNative = async (): Promise<string | null> => {
  const plugin = getFirebaseAuthPlugin();
  if (!plugin) return null;

  const result = await plugin.signInWithGoogle();
  return result.credential?.idToken ?? null;
};
