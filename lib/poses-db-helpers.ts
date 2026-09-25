import { mockPoses, mockShotList, mockCinematicShots, mockTrendingReels } from './mock-data';
import { Pose, ShotListItem, CinematicShot, TrendingReel } from './types';
import { supabase } from './supabase';

const POSES_KEY = 'snap_poses_db';
const SHOTLIST_KEY = 'snap_shotlist_db';
const CINEMATIC_KEY = 'snap_cinematic_db';
const REELS_KEY = 'snap_trending_reels_db';

// --- SUPABASE STORAGE MEDIA UPLOADER ---
export async function uploadMediaToSupabase(file: File, folder = 'reels'): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('snap_media').upload(fileName, file);
    if (error) {
      console.error('Supabase Storage error:', error);
      return null;
    }
    const { data: publicUrlData } = supabase.storage.from('snap_media').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (e) {
    console.error('Upload exception:', e);
    return null;
  }
}

// --- POSES DB ---
export function getPosesDB(): Pose[] {
  if (typeof window === 'undefined') return mockPoses;
  try {
    const stored = localStorage.getItem(POSES_KEY);
    if (!stored) {
      localStorage.setItem(POSES_KEY, JSON.stringify(mockPoses));
      return mockPoses;
    }
    return JSON.parse(stored);
  } catch {
    return mockPoses;
  }
}

export function savePosesDB(poses: Pose[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(POSES_KEY, JSON.stringify(poses));
  } catch (e) {
    console.error('Failed to save poses DB:', e);
  }
}

export function addPoseDB(newPose: Pose): Pose[] {
  const current = getPosesDB();
  const updated = [newPose, ...current];
  savePosesDB(updated);
  return updated;
}

export function updatePoseDB(id: string, partial: Partial<Pose>): Pose[] {
  const current = getPosesDB();
  const updated = current.map(p => p.id === id ? { ...p, ...partial, updated_at: new Date().toISOString() } : p);
  savePosesDB(updated);
  return updated;
}

export function deletePoseDB(id: string): Pose[] {
  const current = getPosesDB();
  const updated = current.filter(p => p.id !== id);
  savePosesDB(updated);
  return updated;
}

// --- SHOT LIST DB ---
export function getShotListDB(): ShotListItem[] {
  if (typeof window === 'undefined') return mockShotList;
  try {
    const stored = localStorage.getItem(SHOTLIST_KEY);
    if (!stored) {
      localStorage.setItem(SHOTLIST_KEY, JSON.stringify(mockShotList));
      return mockShotList;
    }
    return JSON.parse(stored);
  } catch {
    return mockShotList;
  }
}

export function saveShotListDB(items: ShotListItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SHOTLIST_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save shot list DB:', e);
  }
}

// --- CINEMATIC SHOTS DB ---
export function getCinematicDB(): CinematicShot[] {
  if (typeof window === 'undefined') return mockCinematicShots;
  try {
    const stored = localStorage.getItem(CINEMATIC_KEY);
    if (!stored) {
      localStorage.setItem(CINEMATIC_KEY, JSON.stringify(mockCinematicShots));
      return mockCinematicShots;
    }
    return JSON.parse(stored);
  } catch {
    return mockCinematicShots;
  }
}

export function saveCinematicDB(items: CinematicShot[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CINEMATIC_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save cinematic DB:', e);
  }
}

// --- TRENDING REELS DB ---
export function getTrendingReelsDB(): TrendingReel[] {
  if (typeof window === 'undefined') return mockTrendingReels;
  try {
    const stored = localStorage.getItem(REELS_KEY);
    if (!stored) {
      localStorage.setItem(REELS_KEY, JSON.stringify(mockTrendingReels));
      return mockTrendingReels;
    }
    return JSON.parse(stored);
  } catch {
    return mockTrendingReels;
  }
}

export function saveTrendingReelsDB(items: TrendingReel[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REELS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save trending reels DB:', e);
  }
}

export function addTrendingReelDB(newItem: TrendingReel): TrendingReel[] {
  const current = getTrendingReelsDB();
  const updated = [newItem, ...current];
  saveTrendingReelsDB(updated);
  return updated;
}

export function updateTrendingReelDB(id: string, partial: Partial<TrendingReel>): TrendingReel[] {
  const current = getTrendingReelsDB();
  const updated = current.map(item => item.id === id ? { ...item, ...partial } : item);
  saveTrendingReelsDB(updated);
  return updated;
}

export function deleteTrendingReelDB(id: string): TrendingReel[] {
  const current = getTrendingReelsDB();
  const updated = current.filter(item => item.id !== id);
  saveTrendingReelsDB(updated);
  return updated;
}
