// Helper module to manage user-specific Today's Shoot selection (localStorage + Supabase Cloud Sync)
import { getUser } from './auth-helpers';
import { supabase } from './supabase';

function getKeys(targetUserId?: string) {
  const u = getUser();
  const userId = targetUserId || u?.id || 'guest';
  return {
    userId,
    shootKey: `snap_today_shoot_${userId}`,
    doneKey: `snap_today_shoot_done_${userId}`,
  };
}

export function getTodayShootIds(targetUserId?: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const { shootKey } = getKeys(targetUserId);
    return JSON.parse(localStorage.getItem(shootKey) || '[]');
  } catch {
    return [];
  }
}

export function isTodayShoot(poseId: string): boolean {
  return getTodayShootIds().includes(poseId);
}

export function toggleTodayShoot(poseId: string): string[] {
  if (typeof window === 'undefined') return [];
  const { userId, shootKey } = getKeys();
  const current = getTodayShootIds();
  let updated: string[];
  if (current.includes(poseId)) {
    updated = current.filter(id => id !== poseId);
  } else {
    updated = [...current, poseId];
  }
  try {
    localStorage.setItem(shootKey, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update Today Shoot list:', e);
  }

  // Cloud sync
  syncTodayShootCloud(userId, updated, getTodayShootDoneIds(userId));

  return updated;
}

/**
 * Merge newly assigned items into user's existing Today's Shoot list (no duplicates)
 */
export function mergeTodayShootItems(newIds: string[], targetUserId?: string): string[] {
  if (typeof window === 'undefined') return [];
  const { userId, shootKey } = getKeys(targetUserId);
  const current = getTodayShootIds(targetUserId);
  const mergedSet = new Set([...current, ...newIds]);
  const updated = Array.from(mergedSet);
  try {
    localStorage.setItem(shootKey, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to merge Today Shoot list:', e);
  }

  // Cloud sync
  syncTodayShootCloud(userId, updated, getTodayShootDoneIds(userId));

  return updated;
}

/**
 * Replace user's Today's Shoot list completely with new items
 */
export function replaceTodayShootItems(newIds: string[], targetUserId?: string): string[] {
  if (typeof window === 'undefined') return [];
  const { userId, shootKey, doneKey } = getKeys(targetUserId);
  const updated = Array.from(new Set(newIds));
  try {
    localStorage.setItem(shootKey, JSON.stringify(updated));
    // Clear done checkmarks since it is a fresh replacement list
    localStorage.removeItem(doneKey);
  } catch (e) {
    console.error('Failed to replace Today Shoot list:', e);
  }

  // Cloud sync
  syncTodayShootCloud(userId, updated, []);

  return updated;
}

export function clearTodayShoot(targetUserId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const { userId, shootKey, doneKey } = getKeys(targetUserId);
    localStorage.removeItem(shootKey);
    localStorage.removeItem(doneKey);
    syncTodayShootCloud(userId, [], []);
  } catch (e) {
    console.error('Failed to clear Today Shoot list:', e);
  }
}

export function getTodayShootDoneIds(targetUserId?: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const { doneKey } = getKeys(targetUserId);
    return JSON.parse(localStorage.getItem(doneKey) || '[]');
  } catch {
    return [];
  }
}

export function toggleTodayShootDone(poseId: string): string[] {
  if (typeof window === 'undefined') return [];
  const { userId, doneKey } = getKeys();
  const current = getTodayShootDoneIds();
  let updated: string[];
  if (current.includes(poseId)) {
    updated = current.filter(id => id !== poseId);
  } else {
    updated = [...current, poseId];
  }
  try {
    localStorage.setItem(doneKey, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update Today Shoot Done state:', e);
  }

  // Cloud sync
  syncTodayShootCloud(userId, getTodayShootIds(userId), updated);

  return updated;
}

// --- SUPABASE CLOUD SYNC FOR TODAY'S SHOOT WITH TTL CACHING ---
const todayCache = new Map<string, { data: { poseIds: string[]; doneIds: string[] }; timestamp: number }>();
const inFlightTodayPromise = new Map<string, Promise<{ poseIds: string[]; doneIds: string[] }>>();
const TODAY_CACHE_TTL = 60 * 1000; // 60 seconds

export function invalidateTodayShootCache(userId?: string): void {
  if (userId) {
    todayCache.delete(userId);
  } else {
    todayCache.clear();
  }
}

export function syncTodayShootCloud(userId: string, poseIds: string[], doneIds: string[]): void {
  if (!userId || userId === 'guest') return;
  invalidateTodayShootCache(userId);
  const u = getUser();
  try {
    supabase.from('snap_today_shoots').upsert([{
      id: userId,
      user_id: userId,
      user_name: u?.name || 'Photographer',
      pose_ids: poseIds,
      done_ids: doneIds,
      updated_at: new Date().toISOString()
    }], { onConflict: 'user_id' }).then((res) => {
      if (res?.error) console.info('Supabase today shoot sync notice:', res.error.message);
    });
  } catch (e) {
    // Graceful offline fallback
  }
}

export async function fetchTodayShootCloud(targetUserId?: string, forceRefresh = false): Promise<{ poseIds: string[]; doneIds: string[] }> {
  const { userId, shootKey, doneKey } = getKeys(targetUserId);
  if (!userId || userId === 'guest') {
    return { poseIds: getTodayShootIds(), doneIds: getTodayShootDoneIds() };
  }

  const now = Date.now();
  if (!forceRefresh) {
    const cached = todayCache.get(userId);
    if (cached && (now - cached.timestamp < TODAY_CACHE_TTL)) {
      return cached.data;
    }
  }

  if (inFlightTodayPromise.has(userId)) {
    return inFlightTodayPromise.get(userId)!;
  }

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from('snap_today_shoots')
        .select('id, user_id, user_name, pose_ids, done_ids, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        return { poseIds: getTodayShootIds(userId), doneIds: getTodayShootDoneIds(userId) };
      }

      const cloudPoseIds: string[] = data.pose_ids || [];
      const cloudDoneIds: string[] = data.done_ids || [];

      if (typeof window !== 'undefined') {
        localStorage.setItem(shootKey, JSON.stringify(cloudPoseIds));
        localStorage.setItem(doneKey, JSON.stringify(cloudDoneIds));
      }

      const result = { poseIds: cloudPoseIds, doneIds: cloudDoneIds };
      todayCache.set(userId, { data: result, timestamp: Date.now() });
      return result;
    } catch {
      return { poseIds: getTodayShootIds(userId), doneIds: getTodayShootDoneIds(userId) };
    } finally {
      inFlightTodayPromise.delete(userId);
    }
  })();

  inFlightTodayPromise.set(userId, promise);
  return promise;
}
