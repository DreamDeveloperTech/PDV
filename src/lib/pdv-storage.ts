/**
 * Persistência do estado do caixa (PDV) em localStorage para que,
 * ao fechar a aba ou sair do app, a pessoa possa voltar e continuar.
 */

const KEY_PREFIX = "pdv_session_";

export interface PdvStoredSession {
  storeId: string;
  sessionId: string;
  status: "OPEN" | "CLOSED";
  openingAmount: number;
  expectedCash?: number;
  openedAt: string;
  currentUserId?: string;
  currentUserName?: string;
  isExpiredForSales?: boolean;
  /** Quando foi salvo (ISO) */
  savedAt: string;
}

function key(storeId: string): string {
  return `${KEY_PREFIX}${storeId}`;
}

export function savePdvSession(storeId: string, data: Omit<PdvStoredSession, "storeId" | "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const stored: PdvStoredSession = {
      ...data,
      storeId,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(key(storeId), JSON.stringify(stored));
  } catch {
    // ignore
  }
}

export function loadPdvSession(storeId: string): PdvStoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(storeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PdvStoredSession;
    if (parsed.storeId !== storeId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPdvSession(storeId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(storeId));
  } catch {
    // ignore
  }
}
