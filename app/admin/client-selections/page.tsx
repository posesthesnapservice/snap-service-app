'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getClientSelectionsDB, 
  createClientSelectionSession, 
  deleteClientSelectionDB,
  generateWhatsAppShareText,
  generateWhatsAppSubmissionSummary
} from '@/lib/client-selection-helpers';
import { getPosesDB, getTrendingReelsDB } from '@/lib/poses-db-helpers';
import { mergeTodayShootItems } from '@/lib/today-shoot-helpers';
import { ClientSelectionSession, Pose, TrendingReel } from '@/lib/types';
import { formatOptimizedVideoUrl, formatOptimizedCoverUrl } from '@/lib/cloudinary';
import { getSubjectColor } from '@/lib/constants';

export default function AdminClientSelections() {
  const [sessions, setSessions] = useState<ClientSelectionSession[]>([]);
  const [poses, setPoses] = useState<Pose[]>([]);
  const [reels, setReels] = useState<TrendingReel[]>([]);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [eventType, setEventType] = useState('Barat');
  const [eventDate, setEventDate] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [notesForClient, setNotesForClient] = useState('');
  const [createdSession, setCreatedSession] = useState<ClientSelectionSession | null>(null);

  // View / Detail Modal State
  const [viewSession, setViewSession] = useState<ClientSelectionSession | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    setSessions(getClientSelectionsDB());
    setPoses(getPosesDB());
    setReels(getTrendingReelsDB());
  }, []);

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return alert('Please enter client name');

    const newSession = createClientSelectionSession({
      client_name: clientName,
      client_phone: clientPhone,
      event_type: eventType,
      event_date: eventDate,
      expiry_days: expiryDays,
      notes_for_client: notesForClient,
    });

    setSessions(getClientSelectionsDB());
    setCreatedSession(newSession);

    // Reset fields
    setClientName('');
    setClientPhone('');
    setNotesForClient('');
    setEventDate('');
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete selection link for "${name}"?`)) {
      const updated = deleteClientSelectionDB(id);
      setSessions(updated);
      if (viewSession?.id === id) setViewSession(null);
      showToast('Selection link deleted');
    }
  };

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/select/${token}`;
    navigator.clipboard.writeText(link);
    showToast('✓ Link copied to clipboard!');
  };

  const handleShareWhatsApp = (s: ClientSelectionSession) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const text = generateWhatsAppShareText(s, origin);
    const phoneParam = s.client_phone ? s.client_phone.replace(/[^0-9]/g, '') : '';
    const url = phoneParam 
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}` 
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleAssignToTodayShoot = (session: ClientSelectionSession) => {
    if (session.selected_pose_ids.length === 0) {
      alert('Client has not selected any poses yet.');
      return;
    }
    mergeTodayShootItems(session.selected_pose_ids);
    showToast(`✓ ${session.selected_pose_ids.length} Poses assigned to Today's Shoot!`);
  };

  const stats = {
    total: sessions.length,
    submitted: sessions.filter(s => s.status === 'submitted').length,
    pending: sessions.filter(s => s.status === 'pending').length,
  };

  return (
    <div style={{ paddingBottom: '60px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff' }}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#D4AF37', color: '#000', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
            🔗 Client Selection Links
          </h1>
          <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0 0' }}>
            Generate custom links for your clients so they can pick their favorite poses & reels for their shoot
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedSession(null);
            setShowCreateModal(true);
          }}
          style={{
            backgroundColor: '#D4AF37',
            color: '#000',
            border: 'none',
            padding: '11px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(212,175,55,0.3)'
          }}
        >
          <span>+</span> Create Client Selection Link
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Client Links</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>{stats.total}</div>
        </div>
        <div style={{ backgroundColor: '#111118', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}>Completed / Submitted</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>{stats.submitted}</div>
        </div>
        <div style={{ backgroundColor: '#111118', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase' }}>Awaiting Client Pick</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>{stats.pending}</div>
        </div>
      </div>

      {/* List of Client Sessions */}
      {sessions.length === 0 ? (
        <div style={{ backgroundColor: '#111118', border: '1px dashed rgba(212,175,55,0.3)', borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '14px' }}>💌</div>
          <h3 style={{ fontSize: '18px', color: '#D4AF37', margin: '0 0 8px 0' }}>No Client Selection Links Yet</h3>
          <p style={{ fontSize: '13px', color: '#aaa', maxWidth: '480px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
            Aap kisi bhi client ke liye link bana kar WhatsApp par bhej sakte hain. Client bina login kiye aasani se apni marzi ke poses aur reels select kar sakega.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ backgroundColor: '#D4AF37', color: '#000', border: 'none', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            + Create First Selection Link
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sessions.map(s => {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const link = `${origin}/select/${s.token}`;
            const isSubmitted = s.status === 'submitted';
            const isExpired = s.status === 'expired';

            return (
              <div
                key={s.id}
                style={{
                  backgroundColor: '#111118',
                  border: isSubmitted ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  transition: 'border 0.2s'
                }}
              >
                {/* Left Info */}
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: '#fff' }}>
                      {s.client_name}
                    </h3>
                    <span style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      {s.event_type} {s.event_date ? `· ${s.event_date}` : ''}
                    </span>

                    {/* Status Badge */}
                    {isSubmitted ? (
                      <span style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid #10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        ✓ Selection Submitted ({s.selected_pose_ids.length} Poses, {s.selected_reel_ids.length} Reels)
                      </span>
                    ) : isExpired ? (
                      <span style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid #ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        ⏳ Expired
                      </span>
                    ) : (
                      <span style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid #f59e0b', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        ⏳ Pending Client Selection
                      </span>
                    )}
                  </div>

                  {s.client_notes && (
                    <div style={{ fontSize: '12px', color: '#bbb', fontStyle: 'italic', marginBottom: '6px' }}>
                      💬 Client Notes: &ldquo;{s.client_notes}&rdquo;
                    </div>
                  )}

                  <div style={{ fontSize: '12px', color: '#777', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <span>Created: {new Date(s.created_at).toLocaleDateString()}</span>
                    {s.expires_at && <span>Expires: {new Date(s.expires_at).toLocaleDateString()}</span>}
                    {s.client_phone && <span>Phone: {s.client_phone}</span>}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* View Details / Selection Button */}
                  <button
                    onClick={() => setViewSession(s)}
                    style={{
                      backgroundColor: isSubmitted ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                      border: isSubmitted ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.12)',
                      color: isSubmitted ? '#10b981' : '#fff',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    👁️ {isSubmitted ? `View Picks (${s.selected_pose_ids.length + s.selected_reel_ids.length})` : 'Preview'}
                  </button>

                  {/* Assign to Today's Shoot (if submitted) */}
                  {isSubmitted && s.selected_pose_ids.length > 0 && (
                    <button
                      onClick={() => handleAssignToTodayShoot(s)}
                      style={{
                        backgroundColor: '#D4AF37',
                        color: '#000',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                      title="Directly merge these client chosen poses into Today's Shoot for photographers"
                    >
                      🎯 Push to Today Shoot
                    </button>
                  )}

                  {/* Share on WhatsApp */}
                  <button
                    onClick={() => handleShareWhatsApp(s)}
                    style={{
                      backgroundColor: '#25D366',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    💬 WhatsApp Link
                  </button>

                  {/* Copy Link */}
                  <button
                    onClick={() => handleCopyLink(s.token)}
                    style={{
                      backgroundColor: 'rgba(212,175,55,0.1)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: '#D4AF37',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                    title="Copy direct link to clipboard"
                  >
                    📋 Copy
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(s.id, s.client_name)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#ef4444',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    title="Delete Link"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW LINK MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowCreateModal(false)}>
          <div style={{ backgroundColor: '#111118', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.9)' }} onClick={e => e.stopPropagation()}>
            
            {/* If Just Created, Show Success / Copy screen */}
            {createdSession ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
                  <h2 style={{ fontSize: '20px', color: '#D4AF37', margin: '0 0 6px 0' }}>Client Link Created!</h2>
                  <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>
                    Link for <strong>{createdSession.client_name}</strong> is ready to share.
                  </p>
                </div>

                <div style={{ backgroundColor: '#0a0a0f', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/select/${createdSession.token}`}
                    style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: '#D4AF37', fontSize: '12px', outline: 'none' }}
                  />
                  <button
                    onClick={() => handleCopyLink(createdSession.token)}
                    style={{ backgroundColor: '#D4AF37', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Copy Link
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleShareWhatsApp(createdSession)}
                    style={{ flex: 1, backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    💬 Send to Client on WhatsApp
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa', padding: '12px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSession}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#D4AF37' }}>
                    + New Client Selection Link
                  </h2>
                  <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '6px' }}>Client Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ayesha & Bilal"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '6px' }}>Event Type</label>
                      <select
                        value={eventType}
                        onChange={e => setEventType(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none' }}
                      >
                        <option value="Barat">Barat</option>
                        <option value="Mehndi">Mehndi</option>
                        <option value="Walima">Walima</option>
                        <option value="Nikah">Nikah</option>
                        <option value="Mayun">Mayun</option>
                        <option value="Engagement">Engagement</option>
                        <option value="All">All Events</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '6px' }}>Event Date (Optional)</label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={e => setEventDate(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '6px' }}>Client Phone (WhatsApp)</label>
                      <input
                        type="tel"
                        placeholder="e.g. 03001234567"
                        value={clientPhone}
                        onChange={e => setClientPhone(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '6px' }}>Link Expiry (Days)</label>
                      <select
                        value={expiryDays}
                        onChange={e => setExpiryDays(Number(e.target.value))}
                        style={{ width: '100%', backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none' }}
                      >
                        <option value={3}>3 Days</option>
                        <option value={7}>7 Days (Recommended)</option>
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days</option>
                        <option value={0}>Never Expire</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '6px' }}>
                      Instructions / Note for Client (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Please choose 15 poses and 3 reels you love for your Barat shoot."
                      value={notesForClient}
                      onChange={e => setNotesForClient(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ backgroundColor: '#D4AF37', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(212,175,55,0.35)' }}
                  >
                    Generate Link & Share
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* VIEW / MANAGE CLIENT SELECTION MODAL */}
      {viewSession && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setViewSession(null)}>
          <div style={{ backgroundColor: '#111118', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '16px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.9)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#D4AF37' }}>
                  {viewSession.client_name}&apos;s Selection
                </h2>
                <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0 0' }}>
                  Event: {viewSession.event_type} {viewSession.event_date ? `(${viewSession.event_date})` : ''} · Status: {viewSession.status.toUpperCase()}
                </p>
              </div>
              <button onClick={() => setViewSession(null)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Client Notes if any */}
            {viewSession.client_notes && (
              <div style={{ backgroundColor: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '8px', padding: '12px', marginBottom: '18px', fontSize: '13px', color: '#fff' }}>
                <strong style={{ color: '#D4AF37' }}>Client Special Requests:</strong> &ldquo;{viewSession.client_notes}&rdquo;
              </div>
            )}

            {/* Selected Poses Grid */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>
                📸 Selected Poses ({viewSession.selected_pose_ids.length})
              </div>
              {viewSession.selected_pose_ids.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>Client has not selected any poses yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                  {viewSession.selected_pose_ids.map(id => {
                    const p = poses.find(item => item.id === id);
                    if (!p) return null;
                    return (
                      <div key={id} style={{ backgroundColor: '#0a0a0f', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={p.image_url} alt={p.title} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }} />
                        <div style={{ padding: '6px', fontSize: '10px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Reels Grid */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>
                🔥 Selected Reels ({viewSession.selected_reel_ids.length})
              </div>
              {viewSession.selected_reel_ids.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>Client has not selected any reels yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                  {viewSession.selected_reel_ids.map(id => {
                    const r = reels.find(item => item.id === id);
                    if (!r) return null;
                    const cover = formatOptimizedCoverUrl(r.video_url, r.cover_image);
                    return (
                      <div key={id} style={{ backgroundColor: '#0a0a0f', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={cover} alt={r.title} style={{ width: '100%', aspectRatio: '9/16', objectFit: 'cover' }} />
                        <div style={{ padding: '6px', fontSize: '10px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleCopyLink(viewSession.token)}
                style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa', padding: '10px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📋 Copy Client Link
              </button>
              {viewSession.selected_pose_ids.length > 0 && (
                <button
                  onClick={() => handleAssignToTodayShoot(viewSession)}
                  style={{ backgroundColor: '#D4AF37', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  🎯 Push to Today Shoot
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
