'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getTrendingReelsDB, fetchTrendingReelsCloud } from '@/lib/poses-db-helpers';
import { TrendingReel } from '@/lib/types';
import { REEL_EVENTS } from '@/lib/constants';
import { getTodayShootIds, toggleTodayShoot } from '@/lib/today-shoot-helpers';
import { useRouter } from 'next/navigation';
import { getUser, canAccessVideography } from '@/lib/auth-helpers';

export default function TrendingReelsPage() {
  const router = useRouter();
  const [reels, setReels] = useState<TrendingReel[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('All');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [todayIds, setTodayIds] = useState<string[]>([]);
  const [activeVideo, setActiveVideo] = useState<TrendingReel | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Swipe-down / drag-to-dismiss modal states
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const handleCloseVideo = () => {
    setIsClosing(true);
    setDragY(typeof window !== 'undefined' ? window.innerHeight : 700);
    setTimeout(() => {
      setActiveVideo(null);
      setDragY(0);
      setIsDragging(false);
      setIsClosing(false);
    }, 220);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    touchCurrentY.current = currentY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      setDragY(diff);
    } else {
      setDragY(diff * 0.15);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null) return;
    const diff = (touchCurrentY.current ?? touchStartY.current) - touchStartY.current;
    const elapsed = Date.now() - touchStartTime.current;
    const velocity = diff / Math.max(elapsed, 1);

    if (diff > 80 || (diff > 30 && velocity > 0.35)) {
      handleCloseVideo();
    } else {
      setIsDragging(false);
      setDragY(0);
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    touchStartY.current = e.clientY;
    touchCurrentY.current = e.clientY;
    touchStartTime.current = Date.now();
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || touchStartY.current === null) return;
    const currentY = e.clientY;
    touchCurrentY.current = currentY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      setDragY(diff);
    } else {
      setDragY(diff * 0.15);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || touchStartY.current === null) return;
    const diff = (touchCurrentY.current ?? touchStartY.current) - touchStartY.current;
    const elapsed = Date.now() - touchStartTime.current;
    const velocity = diff / Math.max(elapsed, 1);

    if (diff > 80 || (diff > 30 && velocity > 0.35)) {
      handleCloseVideo();
    } else {
      setIsDragging(false);
      setDragY(0);
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
  };

  useEffect(() => {
    if (!activeVideo) {
      setDragY(0);
      setIsDragging(false);
      setIsClosing(false);
    }
  }, [activeVideo]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2200);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    const cloud = await fetchTrendingReelsCloud();
    if (cloud && cloud.length > 0) {
      setReels(cloud.filter(r => r.status !== 'hidden'));
    }
    setTimeout(() => setSyncing(false), 600);
  };

  useEffect(() => {
    const u = getUser();
    if (u && !canAccessVideography(u.role)) {
      router.replace('/home');
      return;
    }

    setReels(getTrendingReelsDB().filter(r => r.status !== 'hidden'));
    const favs = JSON.parse(localStorage.getItem('snap_favorites') || '[]');
    setFavorites(favs);
    setTodayIds(getTodayShootIds());

    // Sync from Supabase Cloud Database (so newly uploaded PC reels appear on mobile!)
    fetchTrendingReelsCloud().then(cloudReels => {
      if (cloudReels && cloudReels.length > 0) {
        setReels(cloudReels.filter(r => r.status !== 'hidden'));
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

  const filtered = reels.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedEvent !== 'All') {
      const reelEvents = (r as any).events || (r.event ? r.event.split(',').map((s: string) => s.trim()) : []);
      if (!reelEvents.includes(selectedEvent) && r.event !== selectedEvent) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '16px', color: '#fff', minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1e1b10',
          color: '#D4AF37',
          border: '1px solid #D4AF37',
          padding: '10px 20px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: '600',
          zIndex: 3000,
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toastMsg}
        </div>
      )}

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔥 Trending Reels Guide
          </h1>
          <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>
            Live GIF-style looping previews · Tap any reel for full audio playback
          </p>
        </div>
        <button
          onClick={handleManualSync}
          style={{
            background: 'rgba(212,175,55,0.12)',
            border: '1px solid rgba(212,175,55,0.3)',
            color: '#D4AF37',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ display: 'inline-block', transform: syncing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s' }}>🔄</span>
          {syncing ? 'Syncing...' : 'Sync Cloud'}
        </button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '14px' }}>
        <input 
          type="text" 
          placeholder="Search trending reels (e.g. Mehndi, Groom entry)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', boxSizing: 'border-box' }}
        />
      </div>

      {/* Event Category Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {REEL_EVENTS.map(ev => (
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
              backgroundColor: selectedEvent === ev ? '#D4AF37' : '#12121a',
              color: selectedEvent === ev ? '#000' : '#aaa',
              borderColor: selectedEvent === ev ? '#D4AF37' : 'rgba(255,255,255,0.08)',
            }}
          >
            {ev}
          </button>
        ))}
      </div>

      {/* Responsive 2-Column Mobile Grid Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .trending-reels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        @media (max-width: 640px) {
          .trending-reels-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .reel-card-info {
            padding: 8px 10px !important;
          }
          .reel-card-title {
            font-size: 12px !important;
            line-height: 1.3 !important;
            margin-bottom: 2px !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
          }
          .reel-card-desc {
            font-size: 10px !important;
            line-height: 1.25 !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 1 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
          }
          .reel-play-btn {
            width: 34px !important;
            height: 34px !important;
          }
          .reel-play-btn svg {
            width: 16px !important;
            height: 16px !important;
          }
          .reel-action-btn {
            width: 26px !important;
            height: 26px !important;
            font-size: 11px !important;
          }
          .reel-badge-tag {
            font-size: 9px !important;
            padding: 1px 5px !important;
          }
          .reel-gif-badge {
            font-size: 8px !important;
            padding: 2px 5px !important;
            bottom: 6px !important;
            left: 6px !important;
          }
        }
      ` }} />

      {/* Reels Grid */}
      <div className="trending-reels-grid">
        {filtered.map(reel => {
          const isPortrait = (reel.orientation || 'portrait') === 'portrait';
          const isFav = favorites.includes(reel.id);
          const isToday = todayIds.includes(reel.id);
          const reelEventList = (reel as any).events || (reel.event ? reel.event.split(',').map((s: string) => s.trim()) : ['General']);

          return (
            <div 
              key={reel.id} 
              style={{ 
                backgroundColor: '#12121a', 
                border: '1px solid rgba(255,255,255,0.08)', 
                borderRadius: '14px', 
                overflow: 'hidden', 
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onClick={() => setActiveVideo(reel)}
            >
              {/* Aspect Ratio Video Framing Container */}
              <div style={{ 
                position: 'relative', 
                width: '100%', 
                paddingTop: isPortrait ? '135%' : '56.25%', // 9:16 portrait vs 16:9 landscape
                backgroundColor: '#000',
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

                {/* Dark Gradient Overlay & Tap to Listen Icon */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}>
                  <div className="reel-play-btn" style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(212,175,55,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,0,0,0.6)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#000">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>
                </div>

                {/* Event & Aspect Tags */}
                <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '70%', zIndex: 10 }}>
                  {reelEventList.slice(0, 2).map((ev: string) => (
                    <span key={ev} className="reel-badge-tag" style={{ background: '#D4AF37', color: '#000', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {ev}
                    </span>
                  ))}
                  <span className="reel-badge-tag" style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', border: '1px solid rgba(255,255,255,0.2)' }}>
                    {isPortrait ? '📱 9:16' : '🖥️ 16:9'}
                  </span>
                </div>

                {/* Muted GIF Indicator Badge */}
                <div className="reel-gif-badge" style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.7)', color: '#D4AF37', fontSize: '10px', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(212,175,55,0.3)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🔇 Loop</span>
                </div>

                {/* Quick Action Overlay Buttons */}
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: '5px', zIndex: 40 }}>
                  <button 
                    className="reel-action-btn"
                    onClick={e => toggleToday(e, reel.id)} 
                    style={{ 
                      background: isToday ? '#10b981' : 'rgba(0,0,0,0.6)', 
                      border: '1px solid rgba(255,255,255,0.2)', 
                      color: '#fff', 
                      borderRadius: '50%', 
                      width: '32px', 
                      height: '32px', 
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                    title="Add to Today Shoot"
                  >
                    {isToday ? '✓' : '+'}
                  </button>
                  <button 
                    className="reel-action-btn"
                    onClick={e => toggleFav(e, reel.id)} 
                    style={{ 
                      background: isFav ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.6)', 
                      border: '1px solid rgba(255,255,255,0.2)', 
                      color: '#fff', 
                      borderRadius: '50%', 
                      width: '32px', 
                      height: '32px', 
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                    title={isFav ? "Remove from favorites" : "Add to favorites"}
                  >
                    {isFav ? '❤️' : '🤍'}
                  </button>
                </div>
              </div>

              {/* Title & Info */}
              <div className="reel-card-info" style={{ padding: '12px' }}>
                <h3 className="reel-card-title" style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{reel.title}</h3>
                {reel.description && (
                  <p className="reel-card-desc" style={{ margin: 0, fontSize: '11px', color: '#aaa', lineHeight: '1.4' }}>{reel.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Video Player Modal with iOS Swipe-Down Dismiss */}
      {activeVideo && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseVideo();
            }
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: `rgba(0,0,0,${Math.max(0.25, 0.94 - (Math.max(0, dragY) / 700) * 0.7)})`, 
            backdropFilter: 'blur(12px)', 
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 2000, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '12px 16px 24px 16px',
            overflow: 'hidden',
            touchAction: 'none'
          }}
        >
          {/* iOS Pull Down Drag Pill */}
          <div 
            onTouchStart={handleTouchStart}
            onMouseDown={handleMouseDown}
            style={{ 
              width: '100%', 
              maxWidth: (activeVideo.orientation || 'portrait') === 'portrait' ? '400px' : '720px',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              padding: '6px 0 10px 0', 
              cursor: 'grab',
              userSelect: 'none',
              transform: `translateY(${Math.max(0, dragY) * 0.8}px)`,
              transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s',
              opacity: isClosing ? 0 : Math.max(0.2, 1 - (dragY / 400))
            }}
          >
            <div style={{ 
              width: '44px', 
              height: '5px', 
              borderRadius: '3px', 
              background: 'rgba(255,255,255,0.5)', 
              boxShadow: '0 1px 4px rgba(0,0,0,0.6)' 
            }} />
            <span style={{ 
              fontSize: '11px', 
              color: 'rgba(255,255,255,0.5)', 
              marginTop: '5px', 
              fontWeight: '500', 
              letterSpacing: '0.2px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>↓</span> Pull down to close
            </span>
          </div>

          {/* Main Video Modal Card */}
          <div 
            onTouchStart={handleTouchStart}
            onMouseDown={handleMouseDown}
            style={{ 
              width: '100%', 
              maxWidth: (activeVideo.orientation || 'portrait') === 'portrait' ? '400px' : '720px', 
              position: 'relative',
              transform: `translateY(${Math.max(0, dragY)}px) scale(${Math.max(0.88, 1 - (Math.max(0, dragY) / 1200))})`,
              transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.22s ease',
              opacity: isClosing ? 0 : 1,
              willChange: 'transform, opacity',
              borderRadius: '16px',
              cursor: isDragging ? 'grabbing' : 'default'
            }}
          >
            {/* Top Right Floating Close Button - clearly visible & easily reachable */}
            <button 
              onClick={handleCloseVideo}
              style={{ 
                position: 'absolute', 
                top: '12px', 
                right: '12px', 
                background: 'rgba(0,0,0,0.65)', 
                border: '1px solid rgba(255,255,255,0.25)', 
                color: '#fff', 
                fontSize: '16px', 
                cursor: 'pointer',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 40,
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.6)'
              }}
              title="Close (or swipe down)"
            >
              ✕
            </button>

            {/* Video Frame */}
            <div style={{ 
              width: '100%', 
              paddingTop: (activeVideo.orientation || 'portrait') === 'portrait' ? '140%' : '56.25%', 
              position: 'relative', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              background: '#000', 
              border: '1px solid rgba(212,175,55,0.4)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9)'
            }}>
              <video 
                src={activeVideo.video_url || 'https://assets.mixkit.co/videos/preview/mixkit-bride-and-groom-walking-in-a-park-41221-large.mp4'} 
                controls 
                autoPlay 
                loop 
                playsInline
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Event Badge Top Left */}
              <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: '6px', zIndex: 30, pointerEvents: 'none' }}>
                <span style={{ background: '#D4AF37', color: '#000', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  {activeVideo.event}
                </span>
                <span style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {(activeVideo.orientation || 'portrait') === 'portrait' ? '📱 9:16' : '🖥️ 16:9'}
                </span>
              </div>
            </div>

            {/* Title & Action Buttons Row */}
            <div style={{ marginTop: '12px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 'bold', color: '#D4AF37' }}>{activeVideo.title}</h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#bbb', lineHeight: '1.4' }}>{activeVideo.description}</p>
              </div>

              {/* Action buttons inside player */}
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={(e) => toggleToday(e, activeVideo.id)}
                  style={{
                    background: todayIds.includes(activeVideo.id) ? '#10b981' : '#D4AF37',
                    color: '#000',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {todayIds.includes(activeVideo.id) ? '✓ In Today' : '+ Today'}
                </button>
                <button
                  onClick={(e) => toggleFav(e, activeVideo.id)}
                  style={{
                    background: favorites.includes(activeVideo.id) ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                  title={favorites.includes(activeVideo.id) ? "Remove from favorites" : "Add to favorites"}
                >
                  {favorites.includes(activeVideo.id) ? '❤️' : '🤍'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
