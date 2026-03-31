/**
 * Simple localStorage-based auth for RRMH.
 * Replaces Internet Identity in the UI flow.
 */

const AUTH_KEY = "rrmh_auth_v2";

export interface LocalUser {
  username: string;
  name: string;
  role: string;
}

const ADMIN_USERNAME = "radharanim123";
const ADMIN_PASSWORD = "radha123456";

export function getLocalUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalUser;
  } catch {
    return null;
  }
}

export function loginLocal(
  username: string,
  password: string,
): { success: boolean; error?: string } {
  if (!username.trim() || !password.trim()) {
    return { success: false, error: "Username এবং Password দিন" };
  }

  // Admin check
  if (username === ADMIN_USERNAME) {
    if (password !== ADMIN_PASSWORD) {
      return { success: false, error: "ভুল username বা password" };
    }
    const user: LocalUser = {
      username: ADMIN_USERNAME,
      name: "Super Admin",
      role: "superadmin",
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return { success: true };
  }

  // Other staff users — store with staff role
  const existingRaw = localStorage.getItem(`rrmh_user_${username}`);
  if (existingRaw) {
    const existing = JSON.parse(existingRaw) as {
      password: string;
      name: string;
      role: string;
    };
    if (existing.password !== password) {
      return { success: false, error: "ভুল password" };
    }
    const user: LocalUser = {
      username,
      name: existing.name,
      role: existing.role,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return { success: true };
  }

  // New user — register as staff
  const newUser = { password, name: username, role: "staff" };
  localStorage.setItem(`rrmh_user_${username}`, JSON.stringify(newUser));
  const user: LocalUser = { username, name: username, role: "staff" };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return { success: true };
}

export function logoutLocal(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function updateLocalUserRole(username: string, role: string): void {
  const raw = localStorage.getItem(`rrmh_user_${username}`);
  if (raw) {
    const u = JSON.parse(raw);
    u.role = role;
    localStorage.setItem(`rrmh_user_${username}`, JSON.stringify(u));
  }
  // Update current session if this is the logged in user
  const current = getLocalUser();
  if (current && current.username === username) {
    current.role = role;
    localStorage.setItem(AUTH_KEY, JSON.stringify(current));
  }
}
