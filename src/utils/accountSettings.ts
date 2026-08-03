/**
 * Per-account settings helpers.
 *
 * Theme / geometry / language are user preferences: they should follow the
 * *account* (active AppUser profile), not the shared browser. We persist the
 * active profile id in localStorage and scope each settings key to it:
 *
 *   app_theme:<userId>  (legacy fallback: app_theme)
 *   app_language:<userId> (legacy fallback: app_language)
 *
 * Providers re-hydrate whenever the active account changes via the
 * `app:account-changed` window event (dispatched from App.tsx on login,
 * profile switch, and logout).
 */

export const ACTIVE_USER_KEY = 'i35_active_user_id';
export const ACCOUNT_CHANGED_EVENT = 'app:account-changed';

/** Id of the currently active AppUser profile, or null when logged out. */
export const getActiveUserId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_USER_KEY);
  } catch {
    return null;
  }
};

/** Persist the active profile id (null clears it, e.g. on logout). */
export const setActiveUserId = (id: string | null): void => {
  try {
    if (id) localStorage.setItem(ACTIVE_USER_KEY, id);
    else localStorage.removeItem(ACTIVE_USER_KEY);
  } catch {
    // storage unavailable — settings just stay global
  }
};

/** Notify settings providers that the active account changed. */
export const notifyAccountChanged = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT));
  }
};

/**
 * Resolve the storage key for a settings base key, scoped to the active
 * account when one is signed in. Falls back to the legacy unscoped key.
 */
export const scopedSettingsKey = (baseKey: string): string => {
  const id = getActiveUserId();
  return id ? `${baseKey}:${id}` : baseKey;
};
