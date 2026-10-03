export type UserRole = 'admin' | 'all_rounder' | 'photographer' | 'cinematographer' | 'user';
export type PoseStatus = 'published' | 'hidden';
export type ChecklistItemStatus = 'done' | 'not_done';

export interface ShootAssignment {
  id: string;
  title: string;
  assigned_by_name: string;
  target_user_id: string;
  target_user_name: string;
  pose_ids: string[];
  event_name?: string;
  notes?: string;
  status: 'pending' | 'accepted_merged' | 'accepted_replaced' | 'dismissed';
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'subject' | 'shoot_type' | 'event' | 'style' | 'location' | 'custom';
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface Pose {
  id: string;
  title: string;
  image_url: string;
  instructions: string;
  camera_lens?: string;
  mood?: string;
  notes?: string;
  status: PoseStatus;
  subjects: string[];
  shoot_types: string[];
  events: string[];
  tags: string[];
  style?: string;
  location?: string;
  created_at: string;
  updated_at: string;
  is_favorited?: boolean;
  relevance_score?: number;
}

export interface ShotListItem {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  event?: string;
  instructions?: string;
  tags: string[];
  created_at: string;
}

export interface CinematicShot {
  id: string;
  title: string;
  description: string;
  media_url?: string;
  cover_image?: string;
  camera_movement?: string;
  framing?: string;
  event?: string;
  orientation?: 'portrait' | 'landscape'; // portrait (9:16) vs landscape (16:9)
  status?: PoseStatus;
  tags: string[];
  created_at: string;
}

export interface TrendingReel {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  cover_image?: string;
  event: string; // 'Mehndi' | 'Barat' | 'Walima' | 'Nikah' | 'Mayun' | 'Dholki' | 'Pre-Wedding' | 'Engagement' | 'General'
  events?: string[]; // Multiple event categories support
  orientation: 'portrait' | 'landscape'; // portrait (9:16) vs landscape (16:9)
  status: PoseStatus;
  tags?: string[];
  created_at: string;
}

export interface DirectionalShoot {
  id: string;
  title: string;
  description?: string;
  media_url?: string;
  cover_image?: string;
  director_notes?: string; // Vocal cue / instruction to tell couple
  camera_angle?: string; // e.g. 'Low Angle 45°', 'Eye Level', 'Side Profile'
  movement?: string; // e.g. 'Slow Walking', 'Veil Twirl', 'Gentle Laugh'
  event: string;
  events?: string[];
  orientation?: 'portrait' | 'landscape';
  status: PoseStatus;
  tags?: string[];
  created_at: string;
}

export interface ChecklistEvent {
  id: string;
  name: string;
  order_index: number;
}

export interface ChecklistItem {
  id: string;
  event_id: string;
  event_name?: string;
  title: string;
  order_index: number;
  status?: ChecklistItemStatus;
  created_at: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSynced: Date | null;
  isSyncing: boolean;
}

export interface AISearchResult {
  poses: Pose[];
  explanation: string;
  isLocalSearch: boolean;
}
