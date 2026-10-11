'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  getPosesDB, 
  getTrendingReelsDB, 
  getCinematicDB, 
  getDirectionalShootsDB,
  fetchPosesCloud, 
  fetchTrendingReelsCloud,
  fetchDirectionalShootsCloud
} from '@/lib/poses-db-helpers';
import { getTodayShootIds, toggleTodayShoot } from '@/lib/today-shoot-helpers';
import { Pose, TrendingReel, CinematicShot, DirectionalShoot } from '@/lib/types';

interface UnifiedFavoriteItem {
  id: string;
  title: string;
  type: 'pose' | 'reel' | 'cinematic' | 'directional';
  image_url: string;
  video_url?: string;
  event?: string;
  description?: string;
  orientation?: 'portrait' | 'landscape';
  camera_angle?: string;
  movement?: string;
  director_notes?: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [todayIds, setTodayIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Poses' | 'Reels' | 'Cinematic' | 'Directional'>('All');
  
  // Data sources
  const [allPoses, setAllPoses] = useState<Pose[]>([]);
  const [allReels, setAllReels] = useState<TrendingReel[]>([]);
  const [allCinematic, setAllCinematic] = useState<CinematicShot[]>([]);
  const [allDirectional, setAllDirectional] = useState<DirectionalShoot[]>([]);
  
  // Active video modal
  const [activeVideo, setActiveVideo] = useState<UnifiedFavoriteItem | null>(null);
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
    setTimeout(() => setToastMsg(''), 2500);
  };

  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem('snap_favorites') || '[]');
    setFavorites(favs);
    setTodayIds(getTodayShootIds());

    setAllPoses(getPosesDB());
    setAllReels(getTrendingReelsDB());
    setAllCinematic(getCinematicDB());
    setAllDirectional(getDirectionalShootsDB());

    // Background sync from cloud to ensure any fresh cloud items are available
    fetchPosesCloud().then(p => { if (p) setAllPoses(p); }).catch(() => {});
    fetchTrendingReelsCloud().then(r => { if (r && r.length > 0) setAllReels(r); }).catch(() => {});
    fetchDirectionalShootsCloud().then(d => { if (d && d.length > 0) setAllDirectional(d); }).catch(() => {});
  }, []);

  const toggleFav = (e: React.MouseEvent, id: string, title?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = favorites.filter(fid => fid !== id);
    setFavorites(updated);
    localStorage.setItem('snap_favorites', JSON.stringify(updated));
    showToast(`🤍 Removed from favorites`);
  };

  const toggleToday = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleTodayShoot(id);
    setTodayIds(updated);
    const isAdded = updated.includes(id);
    showToast(isAdded ? `✅ Added to Today's Shoot!` : `Removed from Today's Shoot`);
  };

  // Build unified favorites list
  const unifiedItems: UnifiedFavoriteItem[] = [];

  // 1. Poses
  allPoses.forEach(p => {
    if (favorites.includes(p.id)) {
      unifiedItems.push({
        id: p.id,
        title: p.title,
        type: 'pose',
        image_url: p.image_url || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
        event: p.events?.[0] || 'Wedding',
        description: p.instructions,
      });
    }
  });

  // 2. Reels
  allReels.forEach(r => {
    if (favorites.includes(r.id)) {
      unifiedItems.push({
        id: r.id,
        title: r.title,
        type: 'reel',
        image_url: r.cover_image || 'https://images.unsplash.com/photo-1519741347686-cfcbf6bde2af?w=800',
        video_url: r.video_url,
        event: (r as any).events?.[0] || r.event || 'Reel',
        description: r.description,
        orientation: r.orientation || 'portrait',
      });
    }
  });

  // 3. Cinematic Shots
  allCinematic.forEach(c => {
    if (favorites.includes(c.id)) {
      unifiedItems.push({
        id: c.id,
        title: c.title,
        type: 'cinematic',
        image_url: c.media_url || 'https://images.unsplash.com/photo-1606220838315-056192d5e927?w=400',
        event: c.event || 'Cinematic',
        description: `${c.camera_movement || ''} · ${c.framing || ''}`,
      });
    }
  });

  // 4. Directional Shoots
  allDirectional.forEach(d => {
    if (favorites.includes(d.id)) {
      unifiedItems.push({
        id: d.id,
        title: d.title,
        type: 'directional',
        image_url: d.cover_image || d.media_url || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
        video_url: d.media_url?.endsWith('.mp4') ? d.media_url : undefined,
        event: d.events?.[0] || d.event || 'Directional',
        description: d.director_notes ? `Director: "${d.director_notes}"` : d.description,
        camera_angle: d.camera_angle,
        movement: d.movement,
        director_notes: d.director_notes,
      });
    }
  });

  const filteredItems = unifiedItems.filter(item => {
    if (activeTab === 'Poses') return item.type === 'pose';
    if (activeTab === 'Reels') return item.type === 'reel';
    if (activeTab === 'Cinematic') return item.type === 'cinematic';
    if (activeTab === 'Directional') return item.type === 'directional';
    return true;
  });

  const posesCount = unifiedItems.filter(i => i.type === 'pose').length;
  const reelsCount = unifiedItems.filter(i => i.type === 'reel').length;
  const cinematicCount = unifiedItems.filter(i => i.type === 'cinematic').length;
  const directionalCount = unifiedItems.filter(i => i.type === 'directional').length;

  return (
    <div style={{ padding: '16px', paddingBottom: '90px', minHeight: '100vh', background: '#0a0a0f', color: '#fff' }}>
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

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => router.back()} 
            style={{ 
              background: '#12121a', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: '#fff', 
              borderRadius: '50%', 
              width: '36px', 
              height: '36px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ←
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#D4AF37' }}>
              My Favorites ❤️
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>
              {unifiedItems.length} saved references across poses, reels, cinematic &amp; directional
            </p>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
        {[
          { label: 'All', count: unifiedItems.length },
          { label: 'Poses', count: posesCount },
          { label: 'Reels', count: reelsCount },
          { label: 'Cinematic', count: cinematicCount },
          { label: 'Directional', count: directionalCount },
        ].map(tab => {
          const isSelected = activeTab === tab.label;
          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label as any)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: isSelected ? '#D4AF37' : '#12121a',
                color: isSelected ? '#000' : '#888',
                border: isSelected ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.2s',
              }}
            >
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          );
        })}
      </div>

      {/* Content Grid */}
      {filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>💔</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '16px' }}>No favorites in this category</h3>
          <p style={{ fontSize: '12px', color: '#777', maxWidth: '280px', margin: 0 }}>
            Tap the heart ❤️ button on any pose, reel, or directional shoot to save it here.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/poses" style={{ background: '#1a1a26', border: '1px solid #D4AF37', color: '#D4AF37', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}>
              Browse Poses 📷
            </Link>
            <Link href="/trending-reels" style={{ background: '#1a1a26', border: '1px solid #D4AF37', color: '#D4AF37', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}>
              Browse Reels 🔥
            </Link>
            <Link href="/directional-shoots" style={{ background: '#1a1a26', border: '1px solid #10b981', color: '#10b981', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}>
              Directional Shoots 🧭
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {filteredItems.map(item => {
            const isToday = todayIds.includes(item.id);
            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#12121a',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                }}
                onClick={() => {
                  if (item.type === 'reel') {
                    setActiveVideo(item);
                  } else if (item.type === 'directional') {
                    router.push('/directional-shoots');
                  } else {
                    router.push(`/poses/${item.id}`);
                  }
                }}
              >
                {/* Media Preview */}
                <div style={{ position: 'relative', width: '100%', paddingTop: '130%', backgroundColor: '#000', overflow: 'hidden' }}>
                  {item.video_url ? (
                    <video
                      src={item.video_url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      poster={item.image_url}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}

                  {/* Gradient Overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)' }} />

                  {/* Type Badge */}
                  <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
                    <span style={{
                      backgroundColor: item.type === 'reel' ? '#ef4444' : item.type === 'cinematic' ? '#38bdf8' : item.type === 'directional' ? '#10b981' : '#D4AF37',
                      color: item.type === 'cinematic' || item.type === 'directional' ? '#000' : '#000',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                    }}>
                      {item.type === 'reel' ? '🔥 REEL' : item.type === 'cinematic' ? '🎬 VIDEO' : item.type === 'directional' ? '🧭 DIR' : '📷 POSE'}
                    </span>
                  </div>

                  {/* Action Buttons (Top Right) */}
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: '5px', zIndex: 30 }}>
                    {/* Add to Today Shoot Button */}
                    <button
                      onClick={(e) => toggleToday(e, item.id)}
                      style={{
                        background: isToday ? '#10b981' : 'rgba(0,0,0,0.7)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Add to Today's Shoot"
                    >
                      {isToday ? '✓' : '+'}
                    </button>

                    {/* Unfavorite Button */}
                    <button
                      onClick={(e) => toggleFav(e, item.id, item.title)}
                      style={{
                        background: 'rgba(239,68,68,0.9)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Remove from Favorites"
                    >
                      ❤️
                    </button>
                  </div>

                  {/* Play Icon for Reel */}
                  {item.type === 'reel' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(212,175,55,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Title Bar on Image */}
                  <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 10 }}>
                    <div style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 'bold' }}>{item.event}</div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Video Modal for Favorite Reels with iOS Swipe-Down Dismiss */}
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
            background: `rgba(0,0,0,${Math.max(0.25, 0.95 - (Math.max(0, dragY) / 700) * 0.7)})`, 
            backdropFilter: 'blur(12px)', 
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 2500, 
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
              maxWidth: '420px',
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
          </div>

          {/* Video Modal Card */}
          <div 
            onTouchStart={handleTouchStart}
            onMouseDown={handleMouseDown}
            style={{ 
              width: '100%', 
              maxWidth: '420px', 
              position: 'relative',
              transform: `translateY(${Math.max(0, dragY)}px) scale(${Math.max(0.88, 1 - (Math.max(0, dragY) / 1200))})`,
              transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.22s ease',
              opacity: isClosing ? 0 : 1,
              willChange: 'transform, opacity',
              borderRadius: '16px',
              cursor: isDragging ? 'grabbing' : 'default'
            }}
          >
            {/* Top Right Floating Close Button */}
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
            <div style={{ width: '100%', paddingTop: '140%', position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000', border: '1px solid rgba(212,175,55,0.4)', boxShadow: '0 20px 50px rgba(0,0,0,0.9)' }}>
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
                  Favorite Reel
                </span>
              </div>
            </div>

            {/* Title & Action Buttons */}
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 'bold', color: '#D4AF37' }}>{activeVideo.title}</h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#bbb', lineHeight: '1.4' }}>{activeVideo.description}</p>
              </div>
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
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {todayIds.includes(activeVideo.id) ? '✓ In Today' : '+ Add to Today'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
