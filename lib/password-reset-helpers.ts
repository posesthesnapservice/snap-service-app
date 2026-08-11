// Helper for managing user password reset requests to Admin

export interface PasswordResetRequest {
  id: string;
  email: string;
  note?: string;
  status: 'pending' | 'resolved';
  requested_at: string;
}

const RESET_KEY = 'snap_password_resets';

export function getPasswordResets(): PasswordResetRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RESET_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function requestPasswordReset(email: string, note?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const current = getPasswordResets();
    const newReq: PasswordResetRequest = {
      id: `req_${Date.now()}`,
      email: email.trim(),
      note: note?.trim() || undefined,
      status: 'pending',
      requested_at: new Date().toISOString(),
    };
    localStorage.setItem(RESET_KEY, JSON.stringify([newReq, ...current]));
    return true;
  } catch (e) {
    console.error('Failed to save password reset request:', e);
    return false;
  }
}

export function resolvePasswordReset(id: string): PasswordResetRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getPasswordResets();
    const updated = current.map(r => r.id === id ? { ...r, status: 'resolved' as const } : r);
    localStorage.setItem(RESET_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
