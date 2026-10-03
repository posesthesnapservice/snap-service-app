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
  const [activeItem, setActiveItem] = useState<DirectionalShoot | null>(null);
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
      const matchDesc = s.description?.toLowerCase().includes(q);
      const matchNotes = s.director_notes?.toLowerCase().includes(q);
      const matchAngle = s.camera_angle?.toLowerCase().includes(q);
      const matchMove = s.movement?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchNotes && !matchAngle && !matchMove) return false;
    }
    if (selectedEvent !== 'All') {
      const shootEvents = s.events || (s.event ? s.event.split(',').map((x: string) => x.trim()) : []);
      if (!shootEvents.includes(selectedEvent) && s.event !== selectedEvent) return false;
    }
    return true;
  });

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

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🧭 Directional Shoots
          </h1>
          <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
            Director cues, pacing &amp; couple positioning prompts
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
          placeholder="Search angles, cues, movements (e.g. whisper, 45°, walk)..." 
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

      {/* Grid of Directional Shoots */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧭</div>
          <p style={{ margin: 0, fontSize: '14px' }}>No directional shoots found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filtered.map(shoot => {
            const isFav = favorites.includes(shoot.id);
            const isToday = todayIds.includes(shoot.id);
            const shootEvents = shoot.events || (shoot.event ? shoot.event.split(',').map((x: string) => x.trim()) : ['General']);

            return (
              <div 
                key={shoot.id}
                onClick={() => setActiveItem(shoot)}
                style={{
                  backgroundColor: '#12121a',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.07)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                {/* Media Container */}
                <div style={{ position: 'relative', width: '100%', paddingTop: '110%', backgroundColor: '#0a0a0f', overflow: 'hidden' }}>
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

                  {/* Gradient Overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0.1) 50%, rgba(10,10,15,0.4) 100%)' }} />

                  {/* Event Badges */}
                  <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexWrap: 'wrap', gap: '4px', zIndex: 10, maxWidth: '65%' }}>
                    {shootEvents.map((ev: string) => (
                      <span key={ev} style={{ background: '#D4AF37', color: '#000', padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                        {ev}
                      </span>
                    ))}
                  </div>

                  {/* Action Buttons Overlay (Favorite & Today) */}
                  <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: '6px', zIndex: 40 }}>
                    <button
                      onClick={(e) => toggleToday(e, shoot.id)}
                      style={{
                        background: isToday ? '#D4AF37' : 'rgba(0,0,0,0.6)',
                        border: isToday ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.3)',
                        color: isToday ? '#000' : '#fff',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Add to Today's Shoot"
                    >
                      {isToday ? '✓ Today' : '+ Today'}
                    </button>
                    <button
                      onClick={(e) => toggleFav(e, shoot.id)}
                      style={{
                        background: 'rgba(0,0,0,0.6)',
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
                  <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, display: 'flex', gap: '6px', flexWrap: 'wrap', zIndex: 10 }}>
                    {shoot.camera_angle && (
                      <span style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                        📐 {shoot.camera_angle}
                      </span>
                    )}
                    {shoot.movement && (
                      <span style={{ background: 'rgba(192,132,252,0.2)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.4)', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
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
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#aaa', lineHeight: '1.4' }}>
                        {shoot.description}
                      </p>
                    )}
                  </div>

                  {/* Director Cue Box */}
                  {shoot.director_notes && (
                    <div style={{
                      backgroundColor: 'rgba(212,175,55,0.06)',
                      borderLeft: '3px solid #D4AF37',
                      padding: '8px 10px',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '11px',
                      color: '#D4AF37',
                      lineHeight: '1.4',
                      fontStyle: 'italic',
                      marginTop: '8px'
                    }}>
                      🗣️ <strong>Director Cue:</strong> &ldquo;{shoot.director_notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Detail Modal */}
      {activeItem && (
        <div 
          onClick={() => setActiveItem(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#12121a',
              borderRadius: '16px',
              border: '1px solid rgba(212,175,55,0.3)',
              maxWidth: '550px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Media */}
            <div style={{ position: 'relative', width: '100%', paddingTop: '75%', backgroundColor: '#000', overflow: 'hidden' }}>
              {activeItem.media_url?.endsWith('.mp4') ? (
                <video
                  src={activeItem.media_url}
                  autoPlay
                  controls
                  playsInline
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <img 
                  src={activeItem.cover_image || activeItem.media_url || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800'}
                  alt={activeItem.title}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
              <button
                onClick={() => setActiveItem(null)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {(activeItem.events || [activeItem.event]).map((ev: string) => (
                  <span key={ev} style={{ background: '#D4AF37', color: '#000', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    {ev}
                  </span>
                ))}
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#fff' }}>
                {activeItem.title}
              </h2>

              {activeItem.description && (
                <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                  {activeItem.description}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                {activeItem.camera_angle && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '3px' }}>Camera Angle</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#38bdf8' }}>📐 {activeItem.camera_angle}</div>
                  </div>
                )}
                {activeItem.movement && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '3px' }}>Movement</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#c084fc' }}>🎬 {activeItem.movement}</div>
                  </div>
                )}
              </div>

              {activeItem.director_notes && (
                <div style={{
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  padding: '14px',
                  borderRadius: '10px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#D4AF37', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🗣️ EXACT VOCAL DIRECTOR CUE:
                  </div>
                  <div style={{ fontSize: '13px', color: '#fff', fontStyle: 'italic', lineHeight: '1.5' }}>
                    &ldquo;{activeItem.director_notes}&rdquo;
                  </div>
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={(e) => toggleToday(e, activeItem.id)}
                  style={{
                    flex: 1,
                    backgroundColor: todayIds.includes(activeItem.id) ? '#D4AF37' : 'rgba(255,255,255,0.08)',
                    color: todayIds.includes(activeItem.id) ? '#000' : '#fff',
                    border: todayIds.includes(activeItem.id) ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {todayIds.includes(activeItem.id) ? "✓ Added to Today's Shoot" : "+ Add to Today's Shoot"}
                </button>
                <button
                  onClick={(e) => toggleFav(e, activeItem.id)}
                  style={{
                    backgroundColor: favorites.includes(activeItem.id) ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                    color: favorites.includes(activeItem.id) ? '#ef4444' : '#fff',
                    border: favorites.includes(activeItem.id) ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.2)',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {favorites.includes(activeItem.id) ? '❤️ Favorited' : '🤍 Favorite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
