"use client";

import React, { useState, useEffect, useRef } from "react";
import { getPosesDB } from "@/lib/poses-db-helpers";
import Link from "next/link";

export default function AIAssistantPage() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Swipe Popup States
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [animatingDir, setAnimatingDir] = useState<'left' | 'right' | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('snap_favorites') || '[]');
      setFavorites(favs);
    } catch (e) {}
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
    try {
      localStorage.setItem('snap_favorites', JSON.stringify(newFavs));
    } catch (e) {}
  };

  // Local TF-IDF Search Engine
  const performSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    setTimeout(() => {
      const currentPoses = getPosesDB().filter((p: any) => p.status !== 'hidden');
      const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 1);

      const scored = currentPoses.map((pose: any) => {
        let score = 0;
        const maxScore = terms.length * 10;

        terms.forEach((term) => {
          if (pose.title?.toLowerCase().includes(term)) score += 3;
          if (pose.instructions?.toLowerCase().includes(term)) score += 2;
          if (pose.mood?.toLowerCase().includes(term)) score += 2;
          if (pose.subjects?.some((s: string) => s.toLowerCase().includes(term))) score += 4;
          if (pose.events?.some((e: string) => e.toLowerCase().includes(term))) score += 4;
          if (pose.shoot_types?.some((st: string) => st.toLowerCase().includes(term))) score += 3;
          if (pose.tags?.some((t: string) => t.toLowerCase().includes(term))) score += 3;
        });

        const relevance = Math.min(100, Math.round((score / maxScore) * 100));
        return { ...pose, relevance_score: relevance };
      });

      const filteredResults = scored
        .filter((p: any) => (p.relevance_score || 0) > 10)
        .sort((a: any, b: any) => (b.relevance_score || 0) - (a.relevance_score || 0));

      setResults(filteredResults);
      setIsSearching(false);
    }, 400);
  };

  const suggestedQueries = [
    "Mehndi bride solo",
    "Barat couple romantic",
    "Walima outdoor golden hour",
    "Nikah traditional formal",
    "Groom solo sherwani"
  ];

  const handleSearch = (searchQuery: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setQuery(q);
    setIsSearching(true);
    setHasSearched(true);
    setActiveIndex(null);
    
    // Simulate network delay for effect
    setTimeout(() => {
      // Local TF-IDF style search
      const keywords = q.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      
      const currentPosesList = getPosesDB().filter((p: any) => p.status !== 'hidden');
      const scoredPoses = currentPosesList.map((pose: any) => {
        let score = 0;
        let possibleMax = 0;
        
        // Define weights
        const weights = {
          events: 3,
          subjects: 3,
          tags: 2,
          title: 1,
          shoot_types: 1,
          mood: 1
        };

        const checkMatch = (text: string | string[], weight: number) => {
          if (!text) return;
          const textLower = Array.isArray(text) ? text.join(" ").toLowerCase() : text.toLowerCase();
          keywords.forEach(kw => {
            possibleMax += weight;
            if (textLower.includes(kw)) {
              score += weight;
            }
          });
        };

        checkMatch(pose.events, weights.events);
        checkMatch(pose.subjects, weights.subjects);
        checkMatch(pose.tags, weights.tags);
        checkMatch(pose.title, weights.title);
        checkMatch(pose.shoot_types, weights.shoot_types);
        checkMatch(pose.mood, weights.mood);

        const relevancePercentage = possibleMax > 0 ? Math.round((score / possibleMax) * 100) : 0;
        
        return {
          ...pose,
          relevance: relevancePercentage
        };
      });

      // Sort by relevance and filter out < 10%
      const topResults = scoredPoses
        .filter((p: any) => p.relevance >= 10)
        .sort((a: any, b: any) => b.relevance - a.relevance)
        .slice(0, 10);
        
      setResults(topResults);
      setIsSearching(false);
    }, 600);
  };

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
    if (activeIndex === null || results.length === 0 || animatingDir !== null) return;
    
    const flyDir = dir === 'next' ? 'left' : 'right';
    setAnimatingDir(flyDir);

    setTimeout(() => {
      if (dir === 'next') {
        setActiveIndex((prev) => (prev !== null && prev < results.length - 1 ? prev + 1 : 0));
      } else {
        setActiveIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : results.length - 1));
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
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0f", paddingBottom: "6rem", fontFamily: "sans-serif" }}>
      <div style={{ backgroundColor: "#12121a", padding: "1.5rem", borderBottomLeftRadius: "1.5rem", borderBottomRightRadius: "1.5rem", borderBottom: "1px solid #1f1f2e" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#D4AF37", margin: "0 0 1.5rem 0" }}>AI Pose Assistant</h1>
        
        {/* Search Input */}
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder='e.g. "Mehndi bride solo yellow dress"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            style={{
              width: "100%",
              backgroundColor: "#1f1f2e",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "1rem",
              padding: "1rem",
              paddingRight: "3rem",
              color: "#f8fafc",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
          <div style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{ height: "1.25rem", width: "1.25rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        </div>

        <button 
          onClick={() => handleSearch(query)}
          disabled={!query.trim() || isSearching}
          style={{
            width: "100%",
            backgroundColor: !query.trim() || isSearching ? "rgba(212,175,55,0.5)" : "#D4AF37",
            color: "#0a0a0f",
            fontWeight: "bold",
            padding: "0.875rem",
            borderRadius: "0.75rem",
            border: "none",
            cursor: !query.trim() || isSearching ? "not-allowed" : "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          {isSearching ? (
            <>
              <svg style={{ animation: "spin 1s linear infinite", marginLeft: "-0.25rem", marginRight: "0.5rem", height: "1.25rem", width: "1.25rem", color: "#0a0a0f" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </>
          ) : (
            "Find Poses"
          )}
        </button>

        {/* Suggestions */}
        {!hasSearched && (
          <div style={{ marginTop: "1.5rem" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: "500", color: "#94a3b8", marginBottom: "0.75rem", margin: "0 0 0.75rem 0" }}>Try these searches:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {suggestedQueries.map(sq => (
                <button
                  key={sq}
                  onClick={() => handleSearch(sq)}
                  style={{
                    backgroundColor: "#1f1f2e",
                    color: "#f8fafc",
                    fontSize: "0.875rem",
                    padding: "0.375rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #333344",
                    cursor: "pointer"
                  }}
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Area */}
      <div style={{ padding: "1rem" }}>
        {hasSearched && !isSearching && (
          <div style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#94a3b8", fontStyle: "italic" }}>
            Showing best matches for "{query}" (local search)
          </div>
        )}

        {/* Vertical Portrait Aspect Ratio Grid (Same as /poses) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
          {hasSearched && !isSearching && results.length > 0 && (
            results.map((pose: any, idx: number) => (
              <div 
                key={pose.id} 
                onClick={() => setActiveIndex(idx)}
                style={{ 
                  backgroundColor: "#12121a", 
                  borderRadius: "10px", 
                  border: "1px solid rgba(255,255,255,0.05)", 
                  overflow: "hidden", 
                  position: "relative", 
                  cursor: "pointer",
                  aspectRatio: "3 / 4"
                }}
              >
                {/* Relevance Badge */}
                <div style={{
                  position: "absolute",
                  top: "0.4rem",
                  right: "0.4rem",
                  padding: "0.2rem 0.4rem",
                  borderRadius: "0.375rem",
                  fontSize: "0.65rem",
                  fontWeight: "bold",
                  color: "#0a0a0f",
                  zIndex: 10,
                  backgroundColor: pose.relevance > 80 ? "#22c55e" : pose.relevance > 50 ? "#D4AF37" : "#94a3b8"
                }}>
                  {pose.relevance}% match
                </div>
                
                {pose.image_url ? (
                  <img src={pose.image_url} alt={pose.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>No Image</div>
                )}
                
                {/* Heart Button */}
                <button 
                  onClick={(e) => toggleFav(e, pose.id)} 
                  style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: favorites.includes(pose.id) ? '#ff4081' : 'white', fontSize: '10px', padding: 0, zIndex: 10 }}
                >
                  {favorites.includes(pose.id) ? '♥' : '♡'}
                </button>

                {/* Gradient overlay for text visibility */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px", background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}>
                  <h3 style={{ fontWeight: "bold", fontSize: "0.75rem", margin: 0, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pose.title}</h3>
                </div>
              </div>
            ))
          )}
        </div>

        {hasSearched && !isSearching && results.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "#12121a", borderRadius: "0.75rem", border: "1px solid #1f1f2e", marginTop: "1rem" }}>
            <div style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>🤔</div>
            <h3 style={{ fontWeight: "bold", color: "#f8fafc", margin: "0 0 0.25rem 0" }}>No matches found</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1rem", margin: "0 0 1rem 0" }}>Try using broader keywords.</p>
            <button 
              onClick={() => { setHasSearched(false); setQuery(""); }}
              style={{ color: "#D4AF37", fontWeight: "500", fontSize: "0.875rem", background: "none", border: "none", cursor: "pointer" }}
            >
              Clear search
            </button>
          </div>
        )}

        <div style={{ marginTop: "3rem", textAlign: "center", fontSize: "0.75rem", color: "#94a3b8", backgroundColor: "#12121a", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #1f1f2e" }}>
          💡 Connect to internet and add an OpenAI API key for smarter AI search
        </div>
      </div>

      {/* Dating App Style Swipeable Popup Modal */}
      {activeIndex !== null && results[activeIndex] && (
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
                src={results[activeIndex].image_url} 
                alt={results[activeIndex].title} 
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

              {/* Heart/Like Button */}
              <button 
                onClick={(e) => toggleFav(e, results[activeIndex].id)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: favorites.includes(results[activeIndex].id) ? 'rgba(255, 64, 129, 0.25)' : 'rgba(0,0,0,0.6)',
                  border: favorites.includes(results[activeIndex].id) ? '1px solid #ff4081' : '1px solid rgba(255,255,255,0.1)',
                  color: favorites.includes(results[activeIndex].id) ? '#ff4081' : 'white',
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
                {favorites.includes(results[activeIndex].id) ? '♥' : '♡'}
              </button>

              {/* Swipe Indicators */}
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

            {/* Card Content */}
            <div style={{ padding: '12px', background: 'linear-gradient(to top, #0a0a0f 80%, rgba(10,10,15,0))', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span style={{ ...tagStyle, background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}>{results[activeIndex].relevance}% Match</span>
                {results[activeIndex].events?.slice(0, 1).map((e: string) => (
                  <span key={e} style={{ ...tagStyle, background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>{e}</span>
                ))}
              </div>
              
              <h2 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'white', fontWeight: 'bold' }}>{results[activeIndex].title}</h2>
              
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#aaa', lineHeight: '1.4', maxHeight: '60px', overflowY: 'auto' }}>
                {results[activeIndex].instructions}
              </p>

              <Link 
                href={`/poses/${results[activeIndex].id}`}
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

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

