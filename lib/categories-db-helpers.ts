import { Category, Tag } from './types';
import { supabase } from './supabase';

const CATEGORIES_KEY = 'snap_categories_db';
const TAGS_KEY = 'snap_tags_db';

export const defaultCategories: Category[] = [
  { id: '1', name: 'Bride', type: 'subject', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '2', name: 'Groom', type: 'subject', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '3', name: 'Couple', type: 'subject', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '3a', name: 'Sisters', type: 'subject', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '3b', name: 'Brothers', type: 'subject', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '3c', name: 'Old Age', type: 'subject', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '3d', name: 'Family', type: 'subject', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '3e', name: 'Friends', type: 'subject', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '4', name: 'Mehndi', type: 'event', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '5', name: 'Nikah', type: 'event', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '6', name: 'Barat', type: 'event', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '7', name: 'Walima', type: 'event', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '7a', name: 'Reception', type: 'event', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '7b', name: 'Mayun', type: 'event', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '7c', name: 'Dholki', type: 'event', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '7d', name: 'Pre-Wedding', type: 'event', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '7e', name: 'Engagement', type: 'event', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '8', name: 'Portraits', type: 'shoot_type', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '9', name: 'Candid', type: 'shoot_type', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '9a', name: 'Solo', type: 'shoot_type', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '9b', name: 'Standing', type: 'shoot_type', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '9c', name: 'Sitting', type: 'shoot_type', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '9d', name: 'Romantic', type: 'shoot_type', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '10', name: 'Detail Shot', type: 'custom', created_at: '2026-01-01T00:00:00.000Z' },
];

export const defaultTags: Tag[] = [
  { id: '1', name: 'classic', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '2', name: 'modern', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '3', name: 'fun', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '4', name: 'dramatic', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '5', name: 'emotional', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '6', name: 'twirl', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '7', name: 'sherwani', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '8', name: 'lehenga', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '9', name: 'dupatta', created_at: '2026-01-01T00:00:00.000Z' },
  { id: '10', name: 'entry', created_at: '2026-01-01T00:00:00.000Z' },
];

// --- CATEGORIES PERSISTENCE ---

export function getCategoriesDB(): Category[] {
  if (typeof window === 'undefined') return defaultCategories;
  try {
    const stored = localStorage.getItem(CATEGORIES_KEY);
    if (!stored) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
      return defaultCategories;
    }
    const parsed: Category[] = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
      return defaultCategories;
    }
    // Seamlessly merge essential default categories if missing (e.g. Engagement)
    const existingNames = new Set(parsed.map(c => `${c.name.toLowerCase()}_${c.type}`));
    const missingDefaults = defaultCategories.filter(d => !existingNames.has(`${d.name.toLowerCase()}_${d.type}`));
    if (missingDefaults.length > 0) {
      const merged = [...parsed, ...missingDefaults];
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch {
    return defaultCategories;
  }
}

export function saveCategoriesDB(categories: Category[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories DB:', e);
  }

  // Cloud sync to Supabase (if table exists)
  try {
    const payload = categories.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      created_at: c.created_at || new Date().toISOString()
    }));
    supabase.from('snap_categories').upsert(payload, { onConflict: 'id' }).then((res) => {
      if (res?.error) console.info('Supabase categories sync notice:', res.error.message);
    });
  } catch {}
}

export function addCategoryDB(category: Category): Category[] {
  const current = getCategoriesDB();
  // Check if identical name already exists for same type
  const exists = current.some(
    c => c.name.toLowerCase() === category.name.toLowerCase() && c.type === category.type
  );
  if (exists) return current;

  const updated = [category, ...current];
  saveCategoriesDB(updated);
  return updated;
}

export function updateCategoryDB(id: string, name: string, type: Category['type']): Category[] {
  const current = getCategoriesDB();
  const updated = current.map(c => (c.id === id ? { ...c, name: name.trim(), type } : c));
  saveCategoriesDB(updated);
  return updated;
}

export function deleteCategoryDB(id: string): Category[] {
  const current = getCategoriesDB();
  const updated = current.filter(c => c.id !== id);
  saveCategoriesDB(updated);

  try {
    supabase.from('snap_categories').delete().eq('id', id).then((res) => {
      if (res?.error) console.info('Supabase delete category notice:', res.error.message);
    });
  } catch {}

  return updated;
}

// --- TAGS PERSISTENCE ---

export function getTagsDB(): Tag[] {
  if (typeof window === 'undefined') return defaultTags;
  try {
    const stored = localStorage.getItem(TAGS_KEY);
    if (!stored) {
      localStorage.setItem(TAGS_KEY, JSON.stringify(defaultTags));
      return defaultTags;
    }
    const parsed: Tag[] = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(TAGS_KEY, JSON.stringify(defaultTags));
      return defaultTags;
    }
    return parsed;
  } catch {
    return defaultTags;
  }
}

export function saveTagsDB(tags: Tag[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
  } catch (e) {
    console.error('Failed to save tags DB:', e);
  }

  // Cloud sync to Supabase (if table exists)
  try {
    const payload = tags.map(t => ({
      id: t.id,
      name: t.name,
      created_at: t.created_at || new Date().toISOString()
    }));
    supabase.from('snap_tags').upsert(payload, { onConflict: 'id' }).then((res) => {
      if (res?.error) console.info('Supabase tags sync notice:', res.error.message);
    });
  } catch {}
}

export function addTagDB(tag: Tag): Tag[] {
  const current = getTagsDB();
  const exists = current.some(t => t.name.toLowerCase() === tag.name.toLowerCase());
  if (exists) return current;

  const updated = [tag, ...current];
  saveTagsDB(updated);
  return updated;
}

export function updateTagDB(id: string, name: string): Tag[] {
  const current = getTagsDB();
  const updated = current.map(t => (t.id === id ? { ...t, name: name.trim().toLowerCase() } : t));
  saveTagsDB(updated);
  return updated;
}

export function deleteTagDB(id: string): Tag[] {
  const current = getTagsDB();
  const updated = current.filter(t => t.id !== id);
  saveTagsDB(updated);

  try {
    supabase.from('snap_tags').delete().eq('id', id).then((res) => {
      if (res?.error) console.info('Supabase delete tag notice:', res.error.message);
    });
  } catch {}

  return updated;
}

// --- CLOUD SYNC HELPERS ---

export async function fetchCategoriesCloud(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('snap_categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const local = getCategoriesDB();
      const map = new Map(local.map(item => [item.id, item]));
      data.forEach((d: any) => {
        map.set(d.id, {
          id: d.id,
          name: d.name,
          type: d.type,
          created_at: d.created_at || new Date().toISOString()
        });
      });
      const merged = Array.from(map.values());
      saveCategoriesDB(merged);
      return merged;
    }
  } catch {}
  return getCategoriesDB();
}

export async function fetchTagsCloud(): Promise<Tag[]> {
  try {
    const { data, error } = await supabase
      .from('snap_tags')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const local = getTagsDB();
      const map = new Map(local.map(item => [item.id, item]));
      data.forEach((d: any) => {
        map.set(d.id, {
          id: d.id,
          name: d.name,
          created_at: d.created_at || new Date().toISOString()
        });
      });
      const merged = Array.from(map.values());
      saveTagsDB(merged);
      return merged;
    }
  } catch {}
  return getTagsDB();
}
