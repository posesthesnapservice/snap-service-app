'use client';

import { useState, useEffect } from 'react';
import { getTrendingReelsDB, saveTrendingReelsDB, addTrendingReelDB, updateTrendingReelDB, deleteTrendingReelDB, uploadMediaToSupabase } from '@/lib/poses-db-helpers';
import { TrendingReel, PoseStatus } from '@/lib/types';
import { REEL_EVENTS } from '@/lib/constants';
import { lastCloudinaryError } from '@/lib/cloudinary';

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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default function AdminTrendingReels() {
  const [reels, setReels] = useState<TrendingReel[]>([]);
  const [filterEvent, setFilterEvent] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<{
    title: string;
    description: string;
    video_url: string;
    cover_image: string;
    event: string;
    orientation: 'portrait' | 'landscape';
    status: PoseStatus;
    tags: string;
  }>({
    title: '',
    description: '',
    video_url: '',
    cover_image: '',
    event: 'Mehndi',
    orientation: 'portrait',
    status: 'published',
    tags: '',
  });

  useEffect(() => {
    setReels(getTrendingReelsDB());
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      video_url: '',
      cover_image: '',
      event: 'Mehndi',
      orientation: 'portrait',
      status: 'published',
      tags: '',
    });
    setShowModal(true);
  };

  const startEdit = (reel: TrendingReel) => {
    setEditingId(reel.id);
    setForm({
      title: reel.title,
      description: reel.description || '',
      video_url: reel.video_url || '',
      cover_image: reel.cover_image || '',
      event: reel.event,
      orientation: reel.orientation || 'portrait',
      status: reel.status,
      tags: (reel.tags || []).join(', '),
    });
    setShowModal(true);
  };

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);

    // Try Cloudinary (25GB) or Supabase Storage upload
    const publicUrl = await uploadMediaToSupabase(file, 'reels-videos');
    if (publicUrl) {
      setForm(prev => ({ ...prev, video_url: publicUrl }));
      setUploadingVideo(false);
      return;
    }

    setUploadingVideo(false);
    const reason = lastCloudinaryError || 'Upload failed';
    alert(`⚠️ Video Upload Failed: ${reason}\n\nKyunki Cloudinary par aapka preset 'poses preset' abhi 'Signed' mode par hai!\n\nHal: Cloudinary Settings -> Upload presets mein ja kar 'poses preset' par click karein aur Signing Mode ko 'Unsigned' karke Save karein.`);
  };

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);

    const publicUrl = await uploadMediaToSupabase(file, 'reels-covers');
    if (publicUrl) {
      setForm(prev => ({ ...prev, cover_image: publicUrl }));
      setUploadingCover(false);
      return;
    }

    setUploadingCover(false);
    const reason = lastCloudinaryError || 'Upload failed';
    alert(`⚠️ Cover Image Upload Failed: ${reason}\n\nPlease check Cloudinary preset settings (must be 'Unsigned').`);
  };

  const toggleStatus = (id: string, currentStatus: PoseStatus) => {
    const nextStatus: PoseStatus = currentStatus === 'published' ? 'hidden' : 'published';
    const updated = updateTrendingReelDB(id, { status: nextStatus });
    setReels(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this trending reel?')) {
      const updated = deleteTrendingReelDB(id);
      setReels(updated);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return alert('Please enter a reel title');

    const tagList = form.tags.split(',').map(t => t.trim()).filter(Boolean);

    if (editingId) {
      const updated = updateTrendingReelDB(editingId, {
        title: form.title.trim(),
        description: form.description.trim(),
        video_url: form.video_url.trim() || undefined,
        cover_image: form.cover_image.trim() || undefined,
        event: form.event,
        orientation: form.orientation,
        status: form.status,
        tags: tagList,
      });
      setReels(updated);
    } else {
      const created: TrendingReel = {
        id: `tr_${Date.now()}`,
        title: form.title.trim(),
        description: form.description.trim(),
        video_url: form.video_url.trim() || 'https://assets.mixkit.co/videos/preview/mixkit-bride-and-groom-walking-in-a-park-41221-large.mp4',
        cover_image: form.cover_image.trim() || 'https://images.unsplash.com/photo-1519741347686-cfcbf6bde2af?w=800',
        event: form.event,
        orientation: form.orientation,
        status: form.status,
        tags: tagList,
        created_at: new Date().toISOString(),
      };
      const updated = addTrendingReelDB(created);
      setReels(updated);
    }

    setShowModal(false);
  };

  const filteredReels = reels.filter(r => {
    if (filterEvent !== 'All' && r.event !== filterEvent) return false;
    return true;
  });

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#D4AF37' }}>
            🔥 Trending Reels Management
          </h1>
          <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0 0' }}>
            Post and upload viral wedding reels (Mehndi, Barat, Walima, Nikah, Mayun, Dholki)
          </p>
        </div>
        <button onClick={openAddModal} style={{ backgroundColor: '#D4AF37', color: '#000', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <PlusIcon /> Post Trending Reel
        </button>
      </div>

      {/* Event Category Filters */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px' }}>
        {REEL_EVENTS.map((ev) => (
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

      {/* Reels Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {filteredReels.map((reel) => {
          const isPortrait = (reel.orientation || 'portrait') === 'portrait';
          return (
            <div key={reel.id} style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Media Container with Aspect Ratio positioning */}
              <div style={{ 
                position: 'relative', 
                width: '100%', 
                paddingTop: isPortrait ? '140%' : '56.25%', // 9:16 portrait vs 16:9 landscape
                backgroundColor: '#0a0a0f',
                overflow: 'hidden'
              }}>
                {reel.video_url ? (
                  <video 
                    src={reel.video_url} 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    poster={reel.cover_image}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img 
                    src={reel.cover_image || 'https://images.unsplash.com/photo-1519741347686-cfcbf6bde2af?w=800'} 
                    alt={reel.title} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: '6px' }}>
                  <span style={{ background: '#D4AF37', color: '#000', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    {reel.event}
                  </span>
                  <span style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '4px', fontSize: '10px' }}>
                    {isPortrait ? '📱 Portrait (9:16)' : '🖥️ Landscape (16:9)'}
                  </span>
                </div>
              </div>

              {/* Body Info */}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#fff', fontWeight: 'bold' }}>{reel.title}</h3>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#aaa', lineHeight: '1.4' }}>{reel.description}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                  <button
                    onClick={() => toggleStatus(reel.id, reel.status)}
                    style={{
                      border: '1px solid',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      color: reel.status === 'published' ? '#10b981' : '#ef4444',
                      background: reel.status === 'published' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                      borderColor: reel.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    }}
                  >
                    {reel.status === 'published' ? 'PUBLISHED' : 'HIDDEN'}
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => startEdit(reel)} style={{ background: 'transparent', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <EditIcon />
                    </button>
                    <button onClick={() => handleDelete(reel.id)} style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Post / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '24px', maxWidth: '480px', width: '100%', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#D4AF37', margin: 0 }}>
                {editingId ? 'Edit Trending Reel' : 'Post Trending Reel'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Reel Title</label>
                <input 
                  type="text" 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  placeholder="e.g. Vibrant Mehndi Dance Reel" 
                  required 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Event Category</label>
                  <select 
                    value={form.event} 
                    onChange={e => setForm({ ...form, event: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    {REEL_EVENTS.filter(e => e !== 'All').map(ev => (
                      <option key={ev} value={ev}>{ev}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Video Positioning</label>
                  <select 
                    value={form.orientation} 
                    onChange={e => setForm({ ...form, orientation: e.target.value as any })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="portrait">📱 Portrait Reel (9:16 Vertical)</option>
                    <option value="landscape">🖥️ Landscape Film (16:9 Horizontal)</option>
                  </select>
                </div>
              </div>

              {/* Direct Video File Upload or URL */}
              <div style={{ background: '#0a0a0f', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#D4AF37', marginBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  📹 Video File (Upload File OR Paste Link)
                </label>
                
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', background: '#D4AF37', color: '#000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                    📁 Choose Video File from Device...
                    <input type="file" accept="video/*" onChange={handleVideoFileUpload} style={{ display: 'none' }} />
                  </label>
                  {form.video_url && form.video_url.startsWith('data:') && (
                    <span style={{ fontSize: '11px', color: '#10b981', marginLeft: '8px' }}>✓ Video file selected</span>
                  )}
                </div>

                <input 
                  type="text" 
                  value={form.video_url} 
                  onChange={e => setForm({ ...form, video_url: e.target.value })} 
                  placeholder="Or paste video URL (https://example.com/video.mp4)" 
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Direct Cover Image Upload or URL */}
              <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', textTransform: 'uppercase' }}>
                  🖼️ Cover Thumbnail (Upload File OR Paste Link)
                </label>
                
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                    📁 Choose Cover Image File...
                    <input type="file" accept="image/*" onChange={handleCoverFileUpload} style={{ display: 'none' }} />
                  </label>
                  {form.cover_image && form.cover_image.startsWith('data:') && (
                    <span style={{ fontSize: '11px', color: '#10b981', marginLeft: '8px' }}>✓ Cover image selected</span>
                  )}
                </div>

                <input 
                  type="text" 
                  value={form.cover_image} 
                  onChange={e => setForm({ ...form, cover_image: e.target.value })} 
                  placeholder="Or paste cover image URL (https://images.unsplash.com/...)" 
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Description / Guide</label>
                <textarea 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  placeholder="Describe framing, slow-motion speed, flower rain instructions..." 
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  Cancel
                </button>
                <button type="submit" style={{ background: '#D4AF37', border: 'none', color: '#000', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                  Save & Publish Reel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
