// Session management utilities
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove,
} from "./utils";

export interface UserSession {
  email: string;
  name: string;
  role: string;
  timestamp: number;
  expiresAt: number;
}

const SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const SESSION_KEY = "dev-session";
const USER_KEY = "dev-user";

export class SessionManager {
  /**
   * Create a new user session
   */
  static createSession(
    userData: Omit<UserSession, "timestamp" | "expiresAt">
  ): void {
    const sessionData: UserSession = {
      ...userData,
      timestamp: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION,
    };

    // Store in localStorage
    safeLocalStorageSet(SESSION_KEY, "true");
    safeLocalStorageSet(USER_KEY, JSON.stringify(sessionData));

    // Set secure cookie
    const expires = new Date(sessionData.expiresAt).toUTCString();
    document.cookie = `${SESSION_KEY}=true; path=/; expires=${expires}; SameSite=Strict`;
  }

  /**
   * Get current session data
   */
  static getSession(): UserSession | null {
    try {
      const sessionExists = safeLocalStorageGet(SESSION_KEY);
      const userDataStr = safeLocalStorageGet(USER_KEY);

      if (sessionExists !== "true" || !userDataStr) {
        return null;
      }

      const userData: UserSession = JSON.parse(userDataStr);
      const now = Date.now();

      // Check if session has expired
      if (userData.expiresAt && now > userData.expiresAt) {
        this.clearSession();
        return null;
      }

      return userData;
    } catch (error) {
      console.error("Error parsing session data:", error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Check if session is valid
   */
  static isSessionValid(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Get remaining session time in minutes
   */
  static getRemainingTime(): number {
    const session = this.getSession();
    if (!session) return 0;

    const remainingTime = Math.max(0, session.expiresAt - Date.now());
    return Math.floor(remainingTime / (60 * 1000));
  }

  /**
   * Extend session by 1 hour
   */
  static extendSession(): boolean {
    const session = this.getSession();
    if (!session) return false;

    const extendedSession: UserSession = {
      ...session,
      expiresAt: Date.now() + SESSION_DURATION,
    };

    safeLocalStorageSet(USER_KEY, JSON.stringify(extendedSession));

    // Update cookie
    const expires = new Date(extendedSession.expiresAt).toUTCString();
    document.cookie = `${SESSION_KEY}=true; path=/; expires=${expires}; SameSite=Strict`;

    return true;
  }

  /**
   * Clear session data
   */
  static clearSession(): void {
    safeLocalStorageRemove(SESSION_KEY);
    safeLocalStorageRemove(USER_KEY);

    // Clear cookie
    document.cookie = `${SESSION_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  /**
   * Get session info for display
   */
  static getSessionInfo(): {
    isValid: boolean;
    remainingMinutes: number;
    user?: UserSession;
  } {
    const session = this.getSession();
    const remainingMinutes = this.getRemainingTime();

    return {
      isValid: session !== null,
      remainingMinutes,
      user: session || undefined,
    };
  }
}

// Auto-extend session when user is active (every 30 minutes)
export function setupSessionAutoExtension(): () => void {
  const interval = setInterval(() => {
    if (SessionManager.isSessionValid()) {
      SessionManager.extendSession();
    }
  }, 30 * 60 * 1000); // 30 minutes

  return () => clearInterval(interval);
}
