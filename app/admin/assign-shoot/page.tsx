'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Pose } from '@/lib/types';
import { getPosesDB } from '@/lib/poses-db-helpers';
import { getUsersDB, UserAccount, getRoleBadgeInfo } from '@/lib/auth-helpers';
import { 
  createAssignment, 
  getAssignmentsDB, 
  ShootAssignment, 
  fetchAssignmentsCloud 
} from '@/lib/assignment-helpers';

export default function AdminAssignShootPage() {
  const [poses, setPoses] = useState<Pose[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [assignments, setAssignments] = useState<ShootAssignment[]>([]);
  
  // Selection & Form State
  const [selectedPoseIds, setSelectedPoseIds] = useState<string[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [eventTitle, setEventTitle] = useState('Mehndi / Wedding Shoot');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Filters for Poses Selection
  const [search, setSearch] = useState('');
  const [filterEvent, setFilterEvent] = useState('All');

  useEffect(() => {
    const p = getPosesDB();
    setPoses(p);

    const u = getUsersDB().filter(usr => usr.role !== 'admin' && usr.active);
    setUsers(u);
    if (u.length > 0) {
      setTargetUserId(u[0].id);
    }

    setAssignments(getAssignmentsDB());
    fetchAssignmentsCloud().then(cloudAsg => {
      if (cloudAsg && cloudAsg.length > 0) setAssignments(cloudAsg);
    });
  }, []);

  const togglePoseSelection = (id: string) => {
    setSelectedPoseIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredPoses.map(p => p.id);
    setSelectedPoseIds(Array.from(new Set([...selectedPoseIds, ...ids])));
  };

  const clearSelection = () => {
    setSelectedPoseIds([]);
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      alert('Please select a team member to assign.');
      return;
    }
    if (selectedPoseIds.length === 0) {
      alert('Please select at least 1 pose/shot to assign.');
      return;
    }

    const targetUser = users.find(u => u.id === targetUserId);
    if (!targetUser) return;

    setIsSubmitting(true);
    const newAsg = createAssignment({
      title: eventTitle.trim() || 'Today Shoot Assignment',
      assigned_by_name: 'Admin',
      target_user_id: targetUser.id,
      target_user_name: targetUser.name,
      pose_ids: selectedPoseIds,
      event_name: eventTitle.trim(),
      notes: notes.trim(),
    });

    setAssignments(getAssignmentsDB());
    setSuccessMsg(`🚀 Successfully dispatched ${selectedPoseIds.length} shots to ${targetUser.name}!`);
    setSelectedPoseIds([]);
    setNotes('');
    setIsSubmitting(false);

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const filteredPoses = poses.filter(p => {
    if (filterEvent !== 'All') {
      const pEvents = p.events || [];
      if (!pEvents.includes(filterEvent)) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return p.title.toLowerCase().includes(s) || (p.instructions && p.instructions.toLowerCase().includes(s));
    }
    return true;
  });

  const availableEvents = ['All', 'Mehndi', 'Barat', 'Walima', 'Nikah', 'Reception', 'Pre-Wedding', 'General'];

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎯 Assign Today&apos;s Shoot
          </h1>
          <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0 0' }}>
            Select reference shots and dispatch them directly to a photographer or cinematographer. When they open the app, they can accept and merge or replace their Today&apos;s Shoot.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link 
            href="/admin/poses" 
            style={{ 
              backgroundColor: '#1a1a24', 
              color: '#ccc', 
              padding: '10px 16px', 
              borderRadius: '8px', 
              fontSize: '13px', 
              textDecoration: 'none', 
              border: '1px solid #333' 
            }}
          >
            ← Back to Poses
          </Link>
        </div>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', padding: '14px 20px', borderRadius: '8px', marginBottom: '20px', fontWeight: '600', fontSize: '14px' }}>
          {successMsg}
        </div>
      )}

      {/* Main Grid: Form Left, Poses Selection Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left: Dispatch Panel */}
        <div style={{ backgroundColor: '#12121a', border: '1px solid #222', borderRadius: '12px', padding: '20px', position: 'sticky', top: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📤 Dispatch Parameters
          </h2>

          <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Target User */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#aaa', marginBottom: '6px' }}>
                Assign To Team Member *
              </label>
              <select
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#1a1a26', border: '1px solid #333', color: '#fff', fontSize: '13px' }}
                required
              >
                {users.map(u => {
                  const b = getRoleBadgeInfo(u.role);
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} ({b.label}) - @{u.username || u.email.split('@')[0]}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Event Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#aaa', marginBottom: '6px' }}>
                Shoot / Event Title
              </label>
              <input 
                type="text" 
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                placeholder="e.g. Mehndi - Hassaam & Bushra" 
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#1a1a26', border: '1px solid #333', color: '#fff', fontSize: '13px' }}
              />
            </div>

            {/* Instructions / Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#aaa', marginBottom: '6px' }}>
                Special Instructions / Notes for User
              </label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Please capture these couple shots right after the bridal entry. Maintain low angle on twirl shots."
                rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#1a1a26', border: '1px solid #333', color: '#fff', fontSize: '13px', resize: 'vertical' }}
              />
            </div>

            {/* Selection Status Box */}
            <div style={{ backgroundColor: '#1a1a26', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Selected Shots:</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#D4AF37' }}>{selectedPoseIds.length} Poses</div>
              </div>
              {selectedPoseIds.length > 0 && (
                <button 
                  type="button" 
                  onClick={clearSelection} 
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear All
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || selectedPoseIds.length === 0}
              style={{
                backgroundColor: selectedPoseIds.length > 0 ? '#D4AF37' : '#333',
                color: selectedPoseIds.length > 0 ? '#000' : '#888',
                fontWeight: '700',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: selectedPoseIds.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                boxShadow: selectedPoseIds.length > 0 ? '0 4px 15px rgba(212,175,55,0.3)' : 'none'
              }}
            >
              {isSubmitting ? 'Dispatching...' : `🚀 Dispatch Assignment (${selectedPoseIds.length})`}
            </button>
          </form>
        </div>

        {/* Right: Pose Selector */}
        <div>
          {/* Filter Bar */}
          <div style={{ backgroundColor: '#12121a', border: '1px solid #222', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search reference poses by title, keyword..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: '1', minWidth: '220px', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#1a1a26', border: '1px solid #333', color: '#fff', fontSize: '13px' }}
              />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  style={{ backgroundColor: '#1a1a26', border: '1px solid #444', color: '#ccc', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Select All ({filteredPoses.length})
                </button>
              </div>
            </div>

            {/* Event Category Tabs */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingTop: '12px' }}>
              {availableEvents.map(ev => (
                <button
                  key={ev}
                  type="button"
                  onClick={() => setFilterEvent(ev)}
                  style={{
                    backgroundColor: filterEvent === ev ? '#D4AF37' : '#1a1a26',
                    color: filterEvent === ev ? '#000' : '#888',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>

          {/* Pose Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px' }}>
            {filteredPoses.map(pose => {
              const isSelected = selectedPoseIds.includes(pose.id);
              return (
                <div
                  key={pose.id}
                  onClick={() => togglePoseSelection(pose.id)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(212,175,55,0.12)' : '#12121a',
                    border: isSelected ? '2px solid #D4AF37' : '1px solid #222',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  {/* Checkbox indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    zIndex: 2,
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? '#D4AF37' : 'rgba(0,0,0,0.6)',
                    border: isSelected ? 'none' : '1px solid #666',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    {isSelected ? '✓' : ''}
                  </div>

                  <div style={{ height: '160px', width: '100%', position: 'relative', backgroundColor: '#0a0a0f' }}>
                    <img 
                      src={pose.image_url} 
                      alt={pose.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>

                  <div style={{ padding: '10px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 4px 0', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pose.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(pose.events || []).slice(0, 1).map(e => (
                        <span key={e} style={{ fontSize: '10px', backgroundColor: '#1a1a26', color: '#D4AF37', padding: '2px 6px', borderRadius: '4px' }}>
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* History of Dispatched Assignments */}
      <div style={{ marginTop: '40px', backgroundColor: '#12121a', border: '1px solid #222', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#D4AF37', margin: '0 0 16px 0' }}>
          📜 Dispatched Shoot Assignments History
        </h2>
        {assignments.length === 0 ? (
          <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>No assignments dispatched yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                  <th style={{ padding: '10px' }}>Event / Title</th>
                  <th style={{ padding: '10px' }}>Target User</th>
                  <th style={{ padding: '10px' }}>Shots Count</th>
                  <th style={{ padding: '10px' }}>Notes</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Dispatched Date</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => {
                  let statusBadge = { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', text: 'Pending' };
                  if (a.status === 'accepted_merged') statusBadge = { color: '#10b981', bg: 'rgba(16,185,129,0.1)', text: 'Accepted (Merged)' };
                  if (a.status === 'accepted_replaced') statusBadge = { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', text: 'Accepted (Replaced)' };
                  if (a.status === 'dismissed') statusBadge = { color: '#888', bg: 'rgba(255,255,255,0.05)', text: 'Dismissed' };

                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '10px', fontWeight: '600', color: '#fff' }}>{a.title}</td>
                      <td style={{ padding: '10px', color: '#D4AF37' }}>{a.target_user_name}</td>
                      <td style={{ padding: '10px' }}>{a.pose_ids.length} shots</td>
                      <td style={{ padding: '10px', color: '#aaa', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.notes || '—'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ color: statusBadge.color, backgroundColor: statusBadge.bg, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                          {statusBadge.text}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: '#666' }}>
                        {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
