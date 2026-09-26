'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  getTrendingReelsDB, 
  saveTrendingReelsDB, 
  addTrendingReelDB, 
  updateTrendingReelDB, 
  deleteTrendingReelDB, 
  uploadMediaToSupabase, 
  fetchTrendingReelsCloud 
} from '@/lib/poses-db-helpers';
import { TrendingReel, PoseStatus } from '@/lib/types';
import { REEL_EVENTS } from '@/lib/constants';
import { lastCloudinaryError } from '@/lib/cloudinary';

// Available Event Categories for Multi-Selection
const AVAILABLE_EVENTS = [
  'Mehndi',
  'Barat',
  'Walima',
  'Nikah',
  'Reception',
  'Mayun',
  'Dholki',
  'Pre-Wedding',
  'Engagement',
  'General',
];

// Quick Title Suggestions
const QUICK_TITLES = [
  'Bride Entry Slow Motion',
  'Groom Sherwani Reveal',
  'Couple First Look',
  'Vibrant Mehndi Dance',
  'Ring Exchange Close-up',
  'Emotional Rukhsati Moment',
  'Couple Golden Hour Walk'
];

// Quick Tag Suggestions
const QUICK_TAGS = ['#SlowMo', '#BrideEntry', '#GroomWalk', '#ViralDance', '#MehndiReel', '#CoupleGoals', '#Editorial'];

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

interface ReelFormState {
  id?: string;
  title: string;
  description: string;
  video_url: string;
  cover_image: string;
  events: string[];
  orientation: 'portrait' | 'landscape';
  status: PoseStatus;
  tags: string;
  localPreviewUrl?: string;
  uploadStatus?: 'idle' | 'uploading' | 'done' | 'error';
  isPublished?: boolean;
  publishedId?: string;
  isMuted?: boolean;
}

export default function AdminTrendingReels() {
  const [reels, setReels] = useState<TrendingReel[]>([]);
  const [filterEvent, setFilterEvent] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State for Single Add / Edit
  const [form, setForm] = useState<ReelFormState>({
    title: '',
    description: '',
    video_url: '',
    cover_image: '',
    events: ['Mehndi'],
    orientation: 'portrait',
    status: 'published',
    tags: '',
    localPreviewUrl: '',
    uploadStatus: 'idle',
    isMuted: true
  });

  // Batch Queue for Multiple Videos: each item has its own separate preview & filling box
  const [batchQueue, setBatchQueue] = useState<ReelFormState[]>([]);

  const [uploadingGlobal, setUploadingGlobal] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  useEffect(() => {
    setReels(getTrendingReelsDB());
    fetchTrendingReelsCloud().then(cloudReels => {
      if (cloudReels && cloudReels.length > 0) setReels(cloudReels);
    });
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setBatchQueue([]);
    setForm({
      title: '',
      description: '',
      video_url: '',
      cover_image: '',
      events: ['Mehndi'],
      orientation: 'portrait',
      status: 'published',
      tags: '',
      localPreviewUrl: '',
      uploadStatus: 'idle',
      isMuted: true
    });
    setShowModal(true);
  };

  const startEdit = (reel: TrendingReel) => {
    setEditingId(reel.id);
    setBatchQueue([]);

    const reelEvents = (reel as any).events || (reel.event ? reel.event.split(',').map((s: string) => s.trim()) : ['General']);

    setForm({
      title: reel.title,
      description: reel.description || '',
      video_url: reel.video_url || '',
      cover_image: reel.cover_image || '',
      events: reelEvents.length > 0 ? reelEvents : ['General'],
      orientation: reel.orientation || 'portrait',
      status: reel.status,
      tags: (reel.tags || []).join(', '),
      localPreviewUrl: reel.video_url || '',
      uploadStatus: 'done',
      isMuted: true
    });
    setShowModal(true);
  };

  // Toggle Multiple Event Category Badges for Single Form
  const toggleFormEvent = (ev: string) => {
    setForm(prev => {
      const exists = prev.events.includes(ev);
      let updated: string[];
      if (exists) {
        updated = prev.events.filter(e => e !== ev);
        if (updated.length === 0) updated = ['General'];
      } else {
        updated = [...prev.events.filter(e => e !== 'General'), ev];
      }
      return { ...prev, events: updated };
    });
  };

  // Toggle Multiple Event Category Badges for specific Batch Item
  const toggleBatchEvent = (index: number, ev: string) => {
    setBatchQueue(prev => {
      const copy = [...prev];
      const item = copy[index];
      if (!item) return prev;
      const exists = item.events.includes(ev);
      let updated: string[];
      if (exists) {
        updated = item.events.filter(e => e !== ev);
        if (updated.length === 0) updated = ['General'];
      } else {
        updated = [...item.events.filter(e => e !== 'General'), ev];
      }
      copy[index] = { ...item, events: updated };
      return copy;
    });
  };

  // Update specific batch item fields
  const updateBatchItem = (index: number, partial: Partial<ReelFormState>) => {
    setBatchQueue(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], ...partial };
      }
      return copy;
    });
  };

  // Remove specific item from batch queue
  const removeBatchItem = (index: number) => {
    if (confirm(`Are you sure you want to remove Reel #${index + 1} from this batch?`)) {
      setBatchQueue(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  // Handle Multi-Video File Selection: creates separate filling box + preview for each video
  const handleVideoFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const startIdx = batchQueue.length;

    const newItems: ReelFormState[] = files.map((file, idx) => ({
      title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || `Trending Reel ${startIdx + idx + 1}`,
      description: '',
      video_url: '',
      cover_image: '',
      events: ['Mehndi'],
      orientation: 'portrait',
      status: 'published',
      tags: '',
      localPreviewUrl: URL.createObjectURL(file),
      uploadStatus: 'uploading',
      isPublished: false,
      isMuted: true
    }));

    setBatchQueue(prev => [...prev, ...newItems]);
    setUploadingGlobal(true);
    setUploadProgressText(`Uploading ${files.length} video(s) to Cloud...`);

    // Asynchronously upload each video file to Cloudinary / Supabase
    let completedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const targetQueueIdx = startIdx + i;
      uploadMediaToSupabase(file, 'reels-videos').then(publicUrl => {
        completedCount++;
        setUploadProgressText(`Uploaded ${completedCount} of ${files.length} video(s)...`);

        setBatchQueue(prev => {
          const copy = [...prev];
          if (copy[targetQueueIdx]) {
            copy[targetQueueIdx] = {
              ...copy[targetQueueIdx],
              video_url: publicUrl || '',
              uploadStatus: publicUrl ? 'done' : 'error'
            };
          }
          return copy;
        });

        if (completedCount === files.length) {
          setUploadingGlobal(false);
          setUploadProgressText(`✓ All ${files.length} video(s) uploaded to Cloud!`);
        }
      });
    }
  };

  // Upload Cover Image for Single Form
  const handleSingleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const publicUrl = await uploadMediaToSupabase(file, 'reels-covers');
    if (publicUrl) {
      setForm(prev => ({ ...prev, cover_image: publicUrl }));
    } else {
      alert('Cover upload failed. Please check Cloudinary settings.');
    }
  };

  // Upload Cover Image for a specific item in the batch
  const handleBatchCoverUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const publicUrl = await uploadMediaToSupabase(file, 'reels-covers');
    if (publicUrl) {
      updateBatchItem(index, { cover_image: publicUrl });
    } else {
      alert('Cover upload failed. Please check Cloudinary settings.');
    }
  };

  // Publish a SPECIFIC reel from the batch (without refreshing page or losing other reels data!)
  const publishSpecificReel = (index: number) => {
    const item = batchQueue[index];
    if (!item) return;
    if (!item.title.trim()) return alert(`Please enter a title for Reel #${index + 1}`);

    const tagList = item.tags.split(',').map(t => t.trim()).filter(Boolean);
    const chosenEvents = item.events.length > 0 ? item.events : ['General'];
    const newReel: TrendingReel = {
      id: `tr_${Date.now()}_${index}`,
      title: item.title.trim(),
      description: item.description.trim(),
      video_url: item.video_url.trim() || item.localPreviewUrl || '',
      cover_image: item.cover_image.trim() || 'https://images.unsplash.com/photo-1519741347686-cfcbf6bde2af?w=800',
      event: chosenEvents[0] || 'General',
      events: chosenEvents,
      orientation: item.orientation,
      status: item.status,
      tags: tagList,
      created_at: new Date().toISOString(),
    };

    const updatedDB = addTrendingReelDB(newReel);
    setReels(updatedDB);

    // Mark as published on this card without touching or losing other reels data
    setBatchQueue(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], isPublished: true, publishedId: newReel.id };
      }
      return copy;
    });
  };

  // Publish ALL remaining un-published reels in the batch
  const publishAllRemainingBatch = () => {
    const remaining = batchQueue.map((item, idx) => ({ item, idx })).filter(x => !x.item.isPublished);
    if (remaining.length === 0) {
      alert('All reels have already been published!');
      return;
    }

    let currentDB = getTrendingReelsDB();
    const timestamp = Date.now();
    const publishedIndices: number[] = [];

    remaining.forEach(({ item, idx }) => {
      const tagList = item.tags.split(',').map(t => t.trim()).filter(Boolean);
      const chosenEvents = item.events.length > 0 ? item.events : ['General'];
      const newReel: TrendingReel = {
        id: `tr_${timestamp}_${idx}`,
        title: item.title.trim() || `Trending Reel ${idx + 1}`,
        description: item.description.trim(),
        video_url: item.video_url.trim() || item.localPreviewUrl || '',
        cover_image: item.cover_image.trim() || 'https://images.unsplash.com/photo-1519741347686-cfcbf6bde2af?w=800',
        event: chosenEvents[0] || 'General',
        events: chosenEvents,
        orientation: item.orientation,
        status: item.status,
        tags: tagList,
        created_at: new Date(timestamp + idx * 1000).toISOString(),
      };
      currentDB = addTrendingReelDB(newReel);
      publishedIndices.push(idx);
    });

    setReels(currentDB);

    setBatchQueue(prev => {
      const copy = [...prev];
      publishedIndices.forEach(idx => {
        if (copy[idx]) copy[idx] = { ...copy[idx], isPublished: true };
      });
      return copy;
    });

    alert(`🎉 Successfully published ${remaining.length} Reel(s) to Cloud!`);
  };

  // Save Single Reel (when editing an existing reel or adding single reel without batch)
  const handleSingleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return alert('Please enter a reel title');

    const tagList = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const chosenEvents = form.events.length > 0 ? form.events : ['General'];

    if (editingId) {
      const updated = updateTrendingReelDB(editingId, {
        title: form.title.trim(),
        description: form.description.trim(),
        video_url: form.video_url.trim() || undefined,
        cover_image: form.cover_image.trim() || undefined,
        event: chosenEvents[0] || 'General',
        events: chosenEvents,
        orientation: form.orientation,
        status: form.status,
        tags: tagList,
      });
      setReels(updated);
      setShowModal(false);
    } else {
      const created: TrendingReel = {
        id: `tr_${Date.now()}`,
        title: form.title.trim(),
        description: form.description.trim(),
        video_url: form.video_url.trim() || form.localPreviewUrl || 'https://assets.mixkit.co/videos/preview/mixkit-bride-and-groom-walking-in-a-park-41221-large.mp4',
        cover_image: form.cover_image.trim() || 'https://images.unsplash.com/photo-1519741347686-cfcbf6bde2af?w=800',
        event: chosenEvents[0] || 'General',
        events: chosenEvents,
        orientation: form.orientation,
        status: form.status,
        tags: tagList,
        created_at: new Date().toISOString(),
      };
      const updated = addTrendingReelDB(created);
      setReels(updated);
      setShowModal(false);
    }
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

  const filteredReels = reels.filter(r => {
    if (filterEvent === 'All') return true;
    const rEvents = (r as any).events || (r.event ? r.event.split(',').map((s: string) => s.trim()) : []);
    return rEvents.includes(filterEvent) || r.event === filterEvent;
  });

  const publishedCount = batchQueue.filter(b => b.isPublished).length;
  const remainingCount = batchQueue.length - publishedCount;

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff', paddingBottom: '40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔥 Trending Reels Management
          </h1>
          <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0 0' }}>
            Upload multiple videos at once with live looping GIF previews, separate scrollable edit boxes & independent publishing
          </p>
        </div>
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
            boxShadow: '0 4px 15px rgba(212,175,55,0.3)'
          }}
        >
          <PlusIcon /> Post / Batch Upload Reels
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

      {/* Reels Grid Display */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
        {filteredReels.map((reel) => {
          const isPortrait = (reel.orientation || 'portrait') === 'portrait';
          const reelEventBadges = (reel as any).events || (reel.event ? reel.event.split(',').map((s: string) => s.trim()) : ['General']);

          return (
            <div key={reel.id} style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Media Container with Aspect Ratio positioning */}
              <div style={{ 
                position: 'relative', 
                width: '100%', 
                paddingTop: isPortrait ? '140%' : '56.25%',
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
                
                {/* Event badges overlay */}
                <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '75%' }}>
                  {reelEventBadges.map((ev: string) => (
                    <span key={ev} style={{ background: '#D4AF37', color: '#000', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {ev}
                    </span>
                  ))}
                  <span style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '2px 7px', borderRadius: '4px', fontSize: '10px' }}>
                    {isPortrait ? '📱 9:16' : '🖥️ 16:9'}
                  </span>
                </div>
              </div>

              {/* Body Info */}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#fff', fontWeight: 'bold' }}>{reel.title}</h3>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#aaa', lineHeight: '1.4' }}>{reel.description || 'No description added'}</p>
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

      {/* ========================================================================= */}
      {/* MULTI-REEL SCROLLABLE BATCH UPLOAD MODAL & INDEPENDENT PUBLISH SYSTEM     */}
      {/* ========================================================================= */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ 
            backgroundColor: '#0d0d14', 
            border: '1px solid rgba(212,175,55,0.3)', 
            borderRadius: '16px', 
            maxWidth: '1060px', 
            width: '100%', 
            boxSizing: 'border-box', 
            maxHeight: '94vh', 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 80px rgba(0,0,0,0.95)'
          }}>
            
            {/* STICKY TOP ACTION BAR */}
            <div style={{ 
              position: 'sticky', 
              top: 0, 
              zIndex: 20, 
              backgroundColor: '#12121c', 
              borderBottom: '1px solid rgba(212,175,55,0.25)', 
              padding: '16px 24px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#D4AF37', margin: 0 }}>
                    {editingId ? 'Edit Trending Reel' : (batchQueue.length > 0 ? `📹 Batch Uploading (${batchQueue.length} Reels)` : 'Post Trending Reel')}
                  </h2>
                  {batchQueue.length > 0 && (
                    <span style={{ 
                      background: publishedCount === batchQueue.length ? '#10b981' : '#D4AF37', 
                      color: '#000', 
                      fontSize: '11px', 
                      fontWeight: 'bold', 
                      padding: '3px 10px', 
                      borderRadius: '12px' 
                    }}>
                      {publishedCount} of {batchQueue.length} Published
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0' }}>
                  {batchQueue.length > 0 
                    ? 'Har reel ka apna separate preview aur filling box neechy scroll karein. Kisi bhi reel ko individual publish karein ya sab ko aik saath!'
                    : 'Watch live continuous GIF looping preview while typing titles, tags and categories'}
                </p>
              </div>

              {/* Action Buttons in Sticky Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {!editingId && (
                  <label style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    background: 'rgba(255,255,255,0.08)', 
                    color: '#fff', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '8px 14px', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontSize: '12px', 
                    fontWeight: '600'
                  }}>
                    📁 + Add More Videos
                    <input 
                      type="file" 
                      accept="video/*" 
                      multiple 
                      onChange={handleVideoFilesUpload} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                )}

                {batchQueue.length > 1 && remainingCount > 0 && (
                  <button 
                    type="button" 
                    onClick={publishAllRemainingBatch}
                    style={{ 
                      background: '#D4AF37', 
                      color: '#000', 
                      border: 'none', 
                      padding: '8px 18px', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: '12px',
                      boxShadow: '0 4px 15px rgba(212,175,55,0.3)'
                    }}
                  >
                    🚀 Publish All Remaining ({remainingCount})
                  </button>
                )}

                <button 
                  onClick={() => setShowModal(false)} 
                  style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '6px', fontSize: '16px' }}
                >
                  <XIcon />
                </button>
              </div>
            </div>

            {/* MODAL CONTENT CONTAINER */}
            <div style={{ padding: '24px' }}>

              {/* CASE 1: BATCH QUEUE EMPTY (Initial Screen to Pick Videos) */}
              {batchQueue.length === 0 && !editingId && (
                <div style={{ 
                  background: 'linear-gradient(180deg, #14141e 0%, #0c0c14 100%)', 
                  border: '2px dashed rgba(212,175,55,0.4)', 
                  borderRadius: '16px', 
                  padding: '40px 24px', 
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(212,175,55,0.1)', border: '1px solid #D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '28px' }}>
                    📹
                  </div>
                  <h3 style={{ fontSize: '18px', color: '#D4AF37', margin: '0 0 8px 0', fontWeight: 'bold' }}>
                    Select 1 or Multiple Videos from PC
                  </h3>
                  <p style={{ fontSize: '13px', color: '#aaa', maxWidth: '540px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
                    Aap aik waqt mein 5, 8 ya jitni chahein videos select kar sakte hain. Har reel ka apna separate looping GIF preview aur filling box neechy scrollable list mein tayar ho jayega!
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <label style={{ 
                      background: '#D4AF37', 
                      color: '#000', 
                      padding: '12px 28px', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontSize: '14px', 
                      fontWeight: 'bold',
                      boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      📁 Choose Video(s) from PC (Select Multiple)...
                      <input 
                        type="file" 
                        accept="video/*" 
                        multiple 
                        onChange={handleVideoFilesUpload} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Upload Progress Banner if actively uploading */}
              {uploadingGlobal && (
                <div style={{ 
                  background: 'rgba(212,175,55,0.1)', 
                  border: '1px solid rgba(212,175,55,0.3)', 
                  borderRadius: '10px', 
                  padding: '12px 18px', 
                  marginBottom: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(212,175,55,0.3)', borderTopColor: '#D4AF37', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 'bold' }}>{uploadProgressText}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#aaa' }}>Background cloud upload in progress...</span>
                </div>
              )}

              {/* CASE 2: BATCH QUEUE HAS ITEMS -> SCROLL DOWN WITH SEPARATE CARD & FILLING BOX FOR EACH REEL */}
              {batchQueue.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {batchQueue.map((item, idx) => {
                    const previewSrc = item.localPreviewUrl || item.video_url;
                    const isPortrait = item.orientation === 'portrait';

                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          backgroundColor: '#12121c', 
                          border: item.isPublished ? '2px solid #10b981' : '1px solid rgba(212,175,55,0.35)', 
                          borderRadius: '16px', 
                          padding: '20px', 
                          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Reel Card Header */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          marginBottom: '18px', 
                          borderBottom: '1px solid rgba(255,255,255,0.08)', 
                          paddingBottom: '12px',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ 
                              background: item.isPublished ? '#10b981' : '#D4AF37', 
                              color: '#000', 
                              fontWeight: 'bold', 
                              fontSize: '12px', 
                              padding: '3px 10px', 
                              borderRadius: '6px' 
                            }}>
                              REEL #{idx + 1}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                              {item.title || `Trending Reel ${idx + 1}`}
                            </span>

                            {/* Status Indicator */}
                            {item.isPublished ? (
                              <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid #10b981', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>
                                ✅ PUBLISHED TO APP
                              </span>
                            ) : item.uploadStatus === 'uploading' ? (
                              <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid #f59e0b', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>
                                ⏳ Uploading to Cloud...
                              </span>
                            ) : item.video_url ? (
                              <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>
                                ✓ Cloud Ready
                              </span>
                            ) : null}
                          </div>

                          {/* Quick Publish / Remove Action */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {!item.isPublished ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => publishSpecificReel(idx)}
                                  style={{
                                    background: '#D4AF37',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 10px rgba(212,175,55,0.3)'
                                  }}
                                >
                                  🚀 Publish Reel #{idx + 1}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeBatchItem(idx)}
                                  style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                  title="Remove Reel from Batch"
                                >
                                  <TrashIcon />
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>
                                ✓ Live in App
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Body: 2-Column Responsive (Left Preview, Right Form) */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                          
                          {/* LEFT COLUMN: LIVE LOOPING PREVIEW */}
                          <div style={{ flex: '1 1 260px', maxWidth: '300px' }}>
                            <div style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🎬 Live Looping GIF Preview</span>
                              <span style={{ color: '#aaa', fontSize: '10px' }}>Continuous</span>
                            </div>

                            <div style={{ 
                              position: 'relative', 
                              width: '100%', 
                              paddingTop: isPortrait ? '140%' : '56.25%', 
                              backgroundColor: '#050508', 
                              borderRadius: '12px', 
                              overflow: 'hidden', 
                              border: '1px solid rgba(212,175,55,0.3)' 
                            }}>
                              {previewSrc ? (
                                <video 
                                  src={previewSrc} 
                                  autoPlay 
                                  loop 
                                  muted={item.isMuted ?? true} 
                                  playsInline 
                                  poster={item.cover_image}
                                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '12px' }}>
                                  No Preview Available
                                </div>
                              )}

                              {/* Overlay Badges */}
                              <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '80%', pointerEvents: 'none' }}>
                                {item.events.map(ev => (
                                  <span key={ev} style={{ background: '#D4AF37', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                                    {ev}
                                  </span>
                                ))}
                              </div>

                              {/* Bottom Audio Toggle */}
                              <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}>
                                  {isPortrait ? '📱 9:16' : '🖥️ 16:9'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateBatchItem(idx, { isMuted: !item.isMuted })}
                                  style={{
                                    background: item.isMuted ? 'rgba(0,0,0,0.7)' : '#D4AF37',
                                    color: item.isMuted ? '#fff' : '#000',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '12px',
                                    padding: '2px 8px',
                                    fontSize: '9px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {item.isMuted ? '🔇 Muted' : '🔊 Sound'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* RIGHT COLUMN: SEPARATE FILLING BOX FOR THIS REEL */}
                          <div style={{ flex: '2 1 360px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            
                            {/* Title + Quick Suggestions */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', color: '#aaa', fontWeight: 'bold', textTransform: 'uppercase' }}>Reel Title</label>
                                <span style={{ fontSize: '10px', color: '#666' }}>Watch left preview while naming</span>
                              </div>
                              <input 
                                type="text" 
                                value={item.title} 
                                onChange={e => updateBatchItem(idx, { title: e.target.value })} 
                                placeholder="e.g. Vibrant Mehndi Dance Reel" 
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                              />
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                                {QUICK_TITLES.slice(0, 4).map(t => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => updateBatchItem(idx, { title: t })}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#999', padding: '2px 7px', borderRadius: '10px', fontSize: '10px', cursor: 'pointer' }}
                                  >
                                    + {t}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* MULTI-EVENT CATEGORIES FOR THIS REEL */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                  🎉 Event Categories (Multi-Select)
                                </label>
                                <span style={{ fontSize: '11px', color: '#aaa' }}>
                                  Selected: <strong style={{ color: '#D4AF37' }}>{item.events.join(', ')}</strong>
                                </span>
                              </div>

                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {AVAILABLE_EVENTS.map(ev => {
                                  const isSelected = item.events.includes(ev);
                                  return (
                                    <button
                                      key={ev}
                                      type="button"
                                      onClick={() => toggleBatchEvent(idx, ev)}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: '16px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        border: '1px solid',
                                        backgroundColor: isSelected ? '#D4AF37' : '#0a0a0f',
                                        color: isSelected ? '#000' : '#aaa',
                                        borderColor: isSelected ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                                        transition: 'all 0.1s ease'
                                      }}
                                    >
                                      {isSelected ? '✓ ' : '+ '}{ev}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Framing & Cover Thumbnail */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '10px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Framing</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => updateBatchItem(idx, { orientation: 'portrait' })}
                                    style={{
                                      flex: 1,
                                      padding: '7px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid',
                                      background: item.orientation === 'portrait' ? 'rgba(212,175,55,0.15)' : '#0a0a0f',
                                      borderColor: item.orientation === 'portrait' ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                                      color: item.orientation === 'portrait' ? '#D4AF37' : '#888',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    📱 9:16 Portrait
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateBatchItem(idx, { orientation: 'landscape' })}
                                    style={{
                                      flex: 1,
                                      padding: '7px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid',
                                      background: item.orientation === 'landscape' ? 'rgba(212,175,55,0.15)' : '#0a0a0f',
                                      borderColor: item.orientation === 'landscape' ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                                      color: item.orientation === 'landscape' ? '#D4AF37' : '#888',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    🖥️ 16:9 Film
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '10px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Cover Thumbnail (Optional)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <label style={{ 
                                    background: 'rgba(255,255,255,0.06)', 
                                    border: '1px solid rgba(255,255,255,0.15)', 
                                    color: '#bbb', 
                                    padding: '6px 10px', 
                                    borderRadius: '6px', 
                                    fontSize: '11px', 
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    📁 Pick File
                                    <input type="file" accept="image/*" onChange={e => handleBatchCoverUpload(idx, e)} style={{ display: 'none' }} />
                                  </label>
                                  <input 
                                    type="text" 
                                    value={item.cover_image} 
                                    onChange={e => updateBatchItem(idx, { cover_image: e.target.value })} 
                                    placeholder="Or paste cover URL" 
                                    style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <label style={{ display: 'block', fontSize: '10px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Description & Shoot Instructions</label>
                              <textarea 
                                value={item.description} 
                                onChange={e => updateBatchItem(idx, { description: e.target.value })} 
                                placeholder="Describe framing, slow-motion speed, flower rain instructions..." 
                                rows={2}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                              />
                            </div>

                            {/* Tags */}
                            <div>
                              <label style={{ display: 'block', fontSize: '10px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Tags</label>
                              <input 
                                type="text" 
                                value={item.tags} 
                                onChange={e => updateBatchItem(idx, { tags: e.target.value })} 
                                placeholder="#SlowMo, #BrideEntry, #MehndiDance" 
                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                              />
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                                {QUICK_TAGS.map(tag => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                      const existing = item.tags.split(',').map(t => t.trim()).filter(Boolean);
                                      if (!existing.includes(tag)) {
                                        const updated = [...existing, tag].join(', ');
                                        updateBatchItem(idx, { tags: updated });
                                      }
                                    }}
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#777', padding: '1px 6px', borderRadius: '8px', fontSize: '10px', cursor: 'pointer' }}
                                  >
                                    + {tag}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Card Bottom Action */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              {!item.isPublished ? (
                                <button
                                  type="button"
                                  onClick={() => publishSpecificReel(idx)}
                                  style={{
                                    background: '#D4AF37',
                                    color: '#000',
                                    border: 'none',
                                    padding: '9px 20px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    boxShadow: '0 3px 12px rgba(212,175,55,0.35)'
                                  }}
                                >
                                  🚀 Save & Publish Reel #{idx + 1}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  style={{
                                    background: 'rgba(16,185,129,0.15)',
                                    color: '#10b981',
                                    border: '1px solid #10b981',
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    cursor: 'default'
                                  }}
                                >
                                  ✅ Reel #{idx + 1} Published
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Bottom Action Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '13px', color: '#aaa' }}>
                      Status: <strong style={{ color: '#D4AF37' }}>{publishedCount} of {batchQueue.length}</strong> reels published
                    </span>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        {publishedCount > 0 ? 'Done & Close' : 'Cancel'}
                      </button>

                      {remainingCount > 0 && (
                        <button
                          type="button"
                          onClick={publishAllRemainingBatch}
                          style={{
                            background: '#D4AF37',
                            color: '#000',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 18px rgba(212,175,55,0.4)'
                          }}
                        >
                          🚀 Publish All Remaining ({remainingCount})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CASE 3: EDITING AN EXISTING REEL */}
              {editingId && (
                <form onSubmit={handleSingleSave} style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                  {/* Left Looping Preview */}
                  <div style={{ flex: '1 1 280px', maxWidth: '320px' }}>
                    <div style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 'bold', marginBottom: '8px' }}>
                      🎬 Live Looping GIF Preview
                    </div>
                    <div style={{ 
                      position: 'relative', 
                      width: '100%', 
                      paddingTop: form.orientation === 'portrait' ? '140%' : '56.25%', 
                      backgroundColor: '#050508', 
                      borderRadius: '14px', 
                      overflow: 'hidden', 
                      border: '2px solid rgba(212,175,55,0.4)' 
                    }}>
                      <video 
                        src={form.localPreviewUrl || form.video_url} 
                        autoPlay 
                        muted={form.isMuted ?? true} 
                        loop 
                        playsInline 
                        poster={form.cover_image}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '10px' }}>
                          {form.orientation === 'portrait' ? '📱 9:16' : '🖥️ 16:9'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, isMuted: !form.isMuted })}
                          style={{
                            background: form.isMuted ? 'rgba(0,0,0,0.75)' : '#D4AF37',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: form.isMuted ? '#fff' : '#000',
                            borderRadius: '16px',
                            padding: '4px 10px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {form.isMuted ? '🔇 Muted' : '🔊 Sound'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Form Fields */}
                  <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', fontWeight: 'bold' }}>Reel Title</label>
                      <input 
                        type="text" 
                        value={form.title} 
                        onChange={e => setForm({ ...form, title: e.target.value })} 
                        required 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        🎉 Event Categories (Select Multiple)
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {AVAILABLE_EVENTS.map(ev => {
                          const isSelected = form.events.includes(ev);
                          return (
                            <button
                              key={ev}
                              type="button"
                              onClick={() => toggleFormEvent(ev)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '18px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                border: '1px solid',
                                backgroundColor: isSelected ? '#D4AF37' : '#14141e',
                                color: isSelected ? '#000' : '#bbb',
                                borderColor: isSelected ? '#D4AF37' : 'rgba(255,255,255,0.12)',
                              }}
                            >
                              {isSelected ? '✓ ' : '+ '}{ev}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Video Framing</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, orientation: 'portrait' })}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid',
                            background: form.orientation === 'portrait' ? 'rgba(212,175,55,0.15)' : '#0a0a0f',
                            borderColor: form.orientation === 'portrait' ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                            color: form.orientation === 'portrait' ? '#D4AF37' : '#aaa',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          📱 Portrait Reel (9:16 Vertical)
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, orientation: 'landscape' })}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid',
                            background: form.orientation === 'landscape' ? 'rgba(212,175,55,0.15)' : '#0a0a0f',
                            borderColor: form.orientation === 'landscape' ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                            color: form.orientation === 'landscape' ? '#D4AF37' : '#aaa',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          🖥️ Landscape Film (16:9 Horizontal)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Cover Thumbnail</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <label style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          📁 Choose Cover File
                          <input type="file" accept="image/*" onChange={handleSingleCoverUpload} style={{ display: 'none' }} />
                        </label>
                        <input 
                          type="text" 
                          value={form.cover_image} 
                          onChange={e => setForm({ ...form, cover_image: e.target.value })} 
                          placeholder="Or paste cover image URL" 
                          style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Description & Shoot Instructions</label>
                      <textarea 
                        value={form.description} 
                        onChange={e => setForm({ ...form, description: e.target.value })} 
                        rows={2} 
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Tags</label>
                      <input 
                        type="text" 
                        value={form.tags} 
                        onChange={e => setForm({ ...form, tags: e.target.value })} 
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                      />
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
                        style={{ background: '#D4AF37', border: 'none', color: '#000', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                      >
                        💾 Save Changes
                      </button>
                    </div>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
