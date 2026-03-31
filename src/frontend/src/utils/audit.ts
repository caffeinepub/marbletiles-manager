const AUDIT_KEY = "rrm_audit_log";
const MAX_ENTRIES = 500;

export interface AuditEntry {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  user?: string;
}

export function logAudit(
  action: string,
  description: string,
  user?: string,
): void {
  try {
    const existing: AuditEntry[] = JSON.parse(
      localStorage.getItem(AUDIT_KEY) ?? "[]",
    );
    const entry: AuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      description,
      timestamp: new Date().toISOString(),
      user,
    };
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(updated));
  } catch {
    // silently ignore
  }
}

export function getAuditLog(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function clearAuditLog(): void {
  localStorage.removeItem(AUDIT_KEY);
}
