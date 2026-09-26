// Helper for managing user password reset requests to Admin (localStorage + Supabase Cloud)
import { supabase } from './supabase';

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

    // Async sync to Supabase
    try {
      supabase.from('snap_password_resets').insert([{
        id: newReq.id,
        email: newReq.email,
        note: newReq.note || null,
        status: newReq.status,
        requested_at: newReq.requested_at
      }]).then((res) => {
        if (res && res.error) console.warn('Supabase DB Sync (Reset request) notice:', res.error.message);
      });
    } catch (e) {}

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

    // Async sync to Supabase
    try {
      supabase.from('snap_password_resets').update({ status: 'resolved' }).eq('id', id).then((res) => {
        if (res && res.error) console.warn('Supabase DB Sync (Reset resolve) notice:', res.error.message);
      });
    } catch (e) {}

    return updated;
  } catch {
    return [];
  }
}

export async function fetchPasswordResetsCloud(): Promise<PasswordResetRequest[]> {
  try {
    const { data, error } = await supabase.from('snap_password_resets').select('*').order('requested_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return getPasswordResets();
    }
    const local = getPasswordResets();
    const map = new Map<string, PasswordResetRequest>();
    local.forEach(r => map.set(r.id, r));
    data.forEach((r: any) => {
      map.set(r.id, {
        id: r.id,
        email: r.email,
        note: r.note || undefined,
        status: r.status || 'pending',
        requested_at: r.requested_at || new Date().toISOString()
      });
    });
    const merged = Array.from(map.values()).sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
    if (typeof window !== 'undefined') {
      localStorage.setItem(RESET_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return getPasswordResets();
  }
}

