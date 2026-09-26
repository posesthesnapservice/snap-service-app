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
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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
}

export default function AdminTrendingReels() {
  const [reels, setReels] = useState<TrendingReel[]>([]);
  const [filterEvent, setFilterEvent] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
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
  });

  // Batch Queue for Multiple Videos Upload
  const [batchQueue, setBatchQueue] = useState<ReelFormState[]>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(0);

  // Audio mute/unmute state for live preview
  const [isMuted, setIsMuted] = useState(true);

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setReels(getTrendingReelsDB());
    fetchTrendingReelsCloud().then(cloudReels => {
      if (cloudReels && cloudReels.length > 0) setReels(cloudReels);
    });
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setBatchQueue([]);
    setActiveQueueIndex(0);
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
    });
    setIsMuted(true);
    setShowModal(true);
  };

  const startEdit = (reel: TrendingReel) => {
    setEditingId(reel.id);
    setBatchQueue([]);
    setActiveQueueIndex(0);

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
    });
    setIsMuted(true);
    setShowModal(true);
  };

  // Toggle Multiple Event Category Badges
  const toggleEvent = (ev: string) => {
    setForm(prev => {
      const exists = prev.events.includes(ev);
      let updated: string[];
      if (exists) {
        updated = prev.events.filter(e => e !== ev);
        if (updated.length === 0) updated = ['General'];
      } else {
        updated = [...prev.events.filter(e => e !== 'General'), ev];
      }

      // If in batch queue, also update the active item in batchQueue
      if (batchQueue.length > 1) {
        setBatchQueue(q => {
          const copy = [...q];
          if (copy[activeQueueIndex]) copy[activeQueueIndex].events = updated;
          return copy;
        });
      }

      return { ...prev, events: updated };
    });
  };

  // Handle Multi-Video and Single-Video File Selection
  const handleVideoFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);

    // Case 1: Single Video File Selected
    if (files.length === 1) {
      const file = files[0];
      const localUrl = URL.createObjectURL(file);
      const generatedTitle = form.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      setForm(prev => ({
        ...prev,
        localPreviewUrl: localUrl,
        title: generatedTitle,
        uploadStatus: 'uploading'
      }));
      setUploadingVideo(true);
      setUploadProgressText('Uploading HD Video to 25GB Cloud...');

      const publicUrl = await uploadMediaToSupabase(file, 'reels-videos');
      setUploadingVideo(false);

      if (publicUrl) {
        setForm(prev => ({ ...prev, video_url: publicUrl, uploadStatus: 'done' }));
      } else {
        setForm(prev => ({ ...prev, uploadStatus: 'error' }));
        const reason = lastCloudinaryError || 'Upload failed';
        alert(`⚠️ Video Upload Failed: ${reason}\n\nKyunki Cloudinary par aapka preset 'poses preset' abhi 'Signed' mode par hai!\n\nHal: Cloudinary Settings -> Upload presets mein ja kar 'poses preset' par click karein aur Signing Mode ko 'Unsigned' karke Save karein.`);
      }
      return;
    }

    // Case 2: Multiple Video Files Selected (Batch Upload Mode)
    setUploadingVideo(true);
    setUploadProgressText(`Uploading ${files.length} videos to Cloud...`);

    const newQueue: ReelFormState[] = files.map((file, idx) => ({
      title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || `Trending Reel ${idx + 1}`,
      description: form.description || '',
      video_url: '',
      cover_image: form.cover_image || '',
      events: [...form.events],
      orientation: form.orientation,
      status: 'published',
      tags: form.tags || '',
      localPreviewUrl: URL.createObjectURL(file),
      uploadStatus: 'uploading'
    }));

    setBatchQueue(newQueue);
    setActiveQueueIndex(0);
    setForm(newQueue[0]);

    // Asynchronously upload each video in the batch to Cloudinary
    let completedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadMediaToSupabase(file, 'reels-videos').then(publicUrl => {
        completedCount++;
        setUploadProgressText(`Uploaded ${completedCount} of ${files.length} videos...`);

        setBatchQueue(prevQueue => {
          const copy = [...prevQueue];
          if (copy[i]) {
            copy[i] = {
              ...copy[i],
              video_url: publicUrl || '',
              uploadStatus: publicUrl ? 'done' : 'error'
            };
          }
          return copy;
        });

        // If currently viewing this item in the editor, update its video_url as well
        if (i === activeQueueIndex && publicUrl) {
          setForm(prev => ({ ...prev, video_url: publicUrl, uploadStatus: 'done' }));
        }

        if (completedCount === files.length) {
          setUploadingVideo(false);
          setUploadProgressText(`✓ All ${files.length} videos uploaded to Cloud!`);
        }
      });
    }
  };

  // Switch Active Reel in Batch Queue
  const selectQueueItem = (index: number) => {
    // Save current form edits into current queue item
    if (batchQueue[activeQueueIndex]) {
      setBatchQueue(prev => {
        const copy = [...prev];
        copy[activeQueueIndex] = { ...form };
        return copy;
      });
    }

    // Switch to new index
    setActiveQueueIndex(index);
    if (batchQueue[index]) {
      setForm(batchQueue[index]);
    }
  };

  // Handle Cover Thumbnail Upload
  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);

    const publicUrl = await uploadMediaToSupabase(file, 'reels-covers');
    setUploadingCover(false);

    if (publicUrl) {
      setForm(prev => ({ ...prev, cover_image: publicUrl }));
      if (batchQueue.length > 1) {
        setBatchQueue(q => {
          const copy = [...q];
          if (copy[activeQueueIndex]) copy[activeQueueIndex].cover_image = publicUrl;
          return copy;
        });
      }
    } else {
      const reason = lastCloudinaryError || 'Upload failed';
      alert(`⚠️ Cover Image Upload Failed: ${reason}\n\nPlease check Cloudinary preset settings (must be 'Unsigned').`);
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

  // Save Single Reel or Active Reel
  const handleSave = (e: React.FormEvent) => {
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
    } else if (batchQueue.length > 1) {
      // Save current active reel and advance or notify
      setBatchQueue(prev => {
        const copy = [...prev];
        copy[activeQueueIndex] = { ...form };
        return copy;
      });
      if (activeQueueIndex < batchQueue.length - 1) {
        selectQueueItem(activeQueueIndex + 1);
      } else {
        publishAllBatch();
      }
    } else {
      const created: TrendingReel = {
        id: `tr_${Date.now()}`,
        title: form.title.trim(),
        description: form.description.trim(),
        video_url: form.video_url.trim() || 'https://assets.mixkit.co/videos/preview/mixkit-bride-and-groom-walking-in-a-park-41221-large.mp4',
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

  // Publish All Reels in Batch Queue
  const publishAllBatch = () => {
    // Merge latest active form
    const currentQueue = [...batchQueue];
    currentQueue[activeQueueIndex] = { ...form };

    let currentDB = getTrendingReelsDB();
    const timestamp = Date.now();

    currentQueue.forEach((item, idx) => {
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
    });

    setReels(currentDB);
    setShowModal(false);
    alert(`🎉 Successfully published ${currentQueue.length} Trending Reels to Cloud!`);
  };

  const filteredReels = reels.filter(r => {
    if (filterEvent === 'All') return true;
    const rEvents = (r as any).events || (r.event ? r.event.split(',').map((s: string) => s.trim()) : []);
    return rEvents.includes(filterEvent) || r.event === filterEvent;
  });

  const previewSrc = form.localPreviewUrl || form.video_url;

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff', paddingBottom: '40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔥 Trending Reels Management
          </h1>
          <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0 0' }}>
            Upload single or multiple videos simultaneously with live GIF looping preview & multi-category tagging
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

      {/* Reels Grid */}
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
      {/* 2-COLUMN POST & BATCH UPLOAD MODAL WITH LEFT-SIDE LIVE LOOPING GIF PREVIEW */}
      {/* ========================================================================= */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ 
            backgroundColor: '#111118', 
            border: '1px solid rgba(212,175,55,0.25)', 
            borderRadius: '16px', 
            padding: '24px', 
            maxWidth: '960px', 
            width: '100%', 
            boxSizing: 'border-box', 
            maxHeight: '92vh', 
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
          }}>
            {/* Modal Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#D4AF37', margin: 0 }}>
                  {editingId ? 'Edit Trending Reel' : (batchQueue.length > 1 ? '📹 Batch Upload Multiple Reels' : 'Post Trending Reel')}
                </h2>
                {batchQueue.length > 1 && (
                  <span style={{ background: '#D4AF37', color: '#000', fontSize: '11px', fontWeight: 'bold', padding: '3px 9px', borderRadius: '12px' }}>
                    Reel {activeQueueIndex + 1} of {batchQueue.length}
                  </span>
                )}
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '4px' }}>
                <XIcon />
              </button>
            </div>

            {/* 2-Column Responsive Body */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              
              {/* ========================================================= */}
              {/* LEFT COLUMN: LIVE LOOPING GIF PREVIEW & BATCH REELS QUEUE */}
              {/* ========================================================= */}
              <div style={{ flex: '1 1 320px', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎬 Live GIF Looping Preview</span>
                </div>

                {/* Looping Video Container */}
                <div style={{ 
                  position: 'relative',
                  width: '100%',
                  paddingTop: form.orientation === 'portrait' ? '140%' : '56.25%',
                  backgroundColor: '#050508',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: '2px solid rgba(212,175,55,0.4)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.8)'
                }}>
                  {previewSrc ? (
                    <video 
                      ref={previewVideoRef}
                      key={previewSrc}
                      src={previewSrc}
                      autoPlay
                      muted={isMuted}
                      loop
                      playsInline
                      poster={form.cover_image}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666', padding: '24px', textAlign: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', marginBottom: '10px' }}>
                        📹
                      </div>
                      <span style={{ fontSize: '13px', color: '#D4AF37', fontWeight: 'bold' }}>Select Video File</span>
                      <span style={{ fontSize: '11px', color: '#777', marginTop: '6px', lineHeight: '1.4' }}>
                        Video select karne ke baad yahan GIF ki tarha continuous loop play hogi taake title aur tags likhne mein asaani ho
                      </span>
                    </div>
                  )}

                  {/* Top Live Badges Overlay */}
                  <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none', zIndex: 2 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '75%' }}>
                      {form.events.map(ev => (
                        <span key={ev} style={{ background: '#D4AF37', color: '#000', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                          {ev}
                        </span>
                      ))}
                    </div>
                    {previewSrc && (
                      <span style={{ background: 'rgba(0,0,0,0.75)', color: '#10b981', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        LOOPING
                      </span>
                    )}
                  </div>

                  {/* Bottom Controls Bar Overlay */}
                  {previewSrc && (
                    <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                      <span style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', border: '1px solid rgba(255,255,255,0.2)' }}>
                        {form.orientation === 'portrait' ? '📱 9:16 Portrait' : '🖥️ 16:9 Film'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        style={{
                          background: isMuted ? 'rgba(0,0,0,0.75)' : '#D4AF37',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: isMuted ? '#fff' : '#000',
                          borderRadius: '16px',
                          padding: '4px 10px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {isMuted ? '🔇 Muted (GIF Mode)' : '🔊 Audio ON'}
                      </button>
                    </div>
                  )}

                  {/* Uploading Spinner Overlay */}
                  {uploadingVideo && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                      <span style={{ width: '32px', height: '32px', border: '3px solid rgba(212,175,55,0.3)', borderTopColor: '#D4AF37', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite', marginBottom: '10px' }} />
                      <span style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 'bold' }}>{uploadProgressText || 'Uploading to Cloud...'}</span>
                    </div>
                  )}
                </div>

                {/* Batch Queue Thumbnails (If Multiple Videos Selected) */}
                {batchQueue.length > 1 && (
                  <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>BATCH QUEUE ({batchQueue.length} REELS):</span>
                      <span style={{ color: '#aaa', fontSize: '10px' }}>Tap reel to edit</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                      {batchQueue.map((item, idx) => {
                        const isActive = activeQueueIndex === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectQueueItem(idx)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              border: '1px solid',
                              background: isActive ? '#D4AF37' : '#14141e',
                              color: isActive ? '#000' : '#fff',
                              borderColor: isActive ? '#D4AF37' : 'rgba(255,255,255,0.12)',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>#{idx + 1}</span>
                            <span>{item.title.length > 14 ? item.title.substring(0, 14) + '...' : item.title}</span>
                            {item.video_url ? (
                              <span style={{ color: isActive ? '#000' : '#10b981' }}>✓</span>
                            ) : (
                              <span style={{ color: isActive ? '#000' : '#f59e0b' }}>⏳</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* RIGHT COLUMN: REEL DETAILS & MULTIPLE CATEGORY SELECTOR  */}
              {/* ========================================================= */}
              <form onSubmit={handleSave} style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* 1. Video File Upload (Multiple Supported!) */}
                <div style={{ background: '#0a0a0f', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px', padding: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#D4AF37', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    📹 Video Upload (Select 1 or Multiple Videos)
                  </label>
                  
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    <label style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      background: uploadingVideo ? '#444' : '#D4AF37', 
                      color: uploadingVideo ? '#aaa' : '#000', 
                      padding: '9px 16px', 
                      borderRadius: '8px', 
                      cursor: uploadingVideo ? 'not-allowed' : 'pointer', 
                      fontSize: '12px', 
                      fontWeight: 'bold',
                      pointerEvents: uploadingVideo ? 'none' : 'auto',
                      boxShadow: '0 2px 10px rgba(212,175,55,0.25)'
                    }}>
                      {uploadingVideo ? '⏳ Uploading...' : '📁 Choose Video(s) from PC (Select Multiple)...'}
                      <input 
                        type="file" 
                        accept="video/*" 
                        multiple 
                        onChange={handleVideoFilesUpload} 
                        disabled={uploadingVideo} 
                        style={{ display: 'none' }} 
                      />
                    </label>

                    {form.video_url && (
                      <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ Cloud Link Ready
                      </span>
                    )}
                  </div>

                  <input 
                    type="text" 
                    value={form.video_url} 
                    onChange={e => setForm({ ...form, video_url: e.target.value })} 
                    placeholder="Or paste video URL (https://res.cloudinary.com/... or https://...)" 
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* 2. Reel Title + Quick Suggestions */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', fontWeight: 'bold' }}>Reel Title</label>
                    <span style={{ fontSize: '10px', color: '#666' }}>Watch left GIF while typing title</span>
                  </div>
                  <input 
                    type="text" 
                    value={form.title} 
                    onChange={e => setForm({ ...form, title: e.target.value })} 
                    placeholder="e.g. Vibrant Mehndi Dance Reel" 
                    required 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  {/* Quick Title Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {QUICK_TITLES.map(title => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => setForm({ ...form, title })}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', cursor: 'pointer' }}
                      >
                        + {title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. MULTIPLE EVENT CATEGORIES (Multi-Select Chips) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      🎉 Event Categories (Select Multiple)
                    </label>
                    <span style={{ fontSize: '11px', color: '#aaa' }}>
                      Selected: <strong style={{ color: '#D4AF37' }}>{form.events.join(', ')}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {AVAILABLE_EVENTS.map(ev => {
                      const isSelected = form.events.includes(ev);
                      return (
                        <button
                          key={ev}
                          type="button"
                          onClick={() => toggleEvent(ev)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            border: '1px solid',
                            transition: 'all 0.15s ease',
                            backgroundColor: isSelected ? '#D4AF37' : '#14141e',
                            color: isSelected ? '#000' : '#bbb',
                            borderColor: isSelected ? '#D4AF37' : 'rgba(255,255,255,0.12)',
                            boxShadow: isSelected ? '0 0 12px rgba(212,175,55,0.35)' : 'none',
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}{ev}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Video Positioning (Aspect Ratio Switcher) */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    Video Framing / Positioning
                  </label>
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

                {/* 5. Cover Thumbnail (Optional) */}
                <div style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', textTransform: 'uppercase' }}>
                    🖼️ Cover Thumbnail (Optional - Upload File OR Paste Link)
                  </label>
                  
                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <label style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      background: uploadingCover ? '#333' : 'rgba(255,255,255,0.1)', 
                      color: uploadingCover ? '#aaa' : '#fff', 
                      padding: '7px 14px', 
                      borderRadius: '6px', 
                      cursor: uploadingCover ? 'not-allowed' : 'pointer', 
                      fontSize: '11px', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      pointerEvents: uploadingCover ? 'none' : 'auto'
                    }}>
                      {uploadingCover ? '⏳ Uploading...' : '📁 Choose Cover Image File...'}
                      <input type="file" accept="image/*" onChange={handleCoverFileUpload} disabled={uploadingCover} style={{ display: 'none' }} />
                    </label>

                    {form.cover_image && (
                      <span style={{ fontSize: '11px', color: '#10b981' }}>✓ Cover ready</span>
                    )}
                  </div>

                  <input 
                    type="text" 
                    value={form.cover_image} 
                    onChange={e => setForm({ ...form, cover_image: e.target.value })} 
                    placeholder="Or paste cover image URL (https://images.unsplash.com/...)" 
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* 6. Description & Photographer Instructions */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Description & Shoot Instructions
                  </label>
                  <textarea 
                    value={form.description} 
                    onChange={e => setForm({ ...form, description: e.target.value })} 
                    placeholder="Describe framing, slow-motion speed, flower rain instructions..." 
                    rows={2}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* 7. Tags + Quick Tag Chips */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase' }}>Tags</label>
                  <input 
                    type="text" 
                    value={form.tags} 
                    onChange={e => setForm({ ...form, tags: e.target.value })} 
                    placeholder="#SlowMo, #BrideEntry, #MehndiDance" 
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {QUICK_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const existing = form.tags.split(',').map(t => t.trim()).filter(Boolean);
                          if (!existing.includes(tag)) {
                            const updated = [...existing, tag].join(', ');
                            setForm({ ...form, tags: updated });
                          }
                        }}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#888', padding: '2px 7px', borderRadius: '10px', fontSize: '10px', cursor: 'pointer' }}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#aaa', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Cancel
                  </button>

                  {batchQueue.length > 1 ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        type="submit" 
                        style={{ background: '#1c1c28', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                      >
                        💾 Save Reel #{activeQueueIndex + 1}
                      </button>
                      <button 
                        type="button" 
                        onClick={publishAllBatch}
                        style={{ background: '#D4AF37', border: 'none', color: '#000', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', boxShadow: '0 4px 15px rgba(212,175,55,0.3)' }}
                      >
                        🚀 Publish All {batchQueue.length} Reels
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="submit" 
                      style={{ background: '#D4AF37', border: 'none', color: '#000', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 4px 15px rgba(212,175,55,0.3)' }}
                    >
                      ✨ Save & Publish Reel
                    </button>
                  )}
                </div>

              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
