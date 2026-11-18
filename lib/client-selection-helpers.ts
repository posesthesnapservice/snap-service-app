import { ClientSelectionSession } from './types';
import { supabase } from './supabase';

const SELECTIONS_KEY = 'snap_client_selections_db';

export function getClientSelectionsDB(): ClientSelectionSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SELECTIONS_KEY);
    if (!stored) return [];
    const list: ClientSelectionSession[] = JSON.parse(stored);
    const now = new Date().getTime();

    // Check expiry
    return list.map(item => {
      if (item.expires_at && item.status === 'pending') {
        const expTime = new Date(item.expires_at).getTime();
        if (now > expTime) {
          return { ...item, status: 'expired' as const };
        }
      }
      return item;
    });
  } catch {
    return [];
  }
}

export function saveClientSelectionsDB(items: ClientSelectionSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SELECTIONS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save client selections:', e);
  }
}

export function createClientSelectionSession(params: {
  client_name: string;
  client_phone?: string;
  event_type?: string;
  event_date?: string;
  notes_for_client?: string;
  expiry_days?: number; // 0 or undefined for no expiry, or 3, 7, 14, 30
}): ClientSelectionSession {
  const current = getClientSelectionsDB();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const id = `cs_${timestamp}_${randomSuffix}`;
  const token = `cs_${randomSuffix}${Math.floor(Math.random() * 90 + 10)}`;

  let expires_at: string | undefined = undefined;
  if (params.expiry_days && params.expiry_days > 0) {
    expires_at = new Date(timestamp + params.expiry_days * 24 * 60 * 60 * 1000).toISOString();
  }

  const session: ClientSelectionSession = {
    id,
    token,
    client_name: params.client_name.trim(),
    client_phone: params.client_phone?.trim() || undefined,
    event_type: params.event_type?.trim() || 'General',
    event_date: params.event_date?.trim() || undefined,
    notes_for_client: params.notes_for_client?.trim() || undefined,
    selected_pose_ids: [],
    selected_reel_ids: [],
    status: 'pending',
    expires_at,
    created_at: new Date(timestamp).toISOString(),
  };

  const updated = [session, ...current];
  saveClientSelectionsDB(updated);

  // Cloud sync to Supabase (if table exists)
  try {
    supabase.from('snap_client_selections').upsert([{
      id: session.id,
      token: session.token,
      client_name: session.client_name,
      client_phone: session.client_phone || null,
      event_type: session.event_type,
      event_date: session.event_date || null,
      notes_for_client: session.notes_for_client || null,
      selected_pose_ids: session.selected_pose_ids,
      selected_reel_ids: session.selected_reel_ids,
      status: session.status,
      expires_at: session.expires_at || null,
      created_at: session.created_at,
    }], { onConflict: 'id' }).then((res) => {
      if (res?.error) console.info('Supabase client selections sync notice:', res.error.message);
    });
  } catch (e) {
    console.warn('Supabase client selection upsert notice:', e);
  }

  return session;
}

export function getClientSelectionByToken(token: string): ClientSelectionSession | null {
  if (!token) return null;
  const list = getClientSelectionsDB();
  const found = list.find(s => s.token === token || s.id === token);
  if (found) {
    if (found.expires_at && found.status === 'pending') {
      const expTime = new Date(found.expires_at).getTime();
      if (Date.now() > expTime) {
        return { ...found, status: 'expired' };
      }
    }
    return found;
  }
  return null;
}

export async function fetchClientSelectionByTokenCloud(token: string): Promise<ClientSelectionSession | null> {
  const local = getClientSelectionByToken(token);
  if (local) return local;

  try {
    const { data, error } = await supabase
      .from('snap_client_selections')
      .select('*')
      .or(`token.eq.${token},id.eq.${token}`)
      .single();

    if (!error && data) {
      const mapped: ClientSelectionSession = {
        id: data.id,
        token: data.token,
        client_name: data.client_name,
        client_phone: data.client_phone || undefined,
        event_type: data.event_type || 'General',
        event_date: data.event_date || undefined,
        notes_for_client: data.notes_for_client || undefined,
        client_notes: data.client_notes || undefined,
        selected_pose_ids: data.selected_pose_ids || [],
        selected_reel_ids: data.selected_reel_ids || [],
        status: data.status || 'pending',
        expires_at: data.expires_at || undefined,
        created_at: data.created_at || new Date().toISOString(),
        submitted_at: data.submitted_at || undefined,
      };

      const current = getClientSelectionsDB();
      if (!current.some(s => s.id === mapped.id)) {
        saveClientSelectionsDB([mapped, ...current]);
      }
      return mapped;
    }
  } catch {}

  return null;
}

export function submitClientSelection(
  token: string, 
  selectedPoseIds: string[], 
  selectedReelIds: string[], 
  clientNotes?: string
): ClientSelectionSession | null {
  const list = getClientSelectionsDB();
  const target = list.find(s => s.token === token || s.id === token);
  if (!target) return null;

  const now = new Date().toISOString();
  const updatedSession: ClientSelectionSession = {
    ...target,
    selected_pose_ids: Array.from(new Set(selectedPoseIds)),
    selected_reel_ids: Array.from(new Set(selectedReelIds)),
    client_notes: clientNotes?.trim() || target.client_notes,
    status: 'submitted',
    submitted_at: now,
  };

  const updatedList = list.map(s => (s.id === target.id ? updatedSession : s));
  saveClientSelectionsDB(updatedList);

  // Cloud sync to Supabase
  try {
    supabase.from('snap_client_selections').update({
      selected_pose_ids: updatedSession.selected_pose_ids,
      selected_reel_ids: updatedSession.selected_reel_ids,
      client_notes: updatedSession.client_notes || null,
      status: 'submitted',
      submitted_at: now,
    }).eq('id', target.id).then((res) => {
      if (res?.error) console.info('Supabase client selection submit notice:', res.error.message);
    });
  } catch (e) {
    console.warn('Supabase submit update notice:', e);
  }

  return updatedSession;
}

export function deleteClientSelectionDB(id: string): ClientSelectionSession[] {
  const current = getClientSelectionsDB();
  const updated = current.filter(s => s.id !== id && s.token !== id);
  saveClientSelectionsDB(updated);

  try {
    supabase.from('snap_client_selections').delete().eq('id', id).then((res) => {
      if (res?.error) console.info('Supabase delete client selection notice:', res.error.message);
    });
  } catch {}

  return updated;
}

export function generateWhatsAppShareText(session: ClientSelectionSession, originUrl = ''): string {
  const host = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const link = `${host}/select/${session.token}`;
  const eventMsg = session.event_type && session.event_type !== 'All' ? `for your ${session.event_type}` : '';
  const dateMsg = session.event_date ? ` (${session.event_date})` : '';

  let message = `Assalam-o-Alaikum ${session.client_name}! 📸✨\n\n`;
  message += `Here is your customized posing & trending reels selection link ${eventMsg}${dateMsg}:\n`;
  message += `🔗 ${link}\n\n`;

  if (session.notes_for_client) {
    message += `📝 Note: "${session.notes_for_client}"\n\n`;
  } else {
    message += `Please open the link to select your favorite poses and reels. Our photography team will follow your chosen styles during the shoot!\n\n`;
  }

  if (session.expires_at) {
    const formattedDate = new Date(session.expires_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    message += `⏳ Link valid until: ${formattedDate}\n\n`;
  }

  message += `Thank you! — Snap Photography Team`;
  return message;
}

export function generateWhatsAppSubmissionSummary(session: ClientSelectionSession, originUrl = ''): string {
  const host = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const link = `${host}/select/${session.token}`;

  let summary = `📸 *Client Selection Submitted!* ✨\n\n`;
  summary += `👤 Client: *${session.client_name}*\n`;
  if (session.client_phone) summary += `📞 Phone: ${session.client_phone}\n`;
  summary += `🎉 Event: *${session.event_type}* ${session.event_date ? `(${session.event_date})` : ''}\n`;
  summary += `📷 Poses Selected: *${session.selected_pose_ids.length}*\n`;
  summary += `🔥 Reels Selected: *${session.selected_reel_ids.length}*\n\n`;

  if (session.client_notes) {
    summary += `💬 Client Notes: "${session.client_notes}"\n\n`;
  }

  summary += `🔗 View Full Selection: ${link}\n`;
  return summary;
}
