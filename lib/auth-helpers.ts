// Auth helpers with Username or Email sign-in, status access control, last login tracking, and localStorage DB persistence

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

// Initial Demo Users with usernames
const NOW = Date.now();
export const INITIAL_USERS: UserAccount[] = [
  { id: '1', email: 'admin@snapservice.com', username: 'admin', password: 'admin123', name: 'Admin User', role: 'admin', active: true, created_at: new Date(NOW - 86400000 * 30).toISOString(), last_login_at: new Date(NOW - 60000 * 12).toISOString() },
  { id: '2', email: 'photo@snapservice.com', username: 'ahmed', password: 'photo123', name: 'Ahmed Khan', role: 'user', active: true, created_at: new Date(NOW - 86400000 * 15).toISOString(), last_login_at: new Date(NOW - 3600000 * 2).toISOString() },
  { id: '3', email: 'video@snapservice.com', username: 'sara', password: 'video123', name: 'Sara Ali', role: 'user', active: true, created_at: new Date(NOW - 86400000 * 5).toISOString(), last_login_at: new Date(NOW - 86400000 * 1).toISOString() },
];

export const DEMO_USERS = INITIAL_USERS;

// Get persistent users DB
export function getUsersDB(): UserAccount[] {
  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const stored = localStorage.getItem('snap_users_db');
    if (!stored) {
      localStorage.setItem('snap_users_db', JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(stored);
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
      return { ...u, active: !u.active };
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

  // Record last login timestamp
  const loginTimestamp = new Date().toISOString();
  users[userIndex] = { ...user, last_login_at: loginTimestamp };
  saveUsersDB(users);

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

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('snap_user');
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
}

export function isAdmin(): boolean {
  return getUser()?.role === 'admin';
}
