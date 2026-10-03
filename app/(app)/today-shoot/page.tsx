'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getPosesDB, 
  getTrendingReelsDB, 
  getCinematicDB, 
  getDirectionalShootsDB,
  fetchPosesCloud, 
  fetchTrendingReelsCloud, 
  fetchCinematicCloud,
  fetchDirectionalShootsCloud 
} from '@/lib/poses-db-helpers';
import { getUser } from '@/lib/auth-helpers';
import { 
  getTodayShootIds, 
  toggleTodayShoot, 
  clearTodayShoot, 
  getTodayShootDoneIds, 
  toggleTodayShootDone,
  fetchTodayShootCloud 
} from '@/lib/today-shoot-helpers';
import { 
  getPendingAssignmentsForUser, 
  respondToAssignment, 
  fetchAssignmentsCloud, 
  ShootAssignment 
} from '@/lib/assignment-helpers';
import Link from 'next/link';

export interface UnifiedTodayItem {
  id: string;
  title: string;
  type: 'pose' | 'reel' | 'cinematic' | 'directional';
  image_url: string;
  video_url?: string;
  event?: string;
  instructions?: string;
  notes?: string;
  camera_lens?: string;
  camera_movement?: string;
  camera_angle?: string;
  director_notes?: string;
  orientation?: 'portrait' | 'landscape';
}

export default function TodayShootPage() {
  const router = useRouter();
  const [todayIds, setTodayIds] = useState<string[]>([]);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');

  // Unified items data sources
  const [allPoses, setAllPoses] = useState<any[]>([]);
  const [allReels, setAllReels] = useState<any[]>([]);
  const [allCinematic, setAllCinematic] = useState<any[]>([]);
  const [allDirectional, setAllDirectional] = useState<any[]>([]);

  // Pending Shoot Assignment Modal States
  const [pendingAssignments, setPendingAssignments] = useState<ShootAssignment[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<ShootAssignment | null>(null);
  
  // Swipe Popup States
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [animatingDir, setAnimatingDir] = useState<'left' | 'right' | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    setTodayIds(getTodayShootIds());
    setDoneIds(getTodayShootDoneIds());

    setAllPoses(getPosesDB());
    setAllReels(getTrendingReelsDB());
    setAllCinematic(getCinematicDB());
    setAllDirectional(getDirectionalShootsDB());

    // Background fetch fresh items from Supabase cloud
    fetchPosesCloud().then(p => { if (p && p.length > 0) setAllPoses(p); }).catch(() => {});
    fetchTrendingReelsCloud().then(r => { if (r && r.length > 0) setAllReels(r); }).catch(() => {});
    fetchCinematicCloud().then(c => { if (c && c.length > 0) setAllCinematic(c); }).catch(() => {});
    fetchDirectionalShootsCloud().then(d => { if (d && d.length > 0) setAllDirectional(d); }).catch(() => {});

    const u = getUser();
    if (u) {
      // Sync personal Today Shoot list from Supabase cloud
      fetchTodayShootCloud(u.id).then(({ poseIds, doneIds }) => {
        if (poseIds) setTodayIds(poseIds);
        if (doneIds) setDoneIds(doneIds);
      }).catch(() => {});

      const pending = getPendingAssignmentsForUser(u.id);
      setPendingAssignments(pending);
      if (pending.length > 0) {
        setActiveAssignment(pending[0]);
      }

      fetchAssignmentsCloud().then(() => {
        const fresh = getPendingAssignmentsForUser(u.id);
        setPendingAssignments(fresh);
        if (fresh.length > 0) {
          setActiveAssignment((prev: ShootAssignment | null) => prev || fresh[0]);
        }
      });
    }

    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const handleAcceptAssignment = (action: 'merge' | 'replace') => {
    if (!activeAssignment) return;
    const count = activeAssignment.pose_ids.length;
    respondToAssignment(activeAssignment.id, action);
    
    // Refresh IDs
    setTodayIds(getTodayShootIds());
    setDoneIds(getTodayShootDoneIds());

    const u = getUser();
    if (u) {
      setPendingAssignments(getPendingAssignmentsForUser(u.id));
    }
    setActiveAssignment(null);

    setToastMsg(
      action === 'merge' 
        ? `✅ Merged ${count} shots into your Today's Shoot!` 
        : `🔄 Replaced Today's Shoot with ${count} assigned shots!`
    );
    setTimeout(() => setToastMsg(''), 4500);
  };

  const handleDismissAssignment = () => {
    if (!activeAssignment) return;
    respondToAssignment(activeAssignment.id, 'dismiss');
    const u = getUser();
    if (u) {
      setPendingAssignments(getPendingAssignmentsForUser(u.id));
    }
    setActiveAssignment(null);
  };

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

  // Build unified today shoot items across poses, reels, and cinematic
  const todayItems: UnifiedTodayItem[] = [];
  todayIds.forEach(id => {
    // 1. Poses
    const pose = allPoses.find((p: any) => p.id === id);
    if (pose) {
      todayItems.push({
        id: pose.id,
        title: pose.title,
        type: 'pose',
        image_url: pose.image_url || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
        event: pose.events?.[0] || 'Pose',
        instructions: pose.instructions,
        notes: pose.notes,
        camera_lens: pose.camera_lens,
        orientation: 'portrait'
      });
      return;
    }
    // 2. Trending Reels
    const reel = allReels.find((r: any) => r.id === id);
    if (reel) {
      todayItems.push({
        id: reel.id,
        title: reel.title,
        type: 'reel',
        image_url: reel.cover_image || 'https://images.unsplash.com/photo-1519741347686-cfcbf6bde2af?w=800',
        video_url: reel.video_url,
        event: reel.event || (reel.events && reel.events[0]) || 'Reel',
        instructions: reel.caption || reel.description || 'Reel video idea',
        orientation: reel.orientation || 'portrait'
      });
      return;
    }
    // 3. Cinematic Shots
    const cine = allCinematic.find((c: any) => c.id === id);
    if (cine) {
      todayItems.push({
        id: cine.id,
        title: cine.title,
        type: 'cinematic',
        image_url: cine.media_url || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
        event: cine.event || 'Cinematic',
        instructions: cine.description,
        camera_movement: cine.camera_movement,
        orientation: cine.orientation || 'portrait'
      });
      return;
    }
    // 4. Directional Shoots
    const dir = allDirectional.find((d: any) => d.id === id);
    if (dir) {
      todayItems.push({
        id: dir.id,
        title: dir.title,
        type: 'directional',
        image_url: dir.cover_image || dir.media_url || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
        video_url: dir.media_url?.endsWith('.mp4') ? dir.media_url : undefined,
        event: dir.event || dir.events?.[0] || 'Directional',
        instructions: dir.director_notes ? `Director: "${dir.director_notes}"` : dir.description,
        director_notes: dir.director_notes,
        camera_angle: dir.camera_angle,
        camera_movement: dir.movement,
        orientation: dir.orientation || 'portrait'
      });
      return;
    }
  });

  const doneCount = todayItems.filter((p: any) => doneIds.includes(p.id)).length;
  const totalCount = todayItems.length;
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
    if (activeIndex === null || todayItems.length === 0 || animatingDir !== null) return;
    const flyDir = dir === 'next' ? 'left' : 'right';
    setAnimatingDir(flyDir);

    setTimeout(() => {
      if (dir === 'next') {
        setActiveIndex((prev) => (prev !== null && prev < todayItems.length - 1 ? prev + 1 : 0));
      } else {
        setActiveIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : todayItems.length - 1));
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

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ backgroundColor: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#10b981', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textAlign: 'center', animation: 'fadeIn 0.3s' }}>
          {toastMsg}
        </div>
      )}

      {/* Pending Assignment Banner if modal was closed */}
      {pendingAssignments.length > 0 && !activeAssignment && (
        <div style={{ backgroundColor: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#D4AF37', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎯 {pendingAssignments.length} Pending Assignment{pendingAssignments.length > 1 ? 's' : ''} from Admin
            </div>
            <div style={{ color: '#aaa', fontSize: '11px', marginTop: '2px' }}>
              {pendingAssignments[0].title} ({pendingAssignments[0].pose_ids.length} shots)
            </div>
          </div>
          <button 
            onClick={() => setActiveAssignment(pendingAssignments[0])}
            style={{ backgroundColor: '#D4AF37', color: '#000', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
          >
            Review &amp; Apply
          </button>
        </div>
      )}

      {/* Assignment Modal Popup */}
      {activeAssignment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#12121a',
            border: '2px solid #D4AF37',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 10px 40px rgba(212,175,55,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Modal Header */}
            <div>
              <div style={{ display: 'inline-block', backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
                🎯 Admin Shoot Assignment
              </div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '700', color: '#fff' }}>
                {activeAssignment.title}
              </h2>
              <div style={{ fontSize: '12px', color: '#888' }}>
                Assigned by: <strong style={{ color: '#ccc' }}>{activeAssignment.assigned_by_name}</strong>
              </div>
            </div>

            {/* Notes if any */}
            {activeAssignment.notes && (
              <div style={{ backgroundColor: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#ddd', lineHeight: '1.4' }}>
                <span style={{ color: '#D4AF37', fontWeight: '600' }}>Instructions: </span>
                {activeAssignment.notes}
              </div>
            )}

            {/* Shots Preview */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#aaa', marginBottom: '8px' }}>
                Assigned Shots ({activeAssignment.pose_ids.length}):
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {activeAssignment.pose_ids.map((pId: string) => {
                  const p = allPoses.find((item: any) => item.id === pId);
                  return (
                    <div key={pId} style={{ minWidth: '90px', width: '90px', backgroundColor: '#1a1a26', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333' }}>
                      <div style={{ height: '90px', width: '100%', backgroundColor: '#0a0a0f' }}>
                        {p?.image_url ? (
                          <img src={p.image_url} alt={p?.title || 'Shot'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '10px', color: '#666' }}>No Image</div>
                        )}
                      </div>
                      <div style={{ padding: '4px 6px', fontSize: '10px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p?.title || pId}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons: Merge or Replace */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => handleAcceptAssignment('merge')}
                style={{
                  backgroundColor: '#D4AF37',
                  color: '#000',
                  fontWeight: '700',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  boxShadow: '0 4px 15px rgba(212,175,55,0.3)'
                }}
              >
                <span>➕ Add to My Today&apos;s Shoot</span>
                <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.85 }}>Keep my current picks and add these {activeAssignment.pose_ids.length} shots</span>
              </button>

              <button
                onClick={() => handleAcceptAssignment('replace')}
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  fontWeight: '700',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                <span>🔄 Replace My Today&apos;s Shoot</span>
                <span style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.85 }}>Clear my current list and start fresh with these {activeAssignment.pose_ids.length} shots</span>
              </button>

              <button
                onClick={handleDismissAssignment}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  padding: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Dismiss for now
              </button>
            </div>
          </div>
        </div>
      )}

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
      ) : todayItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#aaa', background: '#12121a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚡</div>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 8px 0', color: '#fff', fontWeight: 'bold' }}>No shots in Today&apos;s Shoot bucket</h2>
          <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 20px 0', lineHeight: '1.5' }}>
            Tap the <strong style={{ color: '#D4AF37' }}>+ Today</strong> button on any pose, reel, or cinematic shot to plan your shot list for today&apos;s wedding shoot!
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link 
              href="/poses"
              style={{
                display: 'inline-block',
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                textDecoration: 'none'
              }}
            >
              Browse Poses →
            </Link>
            <Link 
              href="/trending-reels"
              style={{
                display: 'inline-block',
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'rgba(212,175,55,0.15)',
                border: '1px solid rgba(212,175,55,0.3)',
                color: '#D4AF37',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                textDecoration: 'none'
              }}
            >
              Browse Reels →
            </Link>
            <Link 
              href="/directional-shoots"
              style={{
                display: 'inline-block',
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                textDecoration: 'none'
              }}
            >
              Directional Shoots 🧭
            </Link>
          </div>
        </div>
      ) : (
        /* Portrait Grid for Today's Poses & Reels */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
          {todayItems.map((item: UnifiedTodayItem, idx: number) => {
            const isCaptured = doneIds.includes(item.id);
            return (
              <div 
                key={item.id} 
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
                <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {/* Media Type Badge */}
                {item.type === 'reel' && (
                  <div style={{ position: 'absolute', top: '6px', left: '36px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', zIndex: 2 }}>
                    🔥 REEL
                  </div>
                )}
                {item.type === 'cinematic' && (
                  <div style={{ position: 'absolute', top: '6px', left: '36px', background: 'rgba(124, 58, 237, 0.9)', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', zIndex: 2 }}>
                    🎬 CINE
                  </div>
                )}
                {item.type === 'directional' && (
                  <div style={{ position: 'absolute', top: '6px', left: '36px', background: 'rgba(16, 185, 129, 0.9)', color: '#000', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', zIndex: 2 }}>
                    🧭 DIR
                  </div>
                )}

                {/* Captured Checkmark Button */}
                <button 
                  onClick={(e) => handleToggleDone(e, item.id)} 
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
                    zIndex: 3
                  }}
                  title={isCaptured ? "Mark as pending" : "Mark as captured"}
                >
                  {isCaptured ? '✓' : ''}
                </button>

                {/* Remove from Today Button */}
                <button 
                  onClick={(e) => handleRemoveFromToday(e, item.id)} 
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
                    zIndex: 3
                  }}
                  title="Remove from Today"
                >
                  ✕
                </button>

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
                  <h3 style={{ margin: 0, fontSize: '0.75rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isCaptured ? 'line-through' : 'none' }}>
                    {item.title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dating App Style Swipeable Popup Modal */}
      {activeIndex !== null && todayItems[activeIndex] && (
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
              {todayItems[activeIndex].video_url ? (
                <video 
                  src={todayItems[activeIndex].video_url} 
                  autoPlay 
                  loop 
                  playsInline 
                  controls
                  poster={todayItems[activeIndex].image_url}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <img 
                  src={todayItems[activeIndex].image_url} 
                  alt={todayItems[activeIndex].title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              )}
              
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
                  zIndex: 4,
                  backdropFilter: 'blur(5px)',
                  padding: 0
                }}
              >
                ✕
              </button>

              {/* Mark Captured Toggle Button */}
              <button 
                onClick={(e) => handleToggleDone(e, todayItems[activeIndex].id)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '6px 10px',
                  borderRadius: '20px',
                  background: doneIds.includes(todayItems[activeIndex].id) ? '#10b981' : 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 4,
                  backdropFilter: 'blur(5px)'
                }}
              >
                {doneIds.includes(todayItems[activeIndex].id) ? '✓ Captured' : 'Mark Done'}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ 
                  background: todayItems[activeIndex].type === 'reel' ? '#ef4444' : todayItems[activeIndex].type === 'cinematic' ? '#7c3aed' : todayItems[activeIndex].type === 'directional' ? '#10b981' : '#D4AF37', 
                  color: (todayItems[activeIndex].type === 'pose' || todayItems[activeIndex].type === 'directional') ? '#000' : '#fff',
                  fontSize: '9px', 
                  fontWeight: 'bold', 
                  padding: '1px 6px', 
                  borderRadius: '4px' 
                }}>
                  {todayItems[activeIndex].type === 'directional' ? '🧭 DIR' : todayItems[activeIndex].type.toUpperCase()}
                </span>
                <span style={{ fontSize: '11px', color: '#888' }}>{todayItems[activeIndex].event}</span>
              </div>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'white', fontWeight: 'bold' }}>{todayItems[activeIndex].title}</h2>
              
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#aaa', lineHeight: '1.4', maxHeight: '60px', overflowY: 'auto' }}>
                {todayItems[activeIndex].instructions}
              </p>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={(e) => handleRemoveFromToday(e, todayItems[activeIndex].id)}
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
                {todayItems[activeIndex].type === 'pose' ? (
                  <Link 
                    href={`/poses/${todayItems[activeIndex].id}`}
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
                ) : (
                  <Link 
                    href={
                      todayItems[activeIndex].type === 'reel' 
                        ? '/trending-reels' 
                        : todayItems[activeIndex].type === 'directional' 
                          ? '/directional-shoots' 
                          : '/cinematic'
                    }
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
                    View Source →
                  </Link>
                )}
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
