'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTodayShootIds, toggleTodayShoot } from '@/lib/today-shoot-helpers';
import { getPosesDB, fetchPosesCloud } from '@/lib/poses-db-helpers';
import { Pose } from '@/lib/types';
import { getUser, canAccessPhotography } from '@/lib/auth-helpers';

const SUBJECT_FILTERS = ['All', 'Bride', 'Groom', 'Couple', 'Sisters', 'Brothers', 'Old Age'];
const EVENT_FILTERS = ['All', 'Mehndi', 'Nikah', 'Barat', 'Walima', 'Reception', 'Pre-Wedding'];
const SHOOT_TYPE_FILTERS = ['All', 'Solo', 'Couple', 'Portrait', 'Standing', 'Sitting', 'Walking', 'Romantic', 'Creative', 'Editorial', 'Traditional'];

export default function PosesPage() {
  const router = useRouter();
  const [posesList, setPosesList] = useState<Pose[]>([]);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [eventFilter, setEventFilter] = useState('All');
  const [shootTypeFilter, setShootTypeFilter] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [todayIds, setTodayIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Swipeable Popup States
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [animatingDir, setAnimatingDir] = useState<'left' | 'right' | null>(null);
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const u = getUser();
    if (u && !canAccessPhotography(u.role)) {
      router.replace('/home');
      return;
    }
    setPosesList(getPosesDB());
    const favs = JSON.parse(localStorage.getItem('snap_favorites') || '[]');
    setFavorites(favs);
    setTodayIds(getTodayShootIds());

    // Sync cloud poses from Supabase
    fetchPosesCloud().then(cloudPoses => {
      if (cloudPoses && cloudPoses.length > 0) {
        setPosesList(cloudPoses);
      }
    }).catch(() => {});

    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const toggleFav = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    let newFavs = [...favorites];
    if (newFavs.includes(id)) {
      newFavs = newFavs.filter(fid => fid !== id);
    } else {
      newFavs.push(id);
    }
    setFavorites(newFavs);
    localStorage.setItem('snap_favorites', JSON.stringify(newFavs));
  };

  const toggleToday = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleTodayShoot(id);
    setTodayIds(updated);
  };

  const filtered = (posesList || []).filter((p: any) => {
    if (p.status === 'hidden') return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (subjectFilter !== 'All' && !p.subjects?.includes(subjectFilter)) return false;
    if (eventFilter !== 'All' && !p.events?.includes(eventFilter)) return false;
    if (shootTypeFilter !== 'All' && !p.shoot_types?.includes(shootTypeFilter)) return false;
    return true;
  });

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (animatingDir !== null) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (activeIndex === null || animatingDir !== null) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;
    
    // Lock vertical scroll if horizontal swipe is happening
    if (Math.abs(diffX) > Math.abs(diffY)) {
      setSwipeOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (activeIndex === null || animatingDir !== null) return;
    const threshold = 70; // Min swipe distance
    
    if (swipeOffset < -threshold) {
      // Swiped Left -> Drop down to left & go to next pose
      navigatePose('next');
    } else if (swipeOffset > threshold) {
      // Swiped Right -> Drop down to right & go to prev pose
      navigatePose('prev');
    } else {
      setSwipeOffset(0);
    }
  };

  const navigatePose = (dir: 'next' | 'prev') => {
    if (activeIndex === null || filtered.length === 0 || animatingDir !== null) return;
    
    const flyDir = dir === 'next' ? 'left' : 'right';
    setAnimatingDir(flyDir);

    setTimeout(() => {
      if (dir === 'next') {
        setActiveIndex((prev) => (prev !== null && prev < filtered.length - 1 ? prev + 1 : 0));
      } else {
        setActiveIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filtered.length - 1));
      }
      setAnimatingDir(null);
      setSwipeOffset(0);
    }, 300);
  };

  // Dynamic Card Animations (Tinder-style drop down & rotate)
  let cardTransform = `translateX(${swipeOffset}px) translateY(${Math.abs(swipeOffset) * 0.35}px) rotate(${swipeOffset * 0.09}deg)`;
  let cardOpacity = 1;
  let cardTransition = swipeOffset === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s' : 'none';

  if (animatingDir === 'left') {
    cardTransform = 'translateX(-420px) translateY(280px) rotate(-38deg)';
    cardOpacity = 0;
    cardTransition = 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-out';
  } else if (animatingDir === 'right') {
    cardTransform = 'translateX(420px) translateY(280px) rotate(38deg)';
    cardOpacity = 0;
    cardTransition = 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-out';
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '80px', minHeight: '100vh', background: '#0a0a0f', color: 'white', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#D4AF37' }}>Pose Library</h1>
        </div>
      </header>

      <input 
        type="text" 
        placeholder="Search poses..." 
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', background: '#12121a', color: 'white', outline: 'none' }} 
      />

      {/* 3 Categories of Filter Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Row 1: Subject Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          {SUBJECT_FILTERS.map(f => (
            <button key={f} onClick={() => setSubjectFilter(f)} style={{ ...pillStyle, background: subjectFilter === f ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : '#12121a', color: subjectFilter === f ? '#000' : '#888', border: subjectFilter === f ? 'none' : '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              {f}
            </button>
          ))}
        </div>
        {/* Row 2: Event Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          {EVENT_FILTERS.map(f => (
            <button key={f} onClick={() => setEventFilter(f)} style={{ ...pillStyle, background: eventFilter === f ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : '#12121a', color: eventFilter === f ? '#000' : '#888', border: eventFilter === f ? 'none' : '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              {f}
            </button>
          ))}
        </div>
        {/* Row 3: Shoot Type Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          {SHOOT_TYPE_FILTERS.map(f => (
            <button key={f} onClick={() => setShootTypeFilter(f)} style={{ ...pillStyle, background: shootTypeFilter === f ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : '#12121a', color: shootTypeFilter === f ? '#000' : '#888', border: shootTypeFilter === f ? 'none' : '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '0.85rem', color: '#666' }}>Showing {filtered.length} poses</div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
          <div style={{ aspectRatio: '3 / 4', background: '#12121a', borderRadius: '10px' }}></div>
          <div style={{ aspectRatio: '3 / 4', background: '#12121a', borderRadius: '10px' }}></div>
          <div style={{ aspectRatio: '3 / 4', background: '#12121a', borderRadius: '10px' }}></div>
          <div style={{ aspectRatio: '3 / 4', background: '#12121a', borderRadius: '10px' }}></div>
          <div style={{ aspectRatio: '3 / 4', background: '#12121a', borderRadius: '10px' }}></div>
          <div style={{ aspectRatio: '3 / 4', background: '#12121a', borderRadius: '10px' }}></div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔍</div>
          <p>No poses found.</p>
        </div>
      ) : (
        /* Portrait vertical grid layout */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
          {filtered.map((pose: any, idx: number) => (
            <div 
              key={pose.id} 
              onClick={() => setActiveIndex(idx)}
              style={{ background: '#12121a', borderRadius: '10px', overflow: 'hidden', position: 'relative', cursor: 'pointer', aspectRatio: '3 / 4', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <img src={pose.image_url || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400'} alt={pose.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              
              {/* Today Shoot Toggle Badge */}
              <button 
                onClick={(e) => toggleToday(e, pose.id)} 
                style={{ 
                  position: 'absolute', 
                  top: '6px', 
                  left: '6px', 
                  background: todayIds.includes(pose.id) ? 'rgba(212,175,55,0.9)' : 'rgba(0,0,0,0.6)', 
                  border: todayIds.includes(pose.id) ? 'none' : '1px solid rgba(255,255,255,0.2)', 
                  borderRadius: '10px', 
                  padding: '2px 6px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  color: todayIds.includes(pose.id) ? '#000' : 'white', 
                  fontSize: '9px', 
                  fontWeight: 'bold',
                  zIndex: 2
                }}
              >
                {todayIds.includes(pose.id) ? '⚡ Today' : '+ Today'}
              </button>

              <button 
                onClick={(e) => toggleFav(e, pose.id)} 
                style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: favorites.includes(pose.id) ? '#ff4081' : 'white', fontSize: '10px', padding: 0 }}
              >
                {favorites.includes(pose.id) ? '♥' : '♡'}
              </button>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
                <h3 style={{ margin: 0, fontSize: '0.75rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pose.title}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dating App Style Swipeable Popup Modal */}
      {activeIndex !== null && filtered[activeIndex] && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          {/* Close Tap Target Outside Card */}
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setActiveIndex(null)} />

          {/* Nav Buttons (Desktop fallback) */}
          <button 
            onClick={(e) => { e.stopPropagation(); navigatePose('prev'); }}
            style={{ ...navArrowStyle, left: '20px' }}
          >
            ‹
          </button>

          {/* Swipe Card Wrapper */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '290px',
              height: '480px',
              background: '#12121a',
              borderRadius: '20px',
              border: '1px solid rgba(212,175,55,0.2)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 100px rgba(212,175,55,0.05)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transform: cardTransform,
              opacity: cardOpacity,
              transition: cardTransition,
            }}
          >
            {/* Card Main Image */}
            <div style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden' }}>
              <img 
                src={filtered[activeIndex].image_url} 
                alt={filtered[activeIndex].title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              
              {/* Close Button */}
              <button 
                onClick={() => setActiveIndex(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  backdropFilter: 'blur(5px)',
                  padding: 0
                }}
              >
                ✕
              </button>

              {/* Today Shoot Toggle Badge in Modal */}
              <button 
                onClick={(e) => toggleToday(e, filtered[activeIndex].id)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '50px',
                  padding: '5px 10px',
                  borderRadius: '15px',
                  background: todayIds.includes(filtered[activeIndex].id) ? 'rgba(212,175,55,0.9)' : 'rgba(0,0,0,0.6)',
                  border: todayIds.includes(filtered[activeIndex].id) ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: todayIds.includes(filtered[activeIndex].id) ? '#000' : 'white',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  zIndex: 2,
                  backdropFilter: 'blur(5px)'
                }}
              >
                {todayIds.includes(filtered[activeIndex].id) ? '⚡ Today' : '+ Today'}
              </button>

              {/* Heart/Like Button (Dating style overlay) */}
              <button 
                onClick={(e) => toggleFav(e, filtered[activeIndex].id)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: favorites.includes(filtered[activeIndex].id) ? 'rgba(255, 64, 129, 0.25)' : 'rgba(0,0,0,0.6)',
                  border: favorites.includes(filtered[activeIndex].id) ? '1px solid #ff4081' : '1px solid rgba(255,255,255,0.1)',
                  color: favorites.includes(filtered[activeIndex].id) ? '#ff4081' : 'white',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  backdropFilter: 'blur(5px)',
                  transition: 'all 0.2s',
                  padding: 0
                }}
              >
                {favorites.includes(filtered[activeIndex].id) ? '♥' : '♡'}
              </button>

              {/* Dating Swipe Indicators */}
              {swipeOffset > 30 && (
                <div style={{ ...swipeIndicatorStyle, top: '50px', left: '15px', borderColor: '#10b981', color: '#10b981', transform: 'rotate(-12deg)', fontSize: '14px', padding: '4px 8px' }}>
                  PREVIOUS
                </div>
              )}
              {swipeOffset < -30 && (
                <div style={{ ...swipeIndicatorStyle, top: '50px', right: '15px', borderColor: '#7c3aed', color: '#7c3aed', transform: 'rotate(12deg)', fontSize: '14px', padding: '4px 8px' }}>
                  NEXT
                </div>
              )}
            </div>

            {/* Card Content (Bottom overlay scrollable panel) */}
            <div style={{ padding: '12px', background: 'linear-gradient(to top, #0a0a0f 80%, rgba(10,10,15,0))', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                {filtered[activeIndex].events?.slice(0, 2).map((e: string) => (
                  <span key={e} style={{ ...tagStyle, background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>{e}</span>
                ))}
                {filtered[activeIndex].subjects?.slice(0, 2).map((s: string) => (
                  <span key={s} style={{ ...tagStyle, background: 'rgba(255,255,255,0.06)', color: '#aaa', border: '1px solid rgba(255,255,255,0.08)' }}>{s}</span>
                ))}
              </div>
              
              <h2 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'white', fontWeight: 'bold' }}>{filtered[activeIndex].title}</h2>
              
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#aaa', lineHeight: '1.4', maxHeight: '60px', overflowY: 'auto' }}>
                {filtered[activeIndex].instructions}
              </p>

              {/* View Full Instructions Link */}
              <Link 
                href={`/poses/${filtered[activeIndex].id}`}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  marginTop: '10px',
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'rgba(212,175,55,0.1)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  color: '#D4AF37',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                }}
              >
                View Details & camera specs →
              </Link>
            </div>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); navigatePose('next'); }}
            style={{ ...navArrowStyle, right: '20px' }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

const pillStyle = {
  padding: '6px 14px',
  borderRadius: '20px',
  border: 'none',
  fontSize: '0.8rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const tagStyle = {
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.65rem',
  color: 'white',
  fontWeight: '600'
};

const navArrowStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'white',
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  fontSize: '24px',
  cursor: 'pointer',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  transition: 'all 0.2s',
};

const swipeIndicatorStyle: React.CSSProperties = {
  position: 'absolute',
  top: '70px',
  padding: '6px 12px',
  border: '4px solid',
  borderRadius: '6px',
  fontSize: '18px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  zIndex: 3,
  background: 'rgba(0,0,0,0.6)',
  transition: 'all 0.1s'
};

