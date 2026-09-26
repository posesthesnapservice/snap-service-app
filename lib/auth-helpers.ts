// Auth helpers with Username or Email sign-in, status access control, last login tracking, and localStorage + Supabase Cloud DB persistence
import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: 'admin' | 'user';
  active: boolean;
  last_login_at?: string;
}

export interface UserAccount {
  id: string;
  email: string;
  username?: string;
  password?: string;
  name: string;
  role: 'admin' | 'user';
  active: boolean;
  created_at?: string;
  last_login_at?: string;
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
    role: 'user', 
    active: true, 
    created_at: '2026-08-01T00:00:00.000Z'
  },
  { 
    id: '3', 
    email: 'video@snapservice.com', 
    username: 'sara', 
    password: 'video123', 
    name: 'Sara Ali', 
    role: 'user', 
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

    // One-time automatic cleanup: Remove old mock dummy timestamps from Sara & Ahmed if they never actually logged in
    const cleanedFlag = localStorage.getItem('snap_users_cleaned_v2');
    if (!cleanedFlag) {
      users = users.map(u => {
        // If it's sara or ahmed and has legacy mock last_login_at
        if ((u.email === 'video@snapservice.com' || u.email === 'photo@snapservice.com')) {
          const updated = { ...u };
          delete updated.last_login_at;
          return updated;
        }
        return u;
      });
      localStorage.setItem('snap_users_db', JSON.stringify(users));
      localStorage.setItem('snap_users_cleaned_v2', 'true');
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
