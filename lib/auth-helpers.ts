// Auth helpers with Username or Email sign-in, status access control, last login tracking, and localStorage + Supabase Cloud DB persistence
import { supabase } from './supabase';
import { UserRole } from './types';

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: UserRole;
  active: boolean;
  last_login_at?: string;
}

export interface UserAccount {
  id: string;
  email: string;
  username?: string;
  password?: string;
  name: string;
  role: UserRole;
  active: boolean;
  created_at?: string;
  last_login_at?: string;
}

export function canAccessPhotography(role?: UserRole): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'all_rounder' || role === 'photographer' || role === 'user';
}

export function canAccessVideography(role?: UserRole): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'all_rounder' || role === 'cinematographer';
}

export function canAccessAdmin(role?: UserRole): boolean {
  return role === 'admin';
}

export function getRoleBadgeInfo(role?: UserRole): { label: string; color: string; bg: string; border: string } {
  switch (role) {
    case 'admin':
      return { label: 'ADMINISTRATOR', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.3)' };
    case 'all_rounder':
      return { label: 'LEAD / ALL-ROUNDER', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)' };
    case 'cinematographer':
      return { label: 'CINEMATOGRAPHER', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.3)' };
    case 'photographer':
    case 'user':
    default:
      return { label: 'PHOTOGRAPHER', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.3)' };
  }
}

// Initial Demo Users with clean dates (no fake/mock last_login_at)
export const INITIAL_USERS: UserAccount[] = [
  { 
    id: '1', 
    email: 'admin@snapservice.com', 
    username: 'admin', 
    password: 'admin123', 
    name: 'Admin User', 
    role: 'admin', 
    active: true, 
    created_at: '2026-08-01T00:00:00.000Z'
  },
  { 
    id: '2', 
    email: 'photo@snapservice.com', 
    username: 'ahmed', 
    password: 'photo123', 
    name: 'Ahmed Khan', 
    role: 'photographer', 
    active: true, 
    created_at: '2026-08-01T00:00:00.000Z'
  },
  { 
    id: '3', 
    email: 'video@snapservice.com', 
    username: 'sara', 
    password: 'video123', 
    name: 'Sara Ali', 
    role: 'cinematographer', 
    active: true, 
    created_at: '2026-08-01T00:00:00.000Z'
  },
  { 
    id: '4', 
    email: 'lead@snapservice.com', 
    username: 'zunair', 
    password: 'lead123', 
    name: 'Zunair Lead', 
    role: 'all_rounder', 
    active: true, 
    created_at: '2026-08-01T00:00:00.000Z'
  },
];

export const DEMO_USERS = INITIAL_USERS;

// Get persistent users DB with auto-cleanup for stale mock data
export function getUsersDB(): UserAccount[] {
  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const stored = localStorage.getItem('snap_users_db');
    if (!stored) {
      localStorage.setItem('snap_users_db', JSON.stringify(INITIAL_USERS));
      localStorage.setItem('snap_users_cleaned_v2', 'true');
      return INITIAL_USERS;
    }
    
    let users: UserAccount[] = JSON.parse(stored);

    // Role migration: upgrade any legacy 'user' roles and add demo lead if missing
    let hasChanges = false;
    users = users.map(u => {
      if (u.role === ('user' as any)) {
        hasChanges = true;
        if (u.email?.includes('video') || u.username?.includes('sara')) {
          return { ...u, role: 'cinematographer' as UserRole };
        }
        return { ...u, role: 'photographer' as UserRole };
      }
      return u;
    });

    if (!users.some(u => u.username === 'zunair' || u.email === 'lead@snapservice.com')) {
      users.push(INITIAL_USERS[3]);
      hasChanges = true;
    }

    if (hasChanges) {
      localStorage.setItem('snap_users_db', JSON.stringify(users));
    }

    return users;
  } catch {
    return INITIAL_USERS;
  }
}

// Save persistent users DB
export function saveUsersDB(users: UserAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('snap_users_db', JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users DB:', e);
  }
}

// Toggle active/inactive user access
export function toggleUserAccess(userId: string): UserAccount[] {
  const users = getUsersDB();
  const updated = users.map(u => {
    if (u.id === userId) {
      const nextActive = !u.active;
      // Async sync to Supabase
      upsertUserCloud({ ...u, active: nextActive });
      return { ...u, active: nextActive };
    }
    return u;
  });
  saveUsersDB(updated);
  return updated;
}

// Authenticate user with Username OR Email & active status check
export function login(identifier: string, password: string): { user: AuthUser | null; error?: string } {
  const users = getUsersDB();
  const cleanId = identifier.trim().toLowerCase();
  
  const userIndex = users.findIndex(u => 
    (u.email.toLowerCase() === cleanId || (u.username && u.username.toLowerCase() === cleanId)) && 
    u.password === password
  );
  
  if (userIndex === -1) {
    return { user: null, error: 'Invalid username/email or password.' };
  }

  const user = users[userIndex];

  if (user.active === false) {
    return { user: null, error: '🚫 Account Disabled: Your access has been turned off by the admin.' };
  }

  // Record real login timestamp
  const loginTimestamp = new Date().toISOString();
  users[userIndex] = { ...user, last_login_at: loginTimestamp };
  saveUsersDB(users);

  // Sync to Supabase cloud
  syncLastLoginCloud(user.id, loginTimestamp);

  const authUser: AuthUser = { 
    id: user.id, 
    email: user.email, 
    username: user.username,
    name: user.name, 
    role: user.role, 
    active: user.active,
    last_login_at: loginTimestamp
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem('snap_user', JSON.stringify(authUser));
  }
  return { user: authUser };
}

export async function loginAsync(identifier: string, password: string): Promise<{ user: AuthUser | null; error?: string }> {
  // Try local first for instant response
  const localRes = login(identifier, password);
  if (localRes.user || (localRes.error && localRes.error.includes('Account Disabled'))) {
    return localRes;
  }
  // If not found, fetch from Supabase cloud (e.g. newly created user or modified role on PC)
  await fetchUsersCloud();
  return login(identifier, password);
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('snap_user');
  }
}

// Anti-Bypass / Anti-Tamper User Retrieval
export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('snap_user');
  if (!stored) return null;
  try {
    const sessionUser: AuthUser = JSON.parse(stored);
    if (!sessionUser || !sessionUser.id || !sessionUser.email) {
      localStorage.removeItem('snap_user');
      return null;
    }

    // Verify session user against registered users database to prevent DevTools role tampering
    const users = getUsersDB();
    const actualUser = users.find(u => 
      u.id === sessionUser.id || u.email.toLowerCase() === sessionUser.email.toLowerCase()
    );

    // If user does not exist in DB, revoke session
    if (!actualUser) {
      localStorage.removeItem('snap_user');
      return null;
    }

    // If user has been deactivated by Admin, revoke session immediately
    if (actualUser.active === false) {
      localStorage.removeItem('snap_user');
      return null;
    }

    // Prevent role escalation tampering (e.g. user manually changed role to 'admin' in localStorage)
    if (sessionUser.role !== actualUser.role) {
      sessionUser.role = actualUser.role;
      localStorage.setItem('snap_user', JSON.stringify(sessionUser));
    }

    sessionUser.active = actualUser.active;
    return sessionUser;
  } catch {
    localStorage.removeItem('snap_user');
    return null;
  }
}

export function isAdmin(): boolean {
  return getUser()?.role === 'admin';
}

// --- CLOUD SYNC HELPERS (Supabase) ---
export async function fetchUsersCloud(): Promise<UserAccount[]> {
  try {
    const { data, error } = await supabase.from('snap_users').select('*');
    if (error || !data || data.length === 0) {
      return getUsersDB();
    }
    const local = getUsersDB();
    // Merge cloud data with local records
    const map = new Map<string, UserAccount>();
    local.forEach(u => map.set(u.email.toLowerCase(), u));
    data.forEach((u: any) => {
      map.set(u.email.toLowerCase(), {
        id: u.id,
        email: u.email,
        username: u.username || undefined,
        password: u.password,
        name: u.name,
        role: u.role || 'user',
        active: u.active ?? true,
        created_at: u.created_at,
        last_login_at: u.last_login_at || undefined
      });
    });
    const merged = Array.from(map.values());
    saveUsersDB(merged);
    return merged;
  } catch {
    return getUsersDB();
  }
}

export function syncLastLoginCloud(userId: string, timestamp: string): void {
  try {
    supabase.from('snap_users').update({ last_login_at: timestamp }).eq('id', userId).then((res) => {
      if (res && res.error) console.warn('Supabase DB Sync (Users last login) notice:', res.error.message);
    });
  } catch (e) {
    console.warn('Sync last login error:', e);
  }
}

export function upsertUserCloud(user: UserAccount): void {
  try {
    supabase.from('snap_users').upsert([{
      id: user.id,
      email: user.email,
      username: user.username,
      password: user.password,
      name: user.name,
      role: user.role,
      active: user.active,
      created_at: user.created_at,
      last_login_at: user.last_login_at
    }], { onConflict: 'email' }).then((res) => {
      if (res && res.error) console.warn('Supabase DB Sync (Users upsert) notice:', res.error.message);
    });
  } catch (e) {
    console.warn('Upsert user cloud error:', e);
  }
}

export function deleteUserCloud(userId: string): void {
  try {
    supabase.from('snap_users').delete().eq('id', userId).then((res) => {
      if (res && res.error) console.warn('Supabase DB Sync (Users delete) notice:', res.error.message);
    });
  } catch (e) {
    console.warn('Delete user cloud error:', e);
  }
}
