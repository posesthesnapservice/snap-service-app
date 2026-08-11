// Helper module to manage user-specific Today's Shoot selection in localStorage
import { getUser } from './auth-helpers';

function getKeys() {
  const u = getUser();
  const userId = u?.id || 'guest';
  return {
    shootKey: `snap_today_shoot_${userId}`,
    doneKey: `snap_today_shoot_done_${userId}`,
  };
}

export function getTodayShootIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const { shootKey } = getKeys();
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

export function clearTodayShoot(): void {
  if (typeof window === 'undefined') return;
  try {
    const { shootKey, doneKey } = getKeys();
    localStorage.removeItem(shootKey);
    localStorage.removeItem(doneKey);
  } catch (e) {
    console.error('Failed to clear Today Shoot list:', e);
  }
}

export function getTodayShootDoneIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const { doneKey } = getKeys();
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
