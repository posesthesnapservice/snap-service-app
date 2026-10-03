'use client';

import React, { useState, useEffect } from 'react';
import { 
  getDirectionalShootsDB, 
  saveDirectionalShootsDB, 
  addDirectionalShootDB, 
  updateDirectionalShootDB, 
  deleteDirectionalShootDB, 
  deleteDirectionalShootsBulkDB, 
  fetchDirectionalShootsCloud,
  uploadMediaToSupabase 
} from '@/lib/poses-db-helpers';
import { DirectionalShoot, PoseStatus } from '@/lib/types';
import { REEL_EVENTS } from '@/lib/constants';

interface ShootFormState {
  id?: string;
  title: string;
  description: string;
  media_url: string;
  cover_image: string;
  director_notes: string;
  camera_angle: string;
  movement: string;
  events: string[];
  orientation: 'portrait' | 'landscape';
  status: PoseStatus;
  tags: string;
}

export default function AdminDirectionalShoots() {
  const [shoots, setShoots] = useState<DirectionalShoot[]>([]);
  const [filterEvent, setFilterEvent] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [form, setForm] = useState<ShootFormState>({
    title: '',
    description: '',
    media_url: '',
    cover_image: '',
    director_notes: '',
    camera_angle: 'Low Angle 45°',
    movement: 'Slow Walking Track',
    events: ['Mehndi'],
    orientation: 'portrait',
    status: 'published',
    tags: ''
  });

  const handleManualSync = async () => {
    setSyncing(true);
    const cloud = await fetchDirectionalShootsCloud();
    if (cloud && cloud.length > 0) {
      setShoots(cloud);
    }
    setTimeout(() => setSyncing(false), 600);
  };

  useEffect(() => {
    setShoots(getDirectionalShootsDB());
    fetchDirectionalShootsCloud().then(cloud => {
      if (cloud && cloud.length > 0) setShoots(cloud);
    });
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      media_url: '',
      cover_image: '',
      director_notes: '',
      camera_angle: 'Low Angle 45°',
      movement: 'Slow Walking Track',
      events: ['Mehndi'],
      orientation: 'portrait',
      status: 'published',
      tags: ''
    });
    setShowModal(true);
  };

  const startEdit = (item: DirectionalShoot) => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      title: item.title,
      description: item.description || '',
      media_url: item.media_url || '',
      cover_image: item.cover_image || '',
      director_notes: item.director_notes || '',
      camera_angle: item.camera_angle || '',
      movement: item.movement || '',
      events: item.events || (item.event ? [item.event] : ['General']),
      orientation: item.orientation || 'portrait',
      status: item.status || 'published',
      tags: item.tags?.join(', ') || ''
    });
    setShowModal(true);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const publicUrl = await uploadMediaToSupabase(file, 'directional-shoots');
    setUploading(false);
    if (publicUrl) {
      const isVideo = file.type.startsWith('video/');
      setForm(prev => ({
        ...prev,
        media_url: publicUrl,
        cover_image: isVideo ? publicUrl.replace(/\.[^.]+$/, '.jpg') : publicUrl
      }));
    } else {
      alert('Upload failed. Please check network or cloud settings.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return alert('Please enter a title');

    const tagList = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const chosenEvents = form.events.length > 0 ? form.events : ['General'];

    if (editingId) {
      const updated = updateDirectionalShootDB(editingId, {
        title: form.title.trim(),
        description: form.description.trim(),
        media_url: form.media_url,
        cover_image: form.cover_image,
        director_notes: form.director_notes.trim(),
        camera_angle: form.camera_angle.trim(),
        movement: form.movement.trim(),
        event: chosenEvents[0],
        events: chosenEvents,
        orientation: form.orientation,
        status: form.status,
        tags: tagList
      });
      setShoots(updated);
    } else {
      const newItem: DirectionalShoot = {
        id: `ds_${Date.now()}`,
        title: form.title.trim(),
        description: form.description.trim(),
        media_url: form.media_url,
        cover_image: form.cover_image,
        director_notes: form.director_notes.trim(),
        camera_angle: form.camera_angle.trim(),
        movement: form.movement.trim(),
        event: chosenEvents[0],
        events: chosenEvents,
        orientation: form.orientation,
        status: form.status,
        tags: tagList,
        created_at: new Date().toISOString()
      };
      const updated = addDirectionalShootDB(newItem);
      setShoots(updated);
    }

    setShowModal(false);
  };

  const toggleStatus = (id: string, currentStatus?: PoseStatus) => {
    const nextStatus: PoseStatus = currentStatus === 'published' ? 'hidden' : 'published';
    const updated = updateDirectionalShootDB(id, { status: nextStatus });
    setShoots(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this directional shoot?')) {
      const updated = deleteDirectionalShootDB(id);
      setShoots(updated);
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (filtered.length === 0) return;
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(s => s.id));
    }
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected directional shoot(s)?`)) {
      const updated = deleteDirectionalShootsBulkDB(selectedIds);
      setShoots(updated);
      setSelectedIds([]);
    }
  };

  const filtered = shoots.filter(s => {
    if (filterEvent === 'All') return true;
    const shootEvents = s.events || (s.event ? s.event.split(',').map((x: string) => x.trim()) : []);
    return shootEvents.includes(filterEvent) || s.event === filterEvent;
  });

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff', paddingBottom: '40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🧭 Directional Shoots Management
          </h1>
          <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0 0' }}>
            Curate vocal director cues, pacing instructions &amp; camera movement angles
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={handleManualSync}
            style={{
              backgroundColor: 'rgba(212,175,55,0.12)',
              color: '#D4AF37',
              border: '1px solid rgba(212,175,55,0.3)',
              padding: '11px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ display: 'inline-block', transform: syncing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s' }}>🔄</span>
            {syncing ? 'Syncing...' : 'Sync Cloud'}
          </button>
          <button 
            onClick={openAddModal} 
            style={{ 
              backgroundColor: '#D4AF37', 
              color: '#000', 
              padding: '11px 20px', 
              borderRadius: '8px', 
              fontWeight: '700', 
              fontSize: '13px', 
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(212,175,55,0.3)'
            }}
          >
            + Add Directional Shoot
          </button>
        </div>
      </div>

      {/* Event Category Filters */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px' }}>
        {['All', ...REEL_EVENTS].map(ev => (
          <button
            key={ev}
            onClick={() => setFilterEvent(ev)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              border: '1px solid',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: filterEvent === ev ? '#D4AF37' : 'rgba(255,255,255,0.04)',
              color: filterEvent === ev ? '#000' : '#aaa',
              borderColor: filterEvent === ev ? '#D4AF37' : 'rgba(255,255,255,0.1)',
            }}
          >
            {ev}
          </button>
        ))}
      </div>

      {/* Multi-Selection Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 18px',
        backgroundColor: selectedIds.length > 0 ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)',
        border: selectedIds.length > 0 ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        marginBottom: '20px',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#fff' }}>
            <input 
              type="checkbox" 
              checked={filtered.length > 0 && selectedIds.length === filtered.length}
              onChange={toggleSelectAll}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#D4AF37' }}
            />
            <span>Select All ({filtered.length})</span>
          </label>
          {selectedIds.length > 0 && (
            <span style={{ 
              backgroundColor: '#D4AF37', 
              color: '#000', 
              padding: '3px 10px', 
              borderRadius: '12px', 
              fontSize: '11px', 
              fontWeight: '700' 
            }}>
              {selectedIds.length} Selected
            </span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setSelectedIds([])}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#aaa',
                padding: '7px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Clear Selection
            </button>
            <button
              onClick={deleteSelected}
              style={{
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 12px rgba(239,68,68,0.35)'
              }}
            >
              🗑️ Delete Selected ({selectedIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Grid of Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
        {filtered.map(shoot => {
          const isSelected = selectedIds.includes(shoot.id);
          const shootEvents = shoot.events || (shoot.event ? shoot.event.split(',').map((x: string) => x.trim()) : ['General']);

          return (
            <div 
              key={shoot.id}
              style={{
                backgroundColor: '#111118',
                border: isSelected ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: isSelected ? '0 0 16px rgba(212,175,55,0.25)' : 'none',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border 0.15s, box-shadow 0.15s'
              }}
            >
              {/* Media Container */}
              <div style={{ position: 'relative', width: '100%', paddingTop: '80%', backgroundColor: '#0a0a0f', overflow: 'hidden' }}>
                {/* Select Checkbox */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(shoot.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 15,
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    backgroundColor: isSelected ? '#D4AF37' : 'rgba(0,0,0,0.65)',
                    border: isSelected ? '2px solid #D4AF37' : '2px solid rgba(255,255,255,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    transition: 'all 0.15s ease'
                  }}
                  title={isSelected ? "Deselect" : "Select for bulk delete"}
                >
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>

                {shoot.media_url?.endsWith('.mp4') ? (
                  <video
                    src={shoot.media_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster={shoot.cover_image}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img 
                    src={shoot.cover_image || shoot.media_url || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800'}
                    alt={shoot.title}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}

                {/* Event badges */}
                <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '70%' }}>
                  {shootEvents.map((ev: string) => (
                    <span key={ev} style={{ background: '#D4AF37', color: '#000', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {ev}
                    </span>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#fff', fontWeight: 'bold' }}>{shoot.title}</h3>
                  {shoot.description && (
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#aaa', lineHeight: '1.4' }}>{shoot.description}</p>
                  )}

                  {/* Badges for angle & movement */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {shoot.camera_angle && (
                      <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                        📐 {shoot.camera_angle}
                      </span>
                    )}
                    {shoot.movement && (
                      <span style={{ background: 'rgba(192,132,252,0.15)', color: '#c084fc', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                        🎬 {shoot.movement}
                      </span>
                    )}
                  </div>

                  {shoot.director_notes && (
                    <div style={{ background: 'rgba(212,175,55,0.06)', borderLeft: '3px solid #D4AF37', padding: '8px 10px', borderRadius: '0 6px 6px 0', fontSize: '11px', color: '#D4AF37', fontStyle: 'italic', lineHeight: '1.4', marginBottom: '12px' }}>
                      🗣️ &ldquo;{shoot.director_notes}&rdquo;
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                  <button
                    onClick={() => toggleStatus(shoot.id, shoot.status)}
                    style={{
                      border: '1px solid',
                      borderRadius: '20px',
                      padding: '4px 10px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      color: shoot.status === 'published' ? '#10b981' : '#ef4444',
                      background: shoot.status === 'published' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                      borderColor: shoot.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    }}
                  >
                    {shoot.status === 'published' ? 'PUBLISHED' : 'HIDDEN'}
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => startEdit(shoot)} 
                      style={{ background: 'transparent', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(shoot.id)} 
                      style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#0d0d14', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#D4AF37' }}>
                {editingId ? 'Edit Directional Shoot' : 'Add New Directional Shoot'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Shoot Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. The Whisper Glance Direction"
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>🗣️ Exact Vocal Director Cue</label>
                <textarea
                  value={form.director_notes}
                  onChange={e => setForm({ ...form, director_notes: e.target.value })}
                  placeholder='e.g. Tell groom: "Whisper what you thought the very first second you saw her today."'
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(212,175,55,0.3)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Camera Angle</label>
                  <input
                    type="text"
                    value={form.camera_angle}
                    onChange={e => setForm({ ...form, camera_angle: e.target.value })}
                    placeholder="e.g. Low Angle 45°"
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Movement / Framing</label>
                  <input
                    type="text"
                    value={form.movement}
                    onChange={e => setForm({ ...form, movement: e.target.value })}
                    placeholder="e.g. Slow Walking Track"
                    style={{ width: '100%', padding: '9px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Media File (Video or Photo)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {uploading ? '⏳ Uploading...' : '📁 Choose File'}
                    <input type="file" accept="video/*,image/*" onChange={handleMediaUpload} style={{ display: 'none' }} disabled={uploading} />
                  </label>
                  <input
                    type="text"
                    value={form.media_url}
                    onChange={e => setForm({ ...form, media_url: e.target.value })}
                    placeholder="Or paste media URL"
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Description / Setup</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe lighting, background setup, or posing mechanics..."
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Applicable Events</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {REEL_EVENTS.map(ev => {
                    const isSelected = form.events.includes(ev);
                    return (
                      <button
                        type="button"
                        key={ev}
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            events: isSelected ? prev.events.filter(x => x !== ev) : [...prev.events, ev]
                          }));
                        }}
                        style={{
                          background: isSelected ? '#D4AF37' : 'rgba(255,255,255,0.05)',
                          color: isSelected ? '#000' : '#888',
                          border: isSelected ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.1)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {ev}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#aaa', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  style={{ background: '#D4AF37', border: 'none', color: '#000', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  💾 Save Directional Shoot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
