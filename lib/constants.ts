// Subjects
export const SUBJECTS = ['Bride', 'Groom', 'Couple', 'Sisters', 'Brothers', 'Old Age', 'Family', 'Friends'] as const;

// Shoot Types  
export const SHOOT_TYPES = ['Solo', 'Couple', 'Portrait', 'Standing', 'Sitting', 'Walking', 'Romantic', 'Creative', 'Editorial', 'Traditional'] as const;

// Events
export const EVENTS = ['Mehndi', 'Nikah', 'Barat', 'Walima', 'Reception', 'Mayun', 'Dholki', 'Pre-Wedding', 'General'] as const;

// Trending Reel Event Categories
export const REEL_EVENTS = ['All', 'Mehndi', 'Barat', 'Walima', 'Nikah', 'Mayun', 'Dholki', 'Pre-Wedding', 'Engagement', 'General'] as const;

// Moods
export const MOODS = ['Romantic', 'Candid', 'Editorial', 'Traditional', 'Fun', 'Dramatic', 'Elegant', 'Natural'] as const;

// Shot List Categories
export const SHOT_LIST_CATEGORIES = ['Details', 'Portraits', 'Candid', 'Decor', 'Family', 'Ceremony', 'Reception'] as const;

// Cinematic Shot Types
export const CINEMATIC_TYPES = ['Entry Shot', 'Walking Shot', 'Reveal', 'Detail Shot', 'Slow Motion', 'Establishing Shot', 'Emotional Moment', 'Camera Movement', 'Couple Interaction'] as const;

export const USER_ROLES = { ADMIN: 'admin', USER: 'user' } as const;

export const CHECKLIST_EVENTS = ['Mehndi', 'Nikah', 'Barat', 'Walima', 'Reception', 'Mayun', 'Dholki'] as const;

// Subject Visual Palette
export const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Bride': { bg: 'rgba(236, 72, 153, 0.18)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.5)' },
  'Groom': { bg: 'rgba(59, 130, 246, 0.18)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.5)' },
  'Couple': { bg: 'rgba(168, 85, 247, 0.18)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.5)' },
  'Sisters': { bg: 'rgba(244, 63, 94, 0.18)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.5)' },
  'Brothers': { bg: 'rgba(6, 182, 212, 0.18)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.5)' },
  'Old Age': { bg: 'rgba(132, 204, 22, 0.18)', text: '#a3e635', border: 'rgba(132, 204, 22, 0.5)' },
  'Family': { bg: 'rgba(16, 185, 129, 0.18)', text: '#34d399', border: 'rgba(16, 185, 129, 0.5)' },
  'Friends': { bg: 'rgba(245, 158, 11, 0.18)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.5)' },
};

export function getSubjectColor(subject: string) {
  return SUBJECT_COLORS[subject] || { bg: 'rgba(212, 175, 55, 0.15)', text: '#D4AF37', border: 'rgba(212, 175, 55, 0.4)' };
}

// Event Visual Palette
export const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Mehndi': { bg: 'rgba(234, 179, 8, 0.18)', text: '#fde047', border: 'rgba(234, 179, 8, 0.5)' },
  'Barat': { bg: 'rgba(239, 68, 68, 0.18)', text: '#f87171', border: 'rgba(239, 68, 68, 0.5)' },
  'Walima': { bg: 'rgba(59, 130, 246, 0.18)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.5)' },
  'Nikah': { bg: 'rgba(16, 185, 129, 0.18)', text: '#34d399', border: 'rgba(16, 185, 129, 0.5)' },
  'Mayun': { bg: 'rgba(249, 115, 22, 0.18)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.5)' },
  'Dholki': { bg: 'rgba(236, 72, 153, 0.18)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.5)' },
  'Pre-Wedding': { bg: 'rgba(168, 85, 247, 0.18)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.5)' },
  'Reception': { bg: 'rgba(14, 165, 233, 0.18)', text: '#38bdf8', border: 'rgba(14, 165, 233, 0.5)' },
  'General': { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.4)' },
};

export function getEventColor(event: string) {
  return EVENT_COLORS[event] || { bg: 'rgba(255, 255, 255, 0.08)', text: '#e2e8f0', border: 'rgba(255, 255, 255, 0.2)' };
}
