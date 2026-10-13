import { ShootAssignment } from './types';
import { supabase } from './supabase';
import { mergeTodayShootItems, replaceTodayShootItems } from './today-shoot-helpers';

export type { ShootAssignment };

const ASSIGNMENTS_KEY = 'snap_shoot_assignments';

export function getAssignmentsDB(): ShootAssignment[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ASSIGNMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveAssignmentsDB(items: ShootAssignment[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save assignments DB:', e);
  }
}

/**
 * Admin creates an assignment targeting a photographer or cinematographer
 */
export function createAssignment(payload: {
  title: string;
  assigned_by_name: string;
  target_user_id: string;
  target_user_name: string;
  pose_ids: string[];
  event_name?: string;
  notes?: string;
}): ShootAssignment {
  const newAssignment: ShootAssignment = {
    id: `asg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    title: payload.title || 'Today Shoot Assignment',
    assigned_by_name: payload.assigned_by_name || 'Admin',
    target_user_id: payload.target_user_id,
    target_user_name: payload.target_user_name,
    pose_ids: payload.pose_ids,
    event_name: payload.event_name || 'Wedding Event',
    notes: payload.notes || '',
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const current = getAssignmentsDB();
  const updated = [newAssignment, ...current];
  saveAssignmentsDB(updated);
  invalidateAssignmentsCache();

  // Sync to Supabase cloud (graceful if table does not exist)
  try {
    supabase.from('snap_assignments').insert([{
      id: newAssignment.id,
      title: newAssignment.title,
      assigned_by_name: newAssignment.assigned_by_name,
      target_user_id: newAssignment.target_user_id,
      target_user_name: newAssignment.target_user_name,
      pose_ids: newAssignment.pose_ids,
      event_name: newAssignment.event_name,
      notes: newAssignment.notes,
      status: newAssignment.status,
      created_at: newAssignment.created_at,
    }]).then(res => {
      if (res?.error) console.info('Supabase cloud assignment sync notice:', res.error.message);
    });
  } catch {
    // offline fallback
  }

  return newAssignment;
}

/**
 * Get active pending assignments for a specific user ID
 */
export function getPendingAssignmentsForUser(userId: string): ShootAssignment[] {
  const all = getAssignmentsDB();
  return all.filter(a => a.target_user_id === userId && a.status === 'pending');
}

/**
 * Handle user response to an assignment (Merge / Replace / Dismiss)
 */
export function respondToAssignment(
  assignmentId: string, 
  action: 'merge' | 'replace' | 'dismiss'
): ShootAssignment | null {
  const current = getAssignmentsDB();
  const index = current.findIndex(a => a.id === assignmentId);
  if (index === -1) return null;

  const assignment = current[index];
  let nextStatus: ShootAssignment['status'] = 'dismissed';

  if (action === 'merge') {
    mergeTodayShootItems(assignment.pose_ids, assignment.target_user_id);
    nextStatus = 'accepted_merged';
  } else if (action === 'replace') {
    replaceTodayShootItems(assignment.pose_ids, assignment.target_user_id);
    nextStatus = 'accepted_replaced';
  } else {
    nextStatus = 'dismissed';
  }

  const updatedAssignment: ShootAssignment = {
    ...assignment,
    status: nextStatus,
  };

  current[index] = updatedAssignment;
  saveAssignmentsDB(current);
  invalidateAssignmentsCache();

  // Update Supabase
  try {
    supabase.from('snap_assignments')
      .update({ status: nextStatus })
      .eq('id', assignmentId)
      .then(res => {
        if (res?.error) console.info('Supabase cloud assignment update notice:', res.error.message);
      });
  } catch {
    // offline
  }

  return updatedAssignment;
}

// --- CLOUD SYNC HELPERS WITH TTL CACHING ---
let cachedAssignments: { data: ShootAssignment[]; timestamp: number } | null = null;
let inFlightAssignmentsPromise: Promise<ShootAssignment[]> | null = null;
const ASSIGNMENTS_CACHE_TTL = 2.5 * 60 * 1000;

export function invalidateAssignmentsCache(): void {
  cachedAssignments = null;
}

/**
 * Cloud Fetcher for Assignments
 */
export async function fetchAssignmentsCloud(forceRefresh = false): Promise<ShootAssignment[]> {
  const now = Date.now();
  if (!forceRefresh && cachedAssignments && (now - cachedAssignments.timestamp < ASSIGNMENTS_CACHE_TTL)) {
    return cachedAssignments.data;
  }

  if (inFlightAssignmentsPromise) {
    return inFlightAssignmentsPromise;
  }

  inFlightAssignmentsPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('snap_assignments')
        .select('id, title, assigned_by_name, target_user_id, target_user_name, pose_ids, event_name, notes, status, created_at')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return getAssignmentsDB();
      }

      const local = getAssignmentsDB();
      const map = new Map<string, ShootAssignment>();
      data.forEach((d: any) => {
        map.set(d.id, {
          id: d.id,
          title: d.title || 'Shoot Assignment',
          assigned_by_name: d.assigned_by_name || 'Admin',
          target_user_id: d.target_user_id,
          target_user_name: d.target_user_name || 'User',
          pose_ids: d.pose_ids || [],
          event_name: d.event_name,
          notes: d.notes,
          status: d.status || 'pending',
          created_at: d.created_at || new Date().toISOString(),
        });
      });

      local.forEach(item => {
        if (!map.has(item.id)) map.set(item.id, item);
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      saveAssignmentsDB(merged);
      cachedAssignments = { data: merged, timestamp: Date.now() };
      return merged;
    } catch {
      return getAssignmentsDB();
    } finally {
      inFlightAssignmentsPromise = null;
    }
  })();

  return inFlightAssignmentsPromise;
}
