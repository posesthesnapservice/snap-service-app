'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  getClientSelectionByToken, 
  fetchClientSelectionByTokenCloud, 
  submitClientSelection,
  generateWhatsAppSubmissionSummary,
  decodeSessionPayload,
  saveClientSelectionsDB,
  getClientSelectionsDB
} from '@/lib/client-selection-helpers';
import { getPosesDB, savePosesDB, fetchPosesCloud, getTrendingReelsDB, fetchTrendingReelsCloud, subscribeToPosesChanges } from '@/lib/poses-db-helpers';
import { mockPoses, mockTrendingReels } from '@/lib/mock-data';
import { formatOptimizedVideoUrl, formatOptimizedCoverUrl } from '@/lib/cloudinary';
import { Pose, TrendingReel, ClientSelectionSession } from '@/lib/types';
import { SUBJECT_COLORS, getSubjectColor, getEventColor } from '@/lib/constants';

const SUBJECT_FILTERS = ['All', 'Bride', 'Groom', 'Couple', 'Sisters', 'Brothers', 'Family', 'Friends'];
const EVENT_FILTERS = ['All', 'Mehndi', 'Nikah', 'Barat', 'Walima', 'Reception', 'Mayun', 'General'];

export default function ClientSelectionPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [session, setSession] = useState<ClientSelectionSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'poses' | 'reels'>('poses');

  // DB Data
  const [poses, setPoses] = useState<Pose[]>([]);
  const [reels, setReels] = useState<TrendingReel[]>([]);

  // Selection states
  const [selectedPoseIds, setSelectedPoseIds] = useState<string[]>([]);
  const [selectedReelIds, setSelectedReelIds] = useState<string[]>([]);
  const [clientNotes, setClientNotes] = useState('');

  // Filters
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [eventFilter, setEventFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Modals
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activePosePreview, setActivePosePreview] = useState<Pose | null>(null);
  const [activeReelPreview, setActiveReelPreview] = useState<TrendingReel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    // Load session
    const loadSessionData = async () => {
      let s: ClientSelectionSession | null = null;

      // 1. First priority: Check URL payload '?d=' (Self-contained, cross-device instant load)
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const encodedData = searchParams.get('d');
        if (encodedData) {
          s = decodeSessionPayload(encodedData);
        }
      }

      // 2. Second priority: Check local device DB
      if (!s) {
        s = getClientSelectionByToken(token);
      }

      // 3. Third priority: Check cloud Supabase DB
      if (!s) {
        s = await fetchClientSelectionByTokenCloud(token);
      }

      // If found, reconcile with local storage (keep previous submission if exists)
      if (s) {
        const current = getClientSelectionsDB();
        const existing = current.find(item => item.id === s!.id || item.token === s!.token);
        if (existing) {
          if (existing.status === 'submitted') {
            s = existing;
          }
        } else {
          saveClientSelectionsDB([s, ...current]);
        }

        setSession(s);
        setSelectedPoseIds(s.selected_pose_ids || []);
        setSelectedReelIds(s.selected_reel_ids || []);
        if (s.content_mode === 'reels_only') {
          setActiveTab('reels');
        } else if (s.content_mode === 'poses_only') {
          setActiveTab('poses');
        }
        if (s.client_notes) setClientNotes(s.client_notes);
        if (s.status === 'submitted') setSubmittedSuccess(true);

        // Instant cross-device hydration: if session link carried studio poses, display them immediately!
        if (s.poses_snapshot && s.poses_snapshot.length > 0) {
          const snapshot = s.poses_snapshot.filter(item => item.status !== 'hidden');
          if (snapshot.length > 0) {
            setPoses(snapshot);
            savePosesDB(snapshot, false);
          }
        }
        // Default event filter to 'All' so client sees full wedding library
      }

      // Load poses & reels with resilient fallback
      let localPoses = getPosesDB().filter(p => p.status !== 'hidden');
      if (localPoses.length === 0) {
        localPoses = mockPoses.filter(p => p.status !== 'hidden');
      }
      setPoses(prev => prev.length > 0 ? prev : localPoses);

      fetchPosesCloud(true).then(p => {
        if (p && p.length > 0) {
          const visible = p.filter(item => item.status !== 'hidden');
          if (visible.length > 0) setPoses(visible);
        }
      });

      let localReels = getTrendingReelsDB().filter(r => r.status !== 'hidden');
      if (localReels.length === 0) {
        localReels = mockTrendingReels.filter(r => r.status !== 'hidden');
      }
      setReels(localReels);

      fetchTrendingReelsCloud(true).then(r => {
        if (r && r.length > 0) {
          const visible = r.filter(item => item.status !== 'hidden');
          if (visible.length > 0) setReels(visible);
        }
      });

      setLoading(false);
    };

    loadSessionData();

    // Realtime sync on client page
    const unsubscribe = subscribeToPosesChanges((latest) => {
      if (latest && latest.length > 0) {
        setPoses(latest.filter(item => item.status !== 'hidden'));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [token]);

  // Toggle pose selection
  const togglePose = (id: string) => {
    setSelectedPoseIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Toggle reel selection
  const toggleReel = (id: string) => {
    setSelectedReelIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Submit client selection
  const handleConfirmSubmit = () => {
    const isReelsOnly = session?.content_mode === 'reels_only';
    const isPosesOnly = session?.content_mode === 'poses_only';

    if (isReelsOnly && selectedReelIds.length === 0) {
      alert('Please select at least 1 reel before submitting.');
      return;
    }
    if (isPosesOnly && selectedPoseIds.length === 0) {
      alert('Please select at least 1 pose before submitting.');
      return;
    }
    if (!isReelsOnly && !isPosesOnly && selectedPoseIds.length === 0 && selectedReelIds.length === 0) {
      alert('Please select at least 1 pose or reel before submitting.');
      return;
    }

    setIsSubmitting(true);
    let updated = submitClientSelection(token, selectedPoseIds, selectedReelIds, clientNotes);
    if (!updated && session) {
      const now = new Date().toISOString();
      updated = {
        ...session,
        selected_pose_ids: selectedPoseIds,
        selected_reel_ids: selectedReelIds,
        client_notes: clientNotes.trim() || undefined,
        status: 'submitted',
        submitted_at: now
      };
      const current = getClientSelectionsDB();
      saveClientSelectionsDB([updated, ...current.filter(x => x.id !== updated!.id)]);
    }

    if (updated) {
      setSession(updated);
      setSubmittedSuccess(true);
      setShowReviewModal(false);
    }
    setIsSubmitting(false);
  };

  // Dynamic Event Filters (Standard + Session Event + Loaded Poses & Reels + Custom Categories)
  const dynamicEventFilters = React.useMemo(() => {
    const list: string[] = ['All'];
    if (session?.event_type && session.event_type !== 'All') {
      list.push(session.event_type);
    }
    const standard = ['Mehndi', 'Nikah', 'Barat', 'Walima', 'Reception', 'Mayun', 'Dholki', 'Pre-Wedding', 'Engagement', 'General'];
    standard.forEach(ev => {
      if (!list.some(x => x.toLowerCase() === ev.toLowerCase())) {
        list.push(ev);
      }
    });
    // Add any unique events from poses
    poses.forEach(p => {
      const pEvents = Array.isArray(p.events) ? p.events : typeof p.events === 'string' ? [p.events] : [];
      pEvents.forEach(e => {
        if (e && !list.some(x => x.toLowerCase() === e.toLowerCase())) {
          list.push(e);
        }
      });
    });
    return list;
  }, [session?.event_type, poses]);

  // Filtered poses
  const filteredPoses = poses.filter(p => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = (p.title || '').toLowerCase().includes(q);
      const matchInst = (p.instructions || '').toLowerCase().includes(q);
      const matchTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchInst && !matchTags) return false;
    }
    if (subjectFilter !== 'All') {
      const rawSubjects = Array.isArray(p.subjects) ? p.subjects : typeof p.subjects === 'string' ? [p.subjects] : [];
      const poseSubjects = rawSubjects.map(s => String(s).toLowerCase());
      if (!poseSubjects.includes(subjectFilter.toLowerCase())) return false;
    }
    if (eventFilter !== 'All') {
      const rawEvents = Array.isArray(p.events) ? p.events : typeof p.events === 'string' ? [p.events] : [];
      const poseEvents = rawEvents.map(e => String(e).toLowerCase());
      const filterLower = eventFilter.toLowerCase();
      const matchesEvent = poseEvents.includes(filterLower) || 
                           poseEvents.includes('all') || 
                           poseEvents.includes('general') ||
                           poseEvents.length === 0;
      if (!matchesEvent) return false;
    }
    return true;
  });

  // Filtered reels
  const filteredReels = reels.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = (r.title || '').toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    if (eventFilter !== 'All') {
      const rawEvents = (r as any).events || [r.event];
      const reelEvents = (rawEvents || []).map((e: string) => (e || '').toLowerCase());
      const filterLower = eventFilter.toLowerCase();
      const matchesEvent = reelEvents.includes(filterLower) || 
                           reelEvents.includes('all') || 
                           reelEvents.includes('general') ||
                           reelEvents.length === 0;
      if (!matchesEvent) return false;
    }
    return true;
  });

  const totalSelectedCount = selectedPoseIds.length + selectedReelIds.length;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid rgba(212,175,55,0.2)', borderTopColor: '#D4AF37', borderRadius: '50%', margin: '0 auto 14px auto', animation: 'spin 0.8s linear infinite' }} />
          <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
          <p style={{ fontSize: '14px', letterSpacing: '0.5px' }}>Loading your photography selection...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: '440px', textAlign: 'center', background: '#12121a', padding: '36px 24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ fontSize: '20px', color: '#D4AF37', margin: '0 0 10px 0' }}>Selection Link Not Found</h2>
          <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.6', margin: '0 0 20px 0' }}>
            Yeh link invalid hai ya expire ho chuka hai. Barah-e-karam photographer team se rabta karein taake naya link share kiya ja sake.
          </p>
        </div>
      </div>
    );
  }

  // Check if expired
  if (session.status === 'expired') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: '440px', textAlign: 'center', background: '#12121a', padding: '36px 24px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h2 style={{ fontSize: '20px', color: '#ef4444', margin: '0 0 10px 0' }}>Link Expired</h2>
          <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.6', margin: '0 0 20px 0' }}>
            Dear <strong>{session.client_name}</strong>, aapka selection link expire ho chuka hai. Photographer team se naya active link generate karwa lein.
          </p>
          <a
            href={`https://wa.me/?text=Assalam-o-Alaikum!%20My%20selection%20link%20for%20${encodeURIComponent(session.client_name)}%20has%20expired.%20Please%20send%20a%20new%20link.`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-block', backgroundColor: '#25D366', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}
          >
            💬 Contact Studio on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', color: '#fff', paddingBottom: '100px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Studio Bar */}
      <header style={{ backgroundColor: '#111118', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '30px', width: 'auto', borderRadius: '6px' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          <div>
            <div style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Snap Photography Studio</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
              {session.content_mode === 'reels_only' ? 'Client Trending Reels Selection' : session.content_mode === 'poses_only' ? 'Client Wedding Poses Selection' : 'Client Posing & Reel Selection'}
            </div>
          </div>
        </div>

        {/* Counter Pill in Header */}
        <button
          onClick={() => setShowReviewModal(true)}
          style={{
            backgroundColor: totalSelectedCount > 0 ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.05)',
            border: totalSelectedCount > 0 ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.1)',
            color: totalSelectedCount > 0 ? '#D4AF37' : '#aaa',
            padding: '7px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>✓</span>
          <span>{totalSelectedCount} Selected</span>
        </button>
      </header>

      {/* Hero Welcome Banner */}
      <div style={{ background: 'linear-gradient(180deg, rgba(212,175,55,0.12) 0%, rgba(10,10,15,0) 100%)', padding: '24px 20px 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ backgroundColor: 'rgba(212,175,55,0.2)', color: '#D4AF37', fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px' }}>
              🎉 {session.event_type} Shoot {session.event_date ? `· ${session.event_date}` : ''}
            </span>
            {session.expires_at && (
              <span style={{ fontSize: '11px', color: '#aaa' }}>
                ⏳ Valid until {new Date(session.expires_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0 8px 0', color: '#fff', letterSpacing: '-0.5px' }}>
            Welcome, <span style={{ color: '#D4AF37' }}>{session.client_name}</span>!
          </h1>
          
          <p style={{ fontSize: '13px', color: '#bbb', margin: 0, lineHeight: '1.5', maxWidth: '640px' }}>
            {session.content_mode === 'reels_only'
              ? 'Apne shoot ke liye cinematic trending video references select karein. Hamari team shoot wale din aapke chune hue reels ke mutabiq shots banayegi!'
              : session.content_mode === 'poses_only'
                ? 'Apne shoot ke liye pasandida wedding poses select karein. Hamari team shoot wale din aapke chune hue poses follow karegi!'
                : 'Apne shoot ke liye pasandida poses aur trending reels select karein. Hamari team shoot wale din aapke chune hue styles ko follow karegi!'}
          </p>

          {/* Photographer's Custom Note to Client */}
          {session.notes_for_client && (
            <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', fontSize: '12px', color: '#e2d4a8', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>💬</span>
              <div>
                <strong>Note from Photographer:</strong> {session.notes_for_client}
              </div>
            </div>
          )}

          {/* Submitted Banner */}
          {submittedSuccess && (
            <div style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid #10b981', color: '#34d399', fontSize: '13px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                ✅ <strong>Selection Successfully Submitted!</strong> ({session.content_mode === 'reels_only' ? `${selectedReelIds.length} Reels` : session.content_mode === 'poses_only' ? `${selectedPoseIds.length} Poses` : `${selectedPoseIds.length} Poses, ${selectedReelIds.length} Reels`}). Aap chahein toh mazeed tabdeeli karke dobara submit kar sakte hain.
              </div>
              <button
                onClick={() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                  const summary = generateWhatsAppSubmissionSummary(session, origin);
                  window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank');
                }}
                style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                💬 Send Picks to Studio on WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px 20px' }}>
        
        {/* Main Tab Switcher or Single Mode Banner */}
        {session.content_mode === 'reels_only' ? (
          <div style={{
            padding: '14px 18px',
            marginBottom: '16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(249,115,22,0.12)',
            border: '1px solid rgba(249,115,22,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🔥</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fb923c' }}>Trending Cinematic Wedding Reels</div>
                <div style={{ fontSize: '11px', color: '#aaa' }}>Apne shoot ke liye best reel references choose karein</div>
              </div>
            </div>
            <span style={{ backgroundColor: '#f97316', color: '#000', fontSize: '12px', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
              {selectedReelIds.length} chosen
            </span>
          </div>
        ) : session.content_mode === 'poses_only' ? (
          <div style={{
            padding: '14px 18px',
            marginBottom: '16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📸</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#60a5fa' }}>Wedding Photography Poses</div>
                <div style={{ fontSize: '11px', color: '#aaa' }}>Apne shoot ke liye best photography poses choose karein</div>
              </div>
            </div>
            <span style={{ backgroundColor: '#60a5fa', color: '#000', fontSize: '12px', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
              {selectedPoseIds.length} chosen
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <button
              onClick={() => setActiveTab('poses')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: activeTab === 'poses' ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.08)',
                backgroundColor: activeTab === 'poses' ? 'rgba(212,175,55,0.15)' : '#12121a',
                color: activeTab === 'poses' ? '#D4AF37' : '#aaa',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s'
              }}
            >
              <span>📸 Wedding Poses</span>
              <span style={{ backgroundColor: activeTab === 'poses' ? '#D4AF37' : 'rgba(255,255,255,0.1)', color: activeTab === 'poses' ? '#000' : '#aaa', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                {selectedPoseIds.length} chosen
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reels')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: activeTab === 'reels' ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.08)',
                backgroundColor: activeTab === 'reels' ? 'rgba(212,175,55,0.15)' : '#12121a',
                color: activeTab === 'reels' ? '#D4AF37' : '#aaa',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s'
              }}
            >
              <span>🔥 Trending Reels</span>
              <span style={{ backgroundColor: activeTab === 'reels' ? '#D4AF37' : 'rgba(255,255,255,0.1)', color: activeTab === 'reels' ? '#000' : '#aaa', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                {selectedReelIds.length} chosen
              </span>
            </button>
          </div>
        )}

        {/* Search & Filter Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder={activeTab === 'poses' ? "Search poses (e.g. bridal entry, sitting, romantic)..." : "Search reels..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#12121a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />

          {/* Subject Filter Pills (only on Poses tab) */}
          {activeTab === 'poses' && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {SUBJECT_FILTERS.map(sub => {
                const isSelected = subjectFilter === sub;
                const col = sub !== 'All' ? getSubjectColor(sub) : null;
                return (
                  <button
                    key={sub}
                    onClick={() => setSubjectFilter(sub)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: isSelected ? 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' : '#12121a',
                      background: isSelected ? '#D4AF37' : '#12121a',
                      color: isSelected ? '#000' : '#bbb',
                      border: isSelected ? 'none' : (col ? `1px solid ${col.border}` : '1px solid rgba(255,255,255,0.08)'),
                    }}
                  >
                    {col && <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isSelected ? '#000' : col.text }} />}
                    {sub}
                  </button>
                );
              })}
            </div>
          )}

          {/* Event Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {dynamicEventFilters.map(ev => {
              const isSelected = eventFilter === ev;
              const isClientEvent = !!session?.event_type && ev.toLowerCase() === session.event_type.toLowerCase() && ev !== 'All';
              return (
                <button
                  key={ev}
                  onClick={() => setEventFilter(ev)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    backgroundColor: isSelected ? 'rgba(212,175,55,0.2)' : isClientEvent ? 'rgba(212,175,55,0.06)' : 'transparent',
                    color: isSelected ? '#D4AF37' : isClientEvent ? '#e2d4a8' : '#777',
                    border: isSelected ? '1.5px solid #D4AF37' : isClientEvent ? '1px dashed rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {ev}{isClientEvent ? ' (Your Event)' : ''}
                </button>
              );
            })}
          </div>

          {/* Event Helper Banner when filtered */}
          {eventFilter !== 'All' && poses.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginTop: '10px',
              fontSize: '12px',
              color: '#D4AF37',
              flexWrap: 'wrap',
              gap: '6px'
            }}>
              <span>
                Filtering by <strong>{eventFilter}</strong> ({filteredPoses.length} pose{filteredPoses.length === 1 ? '' : 's'}). 
                Studio has <strong>{poses.length} total wedding poses</strong> available.
              </span>
              <button
                type="button"
                onClick={() => setEventFilter('All')}
                style={{
                  backgroundColor: '#D4AF37',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                View All ({poses.length}) →
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: POSES GRID */}
        {activeTab === 'poses' && (
          <div>
            {filteredPoses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#aaa', backgroundColor: '#12121a', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }}>
                <div style={{ fontSize: '42px', marginBottom: '12px' }}>📷</div>
                <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', margin: '0 0 6px 0' }}>
                  {eventFilter !== 'All' 
                    ? `No poses found under "${eventFilter}"` 
                    : subjectFilter !== 'All' 
                      ? `No poses found under "${subjectFilter}"` 
                      : search 
                        ? `No poses matching "${search}"` 
                        : 'No poses available yet'}
                </h3>
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 18px 0', maxWidth: '440px', marginInline: 'auto', lineHeight: '1.5' }}>
                  {eventFilter !== 'All' || subjectFilter !== 'All' || search
                    ? 'Filters ko reset karein taake studio ki baqi tamam wedding poses dekh saken aur pasand select kar saken.'
                    : 'Studio team jald hi poses upload kar degi.'}
                </p>
                {(eventFilter !== 'All' || subjectFilter !== 'All' || search) && (
                  <button
                    type="button"
                    onClick={() => {
                      setEventFilter('All');
                      setSubjectFilter('All');
                      setSearch('');
                    }}
                    style={{
                      backgroundColor: '#D4AF37',
                      color: '#000',
                      border: 'none',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(212,175,55,0.3)'
                    }}
                  >
                    View All Wedding Poses ({poses.length}) →
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>
                {filteredPoses.map(pose => {
                  const isSelected = selectedPoseIds.includes(pose.id);
                  return (
                    <div
                      key={pose.id}
                      style={{
                        backgroundColor: '#12121a',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        border: isSelected ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: isSelected ? '0 0 16px rgba(212,175,55,0.3)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s'
                      }}
                    >
                      {/* Image Preview Container */}
                      <div 
                        onClick={() => setActivePosePreview(pose)}
                        style={{ position: 'relative', width: '100%', aspectRatio: '3/4', cursor: 'pointer', backgroundColor: '#050508' }}
                      >
                        <img
                          src={pose.image_url}
                          alt={pose.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />

                        {/* Top Subject Tags */}
                        <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', flexWrap: 'wrap', gap: '3px', maxWidth: '75%' }}>
                          {pose.subjects?.slice(0, 1).map(s => {
                            const col = getSubjectColor(s);
                            return (
                              <span key={s} style={{ backgroundColor: col.bg, color: col.text, border: `1px solid ${col.border}`, fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                                {s}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card Bottom: Title & Select Button */}
                      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'space-between' }}>
                        <div 
                          onClick={() => setActivePosePreview(pose)}
                          style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                        >
                          {pose.title}
                        </div>

                        <button
                          type="button"
                          onClick={() => togglePose(pose.id)}
                          style={{
                            width: '100%',
                            padding: '7px 0',
                            borderRadius: '6px',
                            border: isSelected ? 'none' : '1px solid rgba(212,175,55,0.4)',
                            backgroundColor: isSelected ? '#D4AF37' : 'rgba(212,175,55,0.1)',
                            color: isSelected ? '#000' : '#D4AF37',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s'
                          }}
                        >
                          {isSelected ? '✓ Selected' : '+ Select Pose'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REELS GRID */}
        {activeTab === 'reels' && (
          <div>
            {filteredReels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#aaa', backgroundColor: '#12121a', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }}>
                <div style={{ fontSize: '42px', marginBottom: '12px' }}>🎬</div>
                <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', margin: '0 0 6px 0' }}>
                  {eventFilter !== 'All' 
                    ? `No reels found under "${eventFilter}"` 
                    : search 
                      ? `No reels matching "${search}"` 
                      : 'No trending reels available yet'}
                </h3>
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 18px 0', maxWidth: '440px', marginInline: 'auto', lineHeight: '1.5' }}>
                  {eventFilter !== 'All' || search
                    ? 'Filters ko reset karein taake studio ki baqi tamam trending cinematic reels dekh saken.'
                    : 'Studio team jald hi trending reels upload kar degi.'}
                </p>
                {(eventFilter !== 'All' || search) && (
                  <button
                    type="button"
                    onClick={() => {
                      setEventFilter('All');
                      setSearch('');
                    }}
                    style={{
                      backgroundColor: '#D4AF37',
                      color: '#000',
                      border: 'none',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(212,175,55,0.3)'
                    }}
                  >
                    View All Reels ({reels.length}) →
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>
                {filteredReels.map(reel => {
                  const isSelected = selectedReelIds.includes(reel.id);
                  const safeVideo = formatOptimizedVideoUrl(reel.video_url);
                  const safeCover = formatOptimizedCoverUrl(reel.video_url, reel.cover_image);

                  return (
                    <div
                      key={reel.id}
                      style={{
                        backgroundColor: '#12121a',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        border: isSelected ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: isSelected ? '0 0 16px rgba(212,175,55,0.3)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s'
                      }}
                    >
                      {/* Video / Cover Frame */}
                      <div 
                        onClick={() => setActiveReelPreview(reel)}
                        style={{ position: 'relative', width: '100%', aspectRatio: '9/16', cursor: 'pointer', backgroundColor: '#050508', overflow: 'hidden' }}
                      >
                        {safeVideo ? (
                          <video
                            src={safeVideo}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            poster={safeCover}
                            ref={el => { if (el) { el.muted = true; el.defaultMuted = true; } }}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <img
                            src={safeCover}
                            alt={reel.title}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}

                        {/* Event Badge */}
                        <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 10 }}>
                          <span style={{ backgroundColor: 'rgba(212,175,55,0.9)', color: '#000', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                            {reel.event || 'General'}
                          </span>
                        </div>

                        {/* Play Icon Overlay */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)', pointerEvents: 'none' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px' }}>
                            ▶
                          </div>
                        </div>
                      </div>

                      {/* Bottom Info & Select Button */}
                      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'space-between' }}>
                        <div 
                          onClick={() => setActiveReelPreview(reel)}
                          style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                        >
                          {reel.title}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleReel(reel.id)}
                          style={{
                            width: '100%',
                            padding: '7px 0',
                            borderRadius: '6px',
                            border: isSelected ? 'none' : '1px solid rgba(212,175,55,0.4)',
                            backgroundColor: isSelected ? '#D4AF37' : 'rgba(212,175,55,0.1)',
                            color: isSelected ? '#000' : '#D4AF37',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s'
                          }}
                        >
                          {isSelected ? '✓ Selected' : '+ Select Reel'}
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

      {/* STICKY BOTTOM FLOATING BAR */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#111118',
        borderTop: '1px solid rgba(212,175,55,0.3)',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.8)',
        padding: '12px 20px',
        zIndex: 99,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
              {session.content_mode === 'reels_only' ? (
                <>🔥 {selectedReelIds.length} Reels Selected</>
              ) : session.content_mode === 'poses_only' ? (
                <>📸 {selectedPoseIds.length} Poses Selected</>
              ) : (
                <>📸 {selectedPoseIds.length} Poses <span style={{ color: '#666' }}>|</span> 🔥 {selectedReelIds.length} Reels</>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#D4AF37' }}>
              {totalSelectedCount > 0 
                ? `${totalSelectedCount} items chosen for your shoot` 
                : session.content_mode === 'reels_only' 
                  ? 'Select reels above' 
                  : session.content_mode === 'poses_only' 
                    ? 'Select poses above' 
                    : 'Select poses & reels above'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowReviewModal(true)}
          disabled={totalSelectedCount === 0}
          style={{
            backgroundColor: totalSelectedCount > 0 ? '#D4AF37' : 'rgba(255,255,255,0.1)',
            color: totalSelectedCount > 0 ? '#000' : '#666',
            border: 'none',
            padding: '10px 22px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: totalSelectedCount > 0 ? 'pointer' : 'not-allowed',
            boxShadow: totalSelectedCount > 0 ? '0 4px 15px rgba(212,175,55,0.35)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          Review Selection ({totalSelectedCount}) →
        </button>
      </div>

      {/* REVIEW & SUBMIT MODAL */}
      {showReviewModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowReviewModal(false)}>
          <div style={{ backgroundColor: '#111118', border: '1px solid rgba(212,175,55,0.4)', borderRadius: '16px', maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#D4AF37' }}>Review Your Selection</h2>
                <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0 0' }}>Review your chosen items and add any personal notes for the team.</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Selected Poses Summary (hidden if reels_only) */}
            {session.content_mode !== 'reels_only' && (
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📸 Selected Poses ({selectedPoseIds.length})</span>
                  {selectedPoseIds.length > 0 && (
                    <button onClick={() => setSelectedPoseIds([])} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}>Clear all</button>
                  )}
                </div>
                {selectedPoseIds.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>No poses selected yet.</div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {selectedPoseIds.map(id => {
                      const p = poses.find(item => item.id === id);
                      if (!p) return null;
                      return (
                        <div key={id} style={{ position: 'relative', width: '65px', height: '85px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(212,175,55,0.4)' }}>
                          <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => togglePose(id)} style={{ position: 'absolute', top: 2, right: 2, width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected Reels Summary (hidden if poses_only) */}
            {session.content_mode !== 'poses_only' && (
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🔥 Selected Reels ({selectedReelIds.length})</span>
                  {selectedReelIds.length > 0 && (
                    <button onClick={() => setSelectedReelIds([])} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}>Clear all</button>
                  )}
                </div>
                {selectedReelIds.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>No reels selected yet.</div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {selectedReelIds.map(id => {
                      const r = reels.find(item => item.id === id);
                      if (!r) return null;
                      const cover = formatOptimizedCoverUrl(r.video_url, r.cover_image);
                      return (
                        <div key={id} style={{ position: 'relative', width: '65px', height: '100px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(212,175,55,0.4)' }}>
                          <img src={cover} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => toggleReel(id)} style={{ position: 'absolute', top: 2, right: 2, width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Client Personal Notes */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#aaa', marginBottom: '6px' }}>
                Special Requests or Notes for Photographer (Optional):
              </label>
              <textarea
                value={clientNotes}
                onChange={e => setClientNotes(e.target.value)}
                placeholder="e.g. We want natural candid laughing shots, slow motion twirl entry for bride, and no awkward poses..."
                rows={3}
                style={{ width: '100%', backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Back to Selection
              </button>
              <button
                type="button"
                disabled={isSubmitting || totalSelectedCount === 0}
                onClick={handleConfirmSubmit}
                style={{
                  backgroundColor: '#D4AF37',
                  color: '#000',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(212,175,55,0.35)'
                }}
              >
                {isSubmitting ? 'Submitting...' : `Confirm & Submit (${totalSelectedCount})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POSE DETAIL PREVIEW POPUP */}
      {activePosePreview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setActivePosePreview(null)}>
          <div style={{ backgroundColor: '#111118', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', maxWidth: '380px', width: '100%', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4' }}>
              <img src={activePosePreview.image_url} alt={activePosePreview.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => setActivePosePreview(null)} style={{ position: 'absolute', top: 12, right: 12, width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', fontSize: '14px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '16px' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#fff' }}>{activePosePreview.title}</h3>
              {activePosePreview.instructions && (
                <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#aaa', lineHeight: '1.4' }}>{activePosePreview.instructions}</p>
              )}
              <button
                onClick={() => {
                  togglePose(activePosePreview.id);
                  setActivePosePreview(null);
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedPoseIds.includes(activePosePreview.id) ? 'rgba(239,68,68,0.2)' : '#D4AF37',
                  color: selectedPoseIds.includes(activePosePreview.id) ? '#ef4444' : '#000',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {selectedPoseIds.includes(activePosePreview.id) ? '✕ Remove from My Selection' : '+ Add to My Selection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REEL DETAIL PREVIEW POPUP */}
      {activeReelPreview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setActiveReelPreview(null)}>
          <div style={{ backgroundColor: '#111118', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '16px', maxWidth: '340px', width: '100%', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '9/16', backgroundColor: '#000' }}>
              <video
                src={formatOptimizedVideoUrl(activeReelPreview.video_url)}
                controls
                autoPlay
                loop
                playsInline
                poster={formatOptimizedCoverUrl(activeReelPreview.video_url, activeReelPreview.cover_image)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button onClick={() => setActiveReelPreview(null)} style={{ position: 'absolute', top: 12, right: 12, width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', fontSize: '14px', cursor: 'pointer', zIndex: 10 }}>✕</button>
            </div>
            <div style={{ padding: '14px' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#fff' }}>{activeReelPreview.title}</h3>
              {activeReelPreview.description && (
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#aaa', lineHeight: '1.4' }}>{activeReelPreview.description}</p>
              )}
              <button
                onClick={() => {
                  toggleReel(activeReelPreview.id);
                  setActiveReelPreview(null);
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedReelIds.includes(activeReelPreview.id) ? 'rgba(239,68,68,0.2)' : '#D4AF37',
                  color: selectedReelIds.includes(activeReelPreview.id) ? '#ef4444' : '#000',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {selectedReelIds.includes(activeReelPreview.id) ? '✕ Remove from My Selection' : '+ Add to My Selection'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
