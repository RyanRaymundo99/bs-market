/**
 * "Conta Aprovada" banner: survives component remounts (loading vs content,
 * duplicate instances) via an in-memory set, and across reloads via localStorage.
 */
const SESSION_DISMISSED = new Set<string>();

const KEY_PREFIX = "bs-account-approved-banner-dismissed-";

function legacyDismissedKeys(userId: string): string[] {
  return [`kyc-approved-banner-dismissed-${userId}`];
}

export function isApprovedCelebrationBannerDismissed(userId: string): boolean {
  if (SESSION_DISMISSED.has(userId)) return true;
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(`${KEY_PREFIX}${userId}`) === "true") {
      SESSION_DISMISSED.add(userId);
      return true;
    }
    for (const k of legacyDismissedKeys(userId)) {
      if (localStorage.getItem(k) === "true") {
        SESSION_DISMISSED.add(userId);
        return true;
      }
    }
    return false;
  } catch {
    return SESSION_DISMISSED.has(userId);
  }
}

export function persistApprovedCelebrationBannerDismiss(userId: string): void {
  SESSION_DISMISSED.add(userId);
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${KEY_PREFIX}${userId}`, "true");
    for (const k of legacyDismissedKeys(userId)) {
      localStorage.removeItem(k);
    }
  } catch {
    /* session set still hides for this SPA visit */
  }
}