'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { mockPoses } from '@/lib/mock-data';
import { getTodayShootIds, toggleTodayShoot, clearTodayShoot, getTodayShootDoneIds, toggleTodayShootDone } from '@/lib/today-shoot-helpers';
import Link from 'next/link';

export default function TodayShootPage() {
  const router = useRouter();
  const [todayIds, setTodayIds] = useState<string[]>([]);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Swipe Popup States
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [animatingDir, setAnimatingDir] = useState<'left' | 'right' | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    setTodayIds(getTodayShootIds());
    setDoneIds(getTodayShootDoneIds());
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const handleRemoveFromToday = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleTodayShoot(id);
    setTodayIds(updated);
    if (activeIndex !== null) {
      setActiveIndex(null);
    }
  };

  const handleToggleDone = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleTodayShootDone(id);
    setDoneIds(updated);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to clear Today's Shoot list for the next event?")) {
      clearTodayShoot();
      setTodayIds([]);
      setDoneIds([]);
      setActiveIndex(null);
    }
  };

  const todayPoses = (mockPoses || []).filter((p: any) => todayIds.includes(p.id));
  const doneCount = todayPoses.filter((p: any) => doneIds.includes(p.id)).length;
  const totalCount = todayPoses.length;
  const isAllDone = totalCount > 0 && doneCount === totalCount;

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
    if (Math.abs(diffX) > Math.abs(diffY)) {
      setSwipeOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (activeIndex === null || animatingDir !== null) return;
    const threshold = 70;
    if (swipeOffset < -threshold) {
      navigatePose('next');
    } else if (swipeOffset > threshold) {
      navigatePose('prev');
    } else {
      setSwipeOffset(0);
    }
  };

  const navigatePose = (dir: 'next' | 'prev') => {
    if (activeIndex === null || todayPoses.length === 0 || animatingDir !== null) return;
    const flyDir = dir === 'next' ? 'left' : 'right';
    setAnimatingDir(flyDir);

    setTimeout(() => {
      if (dir === 'next') {
        setActiveIndex((prev) => (prev !== null && prev < todayPoses.length - 1 ? prev + 1 : 0));
      } else {
        setActiveIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : todayPoses.length - 1));
      }
      setAnimatingDir(null);
      setSwipeOffset(0);
    }, 300);
  };

  // Card transform styles
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
      {/* Header Bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#D4AF37' }}>⚡ Today's Shoot</h1>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>Daily Shoot Bucket</span>
          </div>
        </div>

        {totalCount > 0 && (
          <button 
            onClick={handleReset} 
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🔄 Reset Today
          </button>
        )}
      </header>

      {/* Progress Bar Header */}
      {totalCount > 0 && (
        <div style={{ background: '#12121a', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#f8fafc' }}>Shot Progress</span>
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#D4AF37' }}>{doneCount} / {totalCount} Captured</span>
          </div>
          <div style={{ height: '8px', width: '100%', backgroundColor: '#1f1f2e', borderRadius: '9999px', overflow: 'hidden' }}>
            <div 
              style={{
                height: '100%',
                backgroundColor: isAllDone ? '#10b981' : '#D4AF37',
                borderRadius: '9999px',
                transition: 'width 0.4s ease-out',
                width: `${(doneCount / totalCount) * 100}%`
              }}
            />
          </div>
          {isAllDone && (
            <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', textAlign: 'center', color: '#10b981', fontWeight: 'bold', fontSize: '0.8rem' }}>
              🎉 All planned shots captured for today's shoot!
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
          <div style={{ aspectRatio: '3 / 4', background: '#12121a', borderRadius: '10px' }}></div>
          <div style={{ aspectRatio: '3 / 4', background: '#12121a', borderRadius: '10px' }}></div>
          <div style={{ aspectRatio: '3 / 4', background: '#12121a', borderRadius: '10px' }}></div>
        </div>
      ) : todayPoses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#aaa', background: '#12121a', borderRadius: '16px', border: '1px border rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚡</div>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 8px 0', color: '#fff', fontWeight: 'bold' }}>No shots in Today's Shoot bucket</h2>
          <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 20px 0', lineHeight: '1.5' }}>
            Tap the <strong style={{ color: '#D4AF37' }}>+ Today</strong> button on any pose in the library to plan your shot list for today's wedding shoot!
          </p>
          <Link 
            href="/poses"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            Browse Pose Library →
          </Link>
        </div>
      ) : (
        /* Portrait Grid for Today's Poses */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
          {todayPoses.map((pose: any, idx: number) => {
            const isCaptured = doneIds.includes(pose.id);
            return (
              <div 
                key={pose.id} 
                onClick={() => setActiveIndex(idx)}
                style={{ 
                  background: '#12121a', 
                  borderRadius: '10px', 
                  overflow: 'hidden', 
                  position: 'relative', 
                  cursor: 'pointer', 
                  aspectRatio: '3 / 4', 
                  border: isCaptured ? '2px solid #10b981' : '1px solid rgba(212,175,55,0.3)',
                  opacity: isCaptured ? 0.75 : 1
                }}
              >
                <img src={pose.image_url} alt={pose.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {/* Captured Checkmark Button */}
                <button 
                  onClick={(e) => handleToggleDone(e, pose.id)} 
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: isCaptured ? '#10b981' : 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '12px',
                    padding: 0,
                    zIndex: 2
                  }}
                  title={isCaptured ? "Mark as pending" : "Mark as captured"}
                >
                  {isCaptured ? '✓' : ''}
                </button>

                {/* Remove from Today Button */}
                <button 
                  onClick={(e) => handleRemoveFromToday(e, pose.id)} 
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ef4444',
                    fontSize: '12px',
                    padding: 0,
                    zIndex: 2
                  }}
                  title="Remove from Today"
                >
                  ✕
                </button>

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
                  <h3 style={{ margin: 0, fontSize: '0.75rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isCaptured ? 'line-through' : 'none' }}>
                    {pose.title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dating App Style Swipeable Popup Modal */}
      {activeIndex !== null && todayPoses[activeIndex] && (
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
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setActiveIndex(null)} />

          <button 
            onClick={(e) => { e.stopPropagation(); navigatePose('prev'); }}
            style={{ ...navArrowStyle, left: '20px' }}
          >
            ‹
          </button>

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
            <div style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden' }}>
              <img 
                src={todayPoses[activeIndex].image_url} 
                alt={todayPoses[activeIndex].title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              
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

              {/* Mark Captured Toggle Button */}
              <button 
                onClick={(e) => handleToggleDone(e, todayPoses[activeIndex].id)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '6px 10px',
                  borderRadius: '20px',
                  background: doneIds.includes(todayPoses[activeIndex].id) ? '#10b981' : 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 2,
                  backdropFilter: 'blur(5px)'
                }}
              >
                {doneIds.includes(todayPoses[activeIndex].id) ? '✓ Captured' : 'Mark Done'}
              </button>

              {/* Swipe Indicators */}
              {swipeOffset > 30 && (
                <div style={{ ...swipeIndicatorStyle, top: '50px', left: '15px', borderColor: '#10b981', color: '#10b981', transform: 'rotate(-12deg)' }}>
                  PREVIOUS
                </div>
              )}
              {swipeOffset < -30 && (
                <div style={{ ...swipeIndicatorStyle, top: '50px', right: '15px', borderColor: '#7c3aed', color: '#7c3aed', transform: 'rotate(12deg)' }}>
                  NEXT
                </div>
              )}
            </div>

            <div style={{ padding: '12px', background: 'linear-gradient(to top, #0a0a0f 80%, rgba(10,10,15,0))', position: 'relative' }}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'white', fontWeight: 'bold' }}>{todayPoses[activeIndex].title}</h2>
              
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#aaa', lineHeight: '1.4', maxHeight: '60px', overflowY: 'auto' }}>
                {todayPoses[activeIndex].instructions}
              </p>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={(e) => handleRemoveFromToday(e, todayPoses[activeIndex].id)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Remove from Today
                </button>
                <Link 
                  href={`/poses/${todayPoses[activeIndex].id}`}
                  style={{
                    flex: 1,
                    textAlign: 'center',
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
                  Specs →
                </Link>
              </div>
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
  padding: '4px 8px',
  border: '4px solid',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  zIndex: 3,
  background: 'rgba(0,0,0,0.6)',
  transition: 'all 0.1s'
};
