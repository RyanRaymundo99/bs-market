/**
 * "Conta Aprovada" one-time banner: in-memory set, localStorage, sessionStorage,
 * and optional server flag from GET /api/user/status.
 */
export const APPROVED_CELEBRATION_DISMISSED_KEY =
  "approvedCelebrationBannerDismissedAt";

export function readApprovedCelebrationDismissedAt(
  kycData: unknown
): string | null {
  if (!kycData || typeof kycData !== "object" || Array.isArray(kycData)) {
    return null;
  }
  const value = (kycData as Record<string, unknown>)[
    APPROVED_CELEBRATION_DISMISSED_KEY
  ];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function isApprovedCelebrationDismissedInKycData(
  kycData: unknown
): boolean {
  return readApprovedCelebrationDismissedAt(kycData) !== null;
}

export function mergeApprovedCelebrationDismissed(
  kycData: unknown
): Record<string, unknown> {
  const prev =
    kycData && typeof kycData === "object" && !Array.isArray(kycData)
      ? (kycData as Record<string, unknown>)
      : {};
  return {
    ...prev,
    [APPROVED_CELEBRATION_DISMISSED_KEY]: new Date().toISOString(),
  };
}

const SESSION_DISMISSED = new Set<string>();

const KEY_PREFIX = "bs-account-approved-banner-dismissed-";
const SESSION_KEY_PREFIX = "bs-account-approved-banner-dismissed-session-";

function legacyDismissedKeys(userId: string): string[] {
  return [`kyc-approved-banner-dismissed-${userId}`];
}

function readLocalDismissed(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(`${KEY_PREFIX}${userId}`) === "true") return true;
    for (const k of legacyDismissedKeys(userId)) {
      if (localStorage.getItem(k) === "true") return true;
    }
    return false;
  } catch {
    return false;
  }
}

function readSessionDismissed(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(`${SESSION_KEY_PREFIX}${userId}`) === "true";
  } catch {
    return false;
  }
}

export function isApprovedCelebrationBannerDismissed(
  userId: string,
  serverDismissed = false
): boolean {
  if (serverDismissed) {
    SESSION_DISMISSED.add(userId);
    return true;
  }
  if (SESSION_DISMISSED.has(userId)) return true;
  if (readLocalDismissed(userId) || readSessionDismissed(userId)) {
    SESSION_DISMISSED.add(userId);
    return true;
  }
  return false;
}

export function persistApprovedCelebrationBannerDismiss(userId: string): void {
  SESSION_DISMISSED.add(userId);
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${KEY_PREFIX}${userId}`, "true");
    sessionStorage.setItem(`${SESSION_KEY_PREFIX}${userId}`, "true");
    for (const k of legacyDismissedKeys(userId)) {
      localStorage.removeItem(k);
    }
  } catch {
    /* in-memory set still hides for this SPA visit */
  }
}

let pendingServerSync: Promise<void> | null = null;

/** Best-effort server persistence so the banner stays hidden across devices. */
export function syncApprovedCelebrationBannerDismissToServer(
  userId: string
): void {
  persistApprovedCelebrationBannerDismiss(userId);
  if (typeof window === "undefined") return;
  if (pendingServerSync) return;

  pendingServerSync = fetch("/api/user/status", {
    method: "POST",
    credentials: "same-origin",
  })
    .catch((error) => {
      console.error("Failed to sync approved banner dismiss:", error);
    })
    .finally(() => {
      pendingServerSync = null;
    }) as Promise<void>;
}
