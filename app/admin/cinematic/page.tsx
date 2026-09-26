'use client';

import { useState, useEffect } from 'react';
import { 
  getCinematicDB, 
  saveCinematicDB, 
  addCinematicDB, 
  updateCinematicDB, 
  deleteCinematicDB, 
  fetchCinematicCloud 
} from '@/lib/poses-db-helpers';
import { CinematicShot } from '@/lib/types';
import { EVENTS } from '@/lib/constants';

// SVG Icons
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default function AdminCinematic() {
  const [shots, setShots] = useState<CinematicShot[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cameraMovement, setCameraMovement] = useState('');
  const [framing, setFraming] = useState('');
  const [event, setEvent] = useState('Mehndi');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [tagsInput, setTagsInput] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setShots(getCinematicDB());
    fetchCinematicCloud().then(cloudShots => {
      if (cloudShots && cloudShots.length > 0) {
        setShots(cloudShots);
      }
    }).catch(() => {});
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCameraMovement('');
    setFraming('');
    setEvent('Mehndi');
    setOrientation('portrait');
    setTagsInput('');
    setMediaUrl('');
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (shot: CinematicShot) => {
    setEditingId(shot.id);
    setTitle(shot.title);
    setDescription(shot.description);
    setCameraMovement(shot.camera_movement || '');
    setFraming(shot.framing || '');
    setEvent(shot.event || 'Mehndi');
    setOrientation(shot.orientation || 'portrait');
    setTagsInput(shot.tags ? shot.tags.join(', ') : '');
    setMediaUrl(shot.media_url || '');
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this cinematic shot?')) {
      const updated = deleteCinematicDB(id);
      setShots(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Title is required');

    const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    let updated: CinematicShot[];

    if (editingId) {
      updated = updateCinematicDB(editingId, {
        title: title.trim(),
        description: description.trim(),
        camera_movement: cameraMovement.trim() || undefined,
        framing: framing.trim() || undefined,
        event: event || undefined,
        orientation,
        tags: tagsArray,
        media_url: mediaUrl.trim() || undefined
      });
    } else {
      const newShot: CinematicShot = {
        id: `cs_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        camera_movement: cameraMovement.trim() || undefined,
        framing: framing.trim() || undefined,
        event: event || undefined,
        orientation,
        tags: tagsArray,
        media_url: mediaUrl.trim() || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
        created_at: new Date().toISOString()
      };
      updated = addCinematicDB(newShot);
    }

    setShots(updated);
    setShowForm(false);
    resetForm();
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
            Cinematic Shots Management
          </h1>
          <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0 0' }}>
            Manage video movement guides and positioning framing for wedding films
          </p>
        </div>
        <button onClick={handleOpenAdd} style={{ backgroundColor: '#D4AF37', color: '#000', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <PlusIcon /> Add Cinematic Shot
        </button>
      </div>

      {/* Grid of Cinematic Shots */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {shots.map((shot) => {
          const isPortrait = (shot.orientation || 'portrait') === 'portrait';
          return (
            <div key={shot.id} style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Aspect Ratio Video Framing Container */}
              <div style={{
                position: 'relative',
                width: '100%',
                paddingTop: isPortrait ? '135%' : '56.25%', // 9:16 portrait vs 16:9 landscape
                backgroundColor: '#0a0a0f',
                overflow: 'hidden'
              }}>
                <img 
                  src={shot.media_url || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800'} 
                  alt={shot.title} 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: '6px' }}>
                  {shot.event && (
                    <span style={{ backgroundColor: '#D4AF37', color: '#000', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {shot.event}
                    </span>
                  )}
                  <span style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '4px', fontSize: '10px' }}>
                    {isPortrait ? '📱 Portrait (9:16)' : '🖥️ Landscape (16:9)'}
                  </span>
                </div>
              </div>

              {/* Info Body */}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#fff', fontWeight: 'bold' }}>{shot.title}</h3>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#aaa', lineHeight: '1.4' }}>{shot.description}</p>
                  
                  {shot.camera_movement && (
                    <div style={{ fontSize: '11px', color: '#D4AF37', marginBottom: '4px' }}>
                      📹 Movement: {shot.camera_movement}
                    </div>
                  )}
                  {shot.framing && (
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px' }}>
                      📐 Framing: {shot.framing}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                  <button onClick={() => handleEdit(shot)} style={{ background: 'transparent', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EditIcon />
                  </button>
                  <button onClick={() => handleDelete(shot.id)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '24px', maxWidth: '440px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#D4AF37', margin: 0 }}>
                {editingId ? 'Edit Cinematic Shot' : 'Add New Cinematic Shot'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Shot Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Slow Motion Groom Entry Orbit" 
                  required 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Event Category</label>
                  <select 
                    value={event} 
                    onChange={e => setEvent(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    {EVENTS.map(ev => (
                      <option key={ev} value={ev}>{ev}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Video Positioning</label>
                  <select 
                    value={orientation} 
                    onChange={e => setOrientation(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="portrait">📱 Portrait Reel (9:16 Vertical)</option>
                    <option value="landscape">🖥️ Landscape Film (16:9 Horizontal)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Camera Movement & Framing</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input 
                    type="text" 
                    value={cameraMovement} 
                    onChange={e => setCameraMovement(e.target.value)} 
                    placeholder="Movement e.g. Gimbal Orbit" 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  <input 
                    type="text" 
                    value={framing} 
                    onChange={e => setFraming(e.target.value)} 
                    placeholder="Framing e.g. Close Up 50mm" 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Media / Video Thumbnail URL</label>
                <input 
                  type="url" 
                  value={mediaUrl} 
                  onChange={e => setMediaUrl(e.target.value)} 
                  placeholder="https://images.unsplash.com/photo..." 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Instructions / Description</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Describe camera movement and speed..." 
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  Cancel
                </button>
                <button type="submit" style={{ background: '#D4AF37', border: 'none', color: '#000', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                  Save Shot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
