'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDirectionalShootsDB, fetchDirectionalShootsCloud } from '@/lib/poses-db-helpers';
import { DirectionalShoot } from '@/lib/types';
import { REEL_EVENTS } from '@/lib/constants';
import { getTodayShootIds, toggleTodayShoot } from '@/lib/today-shoot-helpers';
import { getUser } from '@/lib/auth-helpers';

export default function DirectionalShootsPage() {
  const router = useRouter();
  const [shoots, setShoots] = useState<DirectionalShoot[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('All');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [todayIds, setTodayIds] = useState<string[]>([]);
  
  // Folder Navigation State
  const [activeFolder, setActiveFolder] = useState<DirectionalShoot | null>(null);
  
  // Full-screen Image Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  const [syncing, setSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    const cloud = await fetchDirectionalShootsCloud();
    if (cloud && cloud.length > 0) {
      setShoots(cloud.filter(s => s.status !== 'hidden'));
    }
    setTimeout(() => setSyncing(false), 600);
  };

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
      return;
    }

    setShoots(getDirectionalShootsDB().filter(s => s.status !== 'hidden'));
    const favs = JSON.parse(localStorage.getItem('snap_favorites') || '[]');
    setFavorites(favs);
    setTodayIds(getTodayShootIds());

    fetchDirectionalShootsCloud().then(cloudShoots => {
      if (cloudShoots && cloudShoots.length > 0) {
        setShoots(cloudShoots.filter(s => s.status !== 'hidden'));
      }
    });
  }, []);

  const toggleFav = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    let newFavs = [...favorites];
    const isRemoving = newFavs.includes(id);
    if (isRemoving) {
      newFavs = newFavs.filter(fid => fid !== id);
      showToast('🤍 Removed from Favorites');
    } else {
      newFavs.push(id);
      showToast('❤️ Added to Favorites!');
    }
    setFavorites(newFavs);
    localStorage.setItem('snap_favorites', JSON.stringify(newFavs));
  };

  const toggleToday = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleTodayShoot(id);
    setTodayIds(updated);
    const isAdded = updated.includes(id);
    showToast(isAdded ? "✅ Added to Today's Shoot!" : "Removed from Today's Shoot");
  };

  const filtered = shoots.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchFolder = s.folder_name?.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q);
      const matchNotes = s.director_notes?.toLowerCase().includes(q);
      const matchAngle = s.camera_angle?.toLowerCase().includes(q);
      const matchMove = s.movement?.toLowerCase().includes(q);
      if (!matchTitle && !matchFolder && !matchDesc && !matchNotes && !matchAngle && !matchMove) return false;
    }
    if (selectedEvent !== 'All') {
      const shootEvents = s.events || (s.event ? s.event.split(',').map((x: string) => x.trim()) : []);
      if (!shootEvents.includes(selectedEvent) && s.event !== selectedEvent) return false;
    }
    return true;
  });

  // Current folder's reference images list
  const currentFolderImages = activeFolder 
    ? (activeFolder.reference_images && activeFolder.reference_images.length > 0 
        ? activeFolder.reference_images 
        : [activeFolder.cover_image || activeFolder.media_url || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800'])
    : [];

  return (
    <div style={{ padding: '16px', color: '#fff', minHeight: '100vh', background: '#0a0a0f', paddingBottom: '90px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1e1b10',
          color: '#D4AF37',
          padding: '10px 20px',
          borderRadius: '24px',
          border: '1px solid #D4AF37',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          zIndex: 9999,
          fontSize: '13px',
          fontWeight: 'bold',
          letterSpacing: '0.3px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMsg}
        </div>
      )}

      {/* VIEW 1: SCENE FOLDER DETAIL VIEW (Opened Folder) */}
      {activeFolder ? (
        <div>
          {/* Back button and folder header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button
              onClick={() => setActiveFolder(null)}
              style={{
                background: '#16161f',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#D4AF37',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ← Back to Scene Folders
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={(e) => toggleToday(e, activeFolder.id)}
                style={{
                  background: todayIds.includes(activeFolder.id) ? '#10b981' : 'rgba(212,175,55,0.15)',
                  border: todayIds.includes(activeFolder.id) ? '1px solid #10b981' : '1px solid #D4AF37',
                  color: todayIds.includes(activeFolder.id) ? '#fff' : '#D4AF37',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {todayIds.includes(activeFolder.id) ? "✓ In Today's Shoot" : "+ Add Scene to Today"}
              </button>

              <button
                onClick={(e) => toggleFav(e, activeFolder.id)}
                style={{
                  background: '#16161f',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: favorites.includes(activeFolder.id) ? '#ef4444' : '#fff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {favorites.includes(activeFolder.id) ? '❤️' : '🤍'}
              </button>
            </div>
          </div>

          {/* Folder Scene Card Header */}
          <div style={{
            background: 'linear-gradient(135deg, #161622 0%, #1e1b12 100%)',
            border: '1px solid rgba(212,175,55,0.35)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: '#D4AF37', color: '#000', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>
                📁 {activeFolder.scene_number || 'SCENE'}
              </span>
              {(activeFolder.events || [activeFolder.event]).map((ev: string) => (
                <span key={ev} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                  {ev}
                </span>
              ))}
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                📸 {currentFolderImages.length} Reference Images
              </span>
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', margin: '0 0 6px 0' }}>
              {activeFolder.title}
            </h1>
            {activeFolder.description && (
              <p style={{ fontSize: '13px', color: '#bbb', margin: '0 0 14px 0', lineHeight: '1.4' }}>
                {activeFolder.description}
              </p>
            )}

            {/* Director's Vocal Cue Callout Box */}
            {activeFolder.director_notes && (
              <div style={{
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.3)',
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  🗣️ DIRECTOR&apos;S VOCAL CUE TO COUPLE:
                </div>
                <div style={{ fontSize: '13px', color: '#fff', fontStyle: 'italic', lineHeight: '1.4' }}>
                  &ldquo;{activeFolder.director_notes}&rdquo;
                </div>
              </div>
            )}

            {/* Angle & Movement Badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {activeFolder.camera_angle && (
                <div style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: '#38bdf8', fontWeight: '600' }}>
                  📐 Angle: {activeFolder.camera_angle}
                </div>
              )}
              {activeFolder.movement && (
                <div style={{ background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.3)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: '#c084fc', fontWeight: '600' }}>
                  🎬 Movement: {activeFolder.movement}
                </div>
              )}
            </div>
          </div>

          {/* Reference Images Gallery Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🖼️ Reference Photos in this Folder ({currentFolderImages.length})
            </h2>
            <span style={{ fontSize: '11px', color: '#888' }}>Tap image to view high-res</span>
          </div>

          {/* Reference Images 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {currentFolderImages.map((imgUrl, idx) => (
              <div
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                style={{
                  backgroundColor: '#12121a',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <div style={{ position: 'relative', width: '100%', paddingTop: '135%', backgroundColor: '#000', overflow: 'hidden' }}>
                  <img
                    src={imgUrl}
                    alt={`Reference ${idx + 1}`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />

                  {/* Shot Index Badge */}
                  <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.75)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    #{idx + 1}
                  </div>

                  {/* Zoom indicator */}
                  <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                    🔍
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Full-Screen Lightbox */}
          {lightboxIndex !== null && (
            <div 
              onClick={() => setLightboxIndex(null)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.96)',
                backdropFilter: 'blur(10px)',
                zIndex: 3500,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}
            >
              {/* Lightbox Top Bar */}
              <div 
                onClick={e => e.stopPropagation()} 
                style={{ width: '100%', maxWidth: '500px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#D4AF37', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                    {activeFolder.scene_number || 'Scene'}
                  </span>
                  <span style={{ color: '#aaa', fontSize: '12px' }}>
                    Shot {lightboxIndex + 1} of {currentFolderImages.length}
                  </span>
                </div>
                <button
                  onClick={() => setLightboxIndex(null)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: '26px', cursor: 'pointer', padding: 0 }}
                >
                  ✕
                </button>
              </div>

              {/* Main Image Frame with Previous/Next Arrows */}
              <div 
                onClick={e => e.stopPropagation()} 
                style={{ position: 'relative', width: '100%', maxWidth: '500px', maxHeight: '72vh', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(212,175,55,0.3)', boxShadow: '0 20px 60px rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}
              >
                <img
                  src={currentFolderImages[lightboxIndex]}
                  alt={`Shot ${lightboxIndex + 1}`}
                  style={{ width: '100%', height: 'auto', maxHeight: '72vh', objectFit: 'contain' }}
                />

                {/* Left Arrow */}
                {lightboxIndex > 0 && (
                  <button
                    onClick={() => setLightboxIndex(lightboxIndex - 1)}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.65)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      fontSize: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ‹
                  </button>
                )}

                {/* Right Arrow */}
                {lightboxIndex < currentFolderImages.length - 1 && (
                  <button
                    onClick={() => setLightboxIndex(lightboxIndex + 1)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.65)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      fontSize: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ›
                  </button>
                )}
              </div>

              {/* Lightbox Bottom Info */}
              <div 
                onClick={e => e.stopPropagation()} 
                style={{ width: '100%', maxWidth: '500px', marginTop: '12px' }}
              >
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '2px' }}>
                  {activeFolder.title}
                </div>
                {activeFolder.director_notes && (
                  <div style={{ fontSize: '11px', color: '#ccc', fontStyle: 'italic' }}>
                    &ldquo;{activeFolder.director_notes}&rdquo;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: TOP-LEVEL SCENE FOLDERS GRID */
        <div>
          {/* Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧭 Directional Shoots
              </h1>
              <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                Scene folders with vocal director cues &amp; reference galleries
              </p>
            </div>
            <button
              onClick={handleManualSync}
              style={{
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.3)',
                color: '#D4AF37',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span style={{ display: 'inline-block', transform: syncing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s' }}>🔄</span>
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search scene folders, angles, cues (e.g. couple layout, whisper, 45°)..." 
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '10px', 
                border: '1px solid rgba(255,255,255,0.1)', 
                background: '#16161f', 
                color: 'white', 
                fontSize: '13px', 
                boxSizing: 'border-box' 
              }} 
            />
            {search && (
              <button 
                onClick={() => setSearch('')} 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Event Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
            {['All', ...REEL_EVENTS].map(ev => (
              <button
                key={ev}
                onClick={() => setSelectedEvent(ev)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: '1px solid',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backgroundColor: selectedEvent === ev ? '#D4AF37' : 'rgba(255,255,255,0.04)',
                  color: selectedEvent === ev ? '#000' : '#aaa',
                  borderColor: selectedEvent === ev ? '#D4AF37' : 'rgba(255,255,255,0.1)',
                }}
              >
                {ev}
              </button>
            ))}
          </div>

          {/* Folders List */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📁</div>
              <p style={{ margin: 0, fontSize: '14px' }}>No directional scene folders found.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filtered.map(shoot => {
                const isFav = favorites.includes(shoot.id);
                const isToday = todayIds.includes(shoot.id);
                const shootEvents = shoot.events || (shoot.event ? shoot.event.split(',').map((x: string) => x.trim()) : ['General']);
                const imgCount = shoot.reference_images?.length || 1;
                const previewImages = shoot.reference_images && shoot.reference_images.length > 0 
                  ? shoot.reference_images.slice(0, 3) 
                  : [shoot.cover_image || shoot.media_url || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800'];

                return (
                  <div 
                    key={shoot.id}
                    onClick={() => setActiveFolder(shoot)}
                    style={{
                      backgroundColor: '#12121a',
                      borderRadius: '16px',
                      border: '1px solid rgba(212,175,55,0.25)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
                      transition: 'transform 0.15s ease, border-color 0.15s ease'
                    }}
                  >
                    {/* Folder Header Tab Styling */}
                    <div style={{
                      backgroundColor: '#1a1820',
                      padding: '10px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>📁</span>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {shoot.scene_number || 'SCENE'}
                        </span>
                        <span style={{ background: 'rgba(255,255,255,0.08)', color: '#bbb', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                          {shootEvents[0]}
                        </span>
                      </div>

                      {/* Reference count indicator badge */}
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}>
                        🖼️ {imgCount} Photos
                      </span>
                    </div>

                    {/* Folder Preview Media Area: 3-Image Collage or Cover */}
                    <div style={{ position: 'relative', width: '100%', height: '170px', backgroundColor: '#0a0a0f', overflow: 'hidden' }}>
                      {previewImages.length >= 3 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', height: '100%', gap: '2px' }}>
                          <div style={{ position: 'relative', height: '100%' }}>
                            <img src={previewImages[0]} alt="Primary" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '2px', height: '100%' }}>
                            <img src={previewImages[1]} alt="Secondary" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <img src={previewImages[2]} alt="Tertiary" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={previewImages[0]}
                          alt={shoot.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}

                      {/* Gradient Overlay */}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0.1) 60%)' }} />

                      {/* Action Buttons Overlay (Favorite & Today) */}
                      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: '6px', zIndex: 30 }}>
                        <button
                          onClick={(e) => toggleToday(e, shoot.id)}
                          style={{
                            background: isToday ? '#10b981' : 'rgba(0,0,0,0.65)',
                            border: isToday ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.3)',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)'
                          }}
                          title="Add to Today's Shoot"
                        >
                          {isToday ? '✓ Today' : '+ Today'}
                        </button>
                        <button
                          onClick={(e) => toggleFav(e, shoot.id)}
                          style={{
                            background: 'rgba(0,0,0,0.65)',
                            border: isFav ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.3)',
                            color: isFav ? '#ef4444' : '#fff',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(4px)'
                          }}
                          title={isFav ? "Remove Favorite" : "Add to Favorites"}
                        >
                          {isFav ? '❤️' : '🤍'}
                        </button>
                      </div>

                      {/* Camera Angle & Movement Badges in media bottom */}
                      <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10, display: 'flex', gap: '6px', flexWrap: 'wrap', zIndex: 10 }}>
                        {shoot.camera_angle && (
                          <span style={{ background: 'rgba(56,189,248,0.25)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.5)', padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                            📐 {shoot.camera_angle}
                          </span>
                        )}
                        {shoot.movement && (
                          <span style={{ background: 'rgba(192,132,252,0.25)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.5)', padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                            🎬 {shoot.movement}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Box */}
                    <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#fff', fontWeight: 'bold' }}>
                          {shoot.title}
                        </h3>
                        {shoot.description && (
                          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#aaa', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {shoot.description}
                          </p>
                        )}
                      </div>

                      {/* Director Cue Snippet */}
                      {shoot.director_notes && (
                        <div style={{
                          backgroundColor: 'rgba(212,175,55,0.06)',
                          borderLeft: '3px solid #D4AF37',
                          padding: '6px 8px',
                          borderRadius: '0 6px 6px 0',
                          fontSize: '11px',
                          color: '#D4AF37',
                          lineHeight: '1.3',
                          fontStyle: 'italic',
                          margin: '8px 0'
                        }}>
                          &ldquo;{shoot.director_notes}&rdquo;
                        </div>
                      )}

                      {/* Open Folder CTA Button */}
                      <button
                        onClick={() => setActiveFolder(shoot)}
                        style={{
                          marginTop: '6px',
                          background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)',
                          border: '1px solid rgba(212,175,55,0.4)',
                          color: '#D4AF37',
                          padding: '8px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>📂 Open Scene Folder ({imgCount} Reference Images)</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
