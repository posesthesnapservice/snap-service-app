import { mockPoses, mockShotList, mockCinematicShots, mockTrendingReels } from './mock-data';
import { Pose, ShotListItem, CinematicShot, TrendingReel } from './types';
import { supabase } from './supabase';
import { uploadMediaToCloudinary, deleteMediaFromCloudinary } from './cloudinary';

const POSES_KEY = 'snap_poses_db';
const SHOTLIST_KEY = 'snap_shotlist_db';
const CINEMATIC_KEY = 'snap_cinematic_db';
const REELS_KEY = 'snap_trending_reels_db';

// --- MEDIA UPLOADER (Cloudinary 25GB -> Supabase Fallback) ---
export async function uploadMediaToSupabase(file: File, folder = 'reels'): Promise<string | null> {
  // 1. Try Cloudinary if configured (25GB Free Storage)
  const cloudinaryUrl = await uploadMediaToCloudinary(file);
  if (cloudinaryUrl) return cloudinaryUrl;

  // 2. Fallback to Supabase Storage
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
  
  // Async sync to Supabase Database table
  supabase.from('snap_poses').insert([{
    id: newPose.id,
    title: newPose.title,
    image_url: newPose.image_url,
    instructions: newPose.instructions || '',
    subjects: newPose.subjects || [],
    shoot_types: newPose.shoot_types || [],
    events: newPose.events || [],
    status: newPose.status || 'published'
  }]).then((res) => {
    if (res && res.error) console.warn('Supabase DB Sync (Poses insert) notice:', res.error.message);
  });

  return updated;
}

export function updatePoseDB(id: string, partial: Partial<Pose>): Pose[] {
  const current = getPosesDB();
  const updated = current.map(p => p.id === id ? { ...p, ...partial, updated_at: new Date().toISOString() } : p);
  savePosesDB(updated);

  supabase.from('snap_poses').update(partial).eq('id', id).then((res) => {
    if (res && res.error) console.warn('Supabase DB Sync (Poses update) notice:', res.error.message);
  });

  return updated;
}

export function deletePoseDB(id: string): Pose[] {
  const current = getPosesDB();
  const toDelete = current.find(p => p.id === id);
  const updated = current.filter(p => p.id !== id);
  savePosesDB(updated);

  supabase.from('snap_poses').delete().eq('id', id).then((res) => {
    if (res && res.error) console.warn('Supabase DB Sync (Poses delete) notice:', res.error.message);
  });

  if (toDelete?.image_url) {
    deleteMediaFromCloudinary(toDelete.image_url);
  }

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

export function addShotListDB(newItem: ShotListItem): ShotListItem[] {
  const current = getShotListDB();
  const updated = [newItem, ...current.filter(i => i.id !== newItem.id)];
  saveShotListDB(updated);

  supabase.from('snap_shotlist').upsert([{
    id: newItem.id,
    title: newItem.title,
    description: newItem.description || '',
    event: newItem.event || null,
    instructions: newItem.instructions || null,
    image_url: newItem.image_url || null,
    tags: newItem.tags || []
  }], { onConflict: 'id' }).then((res) => {
    if (res?.error) console.info('Supabase ShotList sync notice:', res.error.message);
  });

  return updated;
}

export function updateShotListDB(id: string, partial: Partial<ShotListItem>): ShotListItem[] {
  const current = getShotListDB();
  const updated = current.map(item => item.id === id ? { ...item, ...partial } : item);
  saveShotListDB(updated);

  supabase.from('snap_shotlist').update(partial).eq('id', id).then((res) => {
    if (res?.error) console.info('Supabase ShotList update notice:', res.error.message);
  });

  return updated;
}

export function deleteShotListDB(id: string): ShotListItem[] {
  const current = getShotListDB();
  const toDelete = current.find(i => i.id === id);
  const updated = current.filter(i => i.id !== id);
  saveShotListDB(updated);

  supabase.from('snap_shotlist').delete().eq('id', id).then((res) => {
    if (res?.error) console.info('Supabase ShotList delete notice:', res.error.message);
  });

  if (toDelete?.image_url) {
    deleteMediaFromCloudinary(toDelete.image_url);
  }

  return updated;
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

export function addCinematicDB(newItem: CinematicShot): CinematicShot[] {
  const current = getCinematicDB();
  const updated = [newItem, ...current.filter(i => i.id !== newItem.id)];
  saveCinematicDB(updated);

  supabase.from('snap_cinematic').upsert([{
    id: newItem.id,
    title: newItem.title,
    description: newItem.description || '',
    media_url: newItem.media_url || null,
    camera_movement: newItem.camera_movement || null,
    framing: newItem.framing || null,
    event: newItem.event || null,
    orientation: newItem.orientation || 'portrait',
    status: newItem.status || 'published',
    tags: newItem.tags || []
  }], { onConflict: 'id' }).then((res) => {
    if (res?.error) console.info('Supabase Cinematic sync notice:', res.error.message);
  });

  return updated;
}

export function updateCinematicDB(id: string, partial: Partial<CinematicShot>): CinematicShot[] {
  const current = getCinematicDB();
  const updated = current.map(item => item.id === id ? { ...item, ...partial } : item);
  saveCinematicDB(updated);

  supabase.from('snap_cinematic').update(partial).eq('id', id).then((res) => {
    if (res?.error) console.info('Supabase Cinematic update notice:', res.error.message);
  });

  return updated;
}

export function deleteCinematicDB(id: string): CinematicShot[] {
  const current = getCinematicDB();
  const toDelete = current.find(i => i.id === id);
  const updated = current.filter(i => i.id !== id);
  saveCinematicDB(updated);

  supabase.from('snap_cinematic').delete().eq('id', id).then((res) => {
    if (res?.error) console.info('Supabase Cinematic delete notice:', res.error.message);
  });

  if (toDelete?.media_url) {
    deleteMediaFromCloudinary(toDelete.media_url);
  }

  return updated;
}

// --- TRENDING REELS DB ---
const DELETED_REEL_IDS = new Set(['tr2', 'tr3', 'tr4', 'tr5', 'tr6']);

export function getTrendingReelsDB(): TrendingReel[] {
  if (typeof window === 'undefined') return mockTrendingReels;
  try {
    const stored = localStorage.getItem(REELS_KEY);
    if (!stored) {
      localStorage.setItem(REELS_KEY, JSON.stringify(mockTrendingReels));
      return mockTrendingReels;
    }
    const parsed: TrendingReel[] = JSON.parse(stored);
    const cleaned = parsed.filter(item => !DELETED_REEL_IDS.has(item.id));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(REELS_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
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
  const updated = [newItem, ...current.filter(item => item.id !== newItem.id)];
  saveTrendingReelsDB(updated);

  const eventsStr = Array.isArray(newItem.events) && newItem.events.length > 0 
    ? newItem.events.join(', ') 
    : (newItem.event || 'General');

  // Async sync to Supabase Database table with upsert to prevent conflict
  supabase.from('snap_trending_reels').upsert([{
    id: newItem.id,
    title: newItem.title,
    video_url: newItem.video_url || '',
    cover_url: newItem.cover_image || '',
    description: newItem.description || '',
    orientation: newItem.orientation || 'portrait',
    event: eventsStr
  }], { onConflict: 'id' }).then((res) => {
    if (res && res.error) console.warn('Supabase DB Sync (Reels upsert) notice:', res.error.message);
  });

  return updated;
}

export function updateTrendingReelDB(id: string, partial: Partial<TrendingReel>): TrendingReel[] {
  const current = getTrendingReelsDB();
  const updated = current.map(item => item.id === id ? { ...item, ...partial } : item);
  saveTrendingReelsDB(updated);

  const updatePayload: any = { ...partial };
  if (partial.events && Array.isArray(partial.events)) {
    updatePayload.event = partial.events.join(', ');
  }

  supabase.from('snap_trending_reels').update(updatePayload).eq('id', id).then((res) => {
    if (res && res.error) console.warn('Supabase DB Sync (Reels update) notice:', res.error.message);
  });

  return updated;
}

export function deleteTrendingReelDB(id: string): TrendingReel[] {
  const current = getTrendingReelsDB();
  const toDelete = current.find(item => item.id === id);
  const updated = current.filter(item => item.id !== id);
  saveTrendingReelsDB(updated);

  supabase.from('snap_trending_reels').delete().eq('id', id).then((res) => {
    if (res && res.error) console.warn('Supabase DB Sync (Reels delete) notice:', res.error.message);
  });

  if (toDelete?.video_url) {
    deleteMediaFromCloudinary(toDelete.video_url);
  }
  if (toDelete?.cover_image) {
    deleteMediaFromCloudinary(toDelete.cover_image);
  }

  return updated;
}

// --- CLOUD SYNC FETCHERS ---
export async function fetchTrendingReelsCloud(): Promise<TrendingReel[]> {
  try {
    const { data, error } = await supabase.from('snap_trending_reels').select('*').order('created_at', { ascending: false });
    // Delete removed mock reels from Supabase if present
    supabase.from('snap_trending_reels').delete().in('id', Array.from(DELETED_REEL_IDS)).then(() => {});

    if (error || !data || data.length === 0) {
      return getTrendingReelsDB();
    }

    const mapped: TrendingReel[] = data
      .filter((d: any) => !DELETED_REEL_IDS.has(d.id))
      .map((d: any) => {
      const rawEvent = d.event || 'General';
      const eventsList = rawEvent.includes(',') 
        ? rawEvent.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [rawEvent.trim()];
      return {
        id: d.id,
        title: d.title,
        description: d.description || '',
        video_url: d.video_url,
        cover_image: d.cover_url || d.cover_image,
        event: eventsList[0] || 'General',
        events: eventsList,
        orientation: d.orientation || 'portrait',
        status: 'published',
        tags: d.tags || [],
        created_at: d.created_at || new Date().toISOString()
      };
    });

    // Merge cloud and local reels by ID so nothing is ever lost on sync
    const local = getTrendingReelsDB();
    const map = new Map<string, TrendingReel>();
    mapped.forEach(r => map.set(r.id, r));
    local.forEach(r => {
      if (!map.has(r.id)) map.set(r.id, r);
    });
    const merged = Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    saveTrendingReelsDB(merged);
    return merged;
  } catch {
    return getTrendingReelsDB();
  }
}

export async function fetchPosesCloud(): Promise<Pose[]> {
  try {
    const { data, error } = await supabase.from('snap_poses').select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return getPosesDB();
    }
    const mapped: Pose[] = data.map((d: any) => ({
      id: d.id,
      title: d.title,
      image_url: d.image_url,
      instructions: d.instructions || '',
      subjects: d.subjects || [],
      shoot_types: d.shoot_types || [],
      events: d.events || [],
      tags: d.tags || [],
      status: d.status || 'published',
      created_at: d.created_at || new Date().toISOString(),
      updated_at: d.created_at || new Date().toISOString()
    }));
    savePosesDB(mapped);
    return mapped;
  } catch {
    return getPosesDB();
  }
}

export async function fetchShotListCloud(): Promise<ShotListItem[]> {
  try {
    const { data, error } = await supabase.from('snap_shotlist').select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return getShotListDB();
    }
    const mapped: ShotListItem[] = data.map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description || '',
      event: d.event || undefined,
      instructions: d.instructions || undefined,
      image_url: d.image_url || undefined,
      tags: d.tags || [],
      created_at: d.created_at || new Date().toISOString()
    }));

    const local = getShotListDB();
    const map = new Map<string, ShotListItem>();
    mapped.forEach(item => map.set(item.id, item));
    local.forEach(item => {
      if (!map.has(item.id)) map.set(item.id, item);
    });
    const merged = Array.from(map.values());
    saveShotListDB(merged);
    return merged;
  } catch {
    return getShotListDB();
  }
}

export async function fetchCinematicCloud(): Promise<CinematicShot[]> {
  try {
    const { data, error } = await supabase.from('snap_cinematic').select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return getCinematicDB();
    }
    const mapped: CinematicShot[] = data.map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description || '',
      media_url: d.media_url || undefined,
      camera_movement: d.camera_movement || undefined,
      framing: d.framing || undefined,
      event: d.event || undefined,
      orientation: d.orientation || 'portrait',
      status: d.status || 'published',
      tags: d.tags || [],
      created_at: d.created_at || new Date().toISOString()
    }));

    const local = getCinematicDB();
    const map = new Map<string, CinematicShot>();
    mapped.forEach(item => map.set(item.id, item));
    local.forEach(item => {
      if (!map.has(item.id)) map.set(item.id, item);
    });
    const merged = Array.from(map.values());
    saveCinematicDB(merged);
    return merged;
  } catch {
    return getCinematicDB();
  }
}
