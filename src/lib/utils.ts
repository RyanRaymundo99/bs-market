import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Check if running on localhost:3000
export function isLocalhostDev(): boolean {
  if (typeof window === "undefined") return false;

  return (
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1") &&
    window.location.port === "3000"
  );
}

// Performance optimization utilities
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Memoization helper for expensive calculations
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, unknown>();

  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Safe localStorage access with error handling
export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageRemove(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

const SESSION_CACHE_PREFIX = "bs-cache:";

type SessionCacheEntry<T> = { ts: number; data: T };

/** Read cached API data for instant paint (stale-while-revalidate). */
export function readSessionCache<T>(
  key: string,
  maxAgeMs: number
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionCacheEntry<T>;
    if (!parsed?.ts || Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SessionCacheEntry<T> = { ts: Date.now(), data };
    sessionStorage.setItem(
      `${SESSION_CACHE_PREFIX}${key}`,
      JSON.stringify(payload)
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearSessionCache(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${key}`);
  } catch {
    /* quota / private mode */
  }
}

export function scheduleIdleWork(work: () => void, timeoutMs = 1500): () => void {
  if (typeof window === "undefined") return () => {};
  const run = () => {
    try {
      work();
    } catch {
      /* non-critical warmup */
    }
  };
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const timeoutId = setTimeout(run, Math.min(timeoutMs, 400));
  return () => clearTimeout(timeoutId);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: "Pendente",
    PROCESSING: "Processando",
    APPROVED: "Aprovado",
    COMPLETED: "Concluído",
    REJECTED: "Rejeitado",
    CANCELLED: "Cancelado",
    EXECUTING: "Executando",
    CONFIRMED: "Confirmado",
    FAILED: "Falhou",
  };
  return statusMap[status] || status;
}

export function getTransactionTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    DEPOSIT: "Depósito",
    WITHDRAWAL: "Saque",
    BUY_CRYPTO: "Compra Crypto",
    TRADE: "Trade",
    JACKPOT: "Jackpot",
    PROFIT: "Lucro",
    REFUND: "Reembolso",
    ADJUSTMENT: "Ajuste",
  };
  return typeMap[type] || type;
}
