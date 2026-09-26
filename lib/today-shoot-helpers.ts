// Helper module to manage user-specific Today's Shoot selection in localStorage
import { getUser } from './auth-helpers';

function getKeys(targetUserId?: string) {
  const u = getUser();
  const userId = targetUserId || u?.id || 'guest';
  return {
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
  const { shootKey } = getKeys();
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
  return updated;
}

/**
 * Merge newly assigned items into user's existing Today's Shoot list (no duplicates)
 */
export function mergeTodayShootItems(newIds: string[], targetUserId?: string): string[] {
  if (typeof window === 'undefined') return [];
  const { shootKey } = getKeys(targetUserId);
  const current = getTodayShootIds(targetUserId);
  const mergedSet = new Set([...current, ...newIds]);
  const updated = Array.from(mergedSet);
  try {
    localStorage.setItem(shootKey, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to merge Today Shoot list:', e);
  }
  return updated;
}

/**
 * Replace user's Today's Shoot list completely with new items
 */
export function replaceTodayShootItems(newIds: string[], targetUserId?: string): string[] {
  if (typeof window === 'undefined') return [];
  const { shootKey, doneKey } = getKeys(targetUserId);
  const updated = Array.from(new Set(newIds));
  try {
    localStorage.setItem(shootKey, JSON.stringify(updated));
    // Clear done checkmarks since it is a fresh replacement list
    localStorage.removeItem(doneKey);
  } catch (e) {
    console.error('Failed to replace Today Shoot list:', e);
  }
  return updated;
}

export function clearTodayShoot(targetUserId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const { shootKey, doneKey } = getKeys(targetUserId);
    localStorage.removeItem(shootKey);
    localStorage.removeItem(doneKey);
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
  const { doneKey } = getKeys();
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
  return updated;
}

